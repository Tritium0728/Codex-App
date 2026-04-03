import { createClient } from '@/lib/supabase/client'
import type {
  Project, ProjectMember, GDDSection, Decision, Task,
  Milestone, Feature, Risk, Asset, Cost, Purchase,
  Funding, Investor, Message, Profile
} from '@/types'

const sb = () => createClient()

// ── Projects ──────────────────────────────────────────────────────
export async function getMyProjects(): Promise<Project[]> {
  const { data } = await sb()
    .from('project_members')
    .select('project_id, projects(*)')
    .order('joined_at', { ascending: false })
  return (data?.map((d: any) => d.projects).filter(Boolean) ?? []) as Project[]
}

export async function createProject(name: string, genre: string, userId: string): Promise<Project> {
  const client = sb()
  const { data: project, error } = await client
    .from('projects')
    .insert({ name, genre, owner_id: userId })
    .select()
    .single()
  if (error) throw error

  // Add owner as member
  await client.from('project_members').insert({
    project_id: project.id,
    user_id: userId,
    role: 'owner',
    color: '#e8ff47',
  })
  return project as Project
}

export async function updateProject(id: string, updates: Partial<Project>) {
  const { error } = await sb().from('projects').update(updates).eq('id', id)
  if (error) throw error
}

export async function deleteProject(id: string) {
  const { error } = await sb().from('projects').delete().eq('id', id)
  if (error) throw error
}

// ── Project Members ───────────────────────────────────────────────
export async function getProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data } = await sb()
    .from('project_members')
    .select('*, profiles(id, name, color, avatar_url)')
    .eq('project_id', projectId)
  return (data ?? []) as ProjectMember[]
}

export async function updateMemberName(memberId: string, displayName: string) {
  await sb().from('project_members').update({ display_name: displayName }).eq('id', memberId)
}

export async function removeMember(memberId: string) {
  await sb().from('project_members').delete().eq('id', memberId)
}

// ── Invites ───────────────────────────────────────────────────────
export async function createInvite(projectId: string, role = 'member') {
  const { data, error } = await sb()
    .from('project_invites')
    .insert({ project_id: projectId, created_by: (await sb().auth.getUser()).data.user?.id, role })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function joinByInviteCode(code: string) {
  const client = sb()
  const { data: invite } = await client.from('project_invites').select('*').eq('code', code).single()
  if (!invite) throw new Error('Invalid invite code')
  if (new Date(invite.expires_at) < new Date()) throw new Error('Invite expired')

  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  await client.from('project_members').upsert({
    project_id: invite.project_id,
    user_id: user.id,
    role: invite.role,
    color: '#5b8cff',
  })
  await client.from('project_invites').update({ used_count: invite.used_count + 1 }).eq('id', invite.id)
  return invite.project_id
}

// ── GDD ───────────────────────────────────────────────────────────
export async function getGDDSections(projectId: string): Promise<GDDSection[]> {
  const { data } = await sb()
    .from('gdd_sections')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order')
  return (data ?? []) as GDDSection[]
}

export async function upsertGDDSection(projectId: string, key: string, label: string, content: string, sortOrder = 0, isCustom = false) {
  const { error } = await sb().from('gdd_sections').upsert({
    project_id: projectId, key, label, content, sort_order: sortOrder, is_custom: isCustom
  }, { onConflict: 'project_id,key' })
  if (error) throw error
}

export async function deleteGDDSection(projectId: string, key: string) {
  await sb().from('gdd_sections').delete().eq('project_id', projectId).eq('key', key)
}

// ── Decisions ─────────────────────────────────────────────────────
export async function getDecisions(projectId: string): Promise<Decision[]> {
  const { data } = await sb()
    .from('decisions')
    .select('*, profiles(name, color)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Decision[]
}

export async function addDecision(projectId: string, section: string, chose: string, rejected: string, madeBy: string) {
  const { data, error } = await sb()
    .from('decisions')
    .insert({ project_id: projectId, section, chose, rejected, made_by: madeBy })
    .select()
    .single()
  if (error) throw error
  return data as Decision
}

export async function deleteDecision(id: string) {
  await sb().from('decisions').delete().eq('id', id)
}

// ── Tasks ─────────────────────────────────────────────────────────
export async function getTasks(projectId: string): Promise<Task[]> {
  const { data } = await sb()
    .from('tasks')
    .select('*, profiles(name, color)')
    .eq('project_id', projectId)
    .order('created_at')
  return (data ?? []) as Task[]
}

export async function addTask(projectId: string, text: string, period: string, priority: string, assigneeId?: string) {
  const { data, error } = await sb()
    .from('tasks')
    .insert({ project_id: projectId, text, period, priority, assignee_id: assigneeId })
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>) {
  await sb().from('tasks').update(updates).eq('id', id)
}

export async function deleteTask(id: string) {
  await sb().from('tasks').delete().eq('id', id)
}

// ── Milestones ────────────────────────────────────────────────────
export async function getMilestones(projectId: string): Promise<Milestone[]> {
  const { data } = await sb().from('milestones').select('*').eq('project_id', projectId).order('created_at')
  return (data ?? []) as Milestone[]
}

export async function addMilestone(projectId: string, name: string, status: string, progress: number, targetDate: string) {
  const { data, error } = await sb()
    .from('milestones')
    .insert({ project_id: projectId, name, status, progress, target_date: targetDate })
    .select().single()
  if (error) throw error
  return data as Milestone
}

export async function updateMilestone(id: string, updates: Partial<Milestone>) {
  await sb().from('milestones').update(updates).eq('id', id)
}

export async function deleteMilestone(id: string) {
  await sb().from('milestones').delete().eq('id', id)
}

// ── Features ──────────────────────────────────────────────────────
export async function getFeatures(projectId: string): Promise<Feature[]> {
  const { data } = await sb().from('features').select('*').eq('project_id', projectId).order('created_at')
  return (data ?? []) as Feature[]
}

export async function addFeature(projectId: string, name: string, note: string, status: string) {
  const { data, error } = await sb().from('features').insert({ project_id: projectId, name, note, status }).select().single()
  if (error) throw error
  return data as Feature
}

export async function updateFeature(id: string, updates: Partial<Feature>) {
  await sb().from('features').update(updates).eq('id', id)
}

export async function deleteFeature(id: string) {
  await sb().from('features').delete().eq('id', id)
}

// ── Risks ─────────────────────────────────────────────────────────
export async function getRisks(projectId: string): Promise<Risk[]> {
  const { data } = await sb().from('risks').select('*').eq('project_id', projectId).order('created_at')
  return (data ?? []) as Risk[]
}

export async function addRisk(projectId: string, name: string, severity: string, note: string, mitigation: string) {
  const { data, error } = await sb().from('risks').insert({ project_id: projectId, name, severity, note, mitigation }).select().single()
  if (error) throw error
  return data as Risk
}

export async function updateRisk(id: string, updates: Partial<Risk>) {
  await sb().from('risks').update(updates).eq('id', id)
}

export async function deleteRisk(id: string) {
  await sb().from('risks').delete().eq('id', id)
}

// ── Assets ────────────────────────────────────────────────────────
export async function getAssets(projectId: string): Promise<Asset[]> {
  const { data } = await sb().from('assets').select('*').eq('project_id', projectId).order('created_at')
  return (data ?? []) as Asset[]
}

export async function addAsset(projectId: string, asset: Omit<Asset, 'id' | 'project_id' | 'created_at'>) {
  const { data, error } = await sb().from('assets').insert({ project_id: projectId, ...asset }).select().single()
  if (error) throw error
  return data as Asset
}

export async function updateAsset(id: string, updates: Partial<Asset>) {
  await sb().from('assets').update(updates).eq('id', id)
}

export async function deleteAsset(id: string) {
  await sb().from('assets').delete().eq('id', id)
}

// ── Finance ───────────────────────────────────────────────────────
export async function getCosts(projectId: string): Promise<Cost[]> {
  const { data } = await sb().from('costs').select('*').eq('project_id', projectId).order('created_at')
  return (data ?? []) as Cost[]
}

export async function addCost(projectId: string, cost: Omit<Cost, 'id' | 'project_id' | 'created_at'>) {
  const { data, error } = await sb().from('costs').insert({ project_id: projectId, ...cost }).select().single()
  if (error) throw error
  return data as Cost
}

export async function deleteCost(id: string) {
  await sb().from('costs').delete().eq('id', id)
}

export async function getPurchases(projectId: string): Promise<Purchase[]> {
  const { data } = await sb().from('purchases').select('*').eq('project_id', projectId).order('purchase_date', { ascending: false })
  return (data ?? []) as Purchase[]
}

export async function addPurchase(projectId: string, purchase: Omit<Purchase, 'id' | 'project_id' | 'created_at'>) {
  const { data, error } = await sb().from('purchases').insert({ project_id: projectId, ...purchase }).select().single()
  if (error) throw error
  return data as Purchase
}

export async function deletePurchase(id: string) {
  await sb().from('purchases').delete().eq('id', id)
}

export async function getFunding(projectId: string): Promise<Funding[]> {
  const { data } = await sb().from('funding').select('*').eq('project_id', projectId).order('funding_date', { ascending: false })
  return (data ?? []) as Funding[]
}

export async function addFunding(projectId: string, funding: Omit<Funding, 'id' | 'project_id' | 'created_at'>) {
  const { data, error } = await sb().from('funding').insert({ project_id: projectId, ...funding }).select().single()
  if (error) throw error
  return data as Funding
}

export async function deleteFunding(id: string) {
  await sb().from('funding').delete().eq('id', id)
}

export async function getInvestors(projectId: string): Promise<Investor[]> {
  const { data } = await sb().from('investors').select('*').eq('project_id', projectId).order('investor_date', { ascending: false })
  return (data ?? []) as Investor[]
}

export async function addInvestor(projectId: string, investor: Omit<Investor, 'id' | 'project_id' | 'created_at'>) {
  const { data, error } = await sb().from('investors').insert({ project_id: projectId, ...investor }).select().single()
  if (error) throw error
  return data as Investor
}

export async function updateInvestor(id: string, updates: Partial<Investor>) {
  await sb().from('investors').update(updates).eq('id', id)
}

export async function deleteInvestor(id: string) {
  await sb().from('investors').delete().eq('id', id)
}

// ── Messages (Team Chat) ──────────────────────────────────────────
export async function getMessages(projectId: string): Promise<Message[]> {
  const { data } = await sb()
    .from('messages')
    .select('*, profiles(id, name, color)')
    .eq('project_id', projectId)
    .order('created_at')
    .limit(200)
  return (data ?? []) as Message[]
}

export async function sendMessage(projectId: string, userId: string, text: string, ref?: string) {
  const { data, error } = await sb()
    .from('messages')
    .insert({ project_id: projectId, user_id: userId, text, ref })
    .select('*, profiles(id, name, color)')
    .single()
  if (error) throw error
  return data as Message
}

// ── Profile ───────────────────────────────────────────────────────
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await sb().from('profiles').select('*').eq('id', userId).single()
  return data as Profile | null
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  await sb().from('profiles').update(updates).eq('id', userId)
}
