import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 inline-flex items-center gap-2 bg-[rgba(232,255,71,0.08)] border border-[rgba(232,255,71,0.2)] rounded-full px-4 py-2 text-[var(--accent)] font-mono text-xs tracking-widest uppercase">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse-dot" />
        Early Access
      </div>

      <h1 className="font-display font-black text-5xl md:text-8xl leading-none tracking-tight mb-4">
        <span className="text-[var(--accent)] block">Your game's brain.</span>
        <span className="text-white/40 block font-normal">All in one place.</span>
      </h1>

      <p className="max-w-lg text-[var(--muted)] text-lg leading-relaxed mb-10 font-light">
        Codex is the game studio OS for indie devs and small teams. GDD, decisions, milestones, budget, investors, team chat — organized, searchable, and connected to AI.
      </p>

      <div className="flex gap-3 flex-wrap justify-center">
        <Link
          href="/auth/signup"
          className="bg-[var(--accent)] text-black font-mono font-semibold text-sm tracking-wider px-8 py-4 rounded-lg hover:opacity-85 transition-opacity"
        >
          Get Started Free →
        </Link>
        <Link
          href="/auth/login"
          className="border border-[var(--border)] text-[var(--text)] font-mono text-sm px-8 py-4 rounded-lg hover:border-[var(--muted)] hover:bg-[var(--surface)] transition-all"
        >
          Sign In
        </Link>
      </div>

      <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
        {[
          { n: '9', l: 'Genre Templates' },
          { n: '∞', l: 'GDD Pages' },
          { n: '4', l: 'AI Providers' },
          { n: '0', l: 'Spreadsheets Needed' },
        ].map(s => (
          <div key={s.l}>
            <div className="font-display font-bold text-3xl text-[var(--accent)]">{s.n}</div>
            <div className="font-mono text-xs text-[var(--muted)] tracking-wider uppercase mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
