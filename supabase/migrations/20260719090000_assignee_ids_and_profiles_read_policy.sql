-- Allow any authenticated user to read all user profiles
-- (needed so the inspection assignee picker can list team members)
create policy "Authenticated users can read all profiles"
  on public.user_profiles
  for select
  using (auth.role() = 'authenticated');

-- Add assignee_ids to inspections so we can send per-recipient notifications
alter table public.inspections
  add column if not exists assignee_ids uuid[] default '{}';
