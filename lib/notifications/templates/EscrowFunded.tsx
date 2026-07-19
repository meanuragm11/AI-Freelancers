import * as React from 'react';

import type { EmailTemplateData } from '../types';
import { summaryFieldsToRows } from '../emailContent';

import { EmailButton } from './shared/EmailButton';
import { EmailInfoList } from './shared/EmailInfoList';
import { EmailLayout } from './shared/EmailLayout';
import { HeroIcon } from './shared/HeroIcon';
import { SummaryCard } from './shared/SummaryCard';
import { emailColors, emailFonts } from './shared/styles';

export function EscrowFundedTemplate(props: EmailTemplateData) {
  const isMilestoneFunded = props.type === 'milestone_funded';
  const title = props.heading;
  const description = props.content;
  const infoItems = props.infoItems ?? [
    'Funds are securely held in escrow until milestone approval.',
    'Payment is released automatically after you deliver and the client approves.',
    'Keep all project communication on Zelance for your protection.',
  ];

  const summaryRows =
    props.summaryRows && props.summaryRows.length > 0
      ? props.summaryRows
      : summaryFieldsToRows(props.summaryFields);

  return (
    <EmailLayout>
      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr>
            <td align="center" style={{ paddingBottom: 8 }}>
              <HeroIcon type={props.type} variant="success" />
              <h1
                style={{
                  margin: '0 0 12px',
                  fontSize: 26,
                  fontWeight: 800,
                  color: emailColors.textPrimary,
                  lineHeight: 1.25,
                  fontFamily: emailFonts,
                  textAlign: 'center',
                }}
              >
                {title}
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
                {description}
              </p>
            </td>
          </tr>
          <tr>
            <td>
              {summaryRows.length > 0 && <SummaryCard rows={summaryRows} />}
              <EmailButton href={props.primaryCtaHref} label={props.primaryCtaLabel} />
              {props.secondaryCtaLabel && props.secondaryCtaHref && (
                <p style={{ margin: '0 0 8px', textAlign: 'center', fontFamily: emailFonts }}>
                  <a
                    href={props.secondaryCtaHref}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: emailColors.accent,
                      textDecoration: 'none',
                    }}
                  >
                    {props.secondaryCtaLabel}
                  </a>
                </p>
              )}
              <EmailInfoList items={infoItems} />
            </td>
          </tr>
        </tbody>
      </table>
    </EmailLayout>
  );
}
