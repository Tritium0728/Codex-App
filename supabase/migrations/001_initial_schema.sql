-- ============================================================
-- CODEX — Game Studio OS
-- Supabase Migration v1
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null default 'New User',
  color text not null default '#e8ff47',
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  genre text not null default 'blank',
  owner_id uuid references public.profiles(id) on delete cascade not null,
  funding_target integer default 100000,
  funding_round text default 'Pre-seed',
  budgets jsonb default '{"weekly":{"limit":500},"monthly":{"limit":2000},"project":{"limit":50000}}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.projects enable row level security;

-- ============================================================
-- PROJECT MEMBERS (many-to-many: users <-> projects)
-- ============================================================
create type public.member_role as enum ('owner', 'admin', 'member', 'viewer');

create table public.project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role member_role not null default 'member',
  display_name text,
  color text default '#5b8cff',
  joined_at timestamptz default now(),
  unique(project_id, user_id)
);

alter table public.project_members enable row level security;

-- RLS: users can see projects they are members of
create policy "Members can view their projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_members
      where project_id = projects.id and user_id = auth.uid()
    )
  );

create policy "Owners can update their projects"
  on public.projects for update
  using (owner_id = auth.uid());

create policy "Authenticated users can create projects"
  on public.projects for insert
  with check (auth.uid() = owner_id);

create policy "Owners can delete their projects"
  on public.projects for delete
  using (owner_id = auth.uid());

create policy "Members can view project membership"
  on public.project_members for select
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id and pm.user_id = auth.uid()
    )
  );

create policy "Owners/admins can manage members"
  on public.project_members for all
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- GDD SECTIONS
-- ============================================================
create table public.gdd_sections (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  key text not null,
  label text not null,
  content text default '',
  sort_order integer default 0,
  is_custom boolean default false,
  updated_at timestamptz default now(),
  unique(project_id, key)
);

alter table public.gdd_sections enable row level security;

create policy "Project members can view GDD"
  on public.gdd_sections for select
  using (
    exists (select 1 from public.project_members where project_id = gdd_sections.project_id and user_id = auth.uid())
  );

create policy "Members can edit GDD"
  on public.gdd_sections for all
  using (
    exists (select 1 from public.project_members where project_id = gdd_sections.project_id and user_id = auth.uid() and role != 'viewer')
  );

-- ============================================================
-- DECISIONS
-- ============================================================
create table public.decisions (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  section text not null default 'General',
  chose text not null,
  rejected text default '',
  made_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.decisions enable row level security;

create policy "Project members can view decisions"
  on public.decisions for select
  using (exists (select 1 from public.project_members where project_id = decisions.project_id and user_id = auth.uid()));

create policy "Members can manage decisions"
  on public.decisions for all
  using (exists (select 1 from public.project_members where project_id = decisions.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- TASKS
-- ============================================================
create type public.task_period as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.task_priority as enum ('high', 'medium', 'low');

create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  text text not null,
  period task_period not null default 'daily',
  priority task_priority not null default 'medium',
  done boolean default false,
  assignee_id uuid references public.profiles(id),
  due_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Project members can view tasks"
  on public.tasks for select
  using (exists (select 1 from public.project_members where project_id = tasks.project_id and user_id = auth.uid()));

create policy "Members can manage tasks"
  on public.tasks for all
  using (exists (select 1 from public.project_members where project_id = tasks.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- MILESTONES
-- ============================================================
create type public.milestone_status as enum ('planned', 'active', 'done');

create table public.milestones (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  status milestone_status default 'planned',
  progress integer default 0 check (progress >= 0 and progress <= 100),
  target_date text,
  created_at timestamptz default now()
);

alter table public.milestones enable row level security;

create policy "Project members can view milestones"
  on public.milestones for select
  using (exists (select 1 from public.project_members where project_id = milestones.project_id and user_id = auth.uid()));

create policy "Members can manage milestones"
  on public.milestones for all
  using (exists (select 1 from public.project_members where project_id = milestones.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- FEATURES
-- ============================================================
create type public.feature_status as enum ('planned', 'active', 'done', 'cut');

create table public.features (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  note text default '',
  status feature_status default 'planned',
  created_at timestamptz default now()
);

alter table public.features enable row level security;

create policy "Project members can view features"
  on public.features for select
  using (exists (select 1 from public.project_members where project_id = features.project_id and user_id = auth.uid()));

create policy "Members can manage features"
  on public.features for all
  using (exists (select 1 from public.project_members where project_id = features.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- RISKS
-- ============================================================
create type public.risk_severity as enum ('high', 'medium', 'low');

create table public.risks (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  severity risk_severity default 'medium',
  note text default '',
  mitigation text default '',
  created_at timestamptz default now()
);

alter table public.risks enable row level security;

create policy "Project members can view risks"
  on public.risks for select
  using (exists (select 1 from public.project_members where project_id = risks.project_id and user_id = auth.uid()));

create policy "Members can manage risks"
  on public.risks for all
  using (exists (select 1 from public.project_members where project_id = risks.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- ASSETS
-- ============================================================
create type public.asset_priority as enum ('locked', 'considering', 'someday');

create table public.assets (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  store text default '',
  price numeric default 0,
  priority asset_priority default 'considering',
  url text default '',
  created_at timestamptz default now()
);

alter table public.assets enable row level security;

create policy "Project members can view assets"
  on public.assets for select
  using (exists (select 1 from public.project_members where project_id = assets.project_id and user_id = auth.uid()));

create policy "Members can manage assets"
  on public.assets for all
  using (exists (select 1 from public.project_members where project_id = assets.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- COSTS
-- ============================================================
create table public.costs (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  category text default 'Other',
  amount numeric default 0,
  cost_type text default 'monthly',
  note text default '',
  created_at timestamptz default now()
);

alter table public.costs enable row level security;

create policy "Project members can view costs"
  on public.costs for select
  using (exists (select 1 from public.project_members where project_id = costs.project_id and user_id = auth.uid()));

create policy "Members can manage costs"
  on public.costs for all
  using (exists (select 1 from public.project_members where project_id = costs.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- PURCHASES
-- ============================================================
create table public.purchases (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  amount numeric default 0,
  purchase_date date default current_date,
  category text default 'Other',
  budget_type text default 'monthly',
  created_at timestamptz default now()
);

alter table public.purchases enable row level security;

create policy "Project members can view purchases"
  on public.purchases for select
  using (exists (select 1 from public.project_members where project_id = purchases.project_id and user_id = auth.uid()));

create policy "Members can manage purchases"
  on public.purchases for all
  using (exists (select 1 from public.project_members where project_id = purchases.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- FUNDING
-- ============================================================
create table public.funding (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  amount numeric default 0,
  funding_date date default current_date,
  funding_type text default 'self',
  note text default '',
  created_at timestamptz default now()
);

alter table public.funding enable row level security;

create policy "Project members can view funding"
  on public.funding for select
  using (exists (select 1 from public.project_members where project_id = funding.project_id and user_id = auth.uid()));

create policy "Members can manage funding"
  on public.funding for all
  using (exists (select 1 from public.project_members where project_id = funding.project_id and user_id = auth.uid() and role != 'viewer'));

-- ============================================================
-- INVESTORS
-- ============================================================
create type public.investor_status as enum ('prospect', 'verbal', 'committed', 'closed');

create table public.investors (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  amount numeric default 0,
  investor_date date default current_date,
  status investor_status default 'verbal',
  note text default '',
  created_at timestamptz default now()
);

alter table public.investors enable row level security;

create policy "Project members can view investors"
  on public.investors for select
  using (exists (select 1 from public.project_members where project_id = investors.project_id and user_id = auth.uid()));

create policy "Owners/admins can manage investors"
  on public.investors for all
  using (
    exists (
      select 1 from public.project_members
      where project_id = investors.project_id and user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ============================================================
-- TEAM CHAT MESSAGES
-- ============================================================
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  text text not null,
  ref text,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Project members can view messages"
  on public.messages for select
  using (exists (select 1 from public.project_members where project_id = messages.project_id and user_id = auth.uid()));

create policy "Members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = user_id and
    exists (select 1 from public.project_members where project_id = messages.project_id and user_id = auth.uid() and role != 'viewer')
  );

-- Enable realtime for messages
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.tasks;

-- ============================================================
-- PROJECT INVITES
-- ============================================================
create table public.project_invites (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  created_by uuid references public.profiles(id) not null,
  code text unique not null default substring(md5(random()::text) from 1 for 8),
  role member_role default 'member',
  expires_at timestamptz default (now() + interval '7 days'),
  used_count integer default 0,
  max_uses integer default 10,
  created_at timestamptz default now()
);

alter table public.project_invites enable row level security;

create policy "Anyone can view invites by code"
  on public.project_invites for select
  using (true);

create policy "Owners/admins can create invites"
  on public.project_invites for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_id = project_invites.project_id and user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index idx_project_members_user on public.project_members(user_id);
create index idx_project_members_project on public.project_members(project_id);
create index idx_gdd_sections_project on public.gdd_sections(project_id);
create index idx_decisions_project on public.decisions(project_id);
create index idx_tasks_project on public.tasks(project_id);
create index idx_messages_project on public.messages(project_id);
create index idx_messages_created on public.messages(created_at);
create index idx_milestones_project on public.milestones(project_id);
create index idx_features_project on public.features(project_id);
create index idx_risks_project on public.risks(project_id);
create index idx_assets_project on public.assets(project_id);
create index idx_costs_project on public.costs(project_id);
create index idx_purchases_project on public.purchases(project_id);
create index idx_funding_project on public.funding(project_id);
create index idx_investors_project on public.investors(project_id);

-- ============================================================
-- UPDATED_AT trigger helper
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_projects_updated_at before update on public.projects
  for each row execute procedure public.set_updated_at();
create trigger set_tasks_updated_at before update on public.tasks
  for each row execute procedure public.set_updated_at();
create trigger set_gdd_updated_at before update on public.gdd_sections
  for each row execute procedure public.set_updated_at();
