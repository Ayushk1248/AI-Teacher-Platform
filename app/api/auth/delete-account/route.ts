import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// ─── POST: permanently delete the authenticated user ──────────────────────────
//
// Deletion order:
// 1. Identify the user via their session cookie (anon key).
// 2. Delete all their files from Supabase Storage.
// 3. Delete the auth.users row via the service-role admin client.
//    This cascades to:
//      profiles → user_courses, lesson_progress, assessments (→ assessment_questions),
//                 learning_reports, materials
//    And directly:
//      assessment_results (references auth.users)
// 4. Return success so the client can redirect to the landing page.
//
// The service-role key is NEVER exposed to the browser — it only lives in
// server-side env vars.

export async function POST() {
  // ── 1. Build an anon-key server client to identify the caller ──
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase is not configured' }, { status: 503 })
  }

  if (!serviceRoleKey) {
    console.error('[delete-account] SUPABASE_SERVICE_ROLE_KEY is missing from environment')
    return NextResponse.json(
      { error: 'Account deletion is not available. Contact support.' },
      { status: 503 },
    )
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Might not be able to set cookies in some contexts
        }
      },
    },
  })

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = user.id

  // ── 2. Delete all the user's files from Storage ──
  try {
    const { data: files } = await supabase.storage
      .from('materials')
      .list(userId, { limit: 1000 })

    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`)
      await supabase.storage.from('materials').remove(paths)
    }
  } catch (err) {
    // Log but continue — we still want to delete the user even if
    // storage cleanup has issues (orphaned files are harmless).
    console.error('[delete-account] Storage cleanup error:', err)
  }

  // ── 3. Delete the auth user with the service-role (admin) client ──
  //    This cascades to all application tables via FK constraints.
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

  if (deleteError) {
    console.error('[delete-account] Admin deleteUser error:', deleteError.message)
    return NextResponse.json(
      { error: 'Could not delete account. Please try again or contact support.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
