import * as React from 'react';

import { emailColors, emailFonts } from './styles';

export interface SummaryCardRow {
  label: string;
  value: string;
  badge?: 'success' | 'warning' | 'default';
}

export interface SummaryCardProps {
  rows: SummaryCardRow[];
}

function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'warning' }) {
  const colors =
    tone === 'warning'
      ? {
          color: emailColors.warning,
          backgroundColor: emailColors.warningBg,
          border: emailColors.warningBorder,
        }
      : {
          color: emailColors.success,
          backgroundColor: emailColors.successBg,
          border: emailColors.successBorder,
        };

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: colors.color,
        backgroundColor: colors.backgroundColor,
        border: `1px solid ${colors.border}`,
        fontFamily: emailFonts,
      }}
    >
      {label}
    </span>
  );
}

export function SummaryCard({ rows }: SummaryCardProps) {
  const visibleRows = rows.filter((row) => row.value.trim().length > 0);
  if (visibleRows.length === 0) return null;

  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        margin: '0 0 28px',
        backgroundColor: emailColors.surface,
        borderRadius: 12,
        border: `1px solid ${emailColors.border}`,
        overflow: 'hidden',
      }}
    >
      <tbody>
        {visibleRows.map((row, index) => (
          <tr key={row.label}>
            <td
              style={{
                padding: '14px 20px',
                borderBottom: index < visibleRows.length - 1 ? `1px solid ${emailColors.borderLight}` : undefined,
              }}
            >
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: emailColors.textMuted,
                        width: '38%',
                        verticalAlign: 'top',
                        fontFamily: emailFonts,
                      }}
                    >
                      {row.label}
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: emailColors.textPrimary,
                        textAlign: 'right',
                        verticalAlign: 'top',
                        fontFamily: emailFonts,
                      }}
                    >
                      {row.badge === 'success' ? (
                        <StatusBadge label={row.value} tone="success" />
                      ) : row.badge === 'warning' ? (
                        <StatusBadge label={row.value} tone="warning" />
                      ) : (
                        row.value
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
