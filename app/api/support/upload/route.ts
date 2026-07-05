import { NextResponse } from 'next/server';
import {
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_TYPES,
  SUPPORT_BUCKET,
} from '@/lib/support/constants';
import { getAuthenticatedUser, supabaseAdmin } from '@/lib/support/server';

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > SUPPORT_ATTACHMENT_MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }

    if (!SUPPORT_ATTACHMENT_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'bin';
    const filePath = `${user.id}/support/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPPORT_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(SUPPORT_BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    if (signError) throw signError;

    return NextResponse.json({
      attachment: {
        name: file.name,
        url: signed.signedUrl,
        type: file.type,
        size: file.size,
        bucket: SUPPORT_BUCKET,
        path: filePath,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
