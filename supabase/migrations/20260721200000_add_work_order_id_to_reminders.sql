-- Migration: Add optional work_order_id column to reminders table
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS work_order_id text REFERENCES public.work_orders(id) ON DELETE CASCADE;
