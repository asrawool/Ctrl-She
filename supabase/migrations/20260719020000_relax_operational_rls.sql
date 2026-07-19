-- Migration: Relax RLS policies for operational tables to allow any authenticated user to manage them
-- Drop restrictive RBAC policies
drop policy if exists "Authorized roles can manage inventory_items" on public.inventory_items;
drop policy if exists "Authorized roles can manage inventory_movements" on public.inventory_movements;
drop policy if exists "Authorized roles can manage insurance_policies" on public.insurance_policies;
drop policy if exists "Authorized roles can manage machine_licenses" on public.machine_licenses;
drop policy if exists "Authorized roles can manage certifications" on public.certifications;

-- Create broad policies for authenticated users
create policy "Authenticated users can manage inventory_items"
  on public.inventory_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage inventory_movements"
  on public.inventory_movements for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage insurance_policies"
  on public.insurance_policies for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage machine_licenses"
  on public.machine_licenses for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can manage certifications"
  on public.certifications for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Grant full table permissions to authenticated role
grant all privileges on public.inventory_items to authenticated;
grant all privileges on public.inventory_movements to authenticated;
grant all privileges on public.insurance_policies to authenticated;
grant all privileges on public.machine_licenses to authenticated;
grant all privileges on public.certifications to authenticated;
