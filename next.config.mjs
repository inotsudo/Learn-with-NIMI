// CyberSource Flex SDK URL is embedded in the capture-context JWT and loaded
// dynamically by PricingPaymentModal / PricingGiftModal. Both production and
// sandbox hosts must be allowed. Google Pay requires pay.google.com.
const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for the theme-injection script (dangerouslySetInnerHTML)
  // and unsafe-eval for dynamic imports. External scripts are locked to known payment hosts.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://flex.cybersource.com https://testflex.cybersource.com https://pay.google.com",
  // Tailwind + Next.js inline styles require unsafe-inline here.
  "style-src 'self' 'unsafe-inline'",
  // Supabase storage images; Google avatar thumbnails; data/blob URIs for canvas/PDF.
  "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  // All API calls from the browser — Supabase client (HTTP + WebSocket realtime).
  // OpenRouter and Resend are server-side only and do not need client-side connect-src.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // CyberSource Flex renders payment fields inside iframes; Google Pay uses its own iframe.
  "frame-src https://flex.cybersource.com https://testflex.cybersource.com https://pay.google.com",
  // Prevent this site from being embedded in any foreign frame (clickjacking protection).
  "frame-ancestors 'none'",
  // Service worker (push notifications, sw.js).
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security headers on all responses
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy",    value: CSP },
          // frame-ancestors in CSP supersedes X-Frame-Options in modern browsers;
          // keep X-Frame-Options for legacy browsers that predate CSP frame-ancestors.
          { key: "X-Frame-Options",           value: "DENY" },
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
