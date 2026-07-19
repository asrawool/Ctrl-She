-- 1. Create purchase_requests table
CREATE TABLE IF NOT EXISTS public.purchase_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('asset', 'spare_part')),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  priority text NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  justification text NOT NULL,
  supporting_documents jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Modification Requested', 'Procured')),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  modification_notes text,
  linked_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE public.purchase_requests ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Scoped read access: only maintenance_engineer, plant_manager, reliability_engineer, safety_officer, digital_transformation roles
CREATE POLICY "Authorized roles can read purchase_requests"
  ON public.purchase_requests FOR SELECT
  USING (
    public.user_has_role(array['maintenance_engineer', 'plant_manager', 'reliability_engineer', 'safety_officer', 'digital_transformation'])
  );

-- Create/manage access: only maintenance_engineer and plant_manager
CREATE POLICY "Authorized roles can insert purchase_requests"
  ON public.purchase_requests FOR INSERT
  WITH CHECK (
    public.user_has_role(array['maintenance_engineer', 'plant_manager'])
  );

CREATE POLICY "Authorized roles can update purchase_requests"
  ON public.purchase_requests FOR UPDATE
  USING (
    public.user_has_role(array['maintenance_engineer', 'plant_manager'])
  )
  WITH CHECK (
    public.user_has_role(array['maintenance_engineer', 'plant_manager'])
  );

CREATE POLICY "Authorized roles can delete purchase_requests"
  ON public.purchase_requests FOR DELETE
  USING (
    public.user_has_role(array['maintenance_engineer', 'plant_manager'])
  );
