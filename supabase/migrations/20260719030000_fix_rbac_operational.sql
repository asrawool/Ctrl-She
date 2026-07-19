-- Migration: Revert relaxed RLS and apply strict RBAC policies for operational tables
-- Drop relaxed policies
drop policy if exists "Authenticated users can manage inventory_items" on public.inventory_items;
drop policy if exists "Authenticated users can manage inventory_movements" on public.inventory_movements;
drop policy if exists "Authenticated users can manage insurance_policies" on public.insurance_policies;
drop policy if exists "Authenticated users can manage machine_licenses" on public.machine_licenses;
drop policy if exists "Authenticated users can manage certifications" on public.certifications;

-- Drop old strict policies if still present
drop policy if exists "Authorized roles can manage inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can manage inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can manage insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can manage machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can manage certifications" on public.certifications;

-- Create strict RBAC policies for Inventory tables
create policy "Authorized roles can manage inventory_items"
  on public.inventory_items for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

create policy "Authorized roles can manage inventory_movements"
  on public.inventory_movements for all
  using (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']))
  with check (public.user_has_role(array['maintenance_engineer', 'reliability_engineer', 'production_engineer', 'document_controller', 'plant_manager', 'maintenance_manager']));

-- Create strict RBAC policies for Insurance & Certifications tables
create policy "Authorized roles can manage insurance_policies"
  on public.insurance_policies for all
  using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can manage machine_licenses"
  on public.machine_licenses for all
  using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));

create policy "Authorized roles can manage certifications"
  on public.certifications for all
  using (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']))
  with check (public.user_has_role(array['reliability_engineer', 'quality_engineer', 'qa_manager', 'safety_officer', 'hse_engineer', 'document_controller', 'plant_manager']));
