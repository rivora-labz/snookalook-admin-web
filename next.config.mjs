import { withSentryConfig } from "@sentry/nextjs";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rivora-labz/snook-shared"],
  typedRoutes: true,
  // T-NEW WEB §3 WEB.2 — stable Server Action encryption key across deploys. Without
  // this, Next.js auto-generates a per-build key, so action IDs (= hash of action body
  // + key) churn on every deploy; clients with cached chunks then hit UnrecognizedActionError.
  // Pair with Vercel skewProtection (vercel.json). Rotate only on key compromise.
  ...(process.env.SERVER_ACTIONS_ENCRYPTION_KEY
    ? { experimental: { serverActions: { encryptionKey: process.env.SERVER_ACTIONS_ENCRYPTION_KEY } } }
    : {}),
  // Iter-4 §C — security headers PROMOTED 2026-05-31 (founder pen D3). CSP/HSTS/clickjack live in prod.
  // audit-r1: CSP was claimed live (dc62bfd comment) but was never added; added here.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://api.snookalook.com https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: "snookalook-admin-web",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});
