'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="font-display font-bold text-xl mb-2">Check your email</h2>
        <p className="text-[var(--muted)] text-sm leading-relaxed">
          We sent a confirmation link to <span className="text-[var(--text)]">{email}</span>.
          Click it to activate your account and get started.
        </p>
        <p className="text-[var(--muted)] text-xs font-mono mt-6">
          Didn't get it? Check spam or{' '}
          <button onClick={() => setDone(false)} className="text-[var(--accent)] hover:underline">
            try again
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8">
      <h1 className="font-display font-bold text-xl mb-1">Create your studio</h1>
      <p className="text-[var(--muted)] text-sm mb-6">Free forever. No credit card needed.</p>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-md px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Lead Dev"
            required
          />
        </div>
        <div>
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">Email</label>
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
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-md px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="8+ characters"
            minLength={8}
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
          {loading ? 'Creating account...' : 'Create Free Account →'}
        </button>
      </form>

      <p className="text-center text-[var(--muted)] text-xs leading-relaxed mt-4">
        By signing up you agree to our terms. No spam, ever.
      </p>

      <p className="text-center text-[var(--muted)] text-sm mt-4">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[var(--accent)] hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
