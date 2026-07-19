-- Add health_percentage and rul_days columns to inventory_items
alter table public.inventory_items add column if not exists health_percentage integer default 100;
alter table public.inventory_items add column if not exists rul_days integer default 365;

-- Drop existing status check constraint
alter table public.inventory_items drop constraint if exists inventory_items_status_check;

-- Add updated check constraint to accept both sets of status values
alter table public.inventory_items add constraint inventory_items_status_check 
  check (status in ('Operational', 'Maintenance', 'Reserved', 'healthy', 'warning', 'critical'));
