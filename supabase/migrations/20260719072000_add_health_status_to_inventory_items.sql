-- 1. Add health_status column to inventory_items
alter table public.inventory_items add column if not exists health_status text default 'healthy';

-- 2. Add check constraint to health_status
alter table public.inventory_items add constraint inventory_items_health_status_check 
  check (health_status in ('healthy', 'warning', 'critical'));

-- 3. Backfill health_status based on current health_percentage and rul_days
update public.inventory_items
set health_status = case 
  when health_percentage <= 30 or rul_days <= 7 then 'critical'
  when health_percentage <= 60 or rul_days <= 30 then 'warning'
  else 'healthy'
end;

-- 4. Restore any health status values in operational status column to 'Operational'
update public.inventory_items
set status = 'Operational'
where status in ('healthy', 'warning', 'critical');

-- 5. Clean up and restore strict operational check constraint on status column
alter table public.inventory_items drop constraint if exists inventory_items_status_check;
alter table public.inventory_items add constraint inventory_items_status_check 
  check (status in ('Operational', 'Maintenance', 'Reserved'));
