import * as React from 'react';

import { emailColors, emailFonts } from './styles';

export interface EmailInfoListProps {
  items: string[];
}

export function EmailInfoList({ items }: EmailInfoListProps) {
  if (items.length === 0) return null;

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        margin: '28px 0 0',
        backgroundColor: '#f8fafc',
        borderRadius: 10,
        border: `1px solid ${emailColors.borderLight}`,
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: '18px 20px' }}>
            {items.map((item, index) => (
              <p
                key={item}
                style={{
                  margin: index < items.length - 1 ? '0 0 8px' : 0,
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: emailColors.textSecondary,
                  fontFamily: emailFonts,
                }}
              >
                <span style={{ color: emailColors.accent, marginRight: 8 }}>•</span>
                {item}
              </p>
            ))}
          </td>
        </tr>
      </tbody>
    </table>
  );
}
