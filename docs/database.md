# Database

The app uses **Supabase (PostgreSQL)** with Row-Level Security (RLS) enabled on every table. All migrations live in `supabase/migrations/` and must be run manually in the Supabase SQL Editor.

## Migration files

| File | What it does |
|---|---|
| `20260831_create_application_schema.sql` | Creates all core tables, RLS policies, indexes, triggers, and seeds the demo course |
| `20260831_lesson_progress_persistence.sql` | Adds `current_section`, `paused`, and `progress_state` columns to `lesson_progress` |
| `20260831_assessment_results.sql` | Creates the `assessment_results` table |
| `20260831_materials_storage.sql` | Fixes the `materials` table FK, adds `file_size`, creates the Storage bucket, sets storage RLS |

Run them **in order**, top to bottom.

---

## Tables

### `profiles`
One row per Supabase auth user. Created automatically by the `handle_new_user` trigger.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users(id)` |
| `username` | text unique | Set during sign-up or `/setup-profile` |
| `display_name` | text | Defaults to the email prefix |
| `email` | text unique | |
| `created_at` | timestamptz | |

RLS: users can only select/update/insert their own row (`auth.uid() = id`).

---

### `courses`
A course is a named container for one or more lessons.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text | |
| `description` | text | |
| `is_default` | boolean | `true` for the built-in "AI Teacher Demo" course |
| `created_by` | uuid | FK → `profiles(id)`, null for default courses |
| `created_at` | timestamptz | |

RLS: a user can see a course if it is `is_default = true`, they created it, or they are enrolled via `user_courses`.

---

### `lessons`
Individual lessons belonging to a course.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `course_id` | uuid FK | → `courses(id)` |
| `title` | text | Must be unique within a course (`course_id`, `order_index` unique constraint) |
| `description` | text | |
| `order_index` | integer | Display order within the course |
| `content` | jsonb | Stores summary, objective, keyPoints as JSON |
| `is_default` | boolean | `true` for built-in lessons |
| `created_by` | uuid FK | → `profiles(id)` |
| `created_at` | timestamptz | |

The two demo lessons ("Introduction to Neural Networks", "How Neural Networks Learn") have `is_default = true` and are seeded by the migration.

---

### `user_courses`
Enrollment join table — which users are enrolled in which courses.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | → `profiles(id)` |
| `course_id` | uuid FK | → `courses(id)` |
| `created_at` | timestamptz | |

Unique constraint: `(user_id, course_id)`. Every new user is automatically enrolled in the default demo course by the `handle_new_user` trigger.

---

### `lesson_progress`
Tracks each user's progress through each lesson. One row per `(user_id, lesson_id)` pair.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | → `profiles(id)` |
| `lesson_id` | uuid FK | → `lessons(id)` |
| `status` | text | `'not_started'` \| `'in_progress'` \| `'completed'` |
| `progress_percentage` | numeric(5,2) | 0–100 |
| `completed_at` | timestamptz | Set when status becomes `'completed'` |
| `updated_at` | timestamptz | |
| `current_section` | text | Classroom phase: `'teaching'` \| `'question'` \| `'answering'` \| `'evaluating'` \| `'reexplaining'` \| `'continuing'` |
| `paused` | boolean | Whether the lesson is currently paused |
| `progress_state` | jsonb | Full snapshot of classroom state for resume |

The classroom page calls `lesson_progress.upsert()` on every phase change so the student can resume exactly where they left off.

---

### `assessments`
Stores the top-level result of a completed assessment. One row per `(user_id, lesson_id)`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | → `profiles(id)` |
| `lesson_id` | uuid FK | → `lessons(id)` |
| `score` | numeric(5,2) | 0–100 |
| `created_at` | timestamptz | |

---

### `assessment_questions`
Individual question/answer records linked to an assessment.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `assessment_id` | uuid FK | → `assessments(id)` |
| `question` | text | |
| `question_type` | text | |
| `correct_answer` | text | |
| `student_answer` | text | |
| `is_correct` | boolean | |

---

### `assessment_results`
A denormalised table used by the app for the post-lesson assessment flow. One row per `(user_id, lesson_key)`, upserted on each new attempt.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | → `auth.users(id)` |
| `lesson_id` | uuid FK | → `lessons(id)`, nullable |
| `lesson_key` | text | Engine lesson ID, e.g. `'ai-teacher-demo-lesson-1'` |
| `score` | integer | 0–100 |
| `correct` | integer | Number of correct answers |
| `total` | integer | Total questions |
| `time_spent` | text | Human-readable, e.g. `'2m 14s'` |
| `answers` | jsonb | Array of per-question answer records |
| `strong` | jsonb | Array of `{ area, mastery }` for strong topics |
| `weak` | jsonb | Array of `{ area, mastery }` for weak topics |
| `recommendations` | jsonb | Array of recommendation strings |
| `created_at` | timestamptz | |

Unique index on `(user_id, lesson_key)` — latest attempt overwrites previous.

---

### `learning_reports`
Exists in the schema but is not currently written to by the app. The `assessment_results` table is used instead for the learning report display.

---

### `materials`
Metadata for user-uploaded files. Actual file bytes live in Supabase Storage.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | → `auth.users(id)` |
| `name` | text | Original filename |
| `file_type` | text | `'PDF'` \| `'DOCX'` \| `'PPTX'` \| `'TXT'` \| `'Markdown'` |
| `file_size` | bigint | Bytes |
| `storage_path` | text | Path inside the `materials` bucket: `{user_id}/{uuid}_{filename}` |
| `created_at` | timestamptz | |

---

## Supabase Storage

One bucket: **`materials`** (private, not public).

Storage path convention: `{user_id}/{uuid}_{original_filename}`

Storage RLS policies ensure a user can only upload, read, update, and delete objects where the first folder component matches their `auth.uid()`.

Signed URLs (1-hour expiry) are generated client-side via `supabase.storage.from('materials').createSignedUrl()` when the user clicks "Open" on a material.

---

## Postgres functions and triggers

### `ensure_default_demo_course()`
Creates the "AI Teacher Demo" course and its two lessons if they don't already exist. Idempotent.

### `handle_new_user()`
Trigger function that fires `AFTER INSERT ON auth.users`. It:
1. Upserts a `profiles` row.
2. Calls `ensure_default_demo_course()`.
3. Enrolls the user in the demo course via `user_courses`.
4. Creates `lesson_progress` rows (`not_started`) for each demo lesson.

---

## Row-level security summary

Every table has RLS enabled. The general pattern across all tables is:
- **SELECT**: `user_id = auth.uid()`
- **INSERT**: `user_id = auth.uid()` (checked via `with check`)
- **UPDATE**: `user_id = auth.uid()`
- **DELETE**: `user_id = auth.uid()`

Courses and lessons have slightly broader select policies to allow all users to see `is_default = true` content.

No table is readable by other users. There is no admin role or service-role bypass in application code (the service role key is only used optionally for auto-creating the storage bucket).
