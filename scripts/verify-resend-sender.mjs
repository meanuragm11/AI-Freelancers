/**
 * One-off sender verification — mirrors lib/notifications/resend.ts
 * Usage: node scripts/verify-resend-sender.mjs [to-email]
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Resend } from 'resend';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnvLocal() {
  const raw = readFileSync(resolve(root, '.env.local'), 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvLocal();

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL || 'Zelance <support@zelance.co>';
const to = process.argv[2] || 'meanuragm11@gmail.com';

if (!apiKey) {
  console.error(JSON.stringify({ ok: false, error: 'RESEND_API_KEY missing' }, null, 2));
  process.exit(1);
}

const resend = new Resend(apiKey);

const { data, error } = await resend.emails.send({
  from,
  to: [to],
  subject: '[Zelance] Sender verification test — support@zelance.co',
  html: `<p>This is a one-off test from the Zelance app to verify the production sender domain.</p>
<p><strong>From:</strong> ${from}</p>
<p><strong>Sent at:</strong> ${new Date().toISOString()}</p>`,
});

console.log(
  JSON.stringify(
    {
      ok: !error,
      from,
      to,
      resendData: data ?? null,
      resendError: error ?? null,
    },
    null,
    2
  )
);

process.exit(error ? 1 : 0);
