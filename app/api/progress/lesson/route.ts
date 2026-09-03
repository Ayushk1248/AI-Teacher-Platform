import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const LESSON_KEYS: Record<string, string> = {
  'ai-teacher-demo-lesson-1': 'Introduction to Neural Networks',
  'ai-teacher-demo-lesson-2': 'How Neural Networks Learn',
}

type LessonProgressRequest = {
  lessonKey: string
  status: 'in_progress' | 'completed'
  progressPercentage?: number
  timeSpentSeconds?: number
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as LessonProgressRequest
  const lessonTitle = LESSON_KEYS[body.lessonKey]
  if (!lessonTitle) {
    return NextResponse.json({ error: 'Unknown lesson' }, { status: 400 })
  }

  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id')
    .eq('title', lessonTitle)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  if (lessonError || !lesson) {
    return NextResponse.json({ error: lessonError?.message ?? 'Lesson not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const progress = {
    user_id: user.id,
    lesson_id: lesson.id,
    status: body.status,
    progress_percentage: body.status === 'completed' ? 100 : Math.min(99, Math.max(0, body.progressPercentage ?? 1)),
    completed_at: body.status === 'completed' ? now : null,
    updated_at: now,
  }

  const { error: progressError } = await supabase
    .from('lesson_progress')
    .upsert(progress, { onConflict: 'user_id,lesson_id' })

  if (progressError) {
    return NextResponse.json({ error: progressError.message }, { status: 500 })
  }

  if (body.status === 'completed') {
    const activityDate = now.slice(0, 10)
    const { data: existingActivity } = await supabase
      .from('learning_activity')
      .select('study_minutes')
      .eq('user_id', user.id)
      .eq('activity_date', activityDate)
      .maybeSingle()

    const studyMinutes = (existingActivity?.study_minutes ?? 0) + Math.max(1, Math.ceil((body.timeSpentSeconds ?? 0) / 60))
    const { error: activityError } = await supabase
      .from('learning_activity')
      .upsert(
        { user_id: user.id, activity_date: activityDate, study_minutes: studyMinutes },
        { onConflict: 'user_id,activity_date' },
      )

    if (activityError) {
      console.error('[lesson progress] Activity update failed:', activityError.message)
    }
  }

  return NextResponse.json({ ok: true })
}
