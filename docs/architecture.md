# Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS v4 + tw-animate-css |
| UI primitives | Base UI (`@base-ui/react`) + shadcn conventions |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| File storage | Supabase Storage |
| Analytics | Vercel Analytics (production only) |
| Package manager | pnpm |

## Project layout

```
ai-teacher-platform/
├── app/                    # All Next.js routes
│   ├── (app)/              # Authenticated app shell (sidebar + topbar layout)
│   │   ├── dashboard/
│   │   ├── classroom/
│   │   ├── lesson-plan/
│   │   ├── materials/
│   │   ├── progress/
│   │   │   ├── assessment/
│   │   │   ├── report/
│   │   │   └── path/
│   │   ├── settings/
│   │   └── start/
│   ├── api/                # API route handlers
│   │   ├── auth/           # Auth stub routes
│   │   ├── materials/      # File upload/list/delete
│   │   └── progress/
│   │       ├── assessment/ # Save and fetch assessment results
│   │       └── path/       # Learning path data
│   ├── auth/callback/      # OAuth redirect handler
│   ├── login/              # Login page + post-login success screen
│   ├── signup/             # Sign-up page
│   ├── setup-profile/      # New-user profile setup (OAuth users)
│   ├── reset-password/     # Password reset flow
│   ├── globals.css         # Global styles + Tailwind theme tokens
│   ├── layout.tsx          # Root HTML shell
│   └── page.tsx            # Landing page
├── components/
│   ├── app/                # Components used inside the authenticated app
│   ├── landing/            # Landing page sections
│   └── ui/                 # Primitive UI components (button, card, badge…)
├── lib/
│   ├── auth/               # Client-side Supabase auth helpers
│   ├── supabase/           # Supabase client factories (browser + server)
│   ├── teacher-engine.ts   # MockTeacherEngine and lesson data
│   ├── mock-data.ts        # Static UI data (landing page, ask-teacher thread)
│   ├── format-date.ts      # Relative date formatter
│   └── utils.ts            # cn() utility (clsx + tailwind-merge)
├── supabase/
│   └── migrations/         # SQL migration files (run manually in Supabase)
├── public/                 # Static assets
├── types/                  # (empty — reserved for future shared types)
├── auth.ts                 # Server-side auth helper (wraps Supabase getUser)
├── middleware.ts            # Route protection and auth cookie refresh
├── next.config.mjs
├── tsconfig.json
└── .env.local              # Local secrets (not committed)
```

## Request lifecycle

### Public pages (`/`, `/login`, `/signup`, `/reset-password`)
Browser → Next.js → page renders → done. No auth check.

### Protected app pages (`/dashboard`, `/classroom`, etc.)
1. Browser sends request with Supabase session cookie.
2. `middleware.ts` intercepts, calls `supabase.auth.getUser()`.
3. If no valid session → redirect to `/login?callbackUrl=<path>`.
4. If valid session → request proceeds to the page.
5. Server components call `auth()` (`auth.ts`) to get user data for rendering.

### API routes (`/api/*`)
Each route handler calls `createSupabaseServerClient()` then `supabase.auth.getUser()` directly. Returns 401 if no session. No middleware involvement for `/api/` paths.

### OAuth sign-in flow
1. User clicks "Continue with Google/GitHub" on `/login` or `/signup`.
2. `signInWithOAuth()` (in `lib/auth/supabase-auth.ts`) calls Supabase, which redirects to the provider.
3. Provider redirects back to `/auth/callback`.
4. `handleOAuthCallback()` reads the session, checks if the user has a `username` in their metadata.
5. New user (no username) → redirect to `/setup-profile`.
6. Existing user → redirect to `/dashboard`.

## Key design decisions

**Single Supabase project for auth + DB + storage.** All three use the same project and the same anon key. Row-level security (RLS) on every table ensures users can only read/write their own data.

**Two Supabase client factories.** `lib/supabase/client.ts` creates a browser client (for `'use client'` components), `lib/supabase/server.ts` creates a server client that reads cookies via Next.js `cookies()`. The server client is used in Server Components, Route Handlers, and middleware.

**`auth.ts` at the root.** A thin wrapper around `createSupabaseServerClient().auth.getUser()` that returns a normalised `{ user: { id, name, email, image } }` shape. Server Components import this to get the logged-in user without calling Supabase directly.

**`(app)` route group.** Everything inside `app/(app)/` shares the authenticated layout (`layout.tsx` with sidebar + topbar). Routes outside this group (`/login`, `/signup`, etc.) get no layout wrapper.

**`MockTeacherEngine` in `lib/teacher-engine.ts`.** All lesson content, questions, evaluations, and lesson sequencing live here as static TypeScript objects. There is a `RealTeacherEngine` class stub that throws — it is not wired to anything yet.
