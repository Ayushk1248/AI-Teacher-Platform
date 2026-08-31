-- ============================================================================
-- Materials Storage: bucket, RLS policies, and schema additions
-- ============================================================================

-- 1. Ensure public.materials exists and references auth.users(id) directly
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  file_type text,
  file_size bigint,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Fix foreign key constraint if materials was created referencing profiles(id)
alter table public.materials drop constraint if exists materials_user_id_fkey;

-- Ensure profile row exists for all existing auth users
insert into public.profiles (id, username, display_name, email)
select 
  id, 
  coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1), id::text),
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  coalesce(email, '')
from auth.users
on conflict (id) do nothing;

-- Add FK pointing directly to auth.users(id)
alter table public.materials
  add constraint materials_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;

-- Add file_size column if missing
alter table public.materials
  add column if not exists file_size bigint;

-- Enable RLS on materials table
alter table public.materials enable row level security;

-- Materials table RLS policies
drop policy if exists "Users can view own materials" on public.materials;
drop policy if exists "Users can insert own materials" on public.materials;
drop policy if exists "Users can delete own materials" on public.materials;

create policy "Users can view own materials" on public.materials for select using (auth.uid() = user_id);
create policy "Users can insert own materials" on public.materials for insert with check (auth.uid() = user_id);
create policy "Users can delete own materials" on public.materials for delete using (auth.uid() = user_id);

-- 2. Create the private storage bucket (no public access)
insert into storage.buckets (id, name, public)
values ('materials', 'materials', false)
on conflict (id) do nothing;

-- 3. Storage RLS policies — users can only access their own folder
--    Path convention: materials/{user_id}/{filename}

drop policy if exists "Users can upload to own folder" on storage.objects;
drop policy if exists "Users can view own files" on storage.objects;
drop policy if exists "Users can update own files" on storage.objects;
drop policy if exists "Users can delete own files" on storage.objects;

create policy "Users can upload to own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view own files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);
