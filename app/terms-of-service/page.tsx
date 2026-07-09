import LegalPage from '@/components/legal/LegalPage';
import { createLegalMetadata } from '@/lib/legal/metadata';

export const metadata = createLegalMetadata({
  title: 'Terms of Service',
  description:
    'Read the Zelance Terms of Service governing marketplace use, escrow payments, and platform policies for buyers and builders.',
  path: '/terms-of-service',
});

const LAST_UPDATED = 'July 8, 2026';

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms govern your access to and use of the Zelance marketplace, including escrow payments, project workspaces, and community standards."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>Zelance Terms of Service</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>Welcome to Zelance. These Terms of Service ('Terms') govern your access to and use of the Zelance platform, website, applications and related services. By creating an account or using Zelance, you agree to be bound by these Terms.</p>
              <p>1. Eligibility</p>
              <p>Users must be at least 18 years old and legally capable of entering binding contracts. You must provide accurate information and keep your account secure.</p>
              <p>2. About Zelance</p>
              <p>Zelance is an AI-focused freelance marketplace where buyers hire AI builders for AI services, AI assets and project-based work. Zelance provides the platform but is not the employer of builders.</p>
              <p>3. Accounts</p>
              <p>Each user should maintain a single authentic account unless expressly permitted. Users are responsible for all activity under their account and must promptly report unauthorized access.</p>
              <p>4. Marketplace Rules</p>
              <p>Buyers must provide truthful project requirements and pay through Zelance. Builders must deliver original work, communicate professionally, respect deadlines and comply with applicable laws.</p>
              <p>5. Services and Projects</p>
              <p>Buyers may purchase listed services or publish open projects. Builders may submit proposals. Buyers are solely responsible for selecting the builder they wish to hire.</p>
            </div>
          ),
        },
        {
          id: 'marketplace-use',
          title: 'Marketplace Use',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>10. User Content</p>
              <p>Users retain ownership of content they upload. By uploading content, users grant Zelance a limited, non-exclusive license to host, process and display content solely for operating the platform. Zelance never claims ownership of user content.</p>
              <p>11. Acceptable Use</p>
              <p>Users must not upload illegal content, malware, infringing material, spam, hate speech, deceptive projects, fraudulent reviews or attempt to bypass platform payments or security.</p>
              <p>12. Privacy</p>
              <p>Personal information is processed according to the Zelance Privacy Policy.</p>
              <p>13. Suspension and Termination</p>
              <p>Zelance may suspend, restrict or terminate accounts that violate these Terms, applicable law or threaten platform integrity.</p>
            </div>
          ),
        },
        {
          id: 'payments-escrow',
          title: 'Payments & Escrow',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>6. Payments and Escrow</p>
              <p>Payments are processed through approved payment partners. Where escrow is used, funds may be held until agreed milestones are completed or otherwise released under the platform workflow.</p>
              <p>7. Refunds and Disputes</p>
              <p>Refund requests are reviewed according to Zelance policies. Zelance may facilitate dispute resolution but reserves the right to make platform decisions necessary to protect users and the marketplace.</p>
              <p>8. Intellectual Property</p>
              <p>Builders retain ownership of work until full payment unless otherwise agreed. Upon full payment, ownership of the delivered work transfers to the buyer, except where third-party licenses require otherwise. Builders may display completed work in portfolios unless confidentiality has been agreed.</p>
              <p>9. AI Content</p>
              <p>Users are responsible for prompts, uploaded data and generated outputs. Buyers are responsible for ensuring their intended commercial use complies with applicable laws and any third-party AI model license terms.</p>
            </div>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>14. Disclaimers</p>
              <p>Zelance provides the marketplace 'as available'. We do not guarantee uninterrupted availability or guarantee outcomes of projects, business success or earnings.</p>
              <p>15. Limitation of Liability</p>
              <p>To the maximum extent permitted by law, Zelance is not liable for indirect, incidental, special or consequential damages arising from use of the platform.</p>
              <p>16. Indemnity</p>
              <p>Users agree to indemnify Zelance against claims arising from their misuse of the platform, violation of these Terms or infringement of third-party rights.</p>
              <p>17. Governing Law</p>
              <p>These Terms are governed by the laws of India. Courts having appropriate jurisdiction in India shall have exclusive jurisdiction unless applicable law requires otherwise.</p>
              <p>18. Changes</p>
              <p>Zelance may update these Terms from time to time. Continued use after updates constitutes acceptance of the revised Terms.</p>
              <p>19. Contact</p>
              <p>For legal, support or policy questions contact: support@zelance.co</p>
              <p>Summary</p>
              <p>Zelance is an AI freelancing marketplace connecting businesses with AI freelancers for AI development, AI agents, prompt engineering, AI automation, AI image generation, AI video generation, machine learning, data engineering and secure project collaboration.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
