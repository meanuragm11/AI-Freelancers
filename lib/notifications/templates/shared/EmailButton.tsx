import * as React from 'react';

import { emailColors, emailFonts } from './styles';

export interface EmailButtonProps {
  href: string;
  label: string;
  fullWidth?: boolean;
}

export function EmailButton({ href, label, fullWidth = true }: EmailButtonProps) {
  return (
    <table
      role="presentation"
      width={fullWidth ? '100%' : undefined}
      cellPadding={0}
      cellSpacing={0}
      style={{ margin: '0 0 16px' }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              borderRadius: 10,
              backgroundColor: emailColors.accent,
            }}
          >
            <a
              href={href}
              style={{
                display: 'block',
                padding: '14px 24px',
                fontSize: 14,
                fontWeight: 700,
                color: '#ffffff',
                textDecoration: 'none',
                letterSpacing: '0.01em',
                fontFamily: emailFonts,
                textAlign: 'center',
              }}
            >
              {label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
