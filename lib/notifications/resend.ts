import { Resend } from 'resend';
import type * as React from 'react';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const DEFAULT_FROM = 'Zelance <onboarding@resend.dev>';

export interface SendEmailParams {
  to: string;
  subject: string;
  html?: string;
  react?: React.ReactNode;
}

export async function sendEmailViaResend({
  to,
  subject,
  html,
  react,
}: SendEmailParams): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn('[NotificationEngine] RESEND_API_KEY not configured. Email sending disabled.');
    return { ok: false, error: 'resend_not_configured' };
  }

  try {
    const from = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
    const { error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      ...(react ? { react } : { html: html ?? '' }),
    });

    if (error) {
      console.error('[NotificationEngine] Email Failed:', { to, subject, error });
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Resend error';
    console.error('[NotificationEngine] Email Failed:', { to, subject, message });
    return { ok: false, error: message };
  }
}
