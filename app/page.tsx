import LandingPage from '@/components/homepage/LandingPage';
import JsonLd from '@/components/seo/JsonLd';
import { homePageMetadata, pageSeo } from '@/lib/seo/pages';
import { generateWebPageSchema } from '@/lib/seo/schema';

export const metadata = homePageMetadata;

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={generateWebPageSchema({
          title: pageSeo.home.title,
          description: pageSeo.home.description,
          path: pageSeo.home.path,
        })}
      />
      <LandingPage />
    </>
  );
}
