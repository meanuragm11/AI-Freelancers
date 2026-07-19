import * as React from 'react';

import { EMAIL_PATHS, getAppUrl, resolveAppUrl } from '@/lib/urls/appUrl';

import { emailColors, emailFonts } from './styles';

const SUPPORT_EMAIL = 'support@zelance.co';
const COPYRIGHT_YEAR = new Date().getFullYear();

export function EmailFooter() {
  const appUrl = getAppUrl();

  return (
    <tr>
      <td
        style={{
          padding: '28px 40px 32px',
          borderTop: `1px solid ${emailColors.borderLight}`,
          backgroundColor: emailColors.footerBg,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: emailColors.textPrimary,
            marginBottom: 4,
            fontFamily: emailFonts,
          }}
        >
          ZELANCE
        </div>
        <div
          style={{
            fontSize: 11,
            color: emailColors.textMuted,
            marginBottom: 16,
            fontFamily: emailFonts,
          }}
        >
          The AI Talent Marketplace
        </div>
        <p
          style={{
            margin: '0 0 6px',
            fontSize: 12,
            lineHeight: 1.5,
            color: emailColors.textMuted,
            fontFamily: emailFonts,
          }}
        >
          <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: emailColors.textSecondary, textDecoration: 'none' }}>
            {SUPPORT_EMAIL}
          </a>
          {' · '}
          <a href={appUrl} style={{ color: emailColors.textSecondary, textDecoration: 'none' }}>
            {appUrl.replace(/^https?:\/\//, '')}
          </a>
        </p>
        <p
          style={{
            margin: '0 0 12px',
            fontSize: 11,
            color: emailColors.textSubtle,
            fontFamily: emailFonts,
          }}
        >
          © {COPYRIGHT_YEAR} Zelance. All rights reserved.
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            lineHeight: 1.5,
            color: emailColors.textSubtle,
            fontFamily: emailFonts,
          }}
        >
          This is an automated email. Please do not reply.
        </p>
        <p style={{ margin: '16px 0 0', fontSize: 11, color: emailColors.textSubtle, fontFamily: emailFonts }}>
          <a href={resolveAppUrl(EMAIL_PATHS.privacy)} style={{ color: emailColors.textSubtle, textDecoration: 'none' }}>
            Privacy
          </a>
          {' · '}
          <a href={resolveAppUrl(EMAIL_PATHS.terms)} style={{ color: emailColors.textSubtle, textDecoration: 'none' }}>
            Terms
          </a>
        </p>
      </td>
    </tr>
  );
}
