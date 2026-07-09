import * as React from 'react';
import type { NotificationType } from '../types';

const TYPE_EMOJI: Record<NotificationType, string> = {
  message: '💬',
  project_request: '📋',
  quotation: '💰',
  quotation_accepted: '✅',
  escrow_funded: '🔒',
  milestone_proposed: '📝',
  milestone_funded: '💳',
  milestone_submitted: '📦',
  milestone_approved: '👍',
  project_completed: '🎉',
  review_received: '⭐',
  dispute_event: '🛡️',
  refund_event: '💸',
  service_purchased: '🛒',
  asset_purchased: '🤖',
  support_ticket: '🎫',
  open_project_proposal: '📨',
  open_project_hired: '🤝',
  open_project_proposal_rejected: '📭',
  open_project_question: '❓',
};

export interface BaseTemplateProps {
  type: NotificationType;
  heading: string;
  projectName?: string;
  projectStatus?: string;
  dateTime: string;
  content: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel?: string;
  secondaryCtaHref?: string;
}

export function BaseTemplate({
  type,
  heading,
  projectName,
  projectStatus,
  dateTime,
  content,
  primaryCtaLabel,
  primaryCtaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
}: BaseTemplateProps) {
  const emoji = TYPE_EMOJI[type] ?? '🔔';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif' }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ backgroundColor: '#f8fafc', padding: '32px 16px' }}>
          <tbody>
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ maxWidth: 560, backgroundColor: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(15, 23, 42, 0.06)', overflow: 'hidden' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '28px 32px 20px', borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.12em', color: '#0f172a' }}>ZELANCE</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 4, letterSpacing: '0.06em' }}>
                          The AI Talent Marketplace
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '32px 32px 8px', textAlign: 'center' }}>
                        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16 }}>{emoji}</div>
                        <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                          {heading}
                        </h1>
                        {(projectName || projectStatus) && (
                          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ margin: '0 0 16px', backgroundColor: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                                  {projectName && (
                                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>Project:</span>{' '}
                                      <strong>{projectName}</strong>
                                    </div>
                                  )}
                                  {projectStatus && (
                                    <div style={{ fontSize: 13, color: '#334155', marginBottom: 4 }}>
                                      <span style={{ color: '#64748b', fontWeight: 600 }}>Status:</span>{' '}
                                      <strong>{projectStatus}</strong>
                                    </div>
                                  )}
                                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{dateTime}</div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                        <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.6, color: '#475569', textAlign: 'left' }}>
                          {content}
                        </p>
                        <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: '0 auto 12px' }}>
                          <tbody>
                            <tr>
                              <td style={{ borderRadius: 12, backgroundColor: '#2563eb' }}>
                                <a
                                  href={primaryCtaHref}
                                  style={{ display: 'inline-block', padding: '14px 28px', fontSize: 13, fontWeight: 800, color: '#ffffff', textDecoration: 'none', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                                >
                                  {primaryCtaLabel}
                                </a>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                        {secondaryCtaLabel && secondaryCtaHref && (
                          <a href={secondaryCtaHref} style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: '#2563eb', textDecoration: 'none', marginBottom: 8 }}>
                            {secondaryCtaLabel} →
                          </a>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '24px 32px 28px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafafa' }}>
                        <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.5, color: '#94a3b8', textAlign: 'center' }}>
                          You&apos;re receiving this because you have a Zelance account linked to this activity.
                        </p>
                        <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                          Questions? <a href="mailto:support@zelance.com" style={{ color: '#64748b' }}>support@zelance.com</a>
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1', textAlign: 'center' }}>
                          <a href={`${appUrl}/buyer/settings`} style={{ color: '#94a3b8', textDecoration: 'none' }}>Manage preferences</a>
                          {' · '}
                          <a href={`${appUrl}/privacy`} style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy</a>
                          {' · '}
                          <a href={`${appUrl}/terms`} style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms</a>
                        </p>
                      </td>
                    </tr>
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
