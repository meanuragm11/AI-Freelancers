import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-6 text-center">
      <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6">
        <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      </div>
      <h1 className="text-6xl font-black text-slate-900 tracking-tight mb-2">404</h1>
      <h2 className="text-2xl font-black text-slate-700 mb-4">Coordinates Not Found</h2>
      <p className="text-sm font-medium text-slate-500 max-w-md mb-8">
        The workspace, profile, or asset you are looking for has been moved, deleted, or never existed in the global mesh.
      </p>
      <Link href="/" className="bg-slate-900 hover:bg-blue-600 text-white px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md">
        Return to Headquarters
      </Link>
    </div>
  );
}