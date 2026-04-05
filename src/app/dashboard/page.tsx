import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NewProjectButton from '@/components/NewProjectButton'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get projects user is a member of
  const { data: memberships } = await supabase
    .from('project_members')
    .select('role, projects(id, name, genre, created_at, updated_at)')
    .eq('user_id', user!.id)
    .order('joined_at', { ascending: false })

  const projects = memberships?.map((m: any) => ({ ...m.projects, role: m.role })) ?? []

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, color')
    .eq('id', user!.id)
    .single()

  const GENRE_ICONS: Record<string, string> = {
    shooter: '🎯', rpg: '⚔️', strategy: '🏰', narrative: '📖',
    platformer: '🍄', puzzle: '🧩', simulation: '🏗️', horror: '👻', blank: '✦',
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Topbar */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 h-14 flex items-center justify-between">
        <span className="font-display font-bold text-sm tracking-widest text-[var(--accent)] uppercase">Codex</span>
        <div className="flex items-center gap-3">
          <span className="text-[var(--muted)] font-mono text-xs">{profile?.name}</span>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="text-[var(--muted)] font-mono text-xs hover:text-[var(--text)] transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display font-bold text-2xl mb-1">Your Projects</h1>
            <p className="text-[var(--muted)] text-sm">
              {projects.length === 0 ? 'No projects yet — create your first one' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <NewProjectButton userId={user!.id} />
        </div>

        {projects.length === 0 ? (
          <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-16 text-center">
            <div className="text-5xl mb-4">✦</div>
            <div className="font-display font-bold text-xl mb-2">Start your first project</div>
            <p className="text-[var(--muted)] text-sm mb-6 max-w-sm mx-auto">
              Create a blank project or import your existing GDD, budget, and task list in one shot.
            </p>
            <NewProjectButton userId={user!.id} large />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project: any) => (
              <Link
                key={project.id}
                href={`/dashboard/${project.id}`}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:border-[var(--muted2)] hover:bg-[var(--surface2)] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{GENRE_ICONS[project.genre] ?? '✦'}</span>
                  <span className="font-mono text-xs text-[var(--muted)] bg-[var(--surface2)] group-hover:bg-[var(--surface3)] px-2 py-1 rounded capitalize transition-colors">
                    {project.role}
                  </span>
                </div>
                <div className="font-display font-bold text-base mb-1">{project.name}</div>
                <div className="font-mono text-xs text-[var(--muted)] capitalize">{project.genre} · Updated {new Date(project.updated_at).toLocaleDateString()}</div>
              </Link>
            ))}
            <NewProjectButton userId={user!.id} card />
          </div>
        )}
      </main>
    </div>
  )
}
