# Setup Guide

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A Supabase project (free tier works)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role | Only for account deletion |

> **Never commit `.env.local`.** It is already in `.gitignore`.

## 3. Run database migrations

Open your Supabase project's SQL Editor and run each migration file in order:

1. `supabase/migrations/20260831_create_application_schema.sql` — core tables, RLS, seed data
2. `supabase/migrations/20260831_lesson_progress_persistence.sql` — adds progress tracking columns
3. `supabase/migrations/20260831_assessment_results.sql` — assessment results table
4. `supabase/migrations/20260831_materials_storage.sql` — materials table + storage bucket

You can copy-paste each file directly into the SQL Editor and click Run.

## 4. Configure OAuth providers

In your Supabase Dashboard under **Authentication → Providers**:

**Google**
- Enable Google provider
- Add your Google Client ID and Secret (from [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials)
- Set the redirect URL to: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

**GitHub** (optional)
- Enable GitHub provider
- Add your GitHub OAuth App credentials (from [github.com/settings/developers](https://github.com/settings/developers))
- Set the callback URL to: `https://<your-supabase-project>.supabase.co/auth/v1/callback`

## 5. Run the development server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## 6. Build for production

```bash
pnpm build
pnpm start
```

## Notes

- `next.config.mjs` has `typescript.ignoreBuildErrors: true` — TypeScript errors won't block the build but will show in the editor.
- `images.unoptimized: true` — Next.js image optimisation is disabled; images are served as-is.
- The `@/*` path alias maps to the project root, so `@/lib/utils` resolves to `./lib/utils.ts`.
