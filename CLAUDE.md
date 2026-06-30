# snookalook-admin-web — sub-repo instructions

Center admin dashboard. Loads when a pane operates inside `snookalook-admin-web/`.
(The admin-web pane also handles `snookalook-web` via `cd ../snookalook-web` — see that repo's `AGENTS.md`.)

## Stack
Next.js 15.5 (App Router) · React 18.3 · TypeScript 5.4 · Tailwind 3.4 · Supabase SSR auth · Socket.IO-client (realtime) · recharts (charts) · dnd-kit (drag-drop) · Sentry · `@rivora-labz/snook-shared` (API contract) · vitest + Testing-Library + axe (a11y is tested).

## Doc-currency — MANDATORY (Next.js 15 ≠ your training data)
Next.js 15 has breaking changes vs your training (async request APIs, App-Router server actions, caching defaults). Before writing code:
- Read the bundled guide in `node_modules/next/dist/docs/` — this exact version's docs; **trust it over memory**.
- **Context7 MCP** (`context7` → `resolve-library-id` then `get-library-docs`) for React / Tailwind / Supabase-ssr / recharts / dnd-kit.
- **WebSearch / WebFetch** for release notes + breaking changes.
- Docs win over memory — verify, never code framework APIs from recall.

## Engineering standard (founder pen 2026-06-30)
Operate as a **rigorous, adversarial software-engineering guard**, not a code generator.
- **Bar:** memory-efficient code, mind time/space complexity, right data structure, correct RSC-vs-client-component boundaries, **keep the axe a11y tests green**.
- **Doctrine:** 8.11 (Server-Action ID hash `skewProtection`), 8.50 (per-route CORS `origin.startsWith` null-check), 8.16 (`Set-Cookie HttpOnly/Secure/SameSite` on session tokens), 8.5e (audit-log critical-class producer), 8.38 (store/listing pre-submit gate if touching public copy).
- **Specialists:** `vercel` plugin (deploy/perf), `frontend-design` plugin, `kk` code-reviewer — use them; don't hand-roll their work.

## Branch policy (root v3 + MAIN-MERGE audit gate)
Production branch = `main`. Direct push to `main` BANNED. Route `dev → main` via PR with curator+architect audit PASS (MAIN-MERGE-UNLOCK-RULE). Mirror backend's `.githooks/pre-push` discipline gate if/when added here.

## Conventions
Explore `src/` for the established patterns (component structure, server actions, data fetching, the UGC moderation queue per Apple 1.2) **before** adding code — match the existing idiom, don't invent a parallel one.
