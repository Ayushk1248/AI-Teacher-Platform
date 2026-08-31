import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// Maps lesson DB titles to the engine lesson key used in the classroom URL.
// When custom lessons are created they will have no key (null) — the UI
// will show the lesson but link generically to /classroom.
const TITLE_TO_ENGINE_KEY: Record<string, string> = {
  'Introduction to Neural Networks': 'ai-teacher-demo-lesson-1',
  'How Neural Networks Learn':        'ai-teacher-demo-lesson-2',
}

export type PathLesson = {
  id: string
  title: string
  description: string | null
  orderIndex: number
  status: 'not_started' | 'in_progress' | 'completed'
  progressPct: number
  engineKey: string | null  // null for custom lessons not yet wired to the engine
  completedAt: string | null
}

export type PathCourse = {
  id: string
  title: string
  description: string | null
  isDefault: boolean
  lessons: PathLesson[]
}

export type PathResponse = {
  courses: PathCourse[]
  totals: {
    lessons: number
    completed: number
    inProgress: number
    notStarted: number
  }
}

export async function GET() {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all courses the user is enrolled in (including default ones)
  // joined with their lessons and that user's progress on each lesson.
  const { data: rows, error } = await supabase
    .from('user_courses')
    .select(`
      course_id,
      courses (
        id,
        title,
        description,
        is_default,
        lessons (
          id,
          title,
          description,
          order_index,
          lesson_progress (
            status,
            progress_percentage,
            completed_at
          )
        )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[progress/path GET]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const courses: PathCourse[] = (rows ?? []).flatMap((row) => {
    const course = row.courses as unknown as {
      id: string
      title: string
      description: string | null
      is_default: boolean
      lessons: Array<{
        id: string
        title: string
        description: string | null
        order_index: number
        lesson_progress: Array<{
          status: string
          progress_percentage: number
          completed_at: string | null
        }>
      }>
    }

    if (!course) return []

    const lessons: PathLesson[] = (course.lessons ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map((lesson) => {
        // lesson_progress is filtered by RLS to the current user
        const progress = lesson.lesson_progress?.[0]
        const status = (progress?.status ?? 'not_started') as PathLesson['status']

        return {
          id:            lesson.id,
          title:         lesson.title,
          description:   lesson.description,
          orderIndex:    lesson.order_index,
          status,
          progressPct:   progress?.progress_percentage ?? 0,
          engineKey:     TITLE_TO_ENGINE_KEY[lesson.title] ?? null,
          completedAt:   progress?.completed_at ?? null,
        }
      })

    return [{
      id:          course.id,
      title:       course.title,
      description: course.description,
      isDefault:   course.is_default,
      lessons,
    }]
  })

  // Totals across all courses
  const allLessons = courses.flatMap((c) => c.lessons)
  const totals = {
    lessons:    allLessons.length,
    completed:  allLessons.filter((l) => l.status === 'completed').length,
    inProgress: allLessons.filter((l) => l.status === 'in_progress').length,
    notStarted: allLessons.filter((l) => l.status === 'not_started').length,
  }

  return NextResponse.json({ courses, totals } satisfies PathResponse)
}
