import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectApp from '@/components/ProjectApp'
import {
  getGDDSections, getDecisions, getTasks, getMilestones,
  getFeatures, getRisks, getAssets, getCosts, getPurchases,
  getFunding, getInvestors, getProjectMembers, getMessages
} from '@/lib/db'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Load project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!project) redirect('/dashboard')

  // Verify membership
  const { data: membership } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Load all project data in parallel
  const [
    gddSections, decisions, tasks, milestones,
    features, risks, assets, costs, purchases,
    funding, investors, members, messages,
    profile,
  ] = await Promise.all([
    getGDDSections(params.id),
    getDecisions(params.id),
    getTasks(params.id),
    getMilestones(params.id),
    getFeatures(params.id),
    getRisks(params.id),
    getAssets(params.id),
    getCosts(params.id),
    getPurchases(params.id),
    getFunding(params.id),
    getInvestors(params.id),
    getProjectMembers(params.id),
    getMessages(params.id),
    supabase.from('profiles').select('*').eq('id', user.id).single().then(r => r.data),
  ])

  return (
    <ProjectApp
      project={project}
      currentUser={{ ...profile!, role: membership.role }}
      initialData={{
        gddSections, decisions, tasks, milestones,
        features, risks, assets, costs, purchases,
        funding, investors, members, messages,
      }}
    />
  )
}
