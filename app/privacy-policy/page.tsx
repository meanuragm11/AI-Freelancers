import LegalPage from '@/components/legal/LegalPage';
import { createLegalMetadata } from '@/lib/legal/metadata';

export const metadata = createLegalMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how Zelance collects, uses, and protects your personal information across our AI talent marketplace and workspace.',
  path: '/privacy-policy',
});

const LAST_UPDATED = 'July 8, 2026';

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy describes how Zelance collects, uses, stores, and protects information when you use our marketplace and collaboration tools."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p># Zelance Privacy Policy</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>This Privacy Policy explains how Zelance collects, uses, stores, shares and protects your personal information when you use our AI freelancing marketplace. By using Zelance, you agree to this Privacy Policy.</p>
            </div>
          ),
        },
        {
          id: 'information-we-collect',
          title: 'Information We Collect',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>## 1. Information We Collect</p>
              <p>We may collect account information, profile details, email address, authentication information, portfolio content, project details, uploaded files, communications, payment metadata, device information, IP address, browser information, cookies and analytics data.</p>
            </div>
          ),
        },
        {
          id: 'how-we-use-data',
          title: 'How We Use Data',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>## 2. How We Use Your Information</p>
              <p>We use your information to operate the platform, authenticate users, process payments, provide customer support, improve services, detect fraud, send transactional notifications, comply with legal obligations and enhance platform security.</p>
              <p>## 3. Google Sign-In</p>
              <p>If you sign in using Google, Zelance receives only the information you authorize Google to share. Your Google password is never accessible to Zelance.</p>
              <p>## 4. Payments</p>
              <p>Payments are processed by trusted payment providers. Zelance does not store complete debit or credit card information on its own servers.</p>
              <p>## 5. AI Projects and Uploaded Content</p>
              <p>Project descriptions, prompts, portfolios and uploaded files are processed solely for providing marketplace services. Zelance does not claim ownership of user content.</p>
              <p>## 6. Cookies and Analytics</p>
              <p>We use cookies and similar technologies to maintain sessions, remember preferences, improve performance and understand how the platform is used. Analytics may be used to improve user experience.</p>
              <p>## 7. Information Sharing</p>
              <p>We may share information with payment providers, hosting providers, email providers, analytics providers, legal authorities when required by law, or during business restructuring. Zelance does not sell personal information.</p>
              <p>## 8. Data Security</p>
              <p>We use reasonable technical and organizational measures including encrypted connections, access controls, authentication mechanisms and database security to protect user information.</p>
              <p>## 9. Data Retention</p>
              <p>We retain information only for as long as necessary to provide services, comply with legal obligations, resolve disputes and enforce our agreements.</p>
              <p>## 10. Your Rights</p>
              <p>You may request access, correction or deletion of eligible personal information subject to applicable law. Certain information may be retained where legally required.</p>
              <p>## 11. International Users</p>
              <p>As Zelance expands internationally, information may be processed in jurisdictions where our infrastructure or service providers operate while maintaining appropriate safeguards.</p>
              <p>## 12. Children's Privacy</p>
              <p>Zelance is intended only for individuals aged 18 years or older.</p>
              <p>## 13. Policy Updates</p>
              <p>We may update this Privacy Policy from time to time. Material updates will be communicated through appropriate platform channels.</p>
            </div>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>## 14. Contact</p>
              <p>For privacy or legal questions, contact support@zelance.co.</p>
              <p>## Summary</p>
              <p>Zelance is committed to protecting the privacy of AI freelancers, AI developers, AI consultants, buyers and businesses using our AI marketplace. This policy covers AI services, AI projects, digital assets, secure payments, data protection and privacy practices.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
