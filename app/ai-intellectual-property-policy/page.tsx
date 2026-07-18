import LegalPage from '@/components/legal/LegalPage';
import { legalPageMetadata } from '@/lib/seo/pages';

export const metadata = legalPageMetadata.aiIp;

const LAST_UPDATED = 'July 8, 2026';

export default function AIIntellectualPropertyPolicyPage() {
  return (
    <LegalPage
      title="AI & Intellectual Property Policy"
      description="This policy covers ownership, licensing, and usage rights for AI-generated deliverables and marketplace AI Solutions."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>Zelance AI & Intellectual Property Policy</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>This AI & Intellectual Property Policy explains ownership, licensing and responsible use of AI-generated work, digital assets and intellectual property on Zelance.</p>
              <p>1. Purpose</p>
              <p>This policy protects buyers, builders and creators while promoting lawful and ethical use of AI technologies.</p>
            </div>
          ),
        },
        {
          id: 'ownership-rights',
          title: 'Ownership & Rights',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>2. Ownership Before Payment</p>
              <p>Builders retain ownership of their original work until full payment is completed unless otherwise agreed in writing.</p>
              <p>3. Ownership After Payment</p>
              <p>Upon full payment, ownership of the agreed deliverables transfers to the buyer, subject to applicable third-party licenses and law.</p>
              <p>4. Portfolio Rights</p>
              <p>Builders may showcase completed work in portfolios unless the buyer requests confidentiality or both parties agree otherwise.</p>
            </div>
          ),
        },
        {
          id: 'ai-generated-work',
          title: 'AI-Generated Work',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>5. AI-Generated Content</p>
              <p>Users are responsible for prompts, uploaded materials and generated outputs. Zelance does not guarantee originality, copyright eligibility or suitability for a particular purpose.</p>
              <p>6. Commercial Use</p>
              <p>Buyers may commercially use purchased deliverables where permitted by applicable law and any third-party AI model or software license.</p>
              <p>7. Third-Party Content</p>
              <p>Users must have permission to use third-party code, datasets, models, images, fonts, music, trademarks and other protected materials.</p>
              <p>8. Open-Source Software</p>
              <p>Open-source components must comply with their respective licenses. Users are responsible for meeting attribution and distribution requirements.</p>
              <p>9. GitHub & External Integrations</p>
              <p>Where users connect third-party services such as GitHub, they remain responsible for repository ownership, licensing and permissions.</p>
              <p>10. Confidential Information</p>
              <p>Confidential client information, prompts, datasets and business materials must not be disclosed or reused without authorization.</p>
            </div>
          ),
        },
        {
          id: 'marketplace-assets',
          title: 'Marketplace Assets',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>11. Prohibited Conduct</p>
              <p>Do not upload stolen content, copyrighted works without permission, malicious code, unlawful AI models or materials that infringe intellectual property rights.</p>
              <p>12. Takedown Requests</p>
              <p>Rights holders may contact support@zelance.co to report alleged infringement. Zelance may remove or restrict access while investigating.</p>
              <p>13. Policy Enforcement</p>
              <p>Violations may result in content removal, account suspension, termination or legal action where appropriate.</p>
              <p>14. Contact</p>
              <p>Questions regarding intellectual property or AI usage may be sent to support@zelance.co.</p>
              <p>Summary</p>
              <p>AI intellectual property policy, AI copyright, prompt engineering ownership, AI-generated content rights, AI freelancers, AI marketplace, AI services, GitHub projects, digital assets, commercial AI usage, AI licensing.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
