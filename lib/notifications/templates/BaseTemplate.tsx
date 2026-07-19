import * as React from 'react';

import type { EmailTemplateData } from '../types';

import { EmailButton } from './shared/EmailButton';
import { EmailInfoList } from './shared/EmailInfoList';
import { EmailLayout } from './shared/EmailLayout';
import { HeroIcon } from './shared/HeroIcon';
import { SummaryCard } from './shared/SummaryCard';
import { emailColors, emailFonts } from './shared/styles';

export function BaseTemplate({
  type,
  heading,
  dateTime,
  content,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  summaryRows,
  infoItems,
}: EmailTemplateData) {
  return (
    <EmailLayout>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td align="center" style={{ paddingBottom: 8 }}>
              <HeroIcon type={type} />
              <h1
                style={{
                  margin: '0 0 12px',
                  fontSize: 24,
                  fontWeight: 800,
                  color: emailColors.textPrimary,
                  lineHeight: 1.25,
                  fontFamily: emailFonts,
                  textAlign: 'center',
                }}
              >
                {heading}
              </h1>
              <p
                style={{
                  margin: '0 0 28px',
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: emailColors.textSecondary,
                  fontFamily: emailFonts,
                  textAlign: 'center',
                }}
              >
                {content}
              </p>
            </td>
          </tr>
          <tr>
            <td>
              {summaryRows && summaryRows.length > 0 && <SummaryCard rows={summaryRows} />}
              <EmailButton href={primaryCtaHref} label={primaryCtaLabel} />
              {secondaryCtaLabel && secondaryCtaHref && (
                <p style={{ margin: '0 0 8px', textAlign: 'center', fontFamily: emailFonts }}>
                  <a
                    href={secondaryCtaHref}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: emailColors.accent,
                      textDecoration: 'none',
                    }}
                  >
                    {secondaryCtaLabel}
                  </a>
                </p>
              )}
              {infoItems && infoItems.length > 0 && <EmailInfoList items={infoItems} />}
              {!summaryRows?.length && dateTime && (
                <p
                  style={{
                    margin: '24px 0 0',
                    fontSize: 12,
                    color: emailColors.textSubtle,
                    textAlign: 'center',
                    fontFamily: emailFonts,
                  }}
                >
                  {dateTime}
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </EmailLayout>
  );
}
