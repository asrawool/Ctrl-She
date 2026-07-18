-- Add is_ai_modified tracking column to assets table
alter table public.assets
  add column if not exists is_ai_modified boolean default false;
