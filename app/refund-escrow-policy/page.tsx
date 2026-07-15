import LegalPage from '@/components/legal/LegalPage';
import { legalPageMetadata } from '@/lib/seo/pages';

export const metadata = legalPageMetadata.refund;

const LAST_UPDATED = 'July 8, 2026';

export default function RefundEscrowPolicyPage() {
  return (
    <LegalPage
      title="Refund & Escrow Policy"
      description="This policy explains how escrow funds are held, released, and refunded for projects and purchases on Zelance."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>Zelance Refund & Escrow Policy</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>This Refund & Escrow Policy explains how payments, escrow, milestone releases, cancellations, disputes and refunds are handled on Zelance. It is intended to protect both buyers and builders while ensuring fair outcomes.</p>
              <p>1. Purpose</p>
              <p>Zelance uses secure payment workflows to help create trust between buyers and builders. Certain transactions may be protected through an escrow process until agreed conditions are met.</p>
            </div>
          ),
        },
        {
          id: 'escrow-fund-holding',
          title: 'Escrow Fund Holding',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>2. Escrow Workflow</p>
              <p>When applicable, buyer funds are securely held after payment. Funds are released according to the agreed milestone or completion workflow. Builders should not expect payment before the agreed release conditions are satisfied.</p>
              <p>3. Milestone Payments</p>
              <p>Projects may be divided into milestones. Each milestone should clearly define deliverables, timelines and approval expectations. Buyers are encouraged to review each milestone promptly.</p>
              <p>4. Buyer Responsibilities</p>
              <p>Buyers must provide accurate project requirements, review submitted work within a reasonable period, communicate professionally and avoid requesting work outside the agreed scope without updating the agreement.</p>
              <p>5. Builder Responsibilities</p>
              <p>Builders must deliver original work, meet agreed milestones, communicate delays promptly and avoid misrepresentation of skills or deliverables.</p>
            </div>
          ),
        },
        {
          id: 'refund-eligibility',
          title: 'Refund Eligibility',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>6. Refund Eligibility</p>
              <p>Refunds may be considered when work is not delivered, materially differs from the agreed scope, fraudulent activity is detected, duplicate payments occur or other circumstances justify intervention under Zelance policies.</p>
              <p>7. Non-Eligible Refunds</p>
              <p>Refunds are generally not available because a buyer changes their mind after satisfactory delivery, fails to review work within a reasonable period without justification or requests services outside the agreed scope.</p>
              <p>8. Refund Request Process</p>
              <p>Eligible buyers may submit a refund request through the platform. Zelance may request supporting information from both parties before making a platform decision.</p>
            </div>
          ),
        },
        {
          id: 'disputes',
          title: 'Disputes',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>9. Dispute Resolution</p>
              <p>Where a buyer and builder cannot reach agreement, Zelance may review communications, files, milestones and payment history to facilitate a fair resolution. Platform decisions are based on available evidence and applicable policies.</p>
              <p>10. Chargebacks</p>
              <p>Users should contact Zelance before initiating a chargeback. Fraudulent or abusive chargebacks may result in account restrictions or permanent suspension.</p>
              <p>11. Cancellations</p>
              <p>Projects may be cancelled by mutual agreement or in situations permitted by platform policy. Refund outcomes depend on work already completed and project status.</p>
              <p>12. Platform Fees</p>
              <p>Platform fees, where applicable, are governed by Zelance pricing at the time of checkout. Certain processing fees charged by payment providers may not be recoverable.</p>
              <p>13. Fraud Prevention</p>
              <p>Zelance monitors transactions for suspicious activity and may delay, review or reject transactions to protect buyers, builders and the platform.</p>
              <p>14. Policy Updates</p>
              <p>This policy may be updated from time to time to reflect legal, operational or product changes.</p>
              <p>15. Contact</p>
              <p>Questions regarding refunds, escrow or disputes may be sent to support@zelance.co.</p>
              <p>Summary</p>
              <p>Zelance provides secure escrow payments, milestone-based project funding, buyer protection, builder protection, AI freelance marketplace payment security, refund handling and dispute resolution for AI services and digital projects.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
