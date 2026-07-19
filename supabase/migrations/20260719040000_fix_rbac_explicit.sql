-- Migration: Re-enforce explicit SELECT vs WRITE RLS policies on operational tables

-- 1. Drop existing policies to clean up
drop policy if exists "Broad read for authenticated users on inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can manage inventory_items" on public.inventory_items;

drop policy if exists "Broad read for authenticated users on inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can manage inventory_movements" on public.inventory_movements;

drop policy if exists "Broad read for authenticated users on insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can manage insurance_policies" on public.insurance_policies;

drop policy if exists "Broad read for authenticated users on machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can manage machine_licenses" on public.machine_licenses;

drop policy if exists "Broad read for authenticated users on certifications" on public.certifications;
drop policy if exists "Authorized roles can manage certifications" on public.certifications;


-- 2. Define Explicit Policies for inventory_items
create policy "Broad read for authenticated users on inventory_items"
  on public.inventory_items for select using (auth.role() = 'authenticated');

create policy "Authorized roles can insert inventory_items"
  on public.inventory_items for insert with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

create policy "Authorized roles can update inventory_items"
  on public.inventory_items for update using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

create policy "Authorized roles can delete inventory_items"
  on public.inventory_items for delete using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));


-- 3. Define Explicit Policies for inventory_movements
create policy "Broad read for authenticated users on inventory_movements"
  on public.inventory_movements for select using (auth.role() = 'authenticated');

create policy "Authorized roles can insert inventory_movements"
  on public.inventory_movements for insert with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

create policy "Authorized roles can update inventory_movements"
  on public.inventory_movements for update using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

create policy "Authorized roles can delete inventory_movements"
  on public.inventory_movements for delete using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));


-- 4. Define Explicit Policies for insurance_policies
create policy "Broad read for authenticated users on insurance_policies"
  on public.insurance_policies for select using (auth.role() = 'authenticated');

create policy "Authorized roles can insert insurance_policies"
  on public.insurance_policies for insert with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can update insurance_policies"
  on public.insurance_policies for update using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can delete insurance_policies"
  on public.insurance_policies for delete using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));


-- 5. Define Explicit Policies for machine_licenses
create policy "Broad read for authenticated users on machine_licenses"
  on public.machine_licenses for select using (auth.role() = 'authenticated');

create policy "Authorized roles can insert machine_licenses"
  on public.machine_licenses for insert with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can update machine_licenses"
  on public.machine_licenses for update using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can delete machine_licenses"
  on public.machine_licenses for delete using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));


-- 6. Define Explicit Policies for certifications
create policy "Broad read for authenticated users on certifications"
  on public.certifications for select using (auth.role() = 'authenticated');

create policy "Authorized roles can insert certifications"
  on public.certifications for insert with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can update certifications"
  on public.certifications for update using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can delete certifications"
  on public.certifications for delete using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));
