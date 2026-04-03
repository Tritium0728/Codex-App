'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
      <h1 className="font-display font-bold text-xl mb-1">Welcome back</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Sign in to your studio</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-md px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="you@studio.com"
            required
          />
        </div>
        <div>
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-md px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="••••••••"
            required
          />
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-800/50 rounded-md px-3 py-2 text-red-400 text-sm font-mono">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[var(--accent)] text-black font-mono font-semibold text-sm tracking-wider py-3 rounded-md hover:opacity-85 transition-opacity disabled:opacity-40"
        >
          {loading ? 'Signing in...' : 'Sign In →'}
        </button>
      </form>

      <p className="text-center text-[var(--muted)] text-sm mt-6">
        No account?{' '}
        <Link href="/auth/signup" className="text-[var(--accent)] hover:underline">
          Create one free
        </Link>
      </p>
    </div>
  )
}
