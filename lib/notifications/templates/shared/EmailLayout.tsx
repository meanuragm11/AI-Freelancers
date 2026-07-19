import * as React from 'react';

import { emailColors, emailFonts, emailLayout } from './styles';
import { EmailFooter } from './EmailFooter';
import { EmailHeader } from './EmailHeader';

export interface EmailLayoutProps {
  children: React.ReactNode;
}

export function EmailLayout({ children }: EmailLayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Zelance</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: emailColors.background,
          fontFamily: emailFonts,
          WebkitTextSizeAdjust: '100%',
          textSizeAdjust: '100%',
        } as React.CSSProperties}
      >
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: emailColors.background, padding: emailLayout.outerPadding }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{
                    maxWidth: emailLayout.maxWidth,
                    backgroundColor: emailColors.surface,
                    borderRadius: 16,
                    border: `1px solid ${emailColors.border}`,
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <tbody>
                    <EmailHeader />
                    <tr>
                      <td style={{ padding: emailLayout.innerPadding }}>{children}</td>
                    </tr>
                    <EmailFooter />
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
