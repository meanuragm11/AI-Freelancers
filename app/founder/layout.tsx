import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import FounderShell from '@/components/founder/FounderShell';

import { generateNoIndexMetadata } from '@/lib/seo/metadata';

export const metadata = generateNoIndexMetadata(
  'Founder Command Center',
  'Internal Zelance founder administration and operations dashboard.',
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function FounderLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?redirect=/founder');
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-10 shadow-xl text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3">
            Access Denied
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">
            Founder Command Center
          </h1>
          <p className="text-sm font-medium text-slate-500 mb-8">
            Your account does not have founder admin privileges. Contact platform operations if
            you believe this is an error.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center bg-slate-900 hover:bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <FounderShell actorName={profile.full_name || 'Founder'} actorEmail={user.email ?? ''}>
      {children}
    </FounderShell>
  );
}
