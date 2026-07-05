import { NextResponse } from 'next/server';
import { requireBuilderAccount } from '@/lib/server/builderAuth';

type PayoutMethodPayload = {
  payoutRegion?: 'india' | 'international';
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  ifscCode?: string;
  paypalEmail?: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function maskLast4(value: string) {
  const digits = digitsOnly(value);
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

export async function POST(req: Request) {
  try {
    const auth = await requireBuilderAccount();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = (await req.json()) as PayoutMethodPayload;
    const payoutRegion = body.payoutRegion;
    const accountHolderName = body.accountHolderName?.trim();
    const accountNumber = body.accountNumber?.trim() || '';
    const accountLast4 = maskLast4(accountNumber);

    if (!payoutRegion || !accountHolderName || !accountLast4) {
      return NextResponse.json(
        { error: 'Account holder name, region, and a valid account number are required.' },
        { status: 400 }
      );
    }

    if (payoutRegion === 'india') {
      const ifscCode = body.ifscCode?.trim().toUpperCase();
      if (!ifscCode || ifscCode.length < 4) {
        return NextResponse.json({ error: 'A valid IFSC code is required for Indian bank accounts.' }, { status: 400 });
      }

      const { data, error } = await auth.supabaseAdmin
        .from('builder_payout_methods')
        .upsert(
          {
            builder_id: auth.user.id,
            payout_region: 'india',
            account_holder_name: accountHolderName,
            bank_name: body.bankName?.trim() || null,
            account_last4: accountLast4,
            routing_last4: null,
            ifsc_code: ifscCode,
            paypal_email: null,
            status: 'active',
          },
          { onConflict: 'builder_id' }
        )
        .select('id, payout_region, account_holder_name, bank_name, account_last4, ifsc_code')
        .single();

      if (error) throw error;

      await auth.supabaseAdmin
        .from('profiles')
        .update({ payouts_enabled: true, payment_routing_id: `bank_${data.id.slice(0, 8)}` })
        .eq('id', auth.user.id);

      return NextResponse.json({
        success: true,
        payoutMethod: {
          connected: true,
          payoutRegion: 'india',
          accountHolderName: data.account_holder_name,
          bankName: data.bank_name ?? undefined,
          accountLast4: data.account_last4,
          ifscCode: data.ifsc_code ?? undefined,
        },
      });
    }

    const paypalEmail = body.paypalEmail?.trim().toLowerCase();
    const routingLast4 = body.routingNumber ? maskLast4(body.routingNumber) : null;

    if (!paypalEmail && !routingLast4) {
      return NextResponse.json(
        { error: 'Provide either a PayPal email or bank routing number for international payouts.' },
        { status: 400 }
      );
    }

    const { data, error } = await auth.supabaseAdmin
      .from('builder_payout_methods')
      .upsert(
        {
          builder_id: auth.user.id,
          payout_region: 'international',
          account_holder_name: accountHolderName,
          bank_name: body.bankName?.trim() || null,
          account_last4: accountLast4,
          routing_last4: routingLast4,
          ifsc_code: null,
          paypal_email: paypalEmail || null,
          status: 'active',
        },
        { onConflict: 'builder_id' }
      )
      .select('id, payout_region, account_holder_name, bank_name, account_last4, routing_last4, paypal_email')
      .single();

    if (error) throw error;

    await auth.supabaseAdmin
      .from('profiles')
      .update({
        payouts_enabled: true,
        support_email: paypalEmail || undefined,
        payment_routing_id: `bank_${data.id.slice(0, 8)}`,
      })
      .eq('id', auth.user.id);

    return NextResponse.json({
      success: true,
      payoutMethod: {
        connected: true,
        payoutRegion: 'international',
        accountHolderName: data.account_holder_name,
        bankName: data.bank_name ?? undefined,
        accountLast4: data.account_last4,
        routingLast4: data.routing_last4 ?? undefined,
        paypalEmail: data.paypal_email ?? undefined,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to connect payout method';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
