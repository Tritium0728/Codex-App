'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProject } from '@/lib/db'

const GENRES = [
  { key: 'shooter', icon: '🎯', name: 'Action / Shooter' },
  { key: 'rpg', icon: '⚔️', name: 'RPG' },
  { key: 'strategy', icon: '🏰', name: 'Strategy' },
  { key: 'narrative', icon: '📖', name: 'Narrative' },
  { key: 'platformer', icon: '🍄', name: 'Platformer' },
  { key: 'puzzle', icon: '🧩', name: 'Puzzle' },
  { key: 'simulation', icon: '🏗️', name: 'Simulation' },
  { key: 'horror', icon: '👻', name: 'Horror' },
  { key: 'blank', icon: '✦', name: 'Blank / Custom' },
]

interface Props {
  userId: string
  large?: boolean
  card?: boolean
}

export default function NewProjectButton({ userId, large, card }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [genre, setGenre] = useState('blank')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      const project = await createProject(name.trim(), genre, userId)
      router.push(`/dashboard/${project.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (card) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="bg-[var(--surface)] border-2 border-dashed border-[var(--border)] rounded-xl p-6 hover:border-[var(--accent)] hover:bg-[rgba(232,255,71,0.03)] transition-all text-left group"
        >
          <div className="text-2xl mb-3 opacity-40 group-hover:opacity-100 transition-opacity">+</div>
          <div className="font-display font-bold text-base text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">
            New Project
          </div>
          <div className="font-mono text-xs text-[var(--muted)] mt-1">Create or import</div>
        </button>
        {open && <Modal name={name} setName={setName} genre={genre} setGenre={setGenre} loading={loading} error={error} onCreate={handleCreate} onClose={() => setOpen(false)} />}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`bg-[var(--accent)] text-black font-mono font-semibold tracking-wider rounded-lg hover:opacity-85 transition-opacity ${large ? 'text-sm px-8 py-3' : 'text-xs px-4 py-2'}`}
      >
        + New Project
      </button>
      {open && <Modal name={name} setName={setName} genre={genre} setGenre={setGenre} loading={loading} error={error} onCreate={handleCreate} onClose={() => setOpen(false)} />}
    </>
  )
}

function Modal({ name, setName, genre, setGenre, loading, error, onCreate, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl md:rounded-xl w-full max-w-md p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-9 h-1 bg-[var(--muted2)] rounded-full mx-auto mb-5 md:hidden" />
        <h2 className="font-display font-bold text-lg mb-1">New Project</h2>
        <p className="text-[var(--muted)] text-sm mb-5">Give it a name and pick a genre template.</p>

        <div className="mb-4">
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">Project Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onCreate()}
            className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-3 text-[var(--text)] outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="My Awesome Game"
          />
        </div>

        <div className="mb-5">
          <label className="block font-mono text-xs tracking-widest uppercase text-[var(--muted)] mb-2">Genre Template</label>
          <div className="grid grid-cols-3 gap-2">
            {GENRES.map(g => (
              <button
                key={g.key}
                onClick={() => setGenre(g.key)}
                className={`p-3 rounded-lg border text-center transition-all ${genre === g.key ? 'border-[var(--accent)] bg-[rgba(232,255,71,0.06)]' : 'border-[var(--border)] bg-[var(--surface2)] hover:border-[var(--muted2)]'}`}
              >
                <div className="text-xl mb-1">{g.icon}</div>
                <div className="font-mono text-xs text-[var(--muted)] leading-tight">{g.name}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="text-red-400 text-sm font-mono mb-3">{error}</div>}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 border border-[var(--border)] text-[var(--muted)] font-mono text-sm py-3 rounded-lg hover:border-[var(--muted2)] transition-colors">
            Cancel
          </button>
          <button
            onClick={onCreate}
            disabled={loading || !name.trim()}
            className="flex-1 bg-[var(--accent)] text-black font-mono font-semibold text-sm py-3 rounded-lg hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {loading ? 'Creating...' : 'Create Project →'}
          </button>
        </div>
      </div>
    </div>
  )
}
