'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import * as db from '@/lib/db'
import type {
  Project, Profile, GDDSection, Decision, Task, Milestone,
  Feature, Risk, Asset, Cost, Purchase, Funding, Investor, Message, ProjectMember
} from '@/types'
import { GENRE_TEMPLATES } from '@/lib/genres'

// ── Types ──────────────────────────────────────────────────────────
interface CurrentUser extends Profile { role: string }
interface InitialData {
  gddSections: GDDSection[]
  decisions: Decision[]
  tasks: Task[]
  milestones: Milestone[]
  features: Feature[]
  risks: Risk[]
  assets: Asset[]
  costs: Cost[]
  purchases: Purchase[]
  funding: Funding[]
  investors: Investor[]
  members: ProjectMember[]
  messages: Message[]
}

const fmtCurrency = (n: number) => `$${Number(n || 0).toLocaleString()}`
const wordCount = (s: string) => s ? s.trim().split(' ').filter(Boolean).length : 0

const AI_PROVIDERS: Record<string, { name: string; icon: string; color: string; url: string }> = {
  claude:  { name: 'Claude',   icon: '✦', color: '#e8ff47', url: 'https://claude.ai/new' },
  chatgpt: { name: 'ChatGPT',  icon: '⬡', color: '#10a37f', url: 'https://chatgpt.com/' },
  gemini:  { name: 'Gemini',   icon: '✺', color: '#4285f4', url: 'https://gemini.google.com/app' },
  copilot: { name: 'Copilot',  icon: '⬡', color: '#0078d4', url: 'https://copilot.microsoft.com/' },
}

const TABS = [
  { id: 'gdd',       label: 'Doc',      icon: '📄' },
  { id: 'decisions', label: 'Log',      icon: '🗂'  },
  { id: 'clarity',   label: 'Clarity',  icon: '📊' },
  { id: 'budget',    label: 'Budget',   icon: '💳' },
  { id: 'investors', label: 'Fund',     icon: '🏦' },
  { id: 'assets',    label: 'Assets',   icon: '🛒' },
  { id: 'costs',     label: 'Costs',    icon: '💰' },
  { id: 'pitch',     label: 'Pitch',    icon: '🚀' },
  { id: 'github',    label: 'Dev',      icon: '⌥'  },
  { id: 'tchat',     label: 'Chat',     icon: '💬' },
  { id: 'ask',       label: 'Ask',      icon: '✦'  },
  { id: 'import',    label: 'Import',   icon: '📥' },
  { id: 'settings',  label: 'Setup',    icon: '⚙️' },
]

const FULL_LABELS: Record<string, string> = {
  gdd: 'Design Doc', decisions: 'Decision Log', clarity: 'Clarity Tools',
  budget: 'Budget', investors: 'Investors', assets: 'Asset Tracker',
  costs: 'Cost Tracker', pitch: 'Pitch Suite', github: 'Dev Feed',
  tchat: 'Team Chat', ask: 'Ask Codex', import: 'Smart Import', settings: 'Settings',
}

// ── Main Component ─────────────────────────────────────────────────
export default function ProjectApp({ project, currentUser, initialData }: {
  project: Project
  currentUser: CurrentUser
  initialData: InitialData
}) {
  const router = useRouter()
  const [tab, setTab] = useState('gdd')
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [showGenrePicker, setShowGenrePicker] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Local state derived from server data ──────────────────────────
  const [gddMap, setGddMap] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    initialData.gddSections.forEach(s => { m[s.key] = s.content })
    return m
  })
  const [customSections, setCustomSections] = useState(
    initialData.gddSections.filter(s => s.is_custom)
  )
  const [decisions, setDecisions] = useState(initialData.decisions)
  const [tasks, setTasks] = useState(initialData.tasks)
  const [milestones, setMilestones] = useState(initialData.milestones)
  const [features, setFeatures] = useState(initialData.features)
  const [risks, setRisks] = useState(initialData.risks)
  const [assets, setAssets] = useState(initialData.assets)
  const [costs, setCosts] = useState(initialData.costs)
  const [purchases, setPurchases] = useState(initialData.purchases)
  const [funding, setFunding] = useState(initialData.funding)
  const [investors, setInvestors] = useState(initialData.investors)
  const [members, setMembers] = useState(initialData.members)
  const [messages, setMessages] = useState(initialData.messages)
  const [proj, setProj] = useState(project)

  // ── UI state ──────────────────────────────────────────────────────
  const [goalTab, setGoalTab] = useState<'daily'|'weekly'|'monthly'|'yearly'>('daily')
  const [aiProvider, setAiProvider] = useState('claude')
  const [aiModal, setAiModal] = useState<{ prompt: string } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [showNotifs, setShowNotifs] = useState(false)
  const [importRawText, setImportRawText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importStep, setImportStep] = useState(1)
  const [loadKey, setLoadKey] = useState(0)
  const [chatInput, setChatInput] = useState('')
  const [askInput, setAskInput] = useState('')
  const [repoUrl, setRepoUrl] = useState('')
  const [repoData, setRepoData] = useState<any>(null)
  const [repoLoading, setRepoLoading] = useState(false)
  const [notifSettings, setNotifSettings] = useState({
    overdueTasks: true, highRisks: true, budgetOverrun: true, activeMilestones: true,
  })

  // GDD save debounce
  const gddSaveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── Real-time chat subscription ───────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`messages:${project.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `project_id=eq.${project.id}`
      }, async (payload) => {
        // Fetch full message with profile
        const { data } = await supabase
          .from('messages').select('*, profiles(id,name,color)')
          .eq('id', payload.new.id).single()
        if (data) setMessages(p => [...p, data as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [project.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'instant' as any })
    setLoadKey(k => k + 1)
  }, [tab])

  // ── Derived data ──────────────────────────────────────────────────
  const template = GENRE_TEMPLATES[proj.genre] ?? GENRE_TEMPLATES.blank
  const allSections = useMemo(() => [
    ...template.sections,
    ...customSections.map(s => ({ key: s.key, label: s.label, placeholder: '', is_custom: true }))
  ], [template, customSections])

  const currentTasks = useMemo(() => tasks.filter(t => t.period === goalTab), [tasks, goalTab])
  const totalMonthly = useMemo(() => costs.filter(c => c.cost_type === 'monthly').reduce((a, c) => a + Number(c.amount), 0), [costs])
  const totalOneTime = useMemo(() => costs.filter(c => c.cost_type === 'one-time').reduce((a, c) => a + Number(c.amount), 0), [costs])
  const lockedAssets = useMemo(() => assets.filter(a => a.priority === 'locked').reduce((a, c) => a + Number(c.price), 0), [assets])

  const notifications = useMemo(() => {
    const n = []
    if (notifSettings.highRisks) {
      const h = risks.filter(r => r.severity === 'high')
      if (h.length) n.push({ id: 'risks', icon: '🔴', title: `${h.length} high-severity risk${h.length > 1 ? 's' : ''}`, desc: h[0].name })
    }
    if (notifSettings.budgetOverrun) {
      const spent = purchases.reduce((a, p) => a + Number(p.amount), 0)
      if (spent > proj.budgets.project.limit) n.push({ id: 'budget', icon: '💳', title: 'Project budget exceeded', desc: `${fmtCurrency(spent)} spent` })
    }
    if (notifSettings.activeMilestones) {
      const active = milestones.filter(m => m.status === 'active')
      if (active.length) n.push({ id: 'ms', icon: '📍', title: `${active.length} milestone${active.length > 1 ? 's' : ''} in progress`, desc: active[0].name })
    }
    return n
  }, [risks, purchases, milestones, proj.budgets, notifSettings])

  // ── Actions ───────────────────────────────────────────────────────
  const saveGdd = (key: string, value: string) => {
    setGddMap(p => ({ ...p, [key]: value }))
    clearTimeout(gddSaveTimer.current[key])
    gddSaveTimer.current[key] = setTimeout(() => {
      const section = allSections.find(s => s.key === key)
      if (section) db.upsertGDDSection(project.id, key, section.label, value, 0, !!(section as any).is_custom)
    }, 1000)
  }

  const copyToClipboard = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text) } catch {}
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const buildContext = useCallback(() => {
    let c = `PROJECT: ${proj.name} | GENRE: ${template.name}\n\n=== GDD ===\n`
    allSections.forEach(s => { if (gddMap[s.key]) c += `${s.label}:\n${gddMap[s.key]}\n\n` })
    c += `=== DECISIONS ===\n`
    decisions.forEach(d => c += `[${d.section}] Chose: ${d.chose} | Rejected: ${d.rejected}\n`)
    c += `\n=== MILESTONES ===\n`
    milestones.forEach(m => c += `${m.name} — ${m.status} (${m.progress}%) → ${m.target_date}\n`)
    c += `\n=== FEATURES ===\n`
    features.forEach(f => c += `[${f.status}] ${f.name}: ${f.note}\n`)
    c += `\n=== RISKS ===\n`
    risks.forEach(r => c += `[${r.severity}] ${r.name}: ${r.note} | Mitigation: ${r.mitigation}\n`)
    c += `\n=== COSTS ===\n`
    costs.forEach(c2 => c += `${c2.name} — ${fmtCurrency(c2.amount)} ${c2.cost_type}\n`)
    return c
  }, [proj, template, allSections, gddMap, decisions, milestones, features, risks, costs])

  const openWithAI = async (prompt: string) => {
    try { await navigator.clipboard.writeText(prompt) } catch {}
    setAiModal({ prompt })
  }

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return
    const text = chatInput.trim()
    setChatInput('')
    try {
      await db.sendMessage(project.id, currentUser.id, text)
    } catch (e) { console.error(e) }
  }

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const fetchRepo = async (url: string) => {
    setRepoLoading(true)
    try {
      const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) throw new Error('Invalid GitHub URL')
      const [, owner, repo] = match
      const headers = { Accept: 'application/vnd.github+json' }
      const [ir, cr, pr] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=5`, { headers }),
      ])
      const [info, commits, prs] = await Promise.all([ir.json(), cr.json(), pr.json()])
      setRepoData({ info, commits: Array.isArray(commits) ? commits : [], prs: Array.isArray(prs) ? prs : [] })
    } catch (e: any) {
      setRepoData({ error: e.message })
    }
    setRepoLoading(false)
  }

  // ── Render helpers ────────────────────────────────────────────────
  const chip = (s: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-[rgba(85,85,95,0.2)] text-[var(--muted)]',
      active: 'bg-[rgba(91,140,255,0.15)] text-[var(--accent3)]',
      done: 'bg-[rgba(74,222,128,0.12)] text-[var(--green)]',
      cut: 'bg-[rgba(248,113,113,0.12)] text-[var(--red)]',
      high: 'bg-[rgba(248,113,113,0.12)] text-[var(--red)]',
      medium: 'bg-[rgba(251,191,36,0.12)] text-yellow-400',
      low: 'bg-[rgba(74,222,128,0.12)] text-[var(--green)]',
      locked: 'bg-[rgba(232,255,71,0.12)] text-[var(--accent)]',
      considering: 'bg-[rgba(251,191,36,0.12)] text-yellow-400',
      someday: 'bg-[rgba(85,85,95,0.15)] text-[var(--muted)]',
    }
    return (<span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[9px] tracking-wider uppercase ${colors[s] ?? colors.planned}`}>{s}</span>)
  }

  // ── Shared input/button classes ───────────────────────────────────
  const inputCls = 'w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-[var(--text)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(232,255,71,0.07)] transition-all'
  const selectCls = inputCls + ' appearance-none'
  const btnAccent = 'bg-[var(--accent)] text-black font-mono font-semibold text-xs tracking-wider px-4 py-2 rounded-md hover:opacity-85 active:scale-95 transition-all whitespace-nowrap'
  const btnGhost = 'border border-[var(--border)] text-[var(--muted)] font-mono text-xs px-3 py-2 rounded-md hover:border-[var(--muted2)] hover:text-[var(--text)] transition-all whitespace-nowrap'
  const btnDanger = 'bg-[rgba(248,113,113,0.12)] text-[var(--red)] border border-[rgba(248,113,113,0.2)] font-mono text-xs px-2 py-1 rounded'
  const cardCls = 'bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden'
  const sectionHdr = 'flex items-center justify-between mb-3 flex-wrap gap-2'
  const sectionTitle = 'font-display font-semibold text-xs tracking-widest uppercase'

  // ── Full render ───────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)] text-[var(--text)]">
      {/* Loading bar */}
      <div key={loadKey} className="fixed top-0 left-0 right-0 h-0.5 bg-[var(--accent)] z-50 origin-left animate-[loadBar_0.6s_ease_forwards]" />

      {/* SIDEBAR — desktop only */}
      <aside className="hidden md:flex w-[220px] min-w-[220px] flex-col bg-[var(--surface)] border-r border-[var(--border)] overflow-hidden">
        <div className="px-4 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="font-display font-bold text-xs tracking-widest text-[var(--accent)] uppercase">Codex</div>
          <div className="font-mono text-[10px] text-[var(--muted)] mt-0.5">game studio OS</div>
        </div>

        {/* Project name + back */}
        <div className="px-3 py-2.5 border-b border-[var(--border)]">
          <button onClick={() => router.push('/dashboard')} className="font-mono text-[9px] text-[var(--muted)] hover:text-[var(--accent)] transition-colors mb-1 flex items-center gap-1">← All Projects</button>
          <div className="font-mono text-xs text-[var(--text)] truncate font-medium">{proj.name}</div>
          <div className="font-mono text-[9px] text-[var(--muted)] capitalize mt-0.5">{proj.genre}</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {[
            { label: 'Design', tabs: ['gdd', 'decisions'] },
            { label: 'Clarity', tabs: ['clarity'] },
            { label: 'Finance', tabs: ['budget', 'investors', 'assets', 'costs'] },
            { label: 'Investor', tabs: ['pitch'] },
            { label: 'Dev', tabs: ['github', 'tchat'] },
            { label: 'AI', tabs: ['ask', 'import', 'settings'] },
          ].map(group => (
            <div key={group.label}>
              <div className="px-4 pt-3 pb-1 font-mono text-[9px] tracking-widest uppercase text-[var(--muted)]">{group.label}</div>
              {group.tabs.map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`w-full flex items-center gap-2 px-4 py-1.5 font-sans text-xs text-left border-l-2 transition-all ${tab === t ? 'text-[var(--accent)] border-[var(--accent)] bg-[rgba(232,255,71,0.04)]' : 'text-[var(--muted)] border-transparent hover:text-[var(--text)] hover:bg-[var(--surface2)]'}`}
                >
                  <span className="text-sm w-4 text-center">{TABS.find(x => x.id === t)?.icon}</span>
                  {FULL_LABELS[t]}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User / sign out */}
        <div className="border-t border-[var(--border)] px-4 py-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold font-mono flex-shrink-0"
            style={{ background: currentUser.color + '22', color: currentUser.color }}>
            {currentUser.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-xs text-[var(--text)] truncate">{currentUser.name}</div>
            <div className="font-mono text-[9px] text-[var(--muted)] capitalize">{currentUser.role}</div>
          </div>
          <form action="/auth/signout" method="POST">
            <button className="font-mono text-[9px] text-[var(--muted)] hover:text-[var(--text)]">out</button>
          </form>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-[var(--top-h)] border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-4 gap-3 flex-shrink-0">
          {openSection ? (
            <button onClick={() => setOpenSection(null)} className={btnGhost}>← Back</button>
          ) : (
            <button onClick={() => router.push('/dashboard')} className="text-[var(--muted)] font-mono text-[10px] hover:text-[var(--accent)] transition-colors md:hidden flex-shrink-0">⌂</button>
          )}
          <div className="font-display font-semibold text-xs tracking-wider uppercase flex-1 truncate">
            {openSection ? allSections.find(s => s.key === openSection)?.label : FULL_LABELS[tab]}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {tab === 'gdd' && !openSection && (
              <button className={btnGhost} onClick={() => setShowGenrePicker(v => !v)}>
                {template.icon} Template
              </button>
            )}
            <button className={btnAccent} onClick={() => setTab('import')}>📥 Import</button>
            {/* Notification bell */}
            <div className="relative">
              <button onClick={() => setShowNotifs(v => !v)} className="relative text-[var(--muted)] hover:text-[var(--text)] transition-colors p-1">
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--red)] rounded-full text-white text-[9px] font-bold flex items-center justify-center border-2 border-[var(--bg)]">
                    {notifications.length}
                  </span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden animate-slide-in">
                  <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface2)] border-b border-[var(--border)]">
                    <span className="font-display font-semibold text-xs tracking-wider uppercase">Notifications</span>
                    <button onClick={() => setShowNotifs(false)} className="text-[var(--muted)] text-xs">✕</button>
                  </div>
                  {notifications.length === 0
                    ? <div className="px-4 py-6 text-center text-[var(--muted)] text-xs">✓ All clear</div>
                    : notifications.map(n => (
                      <div key={n.id} className="flex gap-3 px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface2)]">
                        <span className="text-lg flex-shrink-0">{n.icon}</span>
                        <div>
                          <div className="text-xs font-medium">{n.title}</div>
                          <div className="text-[10px] text-[var(--muted)] truncate">{n.desc}</div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            <span className="font-mono text-[10px] text-[var(--muted)] hidden sm:block truncate max-w-[120px]">▸ {proj.name}</span>
          </div>
        </header>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4 md:p-5">

          {/* ── GDD ── */}
          {tab === 'gdd' && (
            <div className="animate-fade-in">
              {showGenrePicker && (
                <div className="mb-5 animate-slide-in">
                  <div className={sectionHdr}>
                    <div className={sectionTitle}>Genre Template</div>
                    <button className={btnGhost} onClick={() => setShowGenrePicker(false)}>Done</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(GENRE_TEMPLATES).map(([key, tmpl]) => (
                      <button
                        key={key}
                        onClick={async () => {
                          await db.updateProject(project.id, { genre: key })
                          setProj(p => ({ ...p, genre: key }))
                          setShowGenrePicker(false)
                        }}
                        className={`p-3 rounded-lg border text-center transition-all ${proj.genre === key ? 'border-[var(--accent)] bg-[rgba(232,255,71,0.06)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted2)]'}`}
                      >
                        <div className="text-xl mb-1">{tmpl.icon}</div>
                        <div className="font-mono text-[10px] text-[var(--muted)] leading-tight">{tmpl.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {openSection ? (
                <div className="flex flex-col h-full">
                  <textarea
                    autoFocus
                    className="w-full flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--text)] font-sans text-sm leading-relaxed p-4 outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(232,255,71,0.07)] resize-none transition-all min-h-[400px]"
                    value={gddMap[openSection] || ''}
                    onChange={e => saveGdd(openSection, e.target.value)}
                    placeholder={allSections.find(s => s.key === openSection)?.placeholder || 'Write here...'}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-mono text-[10px] text-[var(--muted)]">{wordCount(gddMap[openSection] || '')} words</span>
                    {gddMap[openSection] && (
                      <button className={btnGhost} onClick={() => copyToClipboard(gddMap[openSection], openSection)}>
                        {copiedKey === openSection ? '✓ Copied' : '📋 Copy'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {allSections.map((s, idx) => (
                    <div
                      key={s.key}
                      onClick={() => setOpenSection(s.key)}
                      style={{ animationDelay: `${idx * 30}ms` }}
                      className="flex items-center gap-3 p-3.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--muted2)] hover:bg-[var(--surface2)] active:scale-[0.99] transition-all animate-slide-in"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium mb-0.5">{s.label}</div>
                        <div className="text-xs text-[var(--muted)] truncate">
                          {gddMap[s.key] ? gddMap[s.key].slice(0, 80) + (gddMap[s.key].length > 80 ? '…' : '') : <span className="text-[var(--muted2)]">Empty — tap to write</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {gddMap[s.key] && (
                          <button
                            className="font-mono text-[9px] text-[var(--muted)] border border-[var(--border)] rounded px-2 py-0.5 hover:text-[var(--text)]"
                            onClick={e => { e.stopPropagation(); copyToClipboard(gddMap[s.key], s.key) }}
                          >
                            {copiedKey === s.key ? '✓' : 'Copy'}
                          </button>
                        )}
                        <span className="font-mono text-[10px] text-[var(--muted)]">{wordCount(gddMap[s.key] || '')}w ›</span>
                      </div>
                    </div>
                  ))}
                  <button
                    className="w-full text-left p-3.5 border-2 border-dashed border-[var(--border)] rounded-lg font-mono text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all"
                    onClick={async () => {
                      const label = prompt('Section name:')
                      if (!label) return
                      const key = 'custom_' + Date.now()
                      await db.upsertGDDSection(project.id, key, label, '', allSections.length, true)
                      setCustomSections(p => [...p, { id: key, project_id: project.id, key, label, content: '', sort_order: p.length, is_custom: true, updated_at: new Date().toISOString() }])
                      setOpenSection(key)
                    }}
                  >
                    + Add Custom Section
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── DECISIONS ── */}
          {tab === 'decisions' && (
            <div className="animate-fade-in">
              <DecisionTab
                decisions={decisions} projectId={project.id} currentUserId={currentUser.id}
                chip={chip} btnAccent={btnAccent} btnGhost={btnGhost} btnDanger={btnDanger}
                inputCls={inputCls} cardCls={cardCls} sectionHdr={sectionHdr} sectionTitle={sectionTitle}
                onAdd={(d) => setDecisions(p => [d, ...p])}
                onDelete={(id) => setDecisions(p => p.filter(x => x.id !== id))}
              />
            </div>
          )}

          {/* ── CLARITY ── */}
          {tab === 'clarity' && (
            <div className="animate-fade-in">
              <ClarityTab
                tasks={tasks} milestones={milestones} features={features} risks={risks}
                members={members} goalTab={goalTab} currentTasks={currentTasks}
                projectId={project.id} currentUserId={currentUser.id}
                chip={chip} btnAccent={btnAccent} btnGhost={btnGhost} btnDanger={btnDanger}
                inputCls={inputCls} selectCls={selectCls} cardCls={cardCls} sectionHdr={sectionHdr} sectionTitle={sectionTitle}
                setGoalTab={setGoalTab}
                onTaskAdd={(t) => setTasks(p => [...p, t])}
                onTaskUpdate={(id, u) => setTasks(p => p.map(x => x.id === id ? { ...x, ...u } : x))}
                onTaskDelete={(id) => setTasks(p => p.filter(x => x.id !== id))}
                onMilestoneAdd={(m) => setMilestones(p => [...p, m])}
                onMilestoneUpdate={(id, u) => setMilestones(p => p.map(x => x.id === id ? { ...x, ...u } : x))}
                onMilestoneDelete={(id) => setMilestones(p => p.filter(x => x.id !== id))}
                onFeatureAdd={(f) => setFeatures(p => [...p, f])}
                onFeatureUpdate={(id, u) => setFeatures(p => p.map(x => x.id === id ? { ...x, ...u } : x))}
                onFeatureDelete={(id) => setFeatures(p => p.filter(x => x.id !== id))}
                onRiskAdd={(r) => setRisks(p => [...p, r])}
                onRiskDelete={(id) => setRisks(p => p.filter(x => x.id !== id))}
              />
            </div>
          )}

          {/* ── BUDGET ── */}
          {tab === 'budget' && (
            <BudgetTab
              purchases={purchases} funding={funding} budgets={proj.budgets}
              projectId={project.id}
              btnAccent={btnAccent} btnGhost={btnGhost} btnDanger={btnDanger}
              inputCls={inputCls} selectCls={selectCls} sectionHdr={sectionHdr} sectionTitle={sectionTitle}
              fmtCurrency={fmtCurrency}
              onPurchaseAdd={(p) => setPurchases(prev => [p, ...prev])}
              onPurchaseDelete={(id) => setPurchases(p => p.filter(x => x.id !== id))}
              onFundingAdd={(f) => setFunding(prev => [f, ...prev])}
              onFundingDelete={(id) => setFunding(p => p.filter(x => x.id !== id))}
              onBudgetUpdate={async (budgets) => {
                await db.updateProject(project.id, { budgets })
                setProj(p => ({ ...p, budgets }))
              }}
            />
          )}

          {/* ── INVESTORS ── */}
          {tab === 'investors' && (
            <InvestorsTab
              investors={investors} fundingTarget={proj.funding_target} fundingRound={proj.funding_round}
              projectId={project.id} funding={funding}
              btnAccent={btnAccent} btnGhost={btnGhost} btnDanger={btnDanger}
              inputCls={inputCls} selectCls={selectCls} sectionHdr={sectionHdr} sectionTitle={sectionTitle}
              fmtCurrency={fmtCurrency} chip={chip}
              onAdd={(i) => setInvestors(p => [i, ...p])}
              onUpdate={(id, u) => setInvestors(p => p.map(x => x.id === id ? { ...x, ...u } : x))}
              onDelete={(id) => setInvestors(p => p.filter(x => x.id !== id))}
              onTargetUpdate={async (target) => { await db.updateProject(project.id, { funding_target: target }); setProj(p => ({ ...p, funding_target: target })) }}
              onRoundUpdate={async (round) => { await db.updateProject(project.id, { funding_round: round }); setProj(p => ({ ...p, funding_round: round })) }}
            />
          )}

          {/* ── ASSETS ── */}
          {tab === 'assets' && (
            <AssetsTab
              assets={assets} projectId={project.id}
              lockedAssets={lockedAssets}
              btnAccent={btnAccent} btnGhost={btnGhost} btnDanger={btnDanger}
              inputCls={inputCls} selectCls={selectCls} sectionHdr={sectionHdr} sectionTitle={sectionTitle}
              fmtCurrency={fmtCurrency} chip={chip}
              onAdd={(a) => setAssets(p => [...p, a])}
              onUpdate={(id, u) => setAssets(p => p.map(x => x.id === id ? { ...x, ...u } : x))}
              onDelete={(id) => setAssets(p => p.filter(x => x.id !== id))}
            />
          )}

          {/* ── COSTS ── */}
          {tab === 'costs' && (
            <CostsTab
              costs={costs} projectId={project.id}
              totalMonthly={totalMonthly} totalOneTime={totalOneTime}
              btnAccent={btnAccent} btnGhost={btnGhost} btnDanger={btnDanger}
              inputCls={inputCls} selectCls={selectCls} sectionHdr={sectionHdr} sectionTitle={sectionTitle}
              fmtCurrency={fmtCurrency}
              onAdd={(c) => setCosts(p => [...p, c])}
              onDelete={(id) => setCosts(p => p.filter(x => x.id !== id))}
            />
          )}

          {/* ── PITCH ── */}
          {tab === 'pitch' && (
            <div className="animate-fade-in space-y-3">
              <div className="text-xs font-mono text-[var(--muted)] bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2">
                ⚠ Each button copies your project prompt and opens your AI. Paste and send for instant results.
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '📊', title: 'Pitch Deck', desc: '9-slide investor deck from your GDD and data', prompt: `Generate a 9-slide investor pitch deck.\n\nSlides: Cover, Problem, Solution, Core Gameplay Loop, Market Opportunity, Competitive Landscape, Business Model, Team & Timeline, The Ask.\n\n${buildContext()}` },
                  { icon: '💹', title: 'Financials', desc: 'Investor financial summary from your cost tracker', prompt: `Generate a structured investor financial summary.\n\nSections: Executive Summary, Cost Breakdown, Revenue Projections (Yr 1-3), Burn Rate, Breakeven, Revenue Streams, Investment Ask.\n\n${buildContext()}` },
                ].map(item => (
                  <div key={item.title} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center">
                    <div className="text-3xl mb-2">{item.icon}</div>
                    <div className="font-display font-bold text-xs tracking-wider uppercase mb-1">{item.title}</div>
                    <div className="text-xs text-[var(--muted)] leading-relaxed mb-4">{item.desc}</div>
                    <button className={btnAccent + ' w-full'} onClick={() => openWithAI(item.prompt)}>
                      Open in {AI_PROVIDERS[aiProvider]?.name} ↗
                    </button>
                  </div>
                ))}
              </div>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">📄</div>
                <div className="font-display font-bold text-xs tracking-wider uppercase mb-1">Executive One-Pager</div>
                <div className="text-xs text-[var(--muted)] leading-relaxed mb-4">Investor-ready one-pager: The Game, Market, Business Model, Team, Ask</div>
                <button className={btnAccent} onClick={() => openWithAI(`Write a punchy investor one-pager.\n\nSections: THE GAME, MARKET OPPORTUNITY, BUSINESS MODEL, TEAM & STATUS, THE ASK.\n\n${buildContext()}`)}>
                  Open in {AI_PROVIDERS[aiProvider]?.name} ↗
                </button>
              </div>

              {/* Project snapshot */}
              <div className="pt-2">
                <div className={sectionTitle + ' mb-3'}>Project Snapshot</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Milestones', value: `${milestones.filter(m => m.status === 'done').length}/${milestones.length}`, sub: 'complete' },
                    { label: 'Features', value: `${features.filter(f => f.status === 'done').length}/${features.length}`, sub: 'done' },
                    { label: 'Risks', value: risks.length, sub: `${risks.filter(r => r.severity === 'high').length} high`, color: risks.some(r => r.severity === 'high') ? 'text-[var(--red)]' : '' },
                    { label: 'Monthly Burn', value: fmtCurrency(totalMonthly), sub: '/month' },
                    { label: 'Assets Locked', value: fmtCurrency(lockedAssets), sub: 'committed' },
                    { label: 'Decisions', value: decisions.length, sub: 'logged' },
                  ].map(s => (
                    <div key={s.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">{s.label}</div>
                      <div className={`font-mono font-semibold text-lg ${(s as any).color || ''}`}>{s.value}</div>
                      <div className="font-mono text-[9px] text-[var(--muted)]">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── GITHUB ── */}
          {tab === 'github' && (
            <div className="animate-fade-in">
              <div className={sectionHdr}>
                <div className={sectionTitle}>Dev Feed</div>
              </div>
              {!repoData && (
                <div className="space-y-3">
                  <input className={inputCls} placeholder="https://github.com/owner/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                  <button className={btnAccent} onClick={() => fetchRepo(repoUrl)} disabled={repoLoading || !repoUrl}>
                    {repoLoading ? 'Loading...' : 'Fetch Commits'}
                  </button>
                </div>
              )}
              {repoData?.error && <div className="text-[var(--red)] font-mono text-xs">{repoData.error}</div>}
              {repoData && !repoData.error && (
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[var(--surface2)] border-b border-[var(--border)] flex items-center justify-between">
                    <div>
                      <div className="font-display font-semibold text-xs tracking-wider">{repoUrl.replace('https://github.com/', '')}</div>
                      {repoData.info && <div className="font-mono text-[9px] text-[var(--muted)] mt-0.5">★ {repoData.info.stargazers_count} · {repoData.info.language}</div>}
                    </div>
                    <button className={btnGhost} onClick={() => { setRepoData(null); setRepoUrl('') }}>✕</button>
                  </div>
                  {repoData.prs?.length > 0 && (
                    <>
                      <div className="px-4 py-2 bg-[var(--surface2)] border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-widest text-[var(--muted)]">Open PRs ({repoData.prs.length})</div>
                      {repoData.prs.map((pr: any) => (
                        <div key={pr.id} className="flex gap-3 px-4 py-2.5 border-b border-[var(--border)] items-center">
                          <span className="font-mono text-[10px] text-[var(--green)]">#{pr.number}</span>
                          <span className="text-xs flex-1 truncate">{pr.title}</span>
                          <span className="font-mono text-[9px] text-[var(--muted)]">{timeAgo(pr.created_at)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="px-4 py-2 bg-[var(--surface2)] border-b border-[var(--border)] font-mono text-[9px] uppercase tracking-widest text-[var(--muted)]">Recent Commits</div>
                  {repoData.commits?.slice(0, 8).map((c: any) => (
                    <div key={c.sha} className="flex gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-0">
                      <span className="font-mono text-[10px] text-[var(--accent3)] flex-shrink-0 mt-0.5">{c.sha?.slice(0, 7)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{c.commit?.message?.split('\n')[0]}</div>
                        <div className="font-mono text-[9px] text-[var(--muted)]">{c.commit?.author?.name}</div>
                      </div>
                      <span className="font-mono text-[9px] text-[var(--muted)] flex-shrink-0">{timeAgo(c.commit?.author?.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TEAM CHAT ── */}
          {tab === 'tchat' && (
            <div className="flex flex-col h-full min-h-0" style={{ height: 'calc(100dvh - var(--top-h) - 72px)' }}>
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div className="font-mono text-[10px] text-[var(--muted)]">{members.length} members · {messages.length} messages</div>
                <div className="flex gap-1">
                  {members.map(m => (
                    <div key={m.id} title={(m as any).profiles?.name || m.display_name || 'Member'} style={{ background: m.color + '22', border: `2px solid ${m.color}`, color: m.color }} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold font-mono">
                      {((m as any).profiles?.name || m.display_name || 'M').slice(0, 1)}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 mb-3">
                {messages.length === 0 && (
                  <div className="text-center py-10 text-[var(--muted)] text-sm">
                    <div className="text-3xl mb-2">💬</div>
                    No messages yet. Start the conversation.
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const profile = (msg as any).profiles
                  const prevMsg = messages[idx - 1]
                  const showDate = !prevMsg || new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString()
                  const showAvatar = !prevMsg || prevMsg.user_id !== msg.user_id || showDate
                  const isMe = msg.user_id === currentUser.id
                  return (
                    <div key={msg.id}>
                      {showDate && <div className="text-center font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] py-2">{new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>}
                      <div className={`flex gap-2 ${showAvatar ? 'pt-2' : 'pt-0.5'}`}>
                        {showAvatar ? (
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono flex-shrink-0 mt-0.5"
                            style={{ background: (profile?.color || '#5b8cff') + '22', color: profile?.color || '#5b8cff' }}>
                            {(profile?.name || 'U').slice(0, 2).toUpperCase()}
                          </div>
                        ) : <div className="w-7 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          {showAvatar && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-xs font-semibold" style={{ color: profile?.color || '#5b8cff' }}>{profile?.name || 'Unknown'}</span>
                              <span className="font-mono text-[9px] text-[var(--muted)]">{new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          <div className="text-sm leading-relaxed break-words">{msg.text}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <textarea
                  className={inputCls + ' resize-none flex-1'}
                  rows={1}
                  placeholder={`Message as ${currentUser.name}...`}
                  value={chatInput}
                  onChange={e => { setChatInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px' }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                />
                <button className={btnAccent + ' self-end'} onClick={sendChatMessage} disabled={!chatInput.trim()}>↑</button>
              </div>
            </div>
          )}


          {/* ── SMART IMPORT ── */}
          {tab === 'import' && (
            <div className="animate-fade-in space-y-4">
              <div className="text-xs font-mono text-[var(--muted)] bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2">
                Paste or upload your existing GDD, budget, task list, or investor notes. AI will extract and populate your project automatically.
              </div>

              {/* File drop zone */}
              <div
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center cursor-pointer hover:border-[var(--accent)] transition-colors"
                onClick={() => document.getElementById('import-file-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)' }}
                onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '' }}
                onDrop={async (e) => {
                  e.preventDefault()
                  const files = e.dataTransfer.files
                  const texts: string[] = []
                  for (const file of Array.from(files)) {
                    const text = await file.text()
                    texts.push(`--- ${file.name} ---\n${text}`)
                  }
                  setImportRawText(p => p ? p + '\n\n' + texts.join('\n\n') : texts.join('\n\n'))
                }}
              >
                <div className="text-3xl mb-2">📎</div>
                <div className="font-mono text-xs font-semibold mb-1">Attach Files</div>
                <div className="text-[10px] text-[var(--muted)]">PDF, Word, TXT, Markdown, CSV — tap to browse or drag & drop</div>
                <input
                  id="import-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.rtf,image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files
                    if (!files) return
                    const texts: string[] = []
                    for (const file of Array.from(files)) {
                      try {
                        const text = await file.text()
                    texts.push(`--- ${file.name} ---\n${text}`)
                      } catch {
                        texts.push(`[Could not read ${file.name}]`)
                      }
                    }
                    setImportRawText(p => p ? p + '\n\n' + texts.join('\n\n') : texts.join('\n\n'))
                  }}
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)]">or paste text</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <textarea
                className={inputCls + ' resize-none min-h-[160px]'}
                placeholder={"Paste your GDD, task list, budget, investor notes — anything. Mix formats, doesn't need to be tidy."}
                value={importRawText}
                onChange={e => setImportRawText(e.target.value)}
              />

              {importRawText && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[var(--accent)]">{importRawText.trim().split(' ').filter(Boolean).length} words loaded</span>
                  <button className="font-mono text-[10px] text-[var(--red)] hover:underline" onClick={() => setImportRawText('')}>Clear</button>
                </div>
              )}

              {importError && (
                <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2 text-red-400 text-xs font-mono">{importError}</div>
              )}

              <button
                className={btnAccent + ' w-full py-3'}
                disabled={importLoading || !importRawText.trim()}
                onClick={async () => {
                  if (!importRawText.trim()) return
                  setImportLoading(true)
                  setImportError('')
                  try {
                    const prompt = "You are a data extraction assistant for a game project management tool. Extract structured data from the following documents and return ONLY a valid JSON object with these fields (omit any field if not found):\n\n{\"projectName\": \"string\", \"genre\": \"shooter|rpg|strategy|narrative|platformer|puzzle|simulation|horror|blank\", \"gdd\": {\"premise\": \"string\", \"coreMechanics\": \"string\", \"playerFantasy\": \"string\", \"setting\": \"string\", \"progression\": \"string\", \"market\": \"string\", \"tech\": \"string\", \"scope\": \"string\"}, \"decisions\": [{\"section\": \"string\", \"chose\": \"string\", \"rejected\": \"string\"}], \"tasks\": [{\"text\": \"string\", \"period\": \"daily|weekly|monthly|yearly\", \"priority\": \"high|medium|low\"}], \"milestones\": [{\"name\": \"string\", \"status\": \"planned|active|done\", \"progress\": 0, \"target_date\": \"string\"}], \"features\": [{\"name\": \"string\", \"note\": \"string\", \"status\": \"planned|active|done|cut\"}], \"risks\": [{\"name\": \"string\", \"severity\": \"high|medium|low\", \"note\": \"string\", \"mitigation\": \"string\"}], \"costs\": [{\"name\": \"string\", \"category\": \"string\", \"amount\": 0, \"cost_type\": \"monthly|one-time\"}], \"fundingTarget\": 0}\n\nReturn ONLY the JSON object. No explanation, no markdown.\n\nDOCUMENTS:\n" + importRawText

                    await navigator.clipboard.writeText(prompt).catch(() => {})
                    setAiModal({ prompt })
                    setImportLoading(false)
                  } catch (e: any) {
                    setImportError(e.message)
                    setImportLoading(false)
                  }
                }}
              >
                {importLoading ? 'Processing...' : `Extract with ${AI_PROVIDERS[aiProvider]?.name || 'AI'} ↗`}
              </button>

              <div className="text-[10px] text-[var(--muted)] font-mono text-center leading-relaxed">
                This copies a structured extraction prompt to your clipboard and opens your AI.<br/>
                Paste it in, hit send, then copy the JSON result back here.
              </div>

              {/* JSON paste step */}
              <div className="border-t border-[var(--border)] pt-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] mb-2">Step 2 — Paste the JSON result from your AI</div>
                <textarea
                  className={inputCls + ' resize-none min-h-[120px] font-mono text-xs'}
                  placeholder={'{ "projectName": "...", "genre": "shooter", "gdd": {...} }'}
                  onChange={async (e) => {
                    const val = e.target.value.trim()
                    if (!val.startsWith('{')) return
                    try {
                      const parsed = JSON.parse(val)
                      // Apply extracted data
                      if (parsed.projectName) await db.updateProject(project.id, { name: parsed.projectName })
                      if (parsed.genre) await db.updateProject(project.id, { genre: parsed.genre })
                      if (parsed.fundingTarget) await db.updateProject(project.id, { funding_target: parsed.fundingTarget })
                      if (parsed.gdd) {
                        const secs = allSections
                        for (const [key, val] of Object.entries(parsed.gdd)) {
                          if (typeof val === 'string' && val.trim()) {
                            const sec = secs.find(s => s.key === key)
                            if (sec) {
                              await db.upsertGDDSection(project.id, key, sec.label, val as string, 0, false)
                              setGddMap(p => ({ ...p, [key]: val as string }))
                            }
                          }
                        }
                      }
                      if (parsed.decisions?.length) {
                        for (const d of parsed.decisions) {
                          const dec = await db.addDecision(project.id, d.section || 'General', d.chose, d.rejected || '', currentUser.id)
                          setDecisions(p => [dec, ...p])
                        }
                      }
                      if (parsed.tasks?.length) {
                        for (const t of parsed.tasks) {
                          const task = await db.addTask(project.id, t.text, t.period || 'daily', t.priority || 'medium')
                          setTasks(p => [...p, task])
                        }
                      }
                      if (parsed.milestones?.length) {
                        for (const m of parsed.milestones) {
                          const ms = await db.addMilestone(project.id, m.name, m.status || 'planned', m.progress || 0, m.target_date || '')
                          setMilestones(p => [...p, ms])
                        }
                      }
                      if (parsed.features?.length) {
                        for (const f of parsed.features) {
                          const feat = await db.addFeature(project.id, f.name, f.note || '', f.status || 'planned')
                          setFeatures(p => [...p, feat])
                        }
                      }
                      if (parsed.risks?.length) {
                        for (const r of parsed.risks) {
                          const risk = await db.addRisk(project.id, r.name, r.severity || 'medium', r.note || '', r.mitigation || '')
                          setRisks(p => [...p, risk])
                        }
                      }
                      if (parsed.costs?.length) {
                        for (const c of parsed.costs) {
                          const cost = await db.addCost(project.id, { name: c.name, category: c.category || 'Other', amount: c.amount || 0, cost_type: c.cost_type || 'monthly', note: '' })
                          setCosts(p => [...p, cost])
                        }
                      }
                      setImportRawText('')
                      setTab('gdd')
                      setProj(p => ({
                        ...p,
                        ...(parsed.projectName ? { name: parsed.projectName } : {}),
                        ...(parsed.genre ? { genre: parsed.genre } : {}),
                      }))
                    } catch {}
                  }}
                />
                <div className="text-[10px] text-[var(--muted)] font-mono mt-1">Data imports automatically as you paste valid JSON</div>
              </div>
            </div>
          )}

          {/* ── ASK CODEX ── */}
          {tab === 'ask' && (
            <div className="animate-fade-in">
              <div className="text-xs font-mono text-[var(--muted)] bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 mb-4">
                Copies your full project context to clipboard and opens your AI. Paste and send.
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {['Summarize my project', "What's at risk?", "What's out of scope?", 'What phase am I in?', 'Pitch me my own game'].map(q => (
                  <button key={q} className={btnGhost} onClick={() => openWithAI(`Answer based ONLY on this project data:\n\n${buildContext()}\n\nQuestion: ${q}`)}>
                    {q} ↗
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <textarea
                  className={inputCls + ' flex-1 resize-none'}
                  rows={3}
                  placeholder="Ask anything about your project..."
                  value={askInput}
                  onChange={e => setAskInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (askInput.trim()) { openWithAI(`Answer based ONLY on this project data:\n\n${buildContext()}\n\nQuestion: ${askInput}`); setAskInput('') } } }}
                />
                <button
                  className={btnAccent + ' self-end'}
                  style={{ background: AI_PROVIDERS[aiProvider]?.color }}
                  onClick={() => { if (askInput.trim()) { openWithAI(`Answer based ONLY on this project data:\n\n${buildContext()}\n\nQuestion: ${askInput}`); setAskInput('') } }}
                >↗</button>
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="animate-fade-in space-y-6">
              <div>
                <div className={sectionTitle + ' mb-3'}>AI Provider</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(AI_PROVIDERS).map(([key, p]) => (
                    <button key={key} onClick={() => setAiProvider(key)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${aiProvider === key ? 'border-[var(--accent)] bg-[rgba(232,255,71,0.04)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--muted2)]'}`}>
                      <div className="text-lg mb-1" style={{ color: p.color }}>{p.icon}</div>
                      <div className="font-mono text-xs font-medium">{p.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className={sectionTitle + ' mb-3'}>Notifications</div>
                <div className="space-y-2">
                  {Object.entries(notifSettings).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3">
                      <div className="text-sm">{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</div>
                      <button
                        onClick={() => setNotifSettings(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        className={`w-8 h-5 rounded-full relative transition-colors ${val ? 'bg-[var(--accent)]' : 'bg-[var(--muted2)]'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${val ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className={sectionTitle + ' mb-3'}>Project</div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg divide-y divide-[var(--border)]">
                  {[
                    { label: 'Project Name', value: proj.name },
                    { label: 'Genre', value: proj.genre },
                    { label: 'Your Role', value: currentUser.role },
                    { label: 'Members', value: `${members.length}` },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between px-4 py-3">
                      <div className="text-sm">{item.label}</div>
                      <div className="font-mono text-xs text-[var(--muted)] capitalize">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className={sectionTitle + ' mb-3'}>Invite Team</div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center">
                  <div className="text-sm text-[var(--muted)] mb-4">Generate a link to invite teammates to this project.</div>
                  <InviteButton projectId={project.id} btnAccent={btnAccent} />
                  <div className="font-mono text-[9px] text-[var(--muted)] mt-3">Links expire after 7 days · 10 max uses</div>
                </div>
              </div>

              <div className="font-mono text-[9px] text-[var(--muted)] text-center pt-2 border-t border-[var(--border)]">
                Codex v1.0 · Game Studio OS · Powered by Supabase
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MOBILE BOTTOM TABS */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-[var(--tab-h)] bg-[var(--surface)] border-t border-[var(--border)] z-40 flex overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 border-none transition-colors ${tab === t.id ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}>
            <span className="text-lg leading-none">{t.icon}</span>
            <span className="font-mono text-[8px] tracking-tight uppercase truncate max-w-full px-0.5">{t.label}</span>
          </button>
        ))}
      </div>

      {/* AI LAUNCH MODAL */}
      {aiModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center" onClick={() => setAiModal(null)}>
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl md:rounded-xl w-full max-w-md p-5 md:p-6 animate-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="w-8 h-1 bg-[var(--muted2)] rounded-full mx-auto mb-4 md:hidden" />
            <h3 className="font-display font-bold text-base mb-1">Open with AI</h3>
            <p className="text-[var(--muted)] text-xs mb-4 leading-relaxed">Copy the prompt, then tap to open your AI and paste it.</p>
            <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg p-3 font-mono text-[10px] text-[var(--muted)] leading-relaxed max-h-24 overflow-y-auto mb-4 select-all">
              {aiModal.prompt.slice(0, 400)}{aiModal.prompt.length > 400 ? '…' : ''}
            </div>
            <div className="flex gap-2 mb-4">
              <button className={btnAccent + ' flex-1'} onClick={async () => { try { await navigator.clipboard.writeText(aiModal.prompt) } catch {} setCopiedKey('modal'); setTimeout(() => setCopiedKey(null), 2000) }}>
                {copiedKey === 'modal' ? '✓ Copied!' : '📋 Copy Prompt'}
              </button>
              <button className={btnGhost} onClick={() => setAiModal(null)}>Cancel</button>
            </div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] mb-2">Open {AI_PROVIDERS[aiProvider]?.name}</div>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: '🌐 Web', url: AI_PROVIDERS[aiProvider]?.url }, { label: '📱 iOS App', url: 'claude://new' }, { label: '💻 Desktop', url: AI_PROVIDERS[aiProvider]?.url }].map(item => (
                <button key={item.label} className="bg-[var(--surface2)] border border-[var(--border)] rounded-lg py-3 text-xs font-mono text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all active:scale-95"
                  onClick={() => window.open(item.url, '_blank')}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components (defined inline for single-file simplicity) ──────

function InviteButton({ projectId, btnAccent }: { projectId: string; btnAccent: string }) {
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const generate = async () => {
    const invite = await db.createInvite(projectId)
    const url = `${window.location.origin}/invite/${invite.code}`
    setLink(url)
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }
  return (
    <div>
      <button className={btnAccent} onClick={generate}>{copied ? '✓ Link Copied!' : 'Generate Invite Link'}</button>
      {link && <div className="font-mono text-[9px] text-[var(--accent3)] mt-2 break-all">{link}</div>}
    </div>
  )
}

// Stub sub-components — each tab is a full component in a real build
// For now they render a placeholder; each would be split into its own file
function DecisionTab(p: any) { return <DecisionTabImpl {...p} /> }
function ClarityTab(p: any) { return <ClarityTabImpl {...p} /> }
function BudgetTab(p: any) { return <BudgetTabImpl {...p} /> }
function InvestorsTab(p: any) { return <InvestorsTabImpl {...p} /> }
function AssetsTab(p: any) { return <AssetsTabImpl {...p} /> }
function CostsTab(p: any) { return <CostsTabImpl {...p} /> }

// ── Full implementations of each tab ─────────────────────────────
function DecisionTabImpl({ decisions, projectId, currentUserId, chip, btnAccent, btnGhost, btnDanger, inputCls, cardCls, sectionHdr, sectionTitle, onAdd, onDelete }: any) {
  const [show, setShow] = useState(false)
  const [section, setSection] = useState('')
  const [chose, setChose] = useState('')
  const [rejected, setRejected] = useState('')
  const [saving, setSaving] = useState(false)
  const add = async () => {
    if (!chose.trim()) return
    setSaving(true)
    try { const d = await db.addDecision(projectId, section || 'General', chose, rejected, currentUserId); onAdd(d); setChose(''); setRejected(''); setSection(''); setShow(false) } finally { setSaving(false) }
  }
  return (
    <div>
      <div className={sectionHdr}><div className={sectionTitle}>Decision Log</div><button className={btnAccent} onClick={() => setShow(v => !v)}>{show ? 'Cancel' : '+ Add'}</button></div>
      {show && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-4 animate-slide-in space-y-3">
        <div><div className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] mb-1.5">Section / Area</div><input className={inputCls} placeholder="Core Mechanics, Tech, Art..." value={section} onChange={e => setSection(e.target.value)} /></div>
        <div><div className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] mb-1.5">What you chose</div><textarea className={inputCls + ' resize-none'} rows={2} placeholder="The decision and rationale..." value={chose} onChange={e => setChose(e.target.value)} /></div>
        <div><div className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] mb-1.5">What you rejected (optional)</div><textarea className={inputCls + ' resize-none'} rows={2} placeholder="Alternatives considered..." value={rejected} onChange={e => setRejected(e.target.value)} /></div>
        <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={() => setShow(false)}>Cancel</button><button className={btnAccent} onClick={add} disabled={saving || !chose.trim()}>{saving ? 'Saving...' : 'Log It'}</button></div>
      </div>}
      <div className="space-y-2">
        {decisions.map((d: any, idx: number) => (
          <div key={d.id} style={{ animationDelay: `${idx * 30}ms` }} className="bg-[var(--surface)] border border-l-[3px] border-[var(--border)] border-l-[var(--accent)] rounded-lg p-3.5 animate-slide-in">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-wider bg-[rgba(232,255,71,0.1)] text-[var(--accent)] px-2 py-0.5 rounded-full">{d.section || 'General'}</span>
              <span className="font-mono text-[9px] text-[var(--muted)] ml-auto">{new Date(d.created_at).toLocaleDateString()}</span>
              <button className={btnDanger} onClick={() => { db.deleteDecision(d.id); onDelete(d.id) }}>✕</button>
            </div>
            <div className="text-sm font-medium mb-1 leading-relaxed">{d.chose}</div>
            {d.rejected && <div className="text-xs text-[var(--muted)] italic"><span className="not-italic text-[var(--accent2)] font-mono text-[9px] uppercase mr-1">rejected</span>{d.rejected}</div>}
          </div>
        ))}
        {decisions.length === 0 && <div className="text-center py-10 text-[var(--muted)] text-sm"><div className="text-2xl mb-2">🗂</div>No decisions logged yet.</div>}
      </div>
    </div>
  )
}

function ClarityTabImpl({ tasks, milestones, features, risks, members, goalTab, currentTasks, projectId, currentUserId, chip, btnAccent, btnGhost, btnDanger, inputCls, selectCls, cardCls, sectionHdr, sectionTitle, setGoalTab, onTaskAdd, onTaskUpdate, onTaskDelete, onMilestoneAdd, onMilestoneUpdate, onMilestoneDelete, onFeatureAdd, onFeatureUpdate, onFeatureDelete, onRiskAdd, onRiskDelete }: any) {
  const [newTask, setNewTask] = useState({ text: '', priority: 'medium', assigneeId: '' })
  const [newMs, setNewMs] = useState({ name: '', status: 'planned', progress: 0, target: '' })
  const [newFeat, setNewFeat] = useState({ name: '', note: '', status: 'planned' })
  const [newRisk, setNewRisk] = useState({ name: '', severity: 'medium', note: '', mitigation: '' })
  const [showTask, setShowTask] = useState(false)
  const [showMs, setShowMs] = useState(false)
  const [showFeat, setShowFeat] = useState(false)
  const [showRisk, setShowRisk] = useState(false)

  return (
    <div className="space-y-6">
      {/* Goals */}
      <div>
        <div className={sectionHdr}><div className={sectionTitle}>Goals</div><button className={btnAccent} onClick={() => setShowTask(v=>!v)}>{showTask?'Cancel':'+ Add'}</button></div>
        <div className="flex border-b border-[var(--border)] mb-4 overflow-x-auto">
          {(['daily','weekly','monthly','yearly'] as const).map(g => (
            <button key={g} onClick={() => setGoalTab(g)} className={`px-3 py-2 font-mono text-xs uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${goalTab===g ? 'text-[var(--accent)] border-[var(--accent)]' : 'text-[var(--muted)] border-transparent'}`}>{g}</button>
          ))}
        </div>
        {showTask && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
          <input className={inputCls} placeholder="What needs to get done..." value={newTask.text} onChange={e=>setNewTask(p=>({...p,text:e.target.value}))} autoFocus />
          <div className="flex gap-2">
            <select className={selectCls + ' flex-1'} value={newTask.priority} onChange={e=>setNewTask(p=>({...p,priority:e.target.value}))}>
              {['high','medium','low'].map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button className={btnGhost} onClick={()=>setShowTask(false)}>Cancel</button>
            <button className={btnAccent} onClick={async()=>{if(!newTask.text.trim())return;const t=await db.addTask(projectId,newTask.text,goalTab,newTask.priority,newTask.assigneeId||undefined);onTaskAdd(t);setNewTask({text:'',priority:'medium',assigneeId:''});setShowTask(false)}}>Add</button>
          </div>
        </div>}
        <div className="space-y-2">
          {currentTasks.map((t: any,idx:number) => (
            <div key={t.id} style={{animationDelay:`${idx*25}ms`}} className={`flex items-start gap-3 p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg transition-opacity animate-[slideRight_0.18s_ease_both] ${t.done?'opacity-50':''}`}>
              <button onClick={()=>{db.updateTask(t.id,{done:!t.done});onTaskUpdate(t.id,{done:!t.done})}} className={`w-4.5 h-4.5 rounded flex-shrink-0 mt-0.5 border-2 flex items-center justify-center transition-all ${t.done?'bg-[var(--accent)] border-[var(--accent)]':'border-[var(--border)]'}`}>
                {t.done && <span className="text-black text-[10px] font-bold">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm leading-relaxed ${t.done?'line-through text-[var(--muted)]':''}`}>{t.text}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority==='high'?'bg-[var(--red)]':t.priority==='medium'?'bg-yellow-400':'bg-[var(--green)]'}`} />
                  <span className="font-mono text-[9px] text-[var(--muted)]">{t.priority}</span>
                </div>
              </div>
              <button className={btnDanger} onClick={()=>{db.deleteTask(t.id);onTaskDelete(t.id)}}>✕</button>
            </div>
          ))}
          {currentTasks.length===0 && <div className="text-center py-8 text-[var(--muted)] text-xs font-mono">No {goalTab} goals yet.</div>}
        </div>
      </div>

      {/* Milestones */}
      <div>
        <div className={sectionHdr}><div className={sectionTitle}>📍 Milestones</div><button className={btnAccent} onClick={()=>setShowMs(v=>!v)}>{showMs?'Cancel':'+ Add'}</button></div>
        {showMs && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
          <input className={inputCls} placeholder="Phase 5 — Launch" value={newMs.name} onChange={e=>setNewMs(p=>({...p,name:e.target.value}))} />
          <div className="flex gap-2">
            <select className={selectCls + ' flex-1'} value={newMs.status} onChange={e=>setNewMs(p=>({...p,status:e.target.value}))}>
              {['planned','active','done'].map(s=><option key={s}>{s}</option>)}
            </select>
            <input className={inputCls + ' flex-1'} placeholder="Target: 2027-Q1" value={newMs.target} onChange={e=>setNewMs(p=>({...p,target:e.target.value}))} />
          </div>
          <div className="flex gap-2 justify-end">
            <button className={btnGhost} onClick={()=>setShowMs(false)}>Cancel</button>
            <button className={btnAccent} onClick={async()=>{if(!newMs.name.trim())return;const m=await db.addMilestone(projectId,newMs.name,newMs.status,newMs.progress,newMs.target);onMilestoneAdd(m);setNewMs({name:'',status:'planned',progress:0,target:''});setShowMs(false)}}>Add</button>
          </div>
        </div>}
        <div className="space-y-2">
          {milestones.map((m:any) => (
            <div key={m.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div><div className="text-sm font-medium">{m.name}</div>{m.target_date&&<div className="font-mono text-[9px] text-[var(--muted)] mt-0.5">Target: {m.target_date}</div>}</div>
                <div className="flex items-center gap-2">{chip(m.status)}<button className={btnDanger} onClick={()=>{db.deleteMilestone(m.id);onMilestoneDelete(m.id)}}>✕</button></div>
              </div>
              <div className="h-1 bg-[var(--muted2)] rounded-full overflow-hidden mb-1.5"><div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500" style={{width:`${m.progress}%`}}/></div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px] text-[var(--muted)]">{m.progress}%</span>
                <input type="range" min={0} max={100} value={m.progress} className="w-20 accent-[var(--accent)]" onChange={e=>{const v=Number(e.target.value);db.updateMilestone(m.id,{progress:v});onMilestoneUpdate(m.id,{progress:v})}} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <div className={sectionHdr}>
          <div className={sectionTitle}>⚡ Features</div>
          <div className="flex items-center gap-2"><span className="font-mono text-[10px] text-[var(--muted)]">{features.filter((f:any)=>f.status==='done').length}/{features.length}</span><button className={btnAccent} onClick={()=>setShowFeat(v=>!v)}>{showFeat?'Cancel':'+ Add'}</button></div>
        </div>
        {showFeat && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
          <div className="flex gap-2"><input className={inputCls + ' flex-1'} placeholder="Feature name" value={newFeat.name} onChange={e=>setNewFeat(p=>({...p,name:e.target.value}))} /><select className={selectCls} style={{width:'auto'}} value={newFeat.status} onChange={e=>setNewFeat(p=>({...p,status:e.target.value}))}>{['planned','active','done','cut'].map(s=><option key={s}>{s}</option>)}</select></div>
          <input className={inputCls} placeholder="Notes..." value={newFeat.note} onChange={e=>setNewFeat(p=>({...p,note:e.target.value}))} />
          <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShowFeat(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newFeat.name.trim())return;const f=await db.addFeature(projectId,newFeat.name,newFeat.note,newFeat.status);onFeatureAdd(f);setNewFeat({name:'',note:'',status:'planned'});setShowFeat(false)}}>Add</button></div>
        </div>}
        <div className="space-y-2">
          {features.map((f:any) => (
            <div key={f.id} className="flex items-start gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
              <div className="flex-1 min-w-0"><div className="text-sm font-medium">{f.name}</div>{f.note&&<div className="text-xs text-[var(--muted)] mt-0.5">{f.note}</div>}</div>
              <select className="bg-transparent border border-[var(--border)] rounded text-[10px] font-mono text-[var(--muted)] px-1 py-0.5 outline-none" value={f.status} onChange={e=>{db.updateFeature(f.id,{status:e.target.value});onFeatureUpdate(f.id,{status:e.target.value})}}>
                {['planned','active','done','cut'].map(s=><option key={s}>{s}</option>)}
              </select>
              <button className={btnDanger} onClick={()=>{db.deleteFeature(f.id);onFeatureDelete(f.id)}}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div>
        <div className={sectionHdr}><div className={sectionTitle}>⚠️ Risks</div><button className={btnAccent} onClick={()=>setShowRisk(v=>!v)}>{showRisk?'Cancel':'+ Add'}</button></div>
        {showRisk && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
          <div className="flex gap-2"><input className={inputCls + ' flex-1'} placeholder="What could go wrong..." value={newRisk.name} onChange={e=>setNewRisk(p=>({...p,name:e.target.value}))} /><select className={selectCls} style={{width:'auto'}} value={newRisk.severity} onChange={e=>setNewRisk(p=>({...p,severity:e.target.value}))}>{['high','medium','low'].map(s=><option key={s}>{s}</option>)}</select></div>
          <input className={inputCls} placeholder="Context..." value={newRisk.note} onChange={e=>setNewRisk(p=>({...p,note:e.target.value}))} />
          <input className={inputCls} placeholder="Mitigation plan..." value={newRisk.mitigation} onChange={e=>setNewRisk(p=>({...p,mitigation:e.target.value}))} />
          <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShowRisk(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newRisk.name.trim())return;const r=await db.addRisk(projectId,newRisk.name,newRisk.severity,newRisk.note,newRisk.mitigation);onRiskAdd(r);setNewRisk({name:'',severity:'medium',note:'',mitigation:''});setShowRisk(false)}}>Add</button></div>
        </div>}
        <div className="space-y-2">
          {risks.map((r:any) => (
            <div key={r.id} className={`bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3.5 border-l-4 ${r.severity==='high'?'border-l-[var(--red)]':r.severity==='medium'?'border-l-yellow-400':'border-l-[var(--green)]'}`}>
              <div className="flex items-center gap-2 mb-1 flex-wrap"><div className="text-sm font-medium flex-1">{r.name}</div>{chip(r.severity)}<button className={btnDanger} onClick={()=>{db.deleteRisk(r.id);onRiskDelete(r.id)}}>✕</button></div>
              {r.note&&<div className="text-xs text-[var(--muted)]">{r.note}</div>}
              {r.mitigation&&<div className="text-xs text-[var(--accent3)] italic mt-1">→ {r.mitigation}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BudgetTabImpl({ purchases, funding, budgets, projectId, btnAccent, btnGhost, btnDanger, inputCls, selectCls, sectionHdr, sectionTitle, fmtCurrency, onPurchaseAdd, onPurchaseDelete, onFundingAdd, onFundingDelete, onBudgetUpdate }: any) {
  const [showP, setShowP] = useState(false)
  const [showF, setShowF] = useState(false)
  const [newP, setNewP] = useState({ name:'', amount:'', purchase_date: new Date().toISOString().split('T')[0], category:'Other', budget_type:'monthly' })
  const [newF, setNewF] = useState({ name:'', amount:'', funding_date: new Date().toISOString().split('T')[0], funding_type:'self', note:'' })
  const totalIn = funding.reduce((a:number,f:any)=>a+Number(f.amount),0)
  const totalOut = purchases.reduce((a:number,p:any)=>a+Number(p.amount),0)
  const monthlySpent = purchases.filter((p:any)=>p.budget_type==='monthly').reduce((a:number,p:any)=>a+Number(p.amount),0)
  const projectSpent = purchases.reduce((a:number,p:any)=>a+Number(p.amount),0)
  const budgetItems = [
    {label:'Weekly',limit:budgets.weekly.limit,spent:purchases.filter((p:any)=>p.budget_type==='weekly').reduce((a:number,p:any)=>a+Number(p.amount),0)},
    {label:'Monthly',limit:budgets.monthly.limit,spent:monthlySpent},
    {label:'Project',limit:budgets.project.limit,spent:projectSpent},
  ]
  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {budgetItems.map(b => {
          const pct = Math.min((b.spent/b.limit)*100,100)
          const over = b.spent > b.limit
          return (
            <div key={b.label} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3">
              <div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">{b.label}</div>
              <div className={`font-mono font-semibold text-lg ${over?'text-[var(--red)]':'text-[var(--accent)]'}`}>{fmtCurrency(b.spent)}</div>
              <div className="font-mono text-[9px] text-[var(--muted)] mb-2">of {fmtCurrency(b.limit)}</div>
              <div className="h-1 bg-[var(--muted2)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{width:`${pct}%`,background:over?'var(--red)':'var(--accent)'}} />
              </div>
              <input type="number" value={b.limit} onChange={e=>{const l=Number(e.target.value);const k=b.label.toLowerCase();const nb={...budgets,[k]:{limit:l}};onBudgetUpdate(nb)}} className="mt-2 w-full bg-transparent font-mono text-[9px] text-[var(--muted)] outline-none border-b border-[var(--border)] pb-0.5" />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        {[{l:'Total In',v:fmtCurrency(totalIn),c:'text-[var(--green)]'},{l:'Total Out',v:fmtCurrency(totalOut),c:'text-[var(--red)]'},{l:'Balance',v:fmtCurrency(totalIn-totalOut),c:totalIn-totalOut>=0?'text-[var(--green)]':'text-[var(--red)]'}].map(s=>(
          <div key={s.l} className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">{s.l}</div><div className={`font-mono font-semibold text-base ${s.c}`}>{s.v}</div></div>
        ))}
      </div>
      <div className={sectionHdr}><div className={sectionTitle}>Purchases</div><button className={btnAccent} onClick={()=>setShowP(v=>!v)}>{showP?'Cancel':'+ Add'}</button></div>
      {showP && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
        <div className="flex gap-2"><input className={inputCls+' flex-1'} placeholder="What did you buy?" value={newP.name} onChange={e=>setNewP(p=>({...p,name:e.target.value}))} /><input className={inputCls} type="number" placeholder="$" value={newP.amount} onChange={e=>setNewP(p=>({...p,amount:e.target.value}))} style={{width:80}} /></div>
        <div className="flex gap-2"><input className={inputCls+' flex-1'} type="date" value={newP.purchase_date} onChange={e=>setNewP(p=>({...p,purchase_date:e.target.value}))} /><select className={selectCls} value={newP.budget_type} onChange={e=>setNewP(p=>({...p,budget_type:e.target.value}))}>{['weekly','monthly','project'].map(t=><option key={t}>{t}</option>)}</select></div>
        <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShowP(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newP.name||!newP.amount)return;const p=await db.addPurchase(projectId,{...newP,amount:Number(newP.amount)});onPurchaseAdd(p);setNewP({name:'',amount:'',purchase_date:new Date().toISOString().split('T')[0],category:'Other',budget_type:'monthly'});setShowP(false)}}>Record</button></div>
      </div>}
      <div className="space-y-2">
        {purchases.map((p:any)=>(
          <div key={p.id} className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex-1 min-w-0"><div className="text-sm font-medium">{p.name}</div><div className="font-mono text-[9px] text-[var(--muted)]">{p.purchase_date} · {p.budget_type}</div></div>
            <div className="font-mono text-sm text-[var(--red)]">-{fmtCurrency(p.amount)}</div>
            <button className={btnDanger} onClick={()=>{db.deletePurchase(p.id);onPurchaseDelete(p.id)}}>✕</button>
          </div>
        ))}
      </div>
      <div className={sectionHdr}><div className={sectionTitle}>Funding Received</div><button className={btnAccent} onClick={()=>setShowF(v=>!v)}>{showF?'Cancel':'+ Add'}</button></div>
      {showF && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
        <div className="flex gap-2"><input className={inputCls+' flex-1'} placeholder="Source name" value={newF.name} onChange={e=>setNewF(f=>({...f,name:e.target.value}))} /><input className={inputCls} type="number" placeholder="$" value={newF.amount} onChange={e=>setNewF(f=>({...f,amount:e.target.value}))} style={{width:80}} /></div>
        <div className="flex gap-2"><input className={inputCls+' flex-1'} type="date" value={newF.funding_date} onChange={e=>setNewF(f=>({...f,funding_date:e.target.value}))} /><select className={selectCls} value={newF.funding_type} onChange={e=>setNewF(f=>({...f,funding_type:e.target.value}))}>{['self','investor','grant','loan','revenue','other'].map(t=><option key={t}>{t}</option>)}</select></div>
        <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShowF(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newF.name||!newF.amount)return;const f=await db.addFunding(projectId,{...newF,amount:Number(newF.amount)});onFundingAdd(f);setNewF({name:'',amount:'',funding_date:new Date().toISOString().split('T')[0],funding_type:'self',note:''});setShowF(false)}}>Add</button></div>
      </div>}
      <div className="space-y-2">
        {funding.map((f:any)=>(
          <div key={f.id} className="flex items-center gap-3 bg-[var(--surface)] border-l-4 border-l-[var(--green)] border-[var(--border)] rounded-lg p-3">
            <div className="flex-1 min-w-0"><div className="text-sm font-medium">{f.name}</div><div className="font-mono text-[9px] text-[var(--muted)]">{f.funding_date} · {f.funding_type}</div></div>
            <div className="font-mono text-sm text-[var(--green)]">+{fmtCurrency(f.amount)}</div>
            <button className={btnDanger} onClick={()=>{db.deleteFunding(f.id);onFundingDelete(f.id)}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function InvestorsTabImpl({ investors, fundingTarget, fundingRound, projectId, funding, btnAccent, btnGhost, btnDanger, inputCls, selectCls, sectionHdr, sectionTitle, fmtCurrency, chip, onAdd, onUpdate, onDelete, onTargetUpdate, onRoundUpdate }: any) {
  const [show, setShow] = useState(false)
  const [newInv, setNewInv] = useState({ name:'', amount:'', investor_date:new Date().toISOString().split('T')[0], status:'verbal', note:'' })
  const totalRaised = investors.filter((i:any)=>i.status==='closed').reduce((a:number,i:any)=>a+Number(i.amount),0)
  const pct = Math.min((totalRaised/fundingTarget)*100,100)
  const ROUNDS = ['Pre-seed','Seed','Series A','Series B','Grant','Self-funded','Bridge']
  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 text-center">
        <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--muted)] mb-2">{fundingRound}</div>
        <div className="font-mono font-bold text-4xl text-[var(--green)]">{fmtCurrency(totalRaised)}</div>
        <div className="text-xs text-[var(--muted)] mt-1">raised of <input type="number" value={fundingTarget} onChange={e=>onTargetUpdate(Number(e.target.value))} className="bg-transparent font-mono text-[var(--muted)] w-20 text-center border-b border-[var(--border)] outline-none inline" /></div>
        <div className="h-1.5 bg-[var(--muted2)] rounded-full mt-3 mb-2 overflow-hidden"><div className="h-full bg-[var(--green)] rounded-full transition-all duration-500" style={{width:`${pct}%`}} /></div>
        <div className="text-[10px] font-mono text-[var(--muted)]">{pct.toFixed(0)}% · {investors.length} investors</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {ROUNDS.map(r=><button key={r} onClick={()=>onRoundUpdate(r)} className={`font-mono text-[10px] px-3 py-1.5 rounded-full border transition-all ${fundingRound===r?'bg-[rgba(91,140,255,0.15)] text-[var(--accent3)] border-[rgba(91,140,255,0.3)]':'border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted2)]'}`}>{r}</button>)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(['closed','committed','verbal'] as const).map(s=>{
          const total = investors.filter((i:any)=>i.status===s).reduce((a:number,i:any)=>a+Number(i.amount),0)
          return <div key={s} className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">{s}</div><div className={`font-mono font-semibold text-sm ${s==='closed'?'text-[var(--green)]':s==='committed'?'text-[var(--accent3)]':'text-yellow-400'}`}>{fmtCurrency(total)}</div></div>
        })}
      </div>
      <div className={sectionHdr}><div className={sectionTitle}>Investors</div><button className={btnAccent} onClick={()=>setShow(v=>!v)}>{show?'Cancel':'+ Add'}</button></div>
      {show && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
        <div className="flex gap-2"><input className={inputCls+' flex-1'} placeholder="Investor / Fund name" value={newInv.name} onChange={e=>setNewInv(p=>({...p,name:e.target.value}))} /><input className={inputCls} type="number" placeholder="$" value={newInv.amount} onChange={e=>setNewInv(p=>({...p,amount:e.target.value}))} style={{width:90}} /></div>
        <div className="flex gap-2"><input className={inputCls+' flex-1'} type="date" value={newInv.investor_date} onChange={e=>setNewInv(p=>({...p,investor_date:e.target.value}))} /><select className={selectCls} value={newInv.status} onChange={e=>setNewInv(p=>({...p,status:e.target.value}))}>{['prospect','verbal','committed','closed'].map(s=><option key={s}>{s}</option>)}</select></div>
        <textarea className={inputCls+' resize-none'} rows={2} placeholder="Notes..." value={newInv.note} onChange={e=>setNewInv(p=>({...p,note:e.target.value}))} />
        <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShow(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newInv.name||!newInv.amount)return;const i=await db.addInvestor(projectId,{...newInv,amount:Number(newInv.amount)});onAdd(i);setNewInv({name:'',amount:'',investor_date:new Date().toISOString().split('T')[0],status:'verbal',note:''});setShow(false)}}>Add</button></div>
      </div>}
      <div className="space-y-2">
        {investors.length===0 && <div className="text-center py-8 text-[var(--muted)] text-sm"><div className="text-2xl mb-2">🏦</div>No investors yet.</div>}
        {investors.map((inv:any)=>(
          <div key={inv.id} className="bg-[var(--surface)] border border-[var(--border)] border-l-4 border-l-[var(--accent3)] rounded-lg p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div><div className="text-sm font-semibold">{inv.name}</div><div className="font-mono text-[9px] text-[var(--muted)] mt-0.5">{inv.investor_date}</div></div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="font-mono font-bold text-base text-[var(--green)]">{fmtCurrency(inv.amount)}</div>
                <select className="bg-transparent border border-[var(--border)] rounded text-[10px] font-mono text-[var(--muted)] px-1 py-0.5 outline-none" value={inv.status} onChange={e=>{db.updateInvestor(inv.id,{status:e.target.value});onUpdate(inv.id,{status:e.target.value})}}>
                  {['prospect','verbal','committed','closed'].map(s=><option key={s}>{s}</option>)}
                </select>
                <button className={btnDanger} onClick={()=>{db.deleteInvestor(inv.id);onDelete(inv.id)}}>✕</button>
              </div>
            </div>
            {inv.note && <div className="text-xs text-[var(--muted)] italic mt-2">{inv.note}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

function AssetsTabImpl({ assets, projectId, lockedAssets, btnAccent, btnGhost, btnDanger, inputCls, selectCls, sectionHdr, sectionTitle, fmtCurrency, chip, onAdd, onUpdate, onDelete }: any) {
  const [show, setShow] = useState(false)
  const [newA, setNewA] = useState({ name:'', store:'', price:'', priority:'considering', url:'' })
  const total = assets.reduce((a:number,c:any)=>a+Number(c.price),0)
  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex gap-6 flex-wrap">
        <div><div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">Locked In</div><div className="font-mono font-semibold text-xl text-[var(--accent)]">{fmtCurrency(lockedAssets)}</div></div>
        <div><div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">Total Listed</div><div className="font-mono font-semibold text-xl">{fmtCurrency(total)}</div></div>
        <div><div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">Assets</div><div className="font-mono font-semibold text-xl">{assets.length}</div></div>
      </div>
      <div className={sectionHdr}><div className={sectionTitle}>Asset Wishlist</div><button className={btnAccent} onClick={()=>setShow(v=>!v)}>{show?'Cancel':'+ Add'}</button></div>
      {show && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
        <div className="flex gap-2"><input className={inputCls+' flex-1'} placeholder="Asset name" value={newA.name} onChange={e=>setNewA(p=>({...p,name:e.target.value}))} /><input className={inputCls} type="number" placeholder="$" value={newA.price} onChange={e=>setNewA(p=>({...p,price:e.target.value}))} style={{width:80}} /></div>
        <div className="flex gap-2"><input className={inputCls+' flex-1'} placeholder="Store (Fab, Unity...)" value={newA.store} onChange={e=>setNewA(p=>({...p,store:e.target.value}))} /><select className={selectCls} value={newA.priority} onChange={e=>setNewA(p=>({...p,priority:e.target.value}))}>{['locked','considering','someday'].map(s=><option key={s}>{s}</option>)}</select></div>
        <input className={inputCls} placeholder="URL (optional)" value={newA.url} onChange={e=>setNewA(p=>({...p,url:e.target.value}))} />
        <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShow(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newA.name)return;const a=await db.addAsset(projectId,{...newA,price:Number(newA.price)||0});onAdd(a);setNewA({name:'',store:'',price:'',priority:'considering',url:''});setShow(false)}}>Add</button></div>
      </div>}
      {(['locked','considering','someday'] as const).map(priority=>{
        const group = assets.filter((a:any)=>a.priority===priority)
        if (!group.length) return null
        return (
          <div key={priority}>
            <div className="flex items-center gap-2 mb-2">{chip(priority)}<span className="font-mono text-[10px] text-[var(--muted)]">{fmtCurrency(group.reduce((a:number,c:any)=>a+Number(c.price),0))}</span></div>
            <div className="space-y-2">
              {group.map((a:any)=>(
                <div key={a.id} className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
                  <div className="flex-1 min-w-0"><div className="text-sm font-medium">{a.name}</div><div className="font-mono text-[9px] text-[var(--muted)]">{a.store}{a.url&&<> · <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent3)]">↗ link</a></>}</div></div>
                  <select className="bg-transparent border border-[var(--border)] rounded text-[10px] font-mono text-[var(--muted)] px-1 py-0.5 outline-none" value={a.priority} onChange={e=>{db.updateAsset(a.id,{priority:e.target.value as any});onUpdate(a.id,{priority:e.target.value})}}>
                    {['locked','considering','someday'].map(s=><option key={s}>{s}</option>)}
                  </select>
                  <div className="font-mono text-sm text-[var(--accent)]">{fmtCurrency(a.price)}</div>
                  <button className={btnDanger} onClick={()=>{db.deleteAsset(a.id);onDelete(a.id)}}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CostsTabImpl({ costs, projectId, totalMonthly, totalOneTime, btnAccent, btnGhost, btnDanger, inputCls, selectCls, sectionHdr, sectionTitle, fmtCurrency, onAdd, onDelete }: any) {
  const [show, setShow] = useState(false)
  const [newC, setNewC] = useState({ name:'', category:'Other', amount:'', cost_type:'monthly', note:'' })
  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[{l:'Monthly Burn',v:fmtCurrency(totalMonthly),c:'text-[var(--red)]',s:'/month'},{l:'One-Time',v:fmtCurrency(totalOneTime),c:'',s:'committed'},{l:'Year 1 Est.',v:fmtCurrency(totalMonthly*12+totalOneTime),c:'text-yellow-400',s:'total'}].map(s=>(
          <div key={s.l} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3"><div className="font-mono text-[9px] uppercase tracking-wider text-[var(--muted)] mb-1">{s.l}</div><div className={`font-mono font-semibold text-lg ${s.c}`}>{s.v}</div><div className="font-mono text-[9px] text-[var(--muted)]">{s.s}</div></div>
        ))}
      </div>
      <div className={sectionHdr}><div className={sectionTitle}>Project Costs</div><button className={btnAccent} onClick={()=>setShow(v=>!v)}>{show?'Cancel':'+ Add'}</button></div>
      {show && <div className="bg-[var(--surface)] border border-[var(--border)] border-t-2 border-t-[var(--accent)] rounded-xl p-4 mb-3 animate-slide-in space-y-3">
        <div className="flex gap-2"><input className={inputCls+' flex-1'} placeholder="Cost name" value={newC.name} onChange={e=>setNewC(p=>({...p,name:e.target.value}))} /><input className={inputCls} type="number" placeholder="$" value={newC.amount} onChange={e=>setNewC(p=>({...p,amount:e.target.value}))} style={{width:80}} /></div>
        <div className="flex gap-2"><select className={selectCls+' flex-1'} value={newC.category} onChange={e=>setNewC(p=>({...p,category:e.target.value}))}>{['Engine','Plugin','Tools','Assets','Marketing','Salary','Hardware','Other'].map(c=><option key={c}>{c}</option>)}</select><select className={selectCls} value={newC.cost_type} onChange={e=>setNewC(p=>({...p,cost_type:e.target.value}))}>{['monthly','one-time','royalty'].map(t=><option key={t}>{t}</option>)}</select></div>
        <div className="flex gap-2 justify-end"><button className={btnGhost} onClick={()=>setShow(false)}>Cancel</button><button className={btnAccent} onClick={async()=>{if(!newC.name)return;const c=await db.addCost(projectId,{...newC,amount:Number(newC.amount)||0});onAdd(c);setNewC({name:'',category:'Other',amount:'',cost_type:'monthly',note:''});setShow(false)}}>Add</button></div>
      </div>}
      <div className="space-y-2">
        {costs.map((c:any)=>(
          <div key={c.id} className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex-1 min-w-0"><div className="text-sm font-medium">{c.name}</div><div className="font-mono text-[9px] text-[var(--muted)]">{c.category}</div></div>
            <div className="text-right"><div className="font-mono text-sm text-[var(--red)]">{fmtCurrency(c.amount)}</div><div className="font-mono text-[9px] text-[var(--muted)]">{c.cost_type}</div></div>
            <button className={btnDanger} onClick={()=>{db.deleteCost(c.id);onDelete(c.id)}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
