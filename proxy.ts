import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isVerifiedBuilder, showsBuyerNav } from '@/lib/accountMode';
import { isStaleAuthSessionError } from '@/lib/auth/errors';

const BUYER_HOME = '/buyer/dashboard';
const BUILDER_HOME = '/builder/dashboard';

// CHANGED: Exported as default async function proxy
export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isBuyerPath = pathname.startsWith('/buyer');
  const isBuilderPath = pathname.startsWith('/builder');
  const isFounderPath = pathname.startsWith('/founder');
  const isLegacyAdminPath = pathname.startsWith('/admin');

  // Legacy /admin UI removed — send to founder command center (auth enforced in layout).
  if (isLegacyAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = '/founder';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Securely get the user session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user && isStaleAuthSessionError(authError)) {
    await supabase.auth.signOut();
  }

  // If there is no user and they are trying to access /buyer, /builder, or the
  // founder command center, boot them to login
  if (!user && (isBuyerPath || isBuilderPath || isFounderPath)) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Founder admin authorization is enforced in app/founder/layout.tsx (service
  // role) and every /api/founder/* route. Do not duplicate an is_admin lookup
  // here — the anon client cannot reliably read that flag under RLS, which
  // incorrectly sent admins to the homepage.

  if (user && (isBuyerPath || isBuilderPath)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_freelancer')
      .eq('id', user.id)
      .maybeSingle();

    const isBuilderAccount = isVerifiedBuilder(profile);
    const isBuyerAccount = showsBuyerNav(profile);

    const isBuilderOnboardingPath = pathname === BUILDER_HOME;

    if (isBuilderPath && !isBuilderAccount && !isBuilderOnboardingPath) {
      const url = request.nextUrl.clone();
      url.pathname = BUILDER_HOME;
      url.search = '';
      return NextResponse.redirect(url);
    }

    if (isBuyerPath && !isBuyerAccount) {
      const url = request.nextUrl.clone();
      url.pathname = BUILDER_HOME;
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

// Ensure this runs on all paths except static files and images
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};