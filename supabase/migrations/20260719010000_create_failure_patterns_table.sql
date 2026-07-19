-- Create failure_patterns table to store AI-detected systemic failure patterns
create table if not exists public.failure_patterns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  matching_root_cause text not null,
  affected_assets text[] not null, -- list of asset IDs
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.failure_patterns enable row level security;

-- Create broad read policy for authenticated users
create policy "Broad read for authenticated users on failure_patterns"
  on public.failure_patterns for select using (auth.role() = 'authenticated');

-- Create RBAC management policies
create policy "Authorized roles can manage failure_patterns"
  on public.failure_patterns for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']));
