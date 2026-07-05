/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Whitelists your Supabase storage for real user avatars
      }
    ],
  },
};

export default nextConfig;