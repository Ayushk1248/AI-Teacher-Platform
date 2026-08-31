alter table public.lesson_progress
  add column if not exists current_section text not null default 'teaching' check (current_section in ('teaching', 'question', 'answering', 'evaluating', 'reexplaining', 'continuing')),
  add column if not exists paused boolean not null default false,
  add column if not exists progress_state jsonb not null default '{}'::jsonb;

create index if not exists idx_lesson_progress_user_status
  on public.lesson_progress (user_id, status);

create index if not exists idx_lesson_progress_updated_at
  on public.lesson_progress (updated_at desc);
