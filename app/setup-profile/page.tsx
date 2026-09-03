'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { getCurrentUser, updatePassword, updateUserProfile, isNewUser, getLinkedIdentities } from '@/lib/auth/supabase-auth'

export default function SetupProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [linkedProviders, setLinkedProviders] = useState<string[]>([])

  useEffect(() => {
    checkAndSetup()
  }, [])

  async function checkAndSetup() {
    try {
      const { isNew, error: newUserError } = await isNewUser()

      if (newUserError) {
        setError('Unable to verify your account. Please try logging in again.')
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      if (!isNew) {
        // User already has a profile
        const { identities, error: identError } = await getLinkedIdentities()
        if (!identError && identities) {
          const providers = identities.map((id) => id.provider)
          setLinkedProviders(providers)
          setInfo(
            `Your account is already linked with: ${providers.join(', ')}. Your profile was automatically restored.`
          )
        }

        // Redirect to dashboard after 2 seconds
        setTimeout(() => router.push('/dashboard'), 2000)
        return
      }

      // Get current user info for display
      const { data, error: userError } = await getCurrentUser()
      if (userError || !data?.user) {
        setError('Session expired. Please log in again.')
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      // Get linked identities to show which providers are connected
      const { identities } = await getLinkedIdentities()
      if (identities) {
        const providers = identities.map((id) => id.provider)
        setLinkedProviders(providers)
        if (providers.length > 1) {
          setInfo(
            `Your account is linked with: ${providers.join(', ')}. You can use any of these to sign in.`
          )
        }
      }

      setLoading(false)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setTimeout(() => router.push('/login'), 2000)
    }
  }

  async function handleSetupProfile() {
    setError('')

    if (!username.trim()) {
      setError('Please enter a username.')
      return
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    if (!password) {
      setError('Please create a password so you can also sign in with your email.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)

    try {
      const { error: passwordError } = await updatePassword(password)
      if (passwordError) {
        throw passwordError
      }

      const { error: profileError } = await updateUserProfile({
        username: username.trim(),
        full_name: username.trim(),
      })

      if (profileError) {
        throw profileError
      }

      // Profile updated successfully, redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      const messageText = err instanceof Error ? err.message : 'Failed to save profile. Please try again.'
      setError(messageText)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0b0f1a]">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-cyan-400" />
          <p className="text-sm text-white/60">Setting up your profile...</p>
        </div>
      </div>
    )
  }

  if (info) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#0b0f1a] p-4">
        <div className="text-center">
          <div className="mb-4 text-lg text-emerald-400">✓</div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 max-w-sm mb-4">
            {info}
          </div>
          <p className="text-xs text-white/40">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#0b0f1a] p-4">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-blue-600/10 blur-[80px]" />
        <div className="absolute bottom-[15%] right-[8%] h-60 w-60 rounded-full bg-cyan-500/[.08] blur-[70px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>

        <h1 className="mb-2 text-center text-xl font-semibold text-white">Complete your profile</h1>
        <p className="mb-7 text-center text-sm text-white/40">Set up your username to get started</p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {linkedProviders.length > 0 && (
          <p className="mb-4 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2.5 text-center text-xs text-cyan-300">
            Connected with: {linkedProviders.join(', ')}
          </p>
        )}

        <div className="rounded-xl border border-white/10 bg-slate-950/20 p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-white/60">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Choose a username"
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/60">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-white/60">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                required
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/50"
              />
            </div>

            <button
              type="button"
              onClick={handleSetupProfile}
              disabled={saving}
              className="mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue to Dashboard'}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-white/35">You can change these settings later</p>
      </div>
    </div>
  )
}
