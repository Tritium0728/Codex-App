// ── Auth / Users ──────────────────────────────────────────────────
export interface Profile {
  id: string
  name: string
  color: string
  avatar_url?: string
  created_at: string
}

// ── Projects ──────────────────────────────────────────────────────
export interface Project {
  id: string
  name: string
  genre: string
  owner_id: string
  funding_target: number
  funding_round: string
  budgets: {
    weekly: { limit: number }
    monthly: { limit: number }
    project: { limit: number }
  }
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  display_name?: string
  color: string
  joined_at: string
  profiles?: Profile
}

export interface ProjectInvite {
  id: string
  project_id: string
  created_by: string
  code: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  expires_at: string
  used_count: number
  max_uses: number
}

// ── GDD ───────────────────────────────────────────────────────────
export interface GDDSection {
  id: string
  project_id: string
  key: string
  label: string
  content: string
  sort_order: number
  is_custom: boolean
  updated_at: string
}

// ── Decisions ─────────────────────────────────────────────────────
export interface Decision {
  id: string
  project_id: string
  section: string
  chose: string
  rejected: string
  made_by?: string
  created_at: string
  profiles?: Profile
}

// ── Tasks ─────────────────────────────────────────────────────────
export type TaskPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  project_id: string
  text: string
  period: TaskPeriod
  priority: TaskPriority
  done: boolean
  assignee_id?: string
  due_date?: string
  created_at: string
  updated_at: string
  profiles?: Profile
}

// ── Milestones ────────────────────────────────────────────────────
export type MilestoneStatus = 'planned' | 'active' | 'done'

export interface Milestone {
  id: string
  project_id: string
  name: string
  status: MilestoneStatus
  progress: number
  target_date?: string
  created_at: string
}

// ── Features ──────────────────────────────────────────────────────
export type FeatureStatus = 'planned' | 'active' | 'done' | 'cut'

export interface Feature {
  id: string
  project_id: string
  name: string
  note: string
  status: FeatureStatus
  created_at: string
}

// ── Risks ─────────────────────────────────────────────────────────
export type RiskSeverity = 'high' | 'medium' | 'low'

export interface Risk {
  id: string
  project_id: string
  name: string
  severity: RiskSeverity
  note: string
  mitigation: string
  created_at: string
}

// ── Assets ────────────────────────────────────────────────────────
export type AssetPriority = 'locked' | 'considering' | 'someday'

export interface Asset {
  id: string
  project_id: string
  name: string
  store: string
  price: number
  priority: AssetPriority
  url: string
  created_at: string
}

// ── Finance ───────────────────────────────────────────────────────
export interface Cost {
  id: string
  project_id: string
  name: string
  category: string
  amount: number
  cost_type: string
  note: string
  created_at: string
}

export interface Purchase {
  id: string
  project_id: string
  name: string
  amount: number
  purchase_date: string
  category: string
  budget_type: string
  created_at: string
}

export interface Funding {
  id: string
  project_id: string
  name: string
  amount: number
  funding_date: string
  funding_type: string
  note: string
  created_at: string
}

export type InvestorStatus = 'prospect' | 'verbal' | 'committed' | 'closed'

export interface Investor {
  id: string
  project_id: string
  name: string
  amount: number
  investor_date: string
  status: InvestorStatus
  note: string
  created_at: string
}

// ── Chat ──────────────────────────────────────────────────────────
export interface Message {
  id: string
  project_id: string
  user_id: string
  text: string
  ref?: string
  created_at: string
  profiles?: Profile
}

// ── UI Helpers ────────────────────────────────────────────────────
export interface Notification {
  id: string
  type: 'info' | 'warning' | 'danger'
  icon: string
  title: string
  desc: string
  time: string
}
