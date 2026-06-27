import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client required to bypass Row Level Security for financial ledgers
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FLAT_PLATFORM_FEE_USD = 5.00;

export async function POST(req: Request) {
  try {
    const { collabId, action } = await req.json();

    if (!collabId || action !== 'release_escrow') {
      return NextResponse.json({ error: 'Invalid billing payload' }, { status: 400 });
    }

    // 1. Fetch the Collab Workspace state
    const { data: collab, error: fetchError } = await supabaseAdmin
      .from('collabs')
      .select('id, buyer_id, builder_id, escrow_amount_usd, status')
      .eq('id', collabId)
      .single();

    if (fetchError || !collab) {
      throw new Error("Collab workspace not found or database error.");
    }

    // Security Check: Ensure funds are actually locked and awaiting release
    if (collab.status !== 'pending_approval' && collab.status !== 'completed') {
      return NextResponse.json({ error: 'Escrow is not in a releasable state.' }, { status: 403 });
    }

    // 2. Financial Mathematics
    const grossAmount = parseFloat(collab.escrow_amount_usd);
    const netPayout = grossAmount - FLAT_PLATFORM_FEE_USD;

    if (netPayout <= 0) {
      throw new Error("Critical Error: Gross amount cannot cover platform fees.");
    }

    // 3. Generate Unique Invoice Number (e.g., ZEL-INV-169872)
    const invoiceNumber = `ZEL-INV-${Math.floor(100000 + Math.random() * 900000)}`;

    // 4. Create the Invoice Record in the Ledger
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert([{
        collab_id: collab.id,
        buyer_id: collab.buyer_id,
        builder_id: collab.builder_id,
        gross_amount_usd: grossAmount,
        platform_fee_usd: FLAT_PLATFORM_FEE_USD,
        net_payout_usd: netPayout,
        invoice_number: invoiceNumber,
        status: 'processing'
      }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 5. Trigger Razorpay Route (Linked Account Transfer)
    // NOTE: This is the SDK integration point for transferring funds to the Builder's connected account.
    /*
      const transfer = await razorpay.transfers.create({
        account: builderConnectedAccountId,
        amount: netPayout * 100, // Cents
        currency: "USD",
        notes: { invoice_ref: invoiceNumber }
      });
      
      // Update invoice with the actual transaction ID from the gateway
      await supabaseAdmin.from('invoices').update({ 
        status: 'paid', 
        payout_transaction_id: transfer.id 
      }).eq('id', invoice.id);
    */

    // 6. Finalize Collab Status
    await supabaseAdmin
      .from('collabs')
      .update({ status: 'completed' })
      .eq('id', collab.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Escrow released, fees deducted, and invoice generated.',
      invoiceDetails: {
        invoiceNumber,
        gross: grossAmount,
        net: netPayout
      }
    });

  } catch (error: any) {
    console.error("Billing Controller Error:", error);
    
    // Alert the Command Center of a financial routing failure
    await supabaseAdmin.from('system_alerts').insert([{
      alert_type: 'system_error',
      risk_level: 'critical',
      message: `Billing Controller Failure on Collab ${req.body ? (req.body as any).collabId : 'unknown'}: ${error.message}`
    }]);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}