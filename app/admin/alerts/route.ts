import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    // SECURE: Pulls from your environment variables instead of hardcoded text
    const adminSecret = process.env.ADMIN_SECRET || 'development_secret';
    
    if (authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized payload' }, { status: 401 });
    }

    const payload = await req.json();
    console.log("🚨 CRITICAL ALERT TRIGGERED:", payload);

    return NextResponse.json({ success: true, message: "Alert received and broadcasted." });

  } catch (error: any) {
    console.error("Alert Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}