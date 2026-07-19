import * as React from 'react';

import type { NotificationType } from '../../types';

import { emailColors } from './styles';

type HeroVariant = 'success' | 'info' | 'message' | 'star' | 'alert' | 'payment';

const TYPE_VARIANT: Partial<Record<NotificationType, HeroVariant>> = {
  message: 'message',
  project_request: 'info',
  quotation: 'payment',
  quotation_accepted: 'success',
  escrow_funded: 'success',
  milestone_proposed: 'info',
  milestone_funded: 'success',
  milestone_submitted: 'info',
  milestone_approved: 'success',
  project_completed: 'success',
  review_received: 'star',
  dispute_event: 'alert',
  refund_event: 'alert',
  service_purchased: 'payment',
  asset_purchased: 'payment',
  support_ticket: 'info',
  open_project_proposal: 'info',
  open_project_hired: 'success',
  open_project_proposal_rejected: 'info',
  open_project_activity_reminder_1: 'alert',
  open_project_activity_reminder_2: 'alert',
  open_project_auto_archived: 'info',
  system: 'info',
};

const VARIANT_STYLE: Record<
  HeroVariant,
  { bg: string; border: string; color: string; symbol: string }
> = {
  success: {
    bg: emailColors.successBg,
    border: emailColors.successBorder,
    color: emailColors.success,
    symbol: '✓',
  },
  info: {
    bg: emailColors.infoBg,
    border: emailColors.infoBorder,
    color: emailColors.accent,
    symbol: '●',
  },
  message: {
    bg: emailColors.infoBg,
    border: emailColors.infoBorder,
    color: emailColors.accent,
    symbol: '✉',
  },
  star: {
    bg: emailColors.warningBg,
    border: emailColors.warningBorder,
    color: emailColors.warning,
    symbol: '★',
  },
  alert: {
    bg: emailColors.warningBg,
    border: emailColors.warningBorder,
    color: emailColors.warning,
    symbol: '!',
  },
  payment: {
    bg: emailColors.successBg,
    border: emailColors.successBorder,
    color: emailColors.success,
    symbol: '$',
  },
};

export interface HeroIconProps {
  type: NotificationType;
  variant?: HeroVariant;
}

export function HeroIcon({ type, variant }: HeroIconProps) {
  const resolved = variant ?? TYPE_VARIANT[type] ?? 'info';
  const style = VARIANT_STYLE[resolved];

  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 20px' }}>
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              backgroundColor: style.bg,
              border: `1px solid ${style.border}`,
            }}
          >
            <div
              style={{
                fontSize: resolved === 'success' ? 34 : 30,
                lineHeight: '72px',
                textAlign: 'center',
                color: style.color,
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              {style.symbol}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
