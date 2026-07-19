-- Migration: Strict RBAC realignment of user roles and table policies

-- 1. Remap old roles to their new consolidated targets
update public.user_roles set role = 'plant_ops' where role = 'production_engineer';
update public.user_roles set role = 'plant_manager' where role = 'maintenance_manager';
update public.user_roles set role = 'quality_engineer' where role = 'qa_manager';
update public.user_roles set role = 'safety_officer' where role = 'hse_engineer';
update public.user_roles set role = 'digital_transformation' where role = 'industry_40';


-- 2. Drop existing RLS policies on all operational tables
-- assets
drop policy if exists "Broad read for authenticated users on assets" on public.assets;
drop policy if exists "Authorized roles can manage assets" on public.assets;
drop policy if exists "Authorized roles can insert assets" on public.assets;
drop policy if exists "Authorized roles can update assets" on public.assets;
drop policy if exists "Authorized roles can delete assets" on public.assets;

-- work_orders
drop policy if exists "Broad read for authenticated users on work_orders" on public.work_orders;
drop policy if exists "Authorized roles can manage work_orders" on public.work_orders;
drop policy if exists "Authorized roles can insert work_orders" on public.work_orders;
drop policy if exists "Authorized roles can update work_orders" on public.work_orders;
drop policy if exists "Authorized roles can delete work_orders" on public.work_orders;

-- rca_reports
drop policy if exists "Broad read for authenticated users on rca_reports" on public.rca_reports;
drop policy if exists "Authorized roles can manage rca_reports" on public.rca_reports;
drop policy if exists "Authorized roles can insert rca_reports" on public.rca_reports;
drop policy if exists "Authorized roles can update rca_reports" on public.rca_reports;
drop policy if exists "Authorized roles can delete rca_reports" on public.rca_reports;

-- spare_parts
drop policy if exists "Broad read for authenticated users on spare_parts" on public.spare_parts;
drop policy if exists "Authorized roles can manage spare_parts" on public.spare_parts;
drop policy if exists "Authorized roles can insert spare_parts" on public.spare_parts;
drop policy if exists "Authorized roles can update spare_parts" on public.spare_parts;
drop policy if exists "Authorized roles can delete spare_parts" on public.spare_parts;

-- inventory_items
drop policy if exists "Broad read for authenticated users on inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can manage inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can insert inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can update inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can delete inventory_items" on public.inventory_items;

-- inventory_movements
drop policy if exists "Broad read for authenticated users on inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can manage inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can insert inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can update inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can delete inventory_movements" on public.inventory_movements;

-- ncrs
drop policy if exists "Broad read for authenticated users on ncrs" on public.ncrs;
drop policy if exists "Authorized roles can manage ncrs" on public.ncrs;
drop policy if exists "Authorized roles can insert ncrs" on public.ncrs;
drop policy if exists "Authorized roles can update ncrs" on public.ncrs;
drop policy if exists "Authorized roles can delete ncrs" on public.ncrs;

-- inspections
drop policy if exists "Broad read for authenticated users on inspections" on public.inspections;
drop policy if exists "Authorized roles can manage inspections" on public.inspections;
drop policy if exists "Authorized roles can insert inspections" on public.inspections;
drop policy if exists "Authorized roles can update inspections" on public.inspections;
drop policy if exists "Authorized roles can delete inspections" on public.inspections;

-- compliance_frameworks
drop policy if exists "Broad read for authenticated users on compliance_frameworks" on public.compliance_frameworks;
drop policy if exists "Authorized roles can manage compliance_frameworks" on public.compliance_frameworks;
drop policy if exists "Authorized roles can insert compliance_frameworks" on public.compliance_frameworks;
drop policy if exists "Authorized roles can update compliance_frameworks" on public.compliance_frameworks;
drop policy if exists "Authorized roles can delete compliance_frameworks" on public.compliance_frameworks;

-- insurance_policies
drop policy if exists "Broad read for authenticated users on insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can manage insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can insert insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can update insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can delete insurance_policies" on public.insurance_policies;

-- machine_licenses
drop policy if exists "Broad read for authenticated users on machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can manage machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can insert machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can update machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can delete machine_licenses" on public.machine_licenses;

-- certifications
drop policy if exists "Broad read for authenticated users on certifications" on public.certifications;
drop policy if exists "Authorized roles can manage certifications" on public.certifications;
drop policy if exists "Authorized roles can insert certifications" on public.certifications;
drop policy if exists "Authorized roles can update certifications" on public.certifications;
drop policy if exists "Authorized roles can delete certifications" on public.certifications;

-- failure_patterns
drop policy if exists "Broad read for authenticated users on failure_patterns" on public.failure_patterns;
drop policy if exists "Authorized roles can manage failure_patterns" on public.failure_patterns;
drop policy if exists "Authorized roles can insert failure_patterns" on public.failure_patterns;
drop policy if exists "Authorized roles can update failure_patterns" on public.failure_patterns;
drop policy if exists "Authorized roles can delete failure_patterns" on public.failure_patterns;


-- 3. Create explicit read/write policies for each table

-- assets
create policy "Broad read for authenticated users on assets"
  on public.assets for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert assets"
  on public.assets for insert with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']));
create policy "Authorized roles can update assets"
  on public.assets for update using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']));
create policy "Authorized roles can delete assets"
  on public.assets for delete using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']));

-- work_orders
create policy "Broad read for authenticated users on work_orders"
  on public.work_orders for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert work_orders"
  on public.work_orders for insert with check (public.user_has_role(array['maintenance_engineer', 'plant_ops', 'reliability_engineer', 'plant_manager']));
create policy "Authorized roles can update work_orders"
  on public.work_orders for update using (public.user_has_role(array['maintenance_engineer', 'plant_ops', 'reliability_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'plant_ops', 'reliability_engineer', 'plant_manager']));
create policy "Authorized roles can delete work_orders"
  on public.work_orders for delete using (public.user_has_role(array['maintenance_engineer', 'plant_ops', 'reliability_engineer', 'plant_manager']));

-- rca_reports
create policy "Broad read for authenticated users on rca_reports"
  on public.rca_reports for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert rca_reports"
  on public.rca_reports for insert with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']));
create policy "Authorized roles can update rca_reports"
  on public.rca_reports for update using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']));
create policy "Authorized roles can delete rca_reports"
  on public.rca_reports for delete using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'plant_manager']));

-- spare_parts
create policy "Broad read for authenticated users on spare_parts"
  on public.spare_parts for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert spare_parts"
  on public.spare_parts for insert with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can update spare_parts"
  on public.spare_parts for update using (public.user_has_role(array['maintenance_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can delete spare_parts"
  on public.spare_parts for delete using (public.user_has_role(array['maintenance_engineer', 'plant_manager']));

-- inventory_items
create policy "Broad read for authenticated users on inventory_items"
  on public.inventory_items for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert inventory_items"
  on public.inventory_items for insert with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can update inventory_items"
  on public.inventory_items for update using (public.user_has_role(array['maintenance_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can delete inventory_items"
  on public.inventory_items for delete using (public.user_has_role(array['maintenance_engineer', 'plant_manager']));

-- inventory_movements
create policy "Broad read for authenticated users on inventory_movements"
  on public.inventory_movements for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert inventory_movements"
  on public.inventory_movements for insert with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can update inventory_movements"
  on public.inventory_movements for update using (public.user_has_role(array['maintenance_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can delete inventory_movements"
  on public.inventory_movements for delete using (public.user_has_role(array['maintenance_engineer', 'plant_manager']));

-- ncrs
create policy "Broad read for authenticated users on ncrs"
  on public.ncrs for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert ncrs"
  on public.ncrs for insert with check (public.user_has_role(array['plant_ops', 'quality_engineer', 'safety_officer', 'plant_manager']));
create policy "Authorized roles can update ncrs"
  on public.ncrs for update using (public.user_has_role(array['plant_ops', 'quality_engineer', 'safety_officer', 'plant_manager']))
  with check (public.user_has_role(array['plant_ops', 'quality_engineer', 'safety_officer', 'plant_manager']));
create policy "Authorized roles can delete ncrs"
  on public.ncrs for delete using (public.user_has_role(array['plant_ops', 'quality_engineer', 'safety_officer', 'plant_manager']));

-- inspections
create policy "Broad read for authenticated users on inspections"
  on public.inspections for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert inspections"
  on public.inspections for insert with check (public.user_has_role(array['quality_engineer', 'safety_officer', 'plant_manager']));
create policy "Authorized roles can update inspections"
  on public.inspections for update using (public.user_has_role(array['quality_engineer', 'safety_officer', 'plant_manager']))
  with check (public.user_has_role(array['quality_engineer', 'safety_officer', 'plant_manager']));
create policy "Authorized roles can delete inspections"
  on public.inspections for delete using (public.user_has_role(array['quality_engineer', 'safety_officer', 'plant_manager']));

-- compliance_frameworks
create policy "Broad read for authenticated users on compliance_frameworks"
  on public.compliance_frameworks for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert compliance_frameworks"
  on public.compliance_frameworks for insert with check (public.user_has_role(array['quality_engineer', 'plant_manager']));
create policy "Authorized roles can update compliance_frameworks"
  on public.compliance_frameworks for update using (public.user_has_role(array['quality_engineer', 'plant_manager']))
  with check (public.user_has_role(array['quality_engineer', 'plant_manager']));
create policy "Authorized roles can delete compliance_frameworks"
  on public.compliance_frameworks for delete using (public.user_has_role(array['quality_engineer', 'plant_manager']));

-- insurance_policies
create policy "Broad read for authenticated users on insurance_policies"
  on public.insurance_policies for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert insurance_policies"
  on public.insurance_policies for insert with check (public.user_has_role(array['safety_officer', 'plant_manager']));
create policy "Authorized roles can update insurance_policies"
  on public.insurance_policies for update using (public.user_has_role(array['safety_officer', 'plant_manager']))
  with check (public.user_has_role(array['safety_officer', 'plant_manager']));
create policy "Authorized roles can delete insurance_policies"
  on public.insurance_policies for delete using (public.user_has_role(array['safety_officer', 'plant_manager']));

-- machine_licenses
create policy "Broad read for authenticated users on machine_licenses"
  on public.machine_licenses for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert machine_licenses"
  on public.machine_licenses for insert with check (public.user_has_role(array['safety_officer', 'plant_manager']));
create policy "Authorized roles can update machine_licenses"
  on public.machine_licenses for update using (public.user_has_role(array['safety_officer', 'plant_manager']))
  with check (public.user_has_role(array['safety_officer', 'plant_manager']));
create policy "Authorized roles can delete machine_licenses"
  on public.machine_licenses for delete using (public.user_has_role(array['safety_officer', 'plant_manager']));

-- certifications
create policy "Broad read for authenticated users on certifications"
  on public.certifications for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert certifications"
  on public.certifications for insert with check (public.user_has_role(array['quality_engineer', 'plant_manager']));
create policy "Authorized roles can update certifications"
  on public.certifications for update using (public.user_has_role(array['quality_engineer', 'plant_manager']))
  with check (public.user_has_role(array['quality_engineer', 'plant_manager']));
create policy "Authorized roles can delete certifications"
  on public.certifications for delete using (public.user_has_role(array['quality_engineer', 'plant_manager']));

-- failure_patterns
create policy "Broad read for authenticated users on failure_patterns"
  on public.failure_patterns for select using (auth.role() = 'authenticated');
create policy "Authorized roles can insert failure_patterns"
  on public.failure_patterns for insert with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can update failure_patterns"
  on public.failure_patterns for update using (public.user_has_role(array['maintenance_engineer', 'plant_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
create policy "Authorized roles can delete failure_patterns"
  on public.failure_patterns for delete using (public.user_has_role(array['maintenance_engineer', 'plant_manager']));
