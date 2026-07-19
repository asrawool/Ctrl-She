-- Create copilot_notes table
create table if not exists public.copilot_notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  source_conversation_id uuid references public.conversations(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS for copilot_notes
alter table public.copilot_notes enable row level security;

-- Policy to restrict rows to user_id = auth.uid()
create policy "Users can manage their own notes"
  on public.copilot_notes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add is_pinned column to conversations table if it does not exist
alter table public.conversations add column if not exists is_pinned boolean not null default false;

-- Create function to enforce max 5 pinned conversations per user server-side
create or replace function public.check_pinned_limit()
returns trigger as $$
declare
  pinned_count integer;
begin
  if new.is_pinned = true then
    select count(*) into pinned_count
    from public.conversations
    where user_id = new.user_id and is_pinned = true and id != new.id;
    
    if pinned_count >= 5 then
      raise exception 'You can only pin up to 5 chats. Unpin one first.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger on conversations table to run check_pinned_limit before insert or update
drop trigger if exists check_pinned_limit_trigger on public.conversations;
create trigger check_pinned_limit_trigger
  before insert or update on public.conversations
  for each row
  execute function public.check_pinned_limit();
