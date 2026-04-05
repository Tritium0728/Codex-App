'use client'
import Link from 'next/link'
import { useState } from 'react'

export default function HomePage() {
  const [loading, setLoading] = useState<string | null>(null)

  const checkout = async (tier: string) => {
    setLoading(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else if (data.error) {
        // Not logged in - go to signup
        window.location.href = '/auth/signup'
      }
    } catch {
      window.location.href = '/auth/signup'
    }
    setLoading(null)
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-[#e8e8ec] overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 md:px-12 border-b border-[#1e1e26] bg-[rgba(9,9,11,0.85)] backdrop-blur-md">
        <span className="font-display font-bold text-sm tracking-widest text-[#e8ff47] uppercase">Codex</span>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="font-mono text-xs text-[#55555f] hover:text-[#e8e8ec] transition-colors tracking-wider uppercase">Features</a>
          <a href="#pricing" className="font-mono text-xs text-[#55555f] hover:text-[#e8e8ec] transition-colors tracking-wider uppercase">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="font-mono text-xs text-[#55555f] hover:text-[#e8e8ec] transition-colors">Sign in</Link>
          <Link href="/auth/signup" className="bg-[#e8ff47] text-black font-mono font-semibold text-xs tracking-wider px-4 py-2 rounded-md hover:opacity-85 transition-opacity">Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,rgba(232,255,71,0.05),transparent)]" />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[rgba(232,255,71,0.08)] border border-[rgba(232,255,71,0.2)] rounded-full px-4 py-2 font-mono text-xs text-[#e8ff47] tracking-widest uppercase mb-8">
            <span className="w-2 h-2 rounded-full bg-[#e8ff47] animate-pulse" />
            Now in early access
          </div>

          <h1 className="font-display font-black leading-none tracking-tight mb-6" style={{fontSize:'clamp(42px,8vw,96px)'}}>
            <span className="text-[#e8ff47] block">Your game's brain.</span>
            <span className="text-[rgba(232,232,236,0.35)] font-normal block">All in one place.</span>
          </h1>

          <p className="max-w-xl mx-auto text-[#55555f] leading-relaxed mb-10 font-light" style={{fontSize:'clamp(15px,2vw,18px)'}}>
            Codex is the game studio OS for indie devs and small teams. GDD, decisions, milestones, budget, investors, team chat — organized, searchable, and connected to AI.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/auth/signup" className="bg-[#e8ff47] text-black font-mono font-semibold text-sm tracking-wider px-8 py-4 rounded-lg hover:opacity-85 transition-all hover:-translate-y-0.5">
              Start Building →
            </Link>
            <a href="#features" className="border border-[#222228] text-[#e8e8ec] font-mono text-sm px-8 py-4 rounded-lg hover:border-[#55555f] hover:bg-[#111114] transition-all">
              See Features
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20">
            {[
              { n: '9', l: 'Genre Templates' },
              { n: '∞', l: 'GDD Pages' },
              { n: '1-click', l: 'AI Import' },
              { n: '0', l: 'Spreadsheets Needed' },
            ].map(s => (
              <div key={s.l}>
                <div className="font-display font-bold text-3xl text-[#e8ff47]">{s.n}</div>
                <div className="font-mono text-xs text-[#55555f] tracking-wider uppercase mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="mb-16">
          <div className="font-mono text-xs tracking-widest uppercase text-[#e8ff47] mb-4">Features</div>
          <h2 className="font-display font-bold leading-tight tracking-tight mb-4" style={{fontSize:'clamp(28px,4vw,48px)'}}>
            Everything your studio needs
          </h2>
          <p className="text-[#55555f] text-base leading-relaxed max-w-lg">
            Stop stitching together Notion, Google Docs, and spreadsheets. Codex is built for game development from the ground up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1e1e26] border border-[#1e1e26] rounded-xl overflow-hidden">
          {[
            { icon: '📄', name: 'Living GDD', desc: 'Full-page editor for each section. 9 genre templates. Add custom sections. Your 38-page doc fits comfortably.' },
            { icon: '🗂', name: 'Decision Log', desc: 'Every design call logged with what you chose and rejected. Know exactly why you made every call months later.' },
            { icon: '📊', name: 'Clarity Tools', desc: 'Daily, weekly, monthly goals. Feature status board. Milestone tracker. Risk log with severity and mitigation.' },
            { icon: '💳', name: 'Budget Tracker', desc: 'Live weekly, monthly, and project budgets. Record purchases, log funding. Know your burn rate at a glance.' },
            { icon: '🏦', name: 'Investor Pipeline', desc: 'Track your full fundraising round. Prospects, verbal commitments, signed deals. Progress toward your target.' },
            { icon: '🚀', name: 'Pitch Suite', desc: 'AI builds your pitch deck, investor financials, and executive one-pager from your actual project data.' },
            { icon: '📥', name: 'Smart Import', desc: 'Upload your existing GDD PDF or Word doc. AI extracts and populates your entire project in one click.' },
            { icon: '⌥', name: 'Dev Feed', desc: 'Link your GitHub repos and see live commits, open PRs, and repo stats without leaving Codex.' },
            { icon: '💬', name: 'Team Chat', desc: 'Per-project message thread. Invite teammates with a link. Real-time updates so everyone stays in sync.' },
          ].map(f => (
            <div key={f.name} className="bg-[#111114] p-7 hover:bg-[#18181d] transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <div className="font-display font-semibold text-xs tracking-widest uppercase mb-2">{f.name}</div>
              <div className="text-sm text-[#55555f] leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-mono text-xs tracking-widest uppercase text-[#e8ff47] mb-4">Pricing</div>
          <h2 className="font-display font-bold leading-tight tracking-tight mb-4" style={{fontSize:'clamp(28px,4vw,48px)'}}>
            Simple tiers. No surprises.
          </h2>
          <p className="text-[#55555f]">Start building. Upgrade when your studio does.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111114] border border-[#222228] rounded-xl p-8 hover:-translate-y-1 transition-transform">
            <div className="font-mono text-xs tracking-widest uppercase text-[#55555f] mb-3">Solo</div>
            <div className="font-display font-bold text-5xl mb-1">$0<span className="text-xl font-normal text-[#55555f]">/mo</span></div>
            <div className="font-mono text-xs text-[#55555f] mb-6">Get started today</div>
            <div className="h-px bg-[#1e1e26] mb-6" />
            <ul className="space-y-3 mb-8">
              {['1 project','Full GDD editor','Decision log','Basic clarity tools','Asset & cost tracker','GitHub Dev Feed'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#55555f]"><span className="text-[#e8ff47] font-mono text-xs mt-0.5">✓</span>{f}</li>
              ))}
              {['Team members','Investor pipeline','Pitch suite'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm opacity-30"><span className="font-mono text-xs mt-0.5">—</span>{f}</li>
              ))}
            </ul>
            <Link href="/auth/signup" className="block text-center border border-[#222228] text-[#e8e8ec] font-mono text-sm py-3 rounded-lg hover:border-[#55555f] hover:bg-[#18181d] transition-all">Get Started Free</Link>
          </div>

          <div className="bg-[#111114] border-2 border-[#e8ff47] rounded-xl p-8 relative hover:-translate-y-1 transition-transform" style={{background:'linear-gradient(135deg,#111114 0%,rgba(232,255,71,0.03) 100%)'}}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#e8ff47] text-black font-mono font-bold text-xs tracking-widest uppercase px-4 py-1 rounded-full">Most Popular</div>
            <div className="font-mono text-xs tracking-widest uppercase text-[#55555f] mb-3">Studio</div>
            <div className="font-display font-bold text-5xl mb-1">$12<span className="text-xl font-normal text-[#55555f]">/mo</span></div>
            <div className="font-mono text-xs text-[#55555f] mb-6">per user · billed monthly</div>
            <div className="h-px bg-[#1e1e26] mb-6" />
            <ul className="space-y-3 mb-8">
              {['Unlimited projects','Full GDD editor','Decision log','Full clarity tools','Budget & cost tracker','Investor pipeline','Up to 10 team members','GitHub Dev Feed','Smart import (AI)'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#55555f]"><span className="text-[#e8ff47] font-mono text-xs mt-0.5">✓</span>{f}</li>
              ))}
            </ul>
            <button onClick={() => checkout('studio')} disabled={loading === 'studio'} className="w-full text-center bg-[#e8ff47] text-black font-mono font-semibold text-sm py-3 rounded-lg hover:opacity-85 transition-opacity disabled:opacity-50">{loading === 'studio' ? 'Loading...' : 'Start 7-Day Free Trial'}</button>
          </div>

          <div className="bg-[#111114] border border-[#222228] rounded-xl p-8 hover:-translate-y-1 transition-transform">
            <div className="font-mono text-xs tracking-widest uppercase text-[#55555f] mb-3">Investor Ready</div>
            <div className="font-display font-bold text-5xl mb-1">$29<span className="text-xl font-normal text-[#55555f]">/mo</span></div>
            <div className="font-mono text-xs text-[#55555f] mb-6">per studio · billed monthly</div>
            <div className="h-px bg-[#1e1e26] mb-6" />
            <ul className="space-y-3 mb-8">
              {['Everything in Studio','Pitch deck generator','Investor financials','Executive one-pager','Unlimited team members','BYOK AI (any provider)','Export to PDF / DOCX','Priority support'].map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-[#55555f]"><span className="text-[#e8ff47] font-mono text-xs mt-0.5">✓</span>{f}</li>
              ))}
            </ul>
            <a href="mailto:hello@thecodexstudio.co" className="block text-center border border-[#222228] text-[#e8e8ec] font-mono text-sm py-3 rounded-lg hover:border-[#55555f] hover:bg-[#18181d] transition-all">Contact Sales</a>
          </div>
        </div>

        <p className="text-center text-[#55555f] font-mono text-xs mt-8">7-day free trial. Cancel anytime. No charge until trial ends.</p>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto bg-[#111114] border border-[#222228] rounded-2xl p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(232,255,71,0.08),transparent_60%)]" />
          <div className="relative z-10">
            <div className="font-mono text-xs tracking-widest uppercase text-[#e8ff47] mb-4">Early Access</div>
            <h2 className="font-display font-bold text-3xl md:text-4xl leading-tight mb-4">Your game deserves<br />a real OS</h2>
            <p className="text-[#55555f] mb-8 leading-relaxed">Bring your GDD, your team, and your vision.<br />We handle the organization.</p>
            <Link href="/auth/signup" className="inline-block bg-[#e8ff47] text-black font-mono font-semibold text-sm tracking-wider px-10 py-4 rounded-lg hover:opacity-85 transition-all hover:-translate-y-0.5">
              Get Early Access →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1e1e26] px-6 md:px-12 py-8 flex flex-wrap items-center justify-between gap-4">
        <span className="font-display font-bold text-sm tracking-widest text-[#e8ff47] uppercase">Codex</span>
        <div className="flex gap-6 flex-wrap">
          <a href="#features" className="font-mono text-xs text-[#55555f] hover:text-[#e8e8ec] transition-colors">Features</a>
          <a href="#pricing" className="font-mono text-xs text-[#55555f] hover:text-[#e8e8ec] transition-colors">Pricing</a>
          <Link href="/auth/login" className="font-mono text-xs text-[#55555f] hover:text-[#e8e8ec] transition-colors">Sign In</Link>
        </div>
        <span className="font-mono text-xs text-[#55555f]">© 2026 Codex · Game Studio OS</span>
      </footer>

    </main>
  )
}
