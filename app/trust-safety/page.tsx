import LegalPage from '@/components/legal/LegalPage';
import { createLegalMetadata } from '@/lib/legal/metadata';

export const metadata = createLegalMetadata({
  title: 'Trust & Safety',
  description:
    'Zelance trust and safety practices including fraud prevention, account security, reporting, and platform integrity.',
  path: '/trust-safety',
});

const LAST_UPDATED = 'July 8, 2026';

export default function TrustSafetyPage() {
  return (
    <LegalPage
      title="Trust & Safety"
      description="Learn how Zelance protects users through verification, fraud prevention, reporting tools, and platform safety measures."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>Zelance Trust & Safety</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>Trust & Safety is a core commitment of Zelance. This page explains how we protect buyers, builders, projects, payments and platform integrity while fostering a professional AI freelancing marketplace.</p>
              <p>1. Our Commitment</p>
              <p>We are committed to creating a safe, transparent and professional marketplace for AI services, AI projects and digital assets.</p>
            </div>
          ),
        },
        {
          id: 'account-security',
          title: 'Account Security',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>2. Secure Accounts</p>
              <p>We encourage strong passwords, verified email addresses and secure authentication. Suspicious login activity may trigger additional security checks.</p>
              <p>3. Buyer Protection</p>
              <p>Buyers benefit from transparent project workflows, milestone tracking, secure payment processing, dispute handling and moderation tools where applicable.</p>
              <p>4. Builder Protection</p>
              <p>Builders receive protection through documented project requirements, communication history, milestone workflows and platform moderation against abusive behavior.</p>
              <p>5. Payment Security</p>
              <p>Payments are processed through trusted payment partners. Zelance does not store full payment card details on its own servers.</p>
            </div>
          ),
        },
        {
          id: 'fraud-prevention',
          title: 'Fraud Prevention',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>6. Fraud Prevention</p>
              <p>We monitor for suspicious activity including fake accounts, fraudulent transactions, spam, phishing, payment abuse and marketplace manipulation.</p>
              <p>7. AI Safety</p>
              <p>Users are expected to use AI responsibly. Illegal, deceptive, harmful or rights-infringing AI content is prohibited.</p>
              <p>8. Moderation</p>
              <p>Reported users, projects and content may be reviewed by the Zelance moderation team. Actions may include warnings, content removal, temporary suspension or permanent account termination.</p>
              <p>9. Privacy & Data Protection</p>
              <p>We apply reasonable technical and organizational safeguards to protect user information. Personal information is handled according to our Privacy Policy.</p>
            </div>
          ),
        },
        {
          id: 'reporting',
          title: 'Reporting',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>10. Reporting Concerns</p>
              <p>Users can report fraud, abuse, copyright concerns, security vulnerabilities or policy violations through support@zelance.co.</p>
              <p>11. Responsible Disclosure</p>
              <p>Security researchers are encouraged to report suspected vulnerabilities responsibly so they can be investigated and resolved.</p>
              <p>12. Continuous Improvement</p>
              <p>Trust & Safety practices evolve as Zelance grows. We regularly improve security controls, policies and moderation processes.</p>
              <p>13. Contact</p>
              <p>Questions about Trust & Safety may be sent to support@zelance.co.</p>
              <p>Summary</p>
              <p>Zelance Trust & Safety covers secure AI freelancing, buyer protection, builder protection, escrow security, fraud prevention, AI safety, secure payments, account security, moderation and responsible AI marketplace practices.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
