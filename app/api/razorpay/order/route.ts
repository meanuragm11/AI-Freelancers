import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { transactionType, amountUsd, itemId, buyerId } = await req.json();

    if (!transactionType || !amountUsd || !buyerId) {
      return NextResponse.json({ error: 'Missing required payment data' }, { status: 400 });
    }

    let platformFee = 0;
    let finalCharge = amountUsd;

    // --- GLOBAL USD FEE ENGINE ---
    if (transactionType === 'collab_milestone') {
      // Escrow Funding: Flat $5 Buyer Fee
      platformFee = 5; 
      finalCharge = amountUsd + platformFee;

    } else if (transactionType === 'component_purchase') {
      // Component Exchange: $1 fee if under $20, else flat $5 fee.
      if (amountUsd < 20) {
        platformFee = 1;
      } else {
        platformFee = 5;
      }
      finalCharge = amountUsd; // Buyer pays exact sticker price
    }

    // Razorpay accepts USD. The amount must be passed in cents (e.g., $5.00 = 500)
    const options = {
      amount: finalCharge * 100, 
      currency: "USD",
      receipt: `rcpt_${buyerId.substring(0, 8)}_${Date.now()}`,
      notes: {
        transaction_type: transactionType,
        item_id: itemId,
        platform_fee_usd: platformFee
      }
    };

    const order = await razorpay.orders.create(options);

    await supabaseAdmin.from('transactions').insert({
      order_id: order.id,
      buyer_id: buyerId,
      item_id: itemId,
      transaction_type: transactionType,
      amount_usd: finalCharge,
      fee_usd: platformFee,
      status: 'pending'
    });

    return NextResponse.json({ 
      success: true, 
      orderId: order.id, 
      amountToPay: finalCharge 
    });

  } catch (error: any) {
    console.error("Razorpay Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}