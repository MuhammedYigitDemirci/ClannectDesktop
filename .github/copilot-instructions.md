# Copilot / AI Agent Instructions for Clannect

Short, actionable guidance so an AI coding agent can be productive immediately.

- **Repo layout (big picture):** This is a monorepo with three Next.js apps:
  - `clannect-app` — main user-facing Next 16 app (app router). See [clannect-app/src/app/page.tsx](clannect-app/src/app/page.tsx).
  - `clannect-admin` — admin dashboard (runs on port 3002 by default). See [clannect-admin/package.json](clannect-admin/package.json).
  - `clannect-landing` — marketing/landing site.

- **Key integrations & boundaries:**
  - Supabase is the primary backend (auth, storage, realtime). Look at [clannect-app/src/lib/supabase.ts](clannect-app/src/lib/supabase.ts) and [clannect-admin/src/lib/supabase.ts](clannect-admin/src/lib/supabase.ts).
  - Database schema/migrations live under `clannect-app/supabase/migrations`.
  - Image compression utilities are in [clannect-app/src/lib/imageCompression.ts](clannect-app/src/lib/imageCompression.ts).

- **Environment variables:** Do not hardcode keys. Typical vars used:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only, sensitive)
  - Per-app `.env.local` files are expected in each app root. Admin uses the service role key when present.

- **Run / build / test commands:**
  - From an app folder: `npm install` then `npm run dev` (default port 3000). Admin uses `npm run dev` which runs Next on port 3002 (see [clannect-admin/package.json](clannect-admin/package.json)).
  - Build: `npm run build` then `npm run start`.
  - Lint: `npm run lint`.

- **Framework conventions & patterns to follow (project-specific):**
  - Uses Next 16 App Router. Files and routes are under `src/app` — prefer server components by default.
  - When you need browser behavior or hooks, add `"use client"` at the top of the component file.
  - Server-side Supabase usage: prefer the provided helper functions
    - In `clannect-app` use `createServerSideClient(cookieStore)` from [clannect-app/src/lib/supabase.ts](clannect-app/src/lib/supabase.ts).
    - In `clannect-admin` use the async `createClient()` in [clannect-admin/src/lib/supabase.ts](clannect-admin/src/lib/supabase.ts) which will use the service role key when available.
  - Avoid exposing `SUPABASE_SERVICE_ROLE_KEY` to client bundles — it must only be accessed server-side.

- **Where to implement new API logic / server routes:**
  - Add Next server-only route handlers under `src/app/api/*` using route handlers or server components. Check existing API directories for patterns.

- **Database & migrations:**
  - SQL migrations and setup scripts are authoritative. Use files in `clannect-app/supabase/migrations` and the `supabase/` folder in the workspace.

- **Common pitfalls observed in codebase:**
  - Many components assume Next server-component defaults — adding client-side code without `"use client"` causes runtime errors.
  - Cookie handling for Supabase is centralized; use the helpers to keep session behavior consistent.

- **Quick examples:**
  - Server-side Supabase client (app):
    - import and call `createServerSideClient(cookieStore)` from [clannect-app/src/lib/supabase.ts](clannect-app/src/lib/supabase.ts).
  - Admin server client (server component):
    - call the async `createClient()` exported by [clannect-admin/src/lib/supabase.ts](clannect-admin/src/lib/supabase.ts).

- **When editing files:**
  - Keep changes limited to the relevant app folder unless cross-app changes are intentional.
  - Preserve existing coding style: TypeScript, Tailwind v4, Next conventions.

- **Files to inspect first for context on any change:**
  - [clannect-app/src/lib/supabase.ts](clannect-app/src/lib/supabase.ts)
  - [clannect-admin/src/lib/supabase.ts](clannect-admin/src/lib/supabase.ts)
  - [clannect-app/supabase/migrations](clannect-app/supabase/migrations)
  - [clannect-app/src/app/providers.tsx](clannect-app/src/app/providers.tsx) (app-wide providers)
  - [clannect-app/src/lib/imageCompression.ts](clannect-app/src/lib/imageCompression.ts)

If any section is unclear or you want more examples (e.g., typical PR patterns, preferred tests, or how feature flags are handled), tell me which area to expand and I'll iterate.
