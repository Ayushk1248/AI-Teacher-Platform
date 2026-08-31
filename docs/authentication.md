# Authentication

Authentication is handled entirely by **Supabase Auth**. There is no NextAuth or custom JWT logic.

## Sign-in methods

| Method | Entry point | Notes |
|---|---|---|
| Google OAuth | `/login`, `/signup` | Requires Google provider enabled in Supabase |
| GitHub OAuth | `/login`, `/signup` | Requires GitHub provider enabled in Supabase |
| Email + password | `/login`, `/signup` | Supabase `signInWithPassword` / `signUp` |
| Password reset | `/reset-password` | Email link → token exchange → new password |

## Key files

| File | Role |
|---|---|
| `lib/auth/supabase-auth.ts` | All client-side auth operations (sign in, sign up, OAuth, reset, etc.) |
| `lib/supabase/client.ts` | Creates the browser Supabase client used in `'use client'` components |
| `lib/supabase/server.ts` | Creates the server Supabase client used in Server Components and API routes |
| `auth.ts` | Server-side helper: calls `getUser()`, returns `{ user: { id, name, email, image } }` or `null` |
| `middleware.ts` | Runs on every matched request, enforces session requirement on protected routes |

## Session model

Supabase Auth uses **HTTP-only cookies** to store the session. The `@supabase/ssr` package handles reading and writing these cookies in both server and client contexts.

Sessions are refreshed automatically by the server client in `middleware.ts` on every protected request.

## Route protection — `middleware.ts`

The middleware runs on every request that matches `config.matcher`. It:

1. Creates a Supabase server client scoped to the current request's cookies.
2. Calls `supabase.auth.getUser()` to verify the session.
3. If the route is protected and there is no valid user → redirects to `/login?callbackUrl=<path>`.
4. If the user is already logged in and visits `/login` or `/signup` → redirects to `/dashboard`.

Protected path prefixes:
```
/dashboard  /classroom  /lesson-plan  /start
/materials  /progress   /settings     /setup-profile
```

The `/api/*` paths are **not** in the middleware matcher. API routes protect themselves by calling `supabase.auth.getUser()` at the top of each handler and returning `401` if no session is found.

## OAuth callback flow

1. User clicks "Continue with Google" → `signInWithOAuth('google')` in `lib/auth/supabase-auth.ts` is called.
2. Supabase redirects the user to Google.
3. After Google auth, the user is returned to `/auth/callback`.
4. `app/auth/callback/page.tsx` calls `handleOAuthCallback()`.
5. `handleOAuthCallback()` calls `supabase.auth.getUser()` to confirm the session, then checks `user.user_metadata.username`.
   - If no username → redirect to `/setup-profile` (new user).
   - If username exists → redirect to `/dashboard` (returning user).

## New user profile setup — `/setup-profile`

After a first OAuth sign-in, the user lands on `/setup-profile`. This page:
- Checks whether the user already has a `username` in their Supabase metadata.
- If yes (account already set up, e.g. re-linking) → auto-redirects to `/dashboard`.
- If no → prompts for a username (and optionally a password), then calls `updateUserProfile()` to save `username` and `full_name` to `user_metadata`.

The `handle_new_user` Postgres trigger also fires at this point to create a `profiles` row and enrol the user in the default demo course.

## Database trigger — `handle_new_user`

Defined in `supabase/migrations/20260831_create_application_schema.sql`. Runs after every new row in `auth.users` (i.e. every new sign-up). It:

1. Inserts a row into `public.profiles` (upserts on conflict).
2. Ensures the "AI Teacher Demo" default course and its lessons exist.
3. Enrolls the new user in that course via `user_courses`.
4. Creates `lesson_progress` rows for each demo lesson with `status = 'not_started'`.

## Signing out

The sign-out button in the sidebar calls `supabase.auth.signOut()` via `createSupabaseBrowserClient()`. This clears the session cookies and redirects to `/`.

## Password reset flow

1. User visits `/reset-password`, enters their email, clicks "Send reset email".
2. `sendPasswordResetEmail()` calls `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing back to `/reset-password`.
3. User clicks the link in the email.
4. `/reset-password` loads. `completeRecoverySessionFromUrl()` reads the `code` or `token_hash` from the URL and exchanges it for a session.
5. If exchange succeeds, the page shows the "Set new password" form.
6. `updatePassword()` calls `supabase.auth.updateUser({ password })`.

## Identity linking

`lib/auth/supabase-auth.ts` also exports `linkIdentity()` and `getLinkedIdentities()` which use `supabase.auth.linkIdentity()`. These are used in the settings area to connect an additional provider to an existing account.
