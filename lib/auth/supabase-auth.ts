import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export type AuthProvider = 'google' | 'github' | 'email'

function getMissingEnvError() {
  return new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment.')
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: null, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
}

export async function signUpWithEmail(email: string, password: string, username: string) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: null, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: username,
        username: username,
      },
    },
  })
  return { data, error }
}

export async function signInWithOAuth(
  provider: 'google' | 'github',
  redirectTo = `${window.location.origin}/auth/callback`
) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: null, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    const message = error.message || 'Authentication failed.'

    if (/unsupported provider|provider is not enabled|not enabled/i.test(message)) {
      return {
        data: null,
        error: new Error(
          `${getIdentityProviderLabel(provider)} OAuth is not enabled for this Supabase project. In the Supabase Dashboard, go to Authentication → Providers, enable ${getIdentityProviderLabel(provider)}, and add the redirect URL ${redirectTo}.`
        ),
      }
    }
  }

  return { data, error }
}

export async function sendPasswordResetEmail(email: string, redirectTo = `${window.location.origin}/reset-password`) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: null, error: getMissingEnvError() }
  }

  const trimmedEmail = email.trim()
  const { data, error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
    redirectTo,
  })

  return { data, error }
}

export async function updatePassword(newPassword: string) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: null, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  return { data, error }
}

export async function completeRecoverySessionFromUrl() {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { error: getMissingEnvError() }
  }

  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const tokenHash = params.get('token_hash')
  const type = params.get('type')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    return { error }
  }

  if (tokenHash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    })
    return { error }
  }

  return { error: null }
}

export async function signOutUser() {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { error: getMissingEnvError() }
  }

  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSupabaseSession() {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: { session: null }, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export async function getCurrentUser() {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: { user: null }, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

export async function getCurrentAuthUserId(): Promise<{ userId: string | null; error: Error | null }> {
  try {
    const { data, error } = await getCurrentUser()

    if (error || !data?.user) {
      return { userId: null, error: error || new Error('No authenticated user found.') }
    }

    return { userId: data.user.id, error: null }
  } catch (err) {
    return {
      userId: null,
      error: err instanceof Error ? err : new Error('Failed to get authenticated user ID.'),
    }
  }
}

export function getIdentityProviderLabel(provider: 'google' | 'github') {
  return provider === 'google' ? 'Google' : 'GitHub'
}

export function getIdentityLinkingErrorMessage(provider: 'google' | 'github', error: any) {
  const message = error?.message || ''

  if (/already.*linked|already.*associated|identity.*exists|provider.*linked/i.test(message)) {
    return `${getIdentityProviderLabel(provider)} is already linked to this account.`
  }

  if (/same email|email.*already|account.*exists|different account/i.test(message)) {
    return `This email is already connected to a different account. Please sign in with that account or use a different email.`
  }

  return `We could not link your ${getIdentityProviderLabel(provider)} account right now. Please try again.`
}

export async function updateUserProfile(updates: { username?: string; full_name?: string; avatar_url?: string }) {
  const supabase = createSupabaseBrowserClient()
  if (!supabase) {
    return { data: null, error: getMissingEnvError() }
  }

  const { data, error } = await supabase.auth.updateUser({
    data: updates,
  })
  return { data, error }
}

export async function isNewUser(): Promise<{ isNew: boolean; error: Error | null }> {
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      return { isNew: false, error: getMissingEnvError() }
    }

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return { isNew: false, error }
    }

    const username = data.user.user_metadata?.username
    return { isNew: !username, error: null }
  } catch (err) {
    return { isNew: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function getLinkedIdentities(): Promise<{
  identities: Array<{ provider: string; id: string }> | null
  error: Error | null
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      return { identities: null, error: getMissingEnvError() }
    }

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return { identities: null, error }
    }

    const identities =
      data.user.identities?.map((id) => ({
        provider: id.provider,
        id: id.id,
      })) || []

    return { identities, error: null }
  } catch (err) {
    return {
      identities: null,
      error: err instanceof Error ? err : new Error('Failed to get linked identities'),
    }
  }
}

export async function linkIdentity(provider: 'google' | 'github'): Promise<{
  data: any
  error: Error | null
  linkingError?: string
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      return { data: null, error: getMissingEnvError(), linkingError: 'Supabase is not configured' }
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      return {
        data: null,
        error: userError || new Error('You must be signed in to link an account.'),
        linkingError: 'Your session expired. Please sign in again and try linking your account.',
      }
    }

    const isAlreadyLinked = (userData.user.identities || []).some((identity) => identity.provider === provider)
    if (isAlreadyLinked) {
      return {
        data: null,
        error: null,
        linkingError: `${getIdentityProviderLabel(provider)} is already linked to this account.`,
      }
    }

    const { data, error } = await supabase.auth.linkIdentity({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?linking=true&provider=${encodeURIComponent(provider)}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      return {
        data: null,
        error,
        linkingError: getIdentityLinkingErrorMessage(provider, error),
      }
    }

    return { data, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during identity linking'
    return {
      data: null,
      error: err instanceof Error ? err : new Error(message),
      linkingError: getIdentityLinkingErrorMessage(provider, { message }),
    }
  }
}

export async function handleOAuthCallback(): Promise<{
  success: boolean
  redirectUrl: string
  error: Error | null
  linkingMessage?: string
}> {
  try {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        redirectUrl: '/login',
        error: getMissingEnvError(),
      }
    }

    // Get the current user after OAuth redirect
    const { data, error: userError } = await supabase.auth.getUser()
    if (userError || !data?.user) {
      return {
        success: false,
        redirectUrl: '/login',
        error: userError || new Error('Failed to get user after OAuth callback'),
      }
    }

    const user = data.user
    const search = new URLSearchParams(window.location.search)
    const provider = search.get('provider') as 'google' | 'github' | null
    const isLinking = search.get('linking') === 'true'

    // Check if this is a new user or existing user.
    // Supabase handles the identity merge when the verified email already belongs to a user,
    // so we keep the internal account ID tied to the authenticated Supabase user.id and not the email text.
    const hasUsername = !!user.user_metadata?.username

    // Determine redirect based on user state
    let redirectUrl = '/dashboard'
    let linkingMessage: string | undefined

    if (!hasUsername) {
      redirectUrl = '/setup-profile'
    }

    if (isLinking && provider) {
      const alreadyLinked = (user.identities || []).some((identity) => identity.provider === provider)
      linkingMessage = alreadyLinked
        ? `${getIdentityProviderLabel(provider)} is now linked to this account.`
        : `We could not link your ${getIdentityProviderLabel(provider)} account. Please try again.`
    }

    return {
      success: true,
      redirectUrl,
      error: null,
      linkingMessage,
    }
  } catch (err) {
    return {
      success: false,
      redirectUrl: '/login',
      error: err instanceof Error ? err : new Error('OAuth callback failed'),
    }
  }
}
