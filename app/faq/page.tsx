import FaqPage from '@/components/faq/FaqPage';
import JsonLd from '@/components/seo/JsonLd';
import { getAllFaqItems } from '@/lib/faq/content';
import { faqPageMetadata } from '@/lib/seo/pages';
import { generateFaqSchema } from '@/lib/seo/schema';

export const metadata = faqPageMetadata;

export default function FaqRoutePage() {
  const faqItems = getAllFaqItems();

  return (
    <>
      <JsonLd
        data={generateFaqSchema(
          faqItems.map((item) => ({
            question: item.question,
            answer: item.answer,
          }))
        )}
      />
      <FaqPage />
    </>
  );
}
