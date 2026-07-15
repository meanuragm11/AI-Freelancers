import ProjectPostWizard from '@/components/open-projects/ProjectPostWizard';
import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = generateNoIndexMetadata(
  'Post a Project',
  'Post an open project and receive proposals from verified AI experts.',
);

export default function NewProjectPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Post an Open Project</h1>
        <p className="text-slate-500 font-medium">Describe your AI project. Verified experts will submit competing proposals.</p>
      </div>
      <ProjectPostWizard />
    </div>
  );
}
