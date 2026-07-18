-- Add action proposal and status columns to messages table
alter table public.messages
  add column if not exists proposed_action jsonb,
  add column if not exists action_status text,
  add column if not exists action_error text,
  add column if not exists action_result jsonb;
