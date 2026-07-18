ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS size bigint;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source text DEFAULT '—';
