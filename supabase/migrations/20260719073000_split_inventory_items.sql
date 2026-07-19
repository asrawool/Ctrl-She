-- 1. Delete garbage row first
delete from public.inventory_items where item_code = 'KAE;LKVF;L';

-- Drop old tables if they exist
drop table if exists public.assets cascade;
drop table if exists public.spare_parts cascade;

-- 2. Create assets and spare_parts tables
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_code text not null unique,
  category text not null,
  manufacturer text not null,
  model text,
  location text not null,
  health_percentage integer not null default 100,
  rul_days integer not null default 365,
  health_status text not null default 'healthy' check (health_status in ('healthy','warning','critical')),
  status text not null default 'Operational' check (status in ('Operational','Maintenance','Reserved')),
  updated_at timestamptz default now()
);

create table public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  part_code text not null unique,
  category text not null,
  manufacturer text not null,
  model text,
  location text not null,
  current_qty integer not null default 0,
  min_qty integer not null default 0,
  max_qty integer not null default 0,
  reorder_point integer not null default 0,
  unit_cost numeric not null default 0,
  supplier text not null,
  status text not null default 'Operational' check (status in ('Operational','Maintenance','Reserved')),
  updated_at timestamptz default now()
);

-- 3. Create a temporary mapping table to map old inventory_items.id to new spare_parts.id
create table public.spare_parts_mapping (
  old_id uuid,
  new_id uuid
);

-- 4. Copy remaining inventory_items rows to spare_parts and log mapping
with inserted_parts as (
  insert into public.spare_parts (name, part_code, category, manufacturer, model, location, current_qty, min_qty, max_qty, reorder_point, unit_cost, supplier, status, updated_at)
  select 
    name, 
    item_code, 
    category, 
    manufacturer, 
    model, 
    location, 
    current_qty, 
    min_qty, 
    max_qty, 
    reorder_point, 
    unit_cost, 
    supplier, 
    status, 
    updated_at
  from public.inventory_items
  returning id, part_code
)
insert into public.spare_parts_mapping (old_id, new_id)
select i.id, p.id
from public.inventory_items i
join inserted_parts p on i.item_code = p.part_code;

-- 5. Null out existing asset_id on work_orders, rca_reports, and insurance_policies
update public.work_orders set asset_id = null;
update public.rca_reports set asset_id = null;
update public.insurance_policies set asset_id = null;

-- 6. Drop existing foreign key constraints pointing to public.inventory_items or assets
alter table public.inventory_movements drop constraint if exists inventory_movements_item_id_fkey;
alter table public.work_orders drop constraint if exists work_orders_asset_id_fkey;
alter table public.rca_reports drop constraint if exists rca_reports_asset_id_fkey;
alter table public.insurance_policies drop constraint if exists insurance_policies_asset_id_fkey;

-- 7. Update inventory_movements item_id references to new spare_parts UUIDs
update public.inventory_movements m
set item_id = map.new_id
from public.spare_parts_mapping map
where m.item_id = map.old_id;

-- Clean up mapping table
drop table public.spare_parts_mapping;

-- 8. Convert foreign key columns to uuid and establish new foreign key constraints
alter table public.work_orders alter column asset_id type uuid using asset_id::uuid;
alter table public.work_orders add constraint work_orders_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete set null;

alter table public.rca_reports alter column asset_id type uuid using asset_id::uuid;
alter table public.rca_reports add constraint rca_reports_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete set null;

alter table public.insurance_policies alter column asset_id type uuid using asset_id::uuid;
alter table public.insurance_policies add constraint insurance_policies_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete set null;

alter table public.inventory_movements alter column item_id type uuid using item_id::uuid;
alter table public.inventory_movements add constraint inventory_movements_item_id_fkey foreign key (item_id) references public.spare_parts(id) on delete cascade;

-- 9. Drop the old inventory_items table
drop table public.inventory_items;

-- 10. Enable Row Level Security (RLS) on new tables
alter table public.assets enable row level security;
alter table public.spare_parts enable row level security;

-- 11. Create RLS Policies
create policy "Broad read for authenticated users on assets"
  on public.assets for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage assets"
  on public.assets for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_ops', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_ops', 'document_controller', 'plant_manager']));

create policy "Broad read for authenticated users on spare_parts"
  on public.spare_parts for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage spare_parts"
  on public.spare_parts for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_ops', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_ops', 'document_controller', 'plant_manager']));
