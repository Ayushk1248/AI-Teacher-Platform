-- Assessment results table
-- Stores one row per user per lesson (upserted on conflict).
-- Run this in your Supabase SQL editor or via `supabase db push`.

create table if not exists public.assessment_results (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  lesson_id       uuid references public.lessons(id) on delete set null,
  lesson_key      text not null,          -- e.g. 'ai-teacher-demo-lesson-1'
  score           integer not null,       -- 0-100 percentage
  correct         integer not null,
  total           integer not null,
  time_spent      text not null default '0s',
  answers         jsonb not null default '[]',
  strong          jsonb not null default '[]',
  weak            jsonb not null default '[]',
  recommendations jsonb not null default '[]',
  created_at      timestamptz not null default now()
);

-- One result per user per lesson (latest wins via upsert)
create unique index if not exists assessment_results_user_lesson_key
  on public.assessment_results (user_id, lesson_key);

-- Row-level security: users can only read/write their own rows
alter table public.assessment_results enable row level security;

create policy "Users can read own assessment results"
  on public.assessment_results for select
  using (auth.uid() = user_id);

create policy "Users can insert own assessment results"
  on public.assessment_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update own assessment results"
  on public.assessment_results for update
  using (auth.uid() = user_id);
