import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin to bypass RLS for system insertions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, category, subject, message, userId } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Determine Priority Logic (Escrow disputes are auto-critical)
    let priority = 'normal';
    if (category === 'Escrow & Payments') priority = 'critical';

    // 2. Insert into Supabase
    const { data: ticket, error } = await supabaseAdmin
      .from('support_tickets')
      .insert([{ user_id: userId || null, name, email, category, subject, message, priority }])
      .select()
      .single();

    if (error) throw error;

    // 3. Trigger Automated Email to User (Implementation depends on your provider, e.g., Resend)
    /* await resend.emails.send({
        from: 'support@zelance.com',
        to: email,
        subject: `[Ticket #${ticket.id.substring(0,6)}] We received your request`,
        html: `<p>Hi ${name},</p><p>We received your ticket regarding "${subject}". Our elite support team will respond shortly.</p>`
      });
    */

    return NextResponse.json({ success: true, ticketId: ticket.id });

  } catch (error: any) {
    console.error("Support API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}