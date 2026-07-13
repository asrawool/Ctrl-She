-- Create conversations table
create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  is_starred boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS for conversations
alter table public.conversations enable row level security;

-- Policy to restrict rows to user_id = auth.uid()
create policy "Users can manage their own conversations"
  on public.conversations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create messages table
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  sources jsonb default '[]'::jsonb,
  confidence numeric,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Enable RLS for messages
alter table public.messages enable row level security;

-- Policy to restrict rows to their conversation owner
create policy "Users can manage messages in their conversations"
  on public.messages
  for all
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = messages.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- Create message_feedback table
create table if not exists public.message_feedback (
  id uuid default gen_random_uuid() primary key,
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  created_at timestamptz default now(),
  constraint message_feedback_unique_user_message unique(message_id, user_id)
);

-- Enable RLS for message_feedback
alter table public.message_feedback enable row level security;

-- Policy to restrict rows to user_id = auth.uid()
create policy "Users can manage their own feedback"
  on public.message_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create storage bucket for copilot attachments
insert into storage.buckets (id, name, public)
values ('copilot-attachments', 'copilot-attachments', true)
on conflict (id) do nothing;

-- Storage policies for copilot-attachments bucket
create policy "Public Access to Copilot Attachments"
  on storage.objects for select
  using (bucket_id = 'copilot-attachments');

create policy "Users can upload their own attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'copilot-attachments' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own attachments"
  on storage.objects for update
  using (
    bucket_id = 'copilot-attachments' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own attachments"
  on storage.objects for delete
  using (
    bucket_id = 'copilot-attachments' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
