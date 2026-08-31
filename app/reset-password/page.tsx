'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { completeRecoverySessionFromUrl, sendPasswordResetEmail, updatePassword } from '@/lib/auth/supabase-auth'

function CircuitBackground() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <pattern id="circuit" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <line x1="0" y1="20" x2="40" y2="20" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="80" y1="20" x2="120" y2="20" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="0" y1="60" x2="30" y2="60" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="90" y1="60" x2="120" y2="60" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="0" y1="100" x2="50" y2="100" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="70" y1="100" x2="120" y2="100" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="40" y1="0" x2="40" y2="40" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="40" y1="60" x2="40" y2="120" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="80" y1="0" x2="80" y2="20" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="80" y1="60" x2="80" y2="100" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="20" y1="20" x2="20" y2="60" stroke="#7eb8f7" strokeWidth="1" />
          <line x1="100" y1="60" x2="100" y2="100" stroke="#7eb8f7" strokeWidth="1" />
          <circle cx="40" cy="20" r="2.5" fill="#7eb8f7" />
          <circle cx="80" cy="20" r="2.5" fill="#7eb8f7" />
          <circle cx="20" cy="60" r="2.5" fill="#7eb8f7" />
          <circle cx="100" cy="60" r="2.5" fill="#7eb8f7" />
          <circle cx="40" cy="100" r="2.5" fill="#7eb8f7" />
          <circle cx="80" cy="100" r="2.5" fill="#7eb8f7" />
          <circle cx="40" cy="60" r="2.5" fill="#7eb8f7" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  )
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [canSetPassword, setCanSetPassword] = useState(false)

  useEffect(() => {
    const initializeRecovery = async () => {
      const { error } = await completeRecoverySessionFromUrl()
      if (error) {
        setError('This reset link is invalid or has expired.')
        return
      }

      setCanSetPassword(true)
    }

    initializeRecovery()
  }, [])

  async function handleSendResetEmail() {
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)

    try {
      const { error } = await sendPasswordResetEmail(email)

      if (error) {
        throw error
      }

      setSubmitted(true)
      setSuccess('If an account exists for that email, a password reset email has been sent.')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdatePassword() {
    setError('')
    setSuccess('')

    if (!password) {
      setError('Please enter a new password.')
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

    setLoading(true)

    try {
      const { error } = await updatePassword(password)

      if (error) {
        throw error
      }

      setSuccess('Password updated successfully. Redirecting to login...')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#0b0f1a] p-4">
      <CircuitBackground />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[20%] h-72 w-72 rounded-full bg-blue-600/10 blur-[80px]" />
        <div className="absolute bottom-[15%] right-[8%] h-60 w-60 rounded-full bg-cyan-500/[.08] blur-[70px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 px-8 py-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>

        <h1 className="mb-2 text-center text-xl font-semibold text-white">
          {canSetPassword ? 'Set a new password' : 'Reset your password'}
        </h1>
        <p className="mb-7 text-center text-sm text-white/40">
          {canSetPassword ? 'Choose a new password for your account.' : 'Enter the email linked to your account.'}
        </p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-center text-sm text-emerald-300">
            {success}
          </p>
        )}

        {!canSetPassword ? (
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/50"
            />
            <button
              type="button"
              onClick={handleSendResetEmail}
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Sending...' : submitted ? 'Resend email' : 'Send reset email'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/50"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-cyan-400/50"
            />
            <button
              type="button"
              onClick={handleUpdatePassword}
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </div>
        )}

        <div className="mt-5 text-center text-xs">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="text-cyan-400 hover:text-cyan-300 transition"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  )
}
