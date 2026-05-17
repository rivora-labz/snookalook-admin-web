// Sentry Next.js v10 App-Router client init.
//
// v10 requires this file at the repo root for browser-side Sentry.init to
// run under Turbopack / App Router; the legacy `sentry.client.config.ts`
// pattern is bundled but never executed, which is why admin-web had a
// silent 36h+ Sentry blackout despite the SDK being on the page.
// Mirrors sentry.client.config.ts byte-for-byte so behavior is identical
// to whatever was supposed to be running.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const release =
  process.env.NEXT_PUBLIC_GIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    release,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
