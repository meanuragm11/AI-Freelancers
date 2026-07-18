import ProjectPostWizard from '@/components/open-projects/ProjectPostWizard';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = generateNoIndexMetadata(
  'Post Project',
  'Post an open project and receive proposals from verified AI experts.',
);

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto mb-8 max-w-3xl">
        <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-blue-600">Open Projects</p>
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
          Post an Open Project
        </h1>
        <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-500">
          Describe your AI project. Verified experts will submit competing proposals.
        </p>
      </div>
      <ProjectPostWizard />
    </div>
  );
}
