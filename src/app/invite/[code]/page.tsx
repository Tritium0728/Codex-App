'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { joinByInviteCode } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'

export default function InvitePage({ params }: { params: { code: string } }) {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'joining' | 'error' | 'done'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // Save invite code and redirect to login
        sessionStorage.setItem('pending_invite', params.code)
        router.push(`/auth/signup?invite=${params.code}`)
        return
      }
      setStatus('joining')
      try {
        const projectId = await joinByInviteCode(params.code)
        setStatus('done')
        setTimeout(() => router.push(`/dashboard/${projectId}`), 1500)
      } catch (e: any) {
        setError(e.message)
        setStatus('error')
      }
    }
    init()
  }, [params.code, router])

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center max-w-sm w-full">
        {status === 'loading' && (
          <>
            <div className="text-3xl mb-4">🔍</div>
            <div className="font-display font-bold text-lg">Checking invite...</div>
          </>
        )}
        {status === 'joining' && (
          <>
            <div className="text-3xl mb-4">🚀</div>
            <div className="font-display font-bold text-lg mb-2">Joining project...</div>
            <div className="text-[var(--muted)] text-sm">One moment</div>
          </>
        )}
        {status === 'done' && (
          <>
            <div className="text-3xl mb-4">✅</div>
            <div className="font-display font-bold text-lg mb-2 text-[var(--accent)]">Joined!</div>
            <div className="text-[var(--muted)] text-sm">Taking you to the project...</div>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-3xl mb-4">⚠️</div>
            <div className="font-display font-bold text-lg mb-2">Couldn't join</div>
            <div className="text-[var(--muted)] text-sm mb-4">{error}</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-[var(--accent)] text-black font-mono font-semibold text-sm px-6 py-2 rounded-md"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
