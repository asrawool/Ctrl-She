-- Workspace-wide settings (single shared row for the whole org)
create table if not exists public.workspace_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  theme text not null default 'system',            -- 'light' | 'dark' | 'system'
  density text not null default 'comfortable',      -- 'comfortable' | 'compact'
  notify_email boolean not null default true,
  notify_inapp boolean not null default true,
  notify_mobile_push boolean not null default true,
  notify_sms_critical boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.workspace_settings (id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

alter table public.workspace_settings enable row level security;

drop policy if exists "Authenticated users can view workspace settings" on public.workspace_settings;
create policy "Authenticated users can view workspace settings"
  on public.workspace_settings
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update workspace settings" on public.workspace_settings;
create policy "Authenticated users can update workspace settings"
  on public.workspace_settings
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');