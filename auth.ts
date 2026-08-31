import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function auth() {
  const supabase = await createSupabaseServerClient()

  if (!supabase) {
    return null
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return {
    user: {
      id: user.id,
      name:
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'User',
      email: user.email || '',
      image: user.user_metadata?.avatar_url || undefined,
    },
  }
}
