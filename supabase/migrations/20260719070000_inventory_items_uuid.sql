-- 1. Create mapping table
create table public.inventory_items_uuid_mapping (
  old_id text primary key,
  new_id uuid default gen_random_uuid()
);

-- Map existing UUIDs
insert into public.inventory_items_uuid_mapping (old_id, new_id)
select id, id::uuid from public.inventory_items 
where id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- Map text IDs
insert into public.inventory_items_uuid_mapping (old_id)
select id from public.inventory_items 
where id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 2. Drop referencing foreign keys
alter table public.inventory_movements drop constraint if exists inventory_movements_item_id_fkey;
alter table public.work_orders drop constraint if exists work_orders_asset_id_fkey;
alter table public.rca_reports drop constraint if exists rca_reports_asset_id_fkey;
alter table public.insurance_policies drop constraint if exists insurance_policies_asset_id_fkey;

-- 3. Modify inventory_items table
alter table public.inventory_items drop constraint if exists inventory_items_pkey;
alter table public.inventory_items alter column id drop default;

update public.inventory_items i
set id = m.new_id::text
from public.inventory_items_uuid_mapping m
where i.id = m.old_id;

alter table public.inventory_items alter column id type uuid using id::uuid;
alter table public.inventory_items add constraint inventory_items_pkey primary key (id);
alter table public.inventory_items alter column id set default gen_random_uuid();

-- 4. Modify inventory_movements table
update public.inventory_movements v
set item_id = m.new_id::text
from public.inventory_items_uuid_mapping m
where v.item_id = m.old_id;

alter table public.inventory_movements alter column item_id type uuid using item_id::uuid;
alter table public.inventory_movements add constraint inventory_movements_item_id_fkey foreign key (item_id) references public.inventory_items(id) on delete cascade;

-- 5. Update referencing columns in work_orders to point to inventory_items
update public.work_orders w
set asset_id = (case 
  when a.asset_code = 'P-401' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-001')
  when a.asset_code = 'C-12' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-005')
  when a.asset_code = 'HX-7' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-006')
  when a.asset_code = 'R-3' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-004')
  else (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-001')
end)::uuid
from public.assets a
where w.asset_id::text = a.id::text;

alter table public.work_orders alter column asset_id type uuid using asset_id::uuid;
alter table public.work_orders add constraint work_orders_asset_id_fkey foreign key (asset_id) references public.inventory_items(id) on delete cascade;

-- 6. Update referencing columns in rca_reports to point to inventory_items
update public.rca_reports r
set asset_id = (case 
  when a.asset_code = 'P-401' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-001')
  when a.asset_code = 'C-12' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-005')
  when a.asset_code = 'HX-7' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-006')
  when a.asset_code = 'R-3' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-004')
  else (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-001')
end)::uuid
from public.assets a
where r.asset_id::text = a.id::text;

alter table public.rca_reports alter column asset_id type uuid using asset_id::uuid;
alter table public.rca_reports add constraint rca_reports_asset_id_fkey foreign key (asset_id) references public.inventory_items(id) on delete cascade;

-- 7. Update referencing columns in insurance_policies to point to inventory_items
update public.insurance_policies i
set asset_id = (case 
  when a.asset_code = 'P-401' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-001')
  when a.asset_code = 'C-12' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-005')
  when a.asset_code = 'HX-7' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-006')
  when a.asset_code = 'R-3' then (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-004')
  else (select new_id from public.inventory_items_uuid_mapping where old_id = 'INV-001')
end)::uuid
from public.assets a
where i.asset_id::text = a.id::text;

alter table public.insurance_policies alter column asset_id type uuid using asset_id::uuid;
alter table public.insurance_policies add constraint insurance_policies_asset_id_fkey foreign key (asset_id) references public.inventory_items(id) on delete set null;

-- 8. Clean up mapping table
drop table public.inventory_items_uuid_mapping;
