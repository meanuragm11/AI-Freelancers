import { NextResponse } from 'next/server';

import {

  MIN_WITHDRAWAL_USD,

  computeBuilderEarningsLedger,

} from '@/lib/builder/earningsLedger';

import { requireBuilderAccount } from '@/lib/server/builderAuth';

import { logBusinessEvent } from '@/lib/events/businessEvents';



type WithdrawPayload = {

  amountUsd?: number;

};



function createReferenceCode() {

  return `WD-${Math.floor(100000 + Math.random() * 900000)}`;

}



export async function POST(req: Request) {

  try {

    const auth = await requireBuilderAccount();

    if ('error' in auth) {

      return NextResponse.json({ error: auth.error }, { status: auth.status });

    }



    const { amountUsd } = (await req.json()) as WithdrawPayload;

    const amount = Number(amountUsd);



    if (!Number.isFinite(amount) || amount <= 0) {

      return NextResponse.json({ error: 'Enter a valid withdrawal amount.' }, { status: 400 });

    }



    if (amount < MIN_WITHDRAWAL_USD) {

      return NextResponse.json(

        { error: `Minimum withdrawal amount is $${MIN_WITHDRAWAL_USD}.` },

        { status: 400 }

      );

    }



    const ledger = await computeBuilderEarningsLedger(auth.supabaseAdmin, auth.user.id);



    if (!ledger.payoutMethod.connected) {

      return NextResponse.json(

        { error: 'Connect a bank account before withdrawing funds.' },

        { status: 409 }

      );

    }



    if (amount > ledger.availableBalanceUsd) {

      return NextResponse.json(

        { error: `Insufficient balance. Available: $${ledger.availableBalanceUsd.toFixed(2)}` },

        { status: 409 }

      );

    }



    const { data: payoutMethod } = await auth.supabaseAdmin

      .from('builder_payout_methods')

      .select('id')

      .eq('builder_id', auth.user.id)

      .eq('status', 'active')

      .maybeSingle();



    if (!payoutMethod?.id) {

      return NextResponse.json(

        { error: 'Connect a bank account before withdrawing funds.' },

        { status: 409 }

      );

    }



    const referenceCode = createReferenceCode();



    const { data: withdrawal, error: withdrawalError } = await auth.supabaseAdmin.rpc(

      'request_builder_withdrawal',

      {

        p_builder_id: auth.user.id,

        p_amount_usd: amount,

        p_reference_code: referenceCode,

        p_payout_method_id: payoutMethod.id,

      }

    );



    if (withdrawalError) {

      const message = withdrawalError.message || 'Withdrawal failed';

      const status =

        message.includes('Insufficient balance') ||

        message.includes('KYC') ||

        message.includes('Payouts') ||

        message.includes('Connect a bank') ||

        message.includes('disabled for this account')

          ? 409

          : 500;

      return NextResponse.json({ error: message }, { status });

    }



    const updatedLedger = await computeBuilderEarningsLedger(auth.supabaseAdmin, auth.user.id);



    void logBusinessEvent({

      eventType: 'withdrawal.requested',

      entityType: 'withdrawal',

      entityId: (withdrawal as { id?: string } | null)?.id ?? null,

      actorId: auth.user.id,

      amountUsd: amount,

      summary: `Builder requested a withdrawal of $${amount.toFixed(2)} (${referenceCode})`,

    });



    return NextResponse.json({

      success: true,

      withdrawal,

      availableBalanceUsd: updatedLedger.availableBalanceUsd,

      message: `Withdrawal of $${amount.toFixed(2)} submitted for review. Reference ${referenceCode}.`,

    });

  } catch (error: unknown) {

    const message = error instanceof Error ? error.message : 'Withdrawal failed';

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

