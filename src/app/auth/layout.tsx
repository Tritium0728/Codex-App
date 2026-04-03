export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display font-bold text-base tracking-widest text-[var(--accent)] uppercase">
            Codex
          </div>
          <div className="font-mono text-xs text-[var(--muted)] mt-1">Game Studio OS</div>
        </div>
        {children}
      </div>
    </div>
  )
}
