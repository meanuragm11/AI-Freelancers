import LegalPage from '@/components/legal/LegalPage';
import { legalPageMetadata } from '@/lib/seo/pages';

export const metadata = legalPageMetadata.cookie;

const LAST_UPDATED = 'July 8, 2026';

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="This policy explains how Zelance uses cookies, local storage, and similar tracking technologies on our platform."
      lastUpdated={LAST_UPDATED}
      sections={[
        {
          id: 'overview',
          title: 'Overview',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>Zelance Cookie Policy</p>
              <p>Effective Date: 08 July 2026</p>
              <p>Last Updated: 08 July 2026</p>
              <p>This Cookie Policy explains how Zelance uses cookies and similar technologies to improve your experience, keep your account secure, and help us understand how our AI freelancing marketplace is used.</p>
              <p>1. What Are Cookies?</p>
              <p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences, maintain secure sessions and improve performance.</p>
            </div>
          ),
        },
        {
          id: 'types-of-cookies',
          title: 'Types of Cookies',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>2. Why We Use Cookies</p>
              <p>Zelance uses cookies to authenticate users, maintain secure sessions, remember preferences, improve platform functionality, analyze website performance and detect fraudulent activity.</p>
              <p>3. Types of Cookies We Use</p>
              <p>We may use essential cookies, functional cookies, analytics cookies and security cookies. Marketing cookies may be introduced in the future with appropriate notice.</p>
              <p>4. Essential Cookies</p>
              <p>These cookies are necessary for account login, authentication, secure navigation and core marketplace functionality. Disabling them may prevent the website from working correctly.</p>
              <p>5. Analytics Cookies</p>
              <p>Analytics cookies help us understand how visitors interact with Zelance so we can improve usability, speed, accessibility and user experience. Analytics data is used in aggregate wherever possible.</p>
              <p>6. Third-Party Services</p>
              <p>Certain trusted third-party services such as authentication providers, payment partners, hosting providers or analytics providers may place cookies necessary to provide their services.</p>
            </div>
          ),
        },
        {
          id: 'managing-cookies',
          title: 'Managing Cookies',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>7. Managing Cookies</p>
              <p>Most browsers allow you to review, delete or block cookies. Disabling certain cookies may affect platform functionality and your user experience.</p>
              <p>8. Do Not Track</p>
              <p>If supported by your browser or applicable law, Zelance will respect available privacy controls where technically feasible.</p>
              <p>9. Policy Updates</p>
              <p>We may update this Cookie Policy as our platform evolves or legal requirements change.</p>
            </div>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          content: (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-8 text-sm leading-7 text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
              <p>10. Contact</p>
              <p>Questions about this Cookie Policy may be sent to support@zelance.co.</p>
              <p>Summary</p>
              <p>Zelance uses cookies to provide a secure AI freelancing marketplace, maintain user sessions, improve website performance, enhance security, support AI services and optimize user experience.</p>
            </div>
          ),
        },
      ]}
    />
  );
}
