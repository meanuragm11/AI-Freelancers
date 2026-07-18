export type RegexFindingType =
  | 'email'
  | 'phone'
  | 'url'
  | 'whatsapp'
  | 'telegram'
  | 'discord'
  | 'linkedin'
  | 'upi'
  | 'crypto_wallet'
  | 'paypal'
  | 'keyword';

export type RegexFinding = {
  type: RegexFindingType;
  label: string;
  match: string;
};

export type RegexScanResult = {
  suspicious: boolean;
  findings: RegexFinding[];
};

type PatternDef = {
  type: RegexFindingType;
  label: string;
  pattern: RegExp;
};

const PATTERNS: PatternDef[] = [
  {
    type: 'email',
    label: 'Email address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  },
  {
    type: 'phone',
    label: 'Phone number',
    pattern: /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/g,
  },
  {
    type: 'url',
    label: 'URL',
    pattern: /(?:https?:\/\/|www\.)[^\s<>"']+/gi,
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    pattern: /(?:whatsapp|wa\.me|w-a(?:pp)?)/gi,
  },
  {
    type: 'telegram',
    label: 'Telegram',
    pattern: /(?:telegram|t\.me|@[a-zA-Z0-9_]{4,})/gi,
  },
  {
    type: 'discord',
    label: 'Discord',
    pattern: /(?:discord(?:\.gg|app)?|discord\.com\/invite)/gi,
  },
  {
    type: 'linkedin',
    label: 'LinkedIn',
    pattern: /(?:linkedin\.com|linked\s*in)/gi,
  },
  {
    type: 'upi',
    label: 'UPI ID',
    pattern: /[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}/gi,
  },
  {
    type: 'crypto_wallet',
    label: 'Crypto wallet',
    pattern: /\b(?:0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{25,90})\b/g,
  },
  {
    type: 'paypal',
    label: 'PayPal',
    pattern: /(?:paypal|pay\s*pal|paypal\.me)/gi,
  },
];

const KEYWORD_PATTERNS: PatternDef[] = [
  { type: 'keyword', label: 'Contact request', pattern: /\bcontact\s+me\b/gi },
  { type: 'keyword', label: 'Email request', pattern: /\bemail\s+me\b/gi },
  { type: 'keyword', label: 'Call request', pattern: /\bcall\s+me\b/gi },
  { type: 'keyword', label: 'DM request', pattern: /\bdm\s+me\b/gi },
  { type: 'keyword', label: 'WhatsApp mention', pattern: /\bwhatsapp\b/gi },
  { type: 'keyword', label: 'Telegram mention', pattern: /\btelegram\b/gi },
  { type: 'keyword', label: 'Off-platform', pattern: /\boutside\s+zelance\b/gi },
  { type: 'keyword', label: 'Direct payment', pattern: /\bpay\s+directly\b/gi },
  { type: 'keyword', label: 'Off-platform', pattern: /\boff[\s-]?platform\b/gi },
  { type: 'keyword', label: 'Bank transfer', pattern: /\bbank\s+transfer\b/gi },
];

function truncateMatch(value: string, max = 80): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function collectFindings(content: string, patterns: PatternDef[]): RegexFinding[] {
  const findings: RegexFinding[] = [];
  const seen = new Set<string>();

  for (const { type, label, pattern } of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      const raw = match[0];
      if (!raw || raw.length < 3) continue;

      // Reduce false positives for bare numbers in normal text
      if (type === 'phone' && !/[\d\s().+-]{7,}/.test(raw)) continue;
      if (type === 'phone' && /^\d{1,2}$/.test(raw.trim())) continue;

      const key = `${type}:${raw.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push({ type, label, match: truncateMatch(raw) });
    }
  }

  return findings;
}

/** Deduplicate UPI findings that overlap with email detections */
function dedupeUpiAgainstEmail(findings: RegexFinding[]): RegexFinding[] {
  const emails = new Set(
    findings.filter((f) => f.type === 'email').map((f) => f.match.toLowerCase())
  );
  if (emails.size === 0) return findings;

  return findings.filter((f) => {
    if (f.type !== 'upi') return true;
    return !emails.has(f.match.toLowerCase());
  });
}

/**
 * Regex-first chat moderation scan. Runs synchronously on every message.
 * No match → safe (skip Gemini). Match → suspicious (send findings to Gemini).
 */
export function scanChatContent(content: string): RegexScanResult {
  const normalized = content?.trim() ?? '';
  if (!normalized) {
    return { suspicious: false, findings: [] };
  }

  const findings = dedupeUpiAgainstEmail([
    ...collectFindings(normalized, PATTERNS),
    ...collectFindings(normalized, KEYWORD_PATTERNS),
  ]);

  return {
    suspicious: findings.length > 0,
    findings,
  };
}
