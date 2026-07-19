-- 1. Create temporary tables for mappings
create table public.assets_uuid_mapping (
  old_id text primary key,
  new_id uuid default gen_random_uuid()
);

insert into public.assets_uuid_mapping (old_id)
select id from public.assets;

create table public.spare_parts_uuid_mapping (
  old_id text primary key,
  new_id uuid default gen_random_uuid()
);

insert into public.spare_parts_uuid_mapping (old_id)
select id from public.spare_parts;

-- 2. Drop foreign key constraints referencing public.assets(id)
alter table public.work_orders drop constraint if exists work_orders_asset_id_fkey;
alter table public.rca_reports drop constraint if exists rca_reports_asset_id_fkey;
alter table public.insurance_policies drop constraint if exists insurance_policies_asset_id_fkey;

-- 3. Update assets table:
-- Add asset_code column
alter table public.assets add column asset_code text;
update public.assets set asset_code = id;
alter table public.assets alter column asset_code set not null;

-- Remove primary key constraint and default
alter table public.assets drop constraint if exists assets_pkey;
alter table public.assets alter column id drop default;

-- Update assets.id to the new UUIDs
update public.assets a
set id = m.new_id::text
from public.assets_uuid_mapping m
where a.id = m.old_id;

-- Change column type to uuid
alter table public.assets alter column id type uuid using id::uuid;

-- Re-add primary key constraint with default gen_random_uuid()
alter table public.assets add constraint assets_pkey primary key (id);
alter table public.assets alter column id set default gen_random_uuid();

-- 4. Update spare_parts table:
-- Add part_code column
alter table public.spare_parts add column part_code text;
update public.spare_parts set part_code = id;
alter table public.spare_parts alter column part_code set not null;

-- Remove primary key constraint and default
alter table public.spare_parts drop constraint if exists spare_parts_pkey;
alter table public.spare_parts alter column id drop default;

-- Update spare_parts.id to the new UUIDs
update public.spare_parts s
set id = m.new_id::text
from public.spare_parts_uuid_mapping m
where s.id = m.old_id;

-- Change column type to uuid
alter table public.spare_parts alter column id type uuid using id::uuid;

-- Re-add primary key constraint with default gen_random_uuid()
alter table public.spare_parts add constraint spare_parts_pkey primary key (id);
alter table public.spare_parts alter column id set default gen_random_uuid();

-- 5. Update referencing columns in work_orders
update public.work_orders w
set asset_id = m.new_id::text
from public.assets_uuid_mapping m
where w.asset_id = m.old_id;

alter table public.work_orders alter column asset_id type uuid using asset_id::uuid;
alter table public.work_orders add constraint work_orders_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete cascade;

-- 6. Update referencing columns in rca_reports
update public.rca_reports r
set asset_id = m.new_id::text
from public.assets_uuid_mapping m
where r.asset_id = m.old_id;

alter table public.rca_reports alter column asset_id type uuid using asset_id::uuid;
alter table public.rca_reports add constraint rca_reports_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete cascade;

-- 7. Update referencing columns in insurance_policies
update public.insurance_policies i
set asset_id = m.new_id::text
from public.assets_uuid_mapping m
where i.asset_id = m.old_id;

alter table public.insurance_policies alter column asset_id type uuid using asset_id::uuid;
alter table public.insurance_policies add constraint insurance_policies_asset_id_fkey foreign key (asset_id) references public.assets(id) on delete set null;

-- 8. Clean up mapping tables
drop table public.assets_uuid_mapping;
drop table public.spare_parts_uuid_mapping;
