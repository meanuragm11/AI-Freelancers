import * as React from 'react';

import { getEmailLogoUrl } from '@/lib/urls/appUrl';

import { emailColors, emailFonts } from './styles';

export function EmailHeader() {
  const logoUrl = getEmailLogoUrl();

  return (
    <tr>
      <td
        style={{
          padding: '32px 40px 24px',
          borderBottom: `1px solid ${emailColors.borderLight}`,
          textAlign: 'center',
        }}
      >
        <img
          src={logoUrl}
          alt="Zelance"
          width={120}
          height={32}
          style={{
            display: 'block',
            margin: '0 auto 12px',
            height: 32,
            width: 'auto',
            maxWidth: 140,
          }}
        />
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: emailColors.textMuted,
            letterSpacing: '0.04em',
            fontFamily: emailFonts,
          }}
        >
          The AI Talent Marketplace
        </div>
      </td>
    </tr>
  );
}
