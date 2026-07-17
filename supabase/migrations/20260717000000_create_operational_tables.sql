-- Migration: Create operational tables for Maintenance, Quality, Insurance, and Inventory

-- 1. Helper function for RBAC checks
create or replace function public.user_has_role(role_list text[])
returns boolean as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = any(role_list)
  );
end;
$$ language plpgsql security definer;

grant execute on function public.user_has_role(text[]) to authenticated;

-- 2. Assets table
create table if not exists public.assets (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  type text not null,
  plant text not null,
  health_percentage integer not null default 100,
  status text not null,
  rul_days integer not null,
  last_inspected_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.assets enable row level security;

create policy "Broad read for authenticated users on assets"
  on public.assets for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage assets"
  on public.assets for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']));

-- 3. Work Orders table
create table if not exists public.work_orders (
  id text primary key default gen_random_uuid()::text,
  asset_id text references public.assets(id) on delete cascade,
  title text not null,
  type text not null check (type in ('preventive', 'corrective', 'predictive', 'emergency')),
  priority text not null,
  status text not null,
  assigned_to text,
  created_by uuid references auth.users(id) on delete set null,
  due_date timestamptz,
  completed_at timestamptz,
  notes text
);

alter table public.work_orders enable row level security;

create policy "Broad read for authenticated users on work_orders"
  on public.work_orders for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage work_orders"
  on public.work_orders for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']));

-- 4. Spare Parts table
create table if not exists public.spare_parts (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  current_quantity integer not null default 0,
  min_quantity integer not null default 0,
  updated_at timestamptz default now()
);

alter table public.spare_parts enable row level security;

create policy "Broad read for authenticated users on spare_parts"
  on public.spare_parts for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage spare_parts"
  on public.spare_parts for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']));

-- 5. RCA Reports table
create table if not exists public.rca_reports (
  id text primary key default gen_random_uuid()::text,
  incident_ref text not null,
  asset_id text references public.assets(id) on delete cascade,
  symptoms text not null,
  root_cause text not null,
  corrective_actions text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.rca_reports enable row level security;

create policy "Broad read for authenticated users on rca_reports"
  on public.rca_reports for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage rca_reports"
  on public.rca_reports for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'maintenance_manager', 'plant_manager', 'production_engineer']));

-- 6. NCRs table
create table if not exists public.ncrs (
  id text primary key default gen_random_uuid()::text,
  ncr_number text not null,
  description text not null,
  severity text not null,
  status text not null,
  framework_ref text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

alter table public.ncrs enable row level security;

create policy "Broad read for authenticated users on ncrs"
  on public.ncrs for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage ncrs"
  on public.ncrs for all
  using (public.user_has_role(array['quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'plant_manager']))
  with check (public.user_has_role(array['quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'plant_manager']));

-- 7. Compliance Frameworks table
create table if not exists public.compliance_frameworks (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  current_score integer not null default 100
);

alter table public.compliance_frameworks enable row level security;

create policy "Broad read for authenticated users on compliance_frameworks"
  on public.compliance_frameworks for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage compliance_frameworks"
  on public.compliance_frameworks for all
  using (public.user_has_role(array['quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'plant_manager']))
  with check (public.user_has_role(array['quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'plant_manager']));

-- 8. Inspections table
create table if not exists public.inspections (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  framework text not null,
  scheduled_date timestamptz not null,
  status text not null,
  assigned_to text
);

alter table public.inspections enable row level security;

create policy "Broad read for authenticated users on inspections"
  on public.inspections for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage inspections"
  on public.inspections for all
  using (public.user_has_role(array['quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'plant_manager']))
  with check (public.user_has_role(array['quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'plant_manager']));

-- 9. Insurance Policies table
create table if not exists public.insurance_policies (
  id text primary key default gen_random_uuid()::text,
  machine text not null,
  asset_id text references public.assets(id) on delete set null,
  provider text not null,
  policy_no text not null,
  start_date date not null,
  expiry_date date not null,
  coverage text not null,
  status text not null,
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.insurance_policies enable row level security;

create policy "Broad read for authenticated users on insurance_policies"
  on public.insurance_policies for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage insurance_policies"
  on public.insurance_policies for all
  using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

-- 10. Machine Licenses table
create table if not exists public.machine_licenses (
  id text primary key default gen_random_uuid()::text,
  kind text not null check (kind in ('Equipment License', 'Operating Permit', 'Calibration Certificate', 'Installation Certificate', 'Government Approval', 'OEM Authorization')),
  cert_no text not null,
  issue_date date not null,
  expiry_date date not null,
  department text not null,
  status text not null,
  updated_at timestamptz default now()
);

alter table public.machine_licenses enable row level security;

create policy "Broad read for authenticated users on machine_licenses"
  on public.machine_licenses for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage machine_licenses"
  on public.machine_licenses for all
  using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

-- 11. Certifications table
create table if not exists public.certifications (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  category text not null,
  issuer text not null,
  expiry_date date not null,
  version text not null,
  status text not null,
  updated_at timestamptz default now()
);

alter table public.certifications enable row level security;

create policy "Broad read for authenticated users on certifications"
  on public.certifications for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage certifications"
  on public.certifications for all
  using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

-- 12. Inventory Items table
create table if not exists public.inventory_items (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  item_code text not null,
  category text not null,
  manufacturer text not null,
  model text not null,
  location text not null,
  current_qty integer not null default 0,
  min_qty integer not null default 0,
  max_qty integer not null default 0,
  reorder_point integer not null default 0,
  unit_cost numeric not null default 0,
  supplier text not null,
  status text not null check (status in ('Operational', 'Maintenance', 'Reserved')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz default now()
);

alter table public.inventory_items enable row level security;

create policy "Broad read for authenticated users on inventory_items"
  on public.inventory_items for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage inventory_items"
  on public.inventory_items for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

-- 13. Inventory Movements table
create table if not exists public.inventory_movements (
  id text primary key default gen_random_uuid()::text,
  item_id text references public.inventory_items(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  quantity integer not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

alter table public.inventory_movements enable row level security;

create policy "Broad read for authenticated users on inventory_movements"
  on public.inventory_movements for select using (auth.role() = 'authenticated');

create policy "Authorized roles can manage inventory_movements"
  on public.inventory_movements for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));


-- 14. SEED DATA

-- Assets
insert into public.assets (id, name, type, plant, health_percentage, status, rul_days, last_inspected_at)
values 
  ('P-401', 'Centrifugal Pump', 'Pump', 'Plant A', 82, 'warning', 145, now() - interval '3 days'),
  ('C-12', 'Screw Compressor', 'Compressor', 'Plant A', 94, 'healthy', 320, now() - interval '5 days'),
  ('HX-7', 'Heat Exchanger', 'Heat Exchanger', 'Plant B', 67, 'critical', 52, now() - interval '1 day'),
  ('R-3', 'Batch Reactor', 'Reactor', 'Plant A', 88, 'healthy', 210, now() - interval '10 days')
on conflict (id) do update set 
  name = excluded.name, 
  health_percentage = excluded.health_percentage, 
  status = excluded.status, 
  rul_days = excluded.rul_days;

-- Work Orders
insert into public.work_orders (id, asset_id, title, type, priority, status, assigned_to, due_date)
values
  ('WO-101', 'P-401', 'P-401 lubrication', 'preventive', 'Medium', 'Pending', 'John Doe', now() + interval '12 hours'),
  ('WO-102', 'HX-7', 'HX-7 gasket replacement', 'predictive', 'High', 'Scheduled', 'Alice Smith', now() + interval '2 days'),
  ('WO-103', 'C-12', 'C-12 vibration analysis', 'predictive', 'Medium', 'Scheduled', 'Bob Johnson', now() + interval '5 days'),
  ('WO-104', 'R-3', 'R-3 seal check', 'preventive', 'Low', 'Scheduled', 'Charlie Brown', now() + interval '12 days')
on conflict (id) do nothing;

-- Spare Parts
insert into public.spare_parts (id, name, current_quantity, min_quantity)
values
  ('SP-001', 'Bearing 6316-C3', 4, 8),
  ('SP-002', 'Mechanical Seal MS-201', 12, 6),
  ('SP-003', 'Gasket 8" ANSI', 22, 10),
  ('SP-004', 'Filter Element FE-77', 3, 10)
on conflict (id) do update set
  current_quantity = excluded.current_quantity,
  min_quantity = excluded.min_quantity;

-- RCA Reports
insert into public.rca_reports (id, incident_ref, asset_id, symptoms, root_cause, corrective_actions)
values
  ('RCA-001', 'IR-2024-118', 'P-401', 
   'Excessive vibration >4.2 mm/s, Temperature rise 12°C above baseline, Abnormal noise', 
   'Bearing starvation, Lube interval too long (2000h), High-vibration operating regime', 
   'Reduce lube interval to 1400h, Install vibration monitoring, Update SOP §6.3')
on conflict (id) do nothing;

-- NCRs
insert into public.ncrs (id, ncr_number, description, severity, status, framework_ref)
values
  ('NCR-2024-042', 'NCR-2024-042', 'Missing calibration record for gauge PG-201', 'High', 'Open', 'PESO'),
  ('NCR-2024-041', 'NCR-2024-041', 'SOP deviation in reactor cleaning', 'Medium', 'In Review', 'ISO 9001'),
  ('NCR-2024-040', 'NCR-2024-040', 'Documented training gap — 3 operators', 'Low', 'Closed', 'ISO 9001')
on conflict (id) do update set
  status = excluded.status,
  severity = excluded.severity;

-- Compliance Frameworks
insert into public.compliance_frameworks (id, name, current_score)
values
  ('CF-001', 'Factory Act', 98),
  ('CF-002', 'OISD', 94),
  ('CF-003', 'PESO', 88),
  ('CF-004', 'ISO 9001', 96),
  ('CF-005', 'ISO 14001', 91),
  ('CF-006', 'ISO 45001', 83),
  ('CF-007', 'Environmental', 79),
  ('CF-008', 'OSHA-equiv', 92)
on conflict (id) do update set
  current_score = excluded.current_score;

-- Inspections
insert into public.inspections (id, name, framework, scheduled_date, status, assigned_to)
values
  ('INSP-001', 'Boiler Pressure Test', 'PESO', now() + interval '2 hours', 'Scheduled', 'PESO Inspector'),
  ('INSP-002', 'Fire Safety Audit', 'HSE', now() + interval '3 days', 'Scheduled', 'HSE Auditor'),
  ('INSP-003', 'Emission Monitoring', 'Environmental', now() + interval '7 days', 'Scheduled', 'Pollution Board'),
  ('INSP-004', 'Internal ISO Audit', 'QA', now() + interval '14 days', 'Scheduled', 'Lead Auditor')
on conflict (id) do nothing;

-- Insurance Policies
insert into public.insurance_policies (id, machine, asset_id, provider, policy_no, start_date, expiry_date, coverage, status)
values
  ('INS-001', 'Boiler B-12', null, 'Bajaj Allianz', 'BA-88213', '2025-01-15', '2026-01-14', '₹1.20 Cr', 'Expiring Soon'),
  ('INS-002', 'Centrifugal Pump 01', 'P-401', 'ICICI Lombard', 'IL-44518', '2025-06-01', '2027-05-31', '₹65 L', 'Active'),
  ('INS-003', 'Turbine T-1', null, 'Tata AIG', 'TA-71209', '2024-11-10', '2025-11-09', '₹4.50 Cr', 'Expired'),
  ('INS-004', 'Compressor C-07', null, 'HDFC Ergo', 'HE-33112', '2025-03-22', '2026-03-21', '₹90 L', 'Active'),
  ('INS-005', 'Reactor R-3', 'R-3', 'New India Assurance', 'NIA-91188', '2025-08-05', '2026-02-04', '₹2.10 Cr', 'Pending Renewal'),
  ('INS-006', 'Cooling Tower CT-2', null, 'Bajaj Allianz', 'BA-99001', '2025-02-11', '2026-02-10', '₹75 L', 'Expiring Soon')
on conflict (id) do update set
  expiry_date = excluded.expiry_date,
  status = excluded.status;

-- Machine Licenses
insert into public.machine_licenses (id, kind, cert_no, issue_date, expiry_date, department, status)
values
  ('LIC-001', 'Equipment License', 'EQL-2025-0421', '2024-06-12', '2027-06-11', 'Maintenance', 'Active'),
  ('LIC-002', 'Operating Permit', 'OP-2025-118', '2025-01-01', '2026-01-31', 'Operations', 'Expiring Soon'),
  ('LIC-003', 'Calibration Certificate', 'CAL-2024-889', '2024-04-18', '2025-04-18', 'Quality', 'Expired'),
  ('LIC-004', 'Installation Certificate', 'INS-2023-77', '2023-10-02', '2033-10-01', 'Engineering', 'Active'),
  ('LIC-005', 'Government Approval', 'GA-PESO-4412', '2024-08-30', '2026-08-29', 'HSE', 'Active'),
  ('LIC-006', 'OEM Authorization', 'OEM-SIE-2201', '2025-02-15', '2026-02-14', 'Maintenance', 'Renewal Required')
on conflict (id) do update set
  expiry_date = excluded.expiry_date,
  status = excluded.status;

-- Certifications
insert into public.certifications (id, name, category, issuer, expiry_date, version, status)
values
  ('CERT-001', 'ISO 9001:2015 — Quality Management', 'ISO', 'TÜV SÜD', '2026-11-20', 'v3.2', 'Active'),
  ('CERT-002', 'ISO 14001:2015 — Environmental', 'Environmental', 'DNV', '2026-04-14', 'v2.1', 'Expiring Soon'),
  ('CERT-003', 'ISO 45001 — Occupational H&S', 'Safety', 'BSI', '2027-01-30', 'v1.4', 'Active'),
  ('CERT-004', 'Factory Act Compliance', 'Factory', 'State Govt', '2026-03-15', 'v5.0', 'Expiring Soon'),
  ('CERT-005', 'Pressure Vessel Certification', 'Equipment', 'PESO', '2025-12-31', 'v2.7', 'Renewal Required')
on conflict (id) do update set
  expiry_date = excluded.expiry_date,
  status = excluded.status;

-- Inventory Items
insert into public.inventory_items (id, name, item_code, category, manufacturer, model, location, current_qty, min_qty, max_qty, reorder_point, unit_cost, supplier, status)
values
  ('INV-001', 'Ball Bearing SKF-6205', 'BRG-6205', 'Bearings', 'SKF', '6205-2RS', 'Plant A', 42, 20, 100, 30, 1200, 'SKF India', 'Operational'),
  ('INV-002', 'V-Belt Drive B-77', 'BLT-B77', 'Belts', 'Fenner', 'B-77', 'Plant A', 8, 15, 60, 20, 850, 'Fenner Drives', 'Operational'),
  ('INV-003', 'Hydraulic Oil ISO 68', 'OIL-H68', 'Lubricants', 'Shell', 'Tellus S2', 'Warehouse B', 0, 10, 40, 15, 4200, 'Shell India', 'Operational'),
  ('INV-004', 'Pressure Gauge 0-25 bar', 'GAU-25', 'Instrumentation', 'WIKA', '213.53', 'Plant B', 12, 8, 30, 10, 1800, 'WIKA', 'Operational'),
  ('INV-005', 'Motor 3-Phase 15kW', 'MTR-15K', 'Motors', 'Siemens', '1LE1', 'Plant A', 3, 2, 8, 4, 68000, 'Siemens', 'Reserved'),
  ('INV-006', 'Gasket EPDM DN100', 'GSK-100', 'Seals', 'Klinger', 'SIL-C4400', 'Warehouse A', 55, 30, 150, 40, 320, 'Klinger', 'Operational'),
  ('INV-007', 'Solenoid Valve 24V', 'VLV-24', 'Valves', 'Festo', 'MFH-3-1/4', 'Plant B', 5, 6, 20, 8, 3400, 'Festo India', 'Operational'),
  ('INV-008', 'PLC Module Digital I/O', 'PLC-DIO', 'Electronics', 'Allen-Bradley', '1756-IB16', 'Plant B', 22, 5, 25, 8, 15400, 'Rockwell', 'Operational')
on conflict (id) do update set
  current_qty = excluded.current_qty,
  min_qty = excluded.min_qty;

-- Inventory Movements
insert into public.inventory_movements (id, item_id, direction, quantity, reason)
values
  ('MVT-001', 'INV-001', 'inbound', 100, 'Initial setup stocking'),
  ('MVT-002', 'INV-001', 'outbound', 58, 'Pump PM repair'),
  ('MVT-003', 'INV-002', 'inbound', 50, 'Monthly replenishment order'),
  ('MVT-004', 'INV-002', 'outbound', 42, 'Compressor belt upgrade'),
  ('MVT-005', 'INV-004', 'inbound', 15, 'Gauge replacement stock')
on conflict (id) do nothing;
