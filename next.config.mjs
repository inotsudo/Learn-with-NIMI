/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers on all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",           value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options",     value: "nosniff" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control",     value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      // Disable caching on all API routes
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },

  // Common redirects
  async redirects() {
    return [
      { source: "/login",     destination: "/loginpage",  permanent: true },
      { source: "/signup",    destination: "/signuppage", permanent: true },
      { source: "/dashboard", destination: "/home",       permanent: true },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    deviceSizes: [375, 640, 768, 1024, 1280, 1920],
    formats: ["image/avif", "image/webp"],
  },

  swcMinify: true,
  reactStrictMode: true,

  experimental: {
    serverActions: {
      allowedOrigins: ["nimipiko.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
