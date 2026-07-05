import { NextResponse } from 'next/server';



export async function POST(req: Request) {

  try {

    const authHeader = req.headers.get('authorization');

    const adminSecret = process.env.ADMIN_SECRET;



    if (!adminSecret) {

      return NextResponse.json({ error: 'Admin alert secret is not configured' }, { status: 500 });

    }



    if (authHeader !== `Bearer ${adminSecret}`) {

      return NextResponse.json({ error: 'Unauthorized payload' }, { status: 401 });

    }



    const payload = await req.json();

    console.log('CRITICAL ALERT TRIGGERED:', payload);



    return NextResponse.json({ success: true, message: 'Alert received and broadcasted.' });

  } catch (error: unknown) {

    console.error('Alert Webhook Error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

