export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  title: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    items: [
      {
        id: 'what-is-zelance',
        question: 'What is Zelance?',
        answer:
          'Zelance is an AI-first marketplace where businesses and clients hire AI Builders to deliver custom AI solutions.',
      },
      {
        id: 'who-can-use',
        question: 'Who can use Zelance?',
        answer: 'Anyone can join as a Client, AI Builder, or both.',
      },
      {
        id: 'free-to-join',
        question: 'Is Zelance free to join?',
        answer: 'Yes. Creating an account is free.',
      },
      {
        id: 'how-to-start',
        question: 'How do I start?',
        answer:
          'Create your profile and begin posting projects or publishing AI Solutions.',
      },
      {
        id: 'switch-roles',
        question: 'Can I switch roles later?',
        answer: 'Yes. You can use both Client and AI Builder features.',
      },
    ],
  },
  {
    id: 'ai-solutions',
    title: 'AI Solutions',
    items: [
      {
        id: 'what-are-ai-solutions',
        question: 'What are AI Solutions?',
        answer: 'AI Solutions are ready-to-use AI offerings published by AI Builders.',
      },
      {
        id: 'multiple-solutions',
        question: 'Can I publish multiple AI Solutions?',
        answer: 'Yes. There is no limit.',
      },
      {
        id: 'edit-solution',
        question: 'Can I edit my AI Solution later?',
        answer: 'Yes. You can update it anytime.',
      },
      {
        id: 'purchase-solution',
        question: 'How do clients purchase an AI Solution?',
        answer: 'Clients can purchase directly from its listing page.',
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    items: [
      {
        id: 'post-project',
        question: 'How do I post a project?',
        answer: 'Click "Post Project" and provide your requirements.',
      },
      {
        id: 'who-can-apply',
        question: 'Who can apply to my project?',
        answer: 'AI Builders matching your requirements can submit proposals.',
      },
      {
        id: 'edit-project',
        question: 'Can I edit my project?',
        answer: 'Yes, until work has started.',
      },
      {
        id: 'cancel-project',
        question: 'Can I cancel a project?',
        answer: 'Yes, subject to the project status.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    items: [
      {
        id: 'how-payment-works',
        question: 'How does payment work?',
        answer: 'Payments are securely handled through Zelance.',
      },
      {
        id: 'when-builder-paid',
        question: 'When does the AI Builder get paid?',
        answer: 'After the approved work is completed.',
      },
      {
        id: 'payment-secure',
        question: 'Is my payment secure?',
        answer: 'Yes. Payments are protected until completion.',
      },
      {
        id: 'request-refund',
        question: 'Can I request a refund?',
        answer: 'Yes, if the order qualifies under the refund policy.',
      },
    ],
  },
  {
    id: 'reviews',
    title: 'Reviews',
    items: [
      {
        id: 'when-leave-review',
        question: 'When can I leave a review?',
        answer: 'After a project or AI Solution is completed.',
      },
      {
        id: 'edit-review',
        question: 'Can reviews be edited?',
        answer: 'No. Reviews cannot be edited after submission.',
      },
      {
        id: 'rating-calculated',
        question: 'How is my rating calculated?',
        answer: 'It is based on verified client reviews.',
      },
    ],
  },
  {
    id: 'trust-safety',
    title: 'Trust & Safety',
    items: [
      {
        id: 'builders-verified',
        question: 'Are AI Builders verified?',
        answer: 'Verified AI Builders are clearly marked on their profiles.',
      },
      {
        id: 'report-user',
        question: 'How do I report a user?',
        answer: 'Use the Report option on their profile or project.',
      },
      {
        id: 'dispute',
        question: "What happens if there's a dispute?",
        answer: 'Zelance reviews the case and makes a final decision.',
      },
      {
        id: 'personal-info-safe',
        question: 'Is my personal information safe?',
        answer: 'Yes. Your data is protected using industry-standard security.',
      },
    ],
  },
  {
    id: 'accounts',
    title: 'Accounts',
    items: [
      {
        id: 'change-profile',
        question: 'Can I change my profile later?',
        answer: 'Yes. You can update your profile anytime.',
      },
      {
        id: 'forgot-password',
        question: 'I forgot my password.',
        answer:
          'Use “Forgot password?” on the sign-in page. If you do not see the email, check spam and wait before requesting another link — Supabase’s built-in mailer allows only about 2–4 reset emails per hour per address on the free tier. Projects with custom SMTP are not subject to that limit.',
      },
    ],
  },
  {
    id: 'support',
    title: 'Support',
    items: [
      {
        id: 'contact-support',
        question: 'How do I contact support?',
        answer: 'Visit the Support page and create a ticket.',
      },
      {
        id: 'support-response-time',
        question: 'How long does support take?',
        answer: 'Most requests receive a response within 24–48 hours.',
      },
      {
        id: 'report-bug',
        question: 'Where can I report a bug?',
        answer: 'Submit a support ticket with the issue details.',
      },
    ],
  },
  {
    id: 'platform',
    title: 'Platform',
    items: [
      {
        id: 'what-makes-different',
        question: 'What makes Zelance different?',
        answer: 'Zelance focuses exclusively on AI Builders and AI Solutions.',
      },
      {
        id: 'milestone-work',
        question: 'Does Zelance support milestone-based work?',
        answer: 'Yes. Projects can be completed through milestones.',
      },
      {
        id: 'international-clients',
        question: 'Can I work with international clients?',
        answer: 'Yes. Zelance is available globally.',
      },
      {
        id: 'own-work',
        question: 'Do I own my work?',
        answer: 'Ownership follows the agreement between the client and AI Builder.',
      },
    ],
  },
];

export function getAllFaqItems(): FaqItem[] {
  return FAQ_CATEGORIES.flatMap((category) => category.items);
}
