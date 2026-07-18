-- Add source RCA reference columns to work_orders
alter table public.work_orders
  add column if not exists source_rca_id text references public.rca_reports(id) on delete set null,
  add column if not exists source_rca_action text;
