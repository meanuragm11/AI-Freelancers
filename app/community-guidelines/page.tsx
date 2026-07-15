import LegalPage from '@/components/legal/LegalPage';
import { legalPageMetadata } from '@/lib/seo/pages';

export const metadata = legalPageMetadata.community;

const LAST_UPDATED = 'July 8, 2026';

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      title="Community Guidelines"
      description="These guidelines define expected behavior for buyers, builders, and all members of the Zelance community."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>Zelance Community Guidelines</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>These Community Guidelines explain the standards of behavior expected from everyone using Zelance. Our goal is to create a safe, professional, trustworthy and collaborative AI freelancing marketplace.</p>
              <p>1. Respect Everyone</p>
              <p>Treat buyers, builders and support staff with professionalism, courtesy and respect. Harassment, threats, discrimination and abusive language are not permitted.</p>
            </div>
          ),
        },
        {
          id: 'professional-conduct',
          title: 'Professional Conduct',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>2. Honest Profiles</p>
              <p>Provide accurate profile information, skills, portfolios and experience. Do not impersonate another person or organization.</p>
              <p>3. Authentic Projects</p>
              <p>Buyers must publish genuine projects with clear requirements. Fake jobs, misleading descriptions and spam postings are prohibited.</p>
              <p>4. Original Work</p>
              <p>Builders must deliver original work or work they are legally permitted to provide. Plagiarism, copyright infringement and unauthorized resale are prohibited.</p>
              <p>5. Responsible AI Use</p>
              <p>AI-generated work must comply with applicable laws and third-party licensing. Do not use Zelance to create harmful, deceptive or illegal AI content.</p>
              <p>6. Intellectual Property</p>
              <p>Respect copyrights, trademarks, patents, licenses and confidential information. Only upload content you have the legal right to use.</p>
              <p>7. Communication</p>
              <p>Keep conversations professional and use Zelance messaging whenever possible during active projects.</p>
            </div>
          ),
        },
        {
          id: 'prohibited-behavior',
          title: 'Prohibited Behavior',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>8. Payments</p>
              <p>All project payments must be completed through Zelance. Attempts to bypass platform payments or fees may result in account restrictions.</p>
              <p>9. Fraud Prevention</p>
              <p>Fraud, scams, fake reviews, fake identities, payment manipulation, phishing, malware and deceptive behavior are strictly prohibited.</p>
              <p>10. Confidentiality</p>
              <p>Respect confidential client information. Builders should not publicly disclose confidential project details without permission.</p>
              <p>11. Reporting</p>
              <p>Report suspicious activity, abusive users or policy violations through the platform or by contacting support@zelance.co.</p>
            </div>
          ),
        },
        {
          id: 'enforcement',
          title: 'Enforcement',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>12. Enforcement</p>
              <p>Zelance may warn, suspend, restrict or permanently remove accounts that violate these guidelines or applicable laws.</p>
              <p>13. Policy Updates</p>
              <p>These Community Guidelines may be updated as Zelance evolves.</p>
              <p>14. Contact</p>
              <p>Questions regarding community standards may be sent to support@zelance.co.</p>
              <p>Summary</p>
              <p>Zelance promotes trusted AI freelancers, secure AI projects, ethical AI development, prompt engineering, AI agents, AI automation, copyright compliance, professional collaboration and marketplace safety.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
