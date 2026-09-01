# Supabase schema

This repository includes the application schema migration at:

- `supabase/migrations/20260831_create_application_schema.sql`

Apply it in Supabase SQL Editor or with the Supabase CLI.

Key design notes:
- `profiles.id` is the authenticated Supabase user id.
- No passwords are stored in custom tables.
- User-owned data is protected via Row Level Security.
- `courses` and `lessons` support creator-owned and default content.
- `user_courses` tracks course enrollment/ownership access.
