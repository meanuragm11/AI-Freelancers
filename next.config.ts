import type { NextConfig } from 'next';

const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const connectSrc = [
  "'self'",
  'https://*.supabase.co',
  'wss://*.supabase.co',
  'https://checkout.razorpay.com',
  'https://api.razorpay.com',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://www.googletagmanager.com',
  posthogHost,
  'https://us.i.posthog.com',
  'https://eu.i.posthog.com',
];

if (supabaseUrl) {
  try {
    connectSrc.push(new URL(supabaseUrl).origin);
  } catch {
    // ignore invalid URL at build time
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://www.google-analytics.com",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(' ')}`,
  'frame-src https://checkout.razorpay.com https://api.razorpay.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

function buildImageRemotePatterns() {
  const patterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/object/public/**',
    },
    {
      protocol: 'https',
      hostname: '**.supabase.co',
      pathname: '/storage/v1/render/image/public/**',
    },
    {
      protocol: 'https',
      hostname: 'images.unsplash.com',
      pathname: '/**',
    },
  ];

  if (supabaseUrl) {
    try {
      const hostname = new URL(supabaseUrl).hostname;
      patterns.unshift(
        {
          protocol: 'https',
          hostname,
          pathname: '/storage/v1/object/public/**',
        },
        {
          protocol: 'https',
          hostname,
          pathname: '/storage/v1/render/image/public/**',
        },
      );
    } catch {
      // ignore invalid URL at build time
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
