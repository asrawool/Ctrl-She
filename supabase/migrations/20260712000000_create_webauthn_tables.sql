-- Create webauthn_credentials table
create table if not exists public.webauthn_credentials (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_type text not null,
  backed_up boolean not null default false,
  transports text[] default '{}',
  created_at timestamptz default now()
);

-- Enable RLS for credentials
alter table public.webauthn_credentials enable row level security;

-- Policy to restrict rows to user_id = auth.uid()
create policy "Users can manage their own WebAuthn credentials"
  on public.webauthn_credentials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create webauthn_challenges table
create table if not exists public.webauthn_challenges (
  user_id uuid primary key references auth.users(id) on delete cascade,
  challenge text not null,
  created_at timestamptz default now()
);

-- Enable RLS for challenges
alter table public.webauthn_challenges enable row level security;

-- Policy to restrict rows to user_id = auth.uid()
create policy "Users can manage their own WebAuthn challenges"
  on public.webauthn_challenges
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create face_descriptors table
create table if not exists public.face_descriptors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  descriptor double precision[] not null,
  created_at timestamptz default now()
);

-- Enable RLS for face_descriptors
alter table public.face_descriptors enable row level security;

-- Policy to restrict access to user_id = auth.uid()
create policy "Users can manage their own face descriptor"
  on public.face_descriptors
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create session_verifications table
create table if not exists public.session_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verified_at timestamptz not null default now()
);

-- Enable RLS for session_verifications
alter table public.session_verifications enable row level security;

-- Policy to restrict access to user_id = auth.uid()
create policy "Users can manage their own session verifications"
  on public.session_verifications
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create check_user_exists function to check if a user email is registered in auth.users
create or replace function public.check_user_exists(email_to_check text)
returns boolean as $$
declare
  user_exists boolean;
begin
  select exists (
    select 1 from auth.users where email = email_to_check
  ) into user_exists;
  return user_exists;
end;
$$ language plpgsql security definer;

-- Revoke execution from public/anon/authenticated roles for security (no client-side account enumeration)
revoke execute on function public.check_user_exists(text) from public;
revoke execute on function public.check_user_exists(text) from anon;
revoke execute on function public.check_user_exists(text) from authenticated;

-- Only allow service role (server-side functions) to execute this function
grant execute on function public.check_user_exists(text) to service_role;

-- Create user_roles table
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null,
  custom_role text,
  created_at timestamptz default now()
);

-- Enable RLS for user_roles
alter table public.user_roles enable row level security;

-- Policy to restrict view to own user_id
create policy "Users can view their own role"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

-- Policy to restrict insert to own user_id (write-once, no update policy exists)
create policy "Users can insert their own role"
  on public.user_roles
  for insert
  with check (auth.uid() = user_id);
