-- Migration: Create secure notifications RPC helper with RBAC guard logic

CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id uuid,
  title text,
  message text,
  type text DEFAULT 'info',
  metadata jsonb DEFAULT '{}'::jsonb,
  icon text DEFAULT null,
  link text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass client RLS constraints on raw inserts
AS $$
DECLARE
  new_notification_id uuid;
BEGIN
  -- 1. Enforce authentication
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'Access Denied: You must be authenticated to send notifications.';
  END IF;

  -- 2. Guard against spam/harassment (cross-user RBAC check)
  -- Allow self-notifications unconditionally (reminders, status updates on own requests, etc.)
  IF auth.uid() <> target_user_id THEN
    -- Check if the sender has one of the authorized staff roles
    IF NOT public.user_has_role(ARRAY[
      'plant_manager',
      'maintenance_engineer',
      'plant_ops',
      'reliability_engineer',
      'quality_engineer',
      'safety_officer',
      'document_controller',
      'digital_transformation'
    ]) THEN
      RAISE EXCEPTION 'Access Denied: You do not have permission to send notifications to other users.';
    END IF;
  END IF;

  -- 3. Perform insert under owner privileges
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    metadata,
    icon,
    link,
    is_read
  ) VALUES (
    target_user_id,
    title,
    message,
    type,
    metadata,
    icon,
    link,
    false
  )
  RETURNING id INTO new_notification_id;

  RETURN new_notification_id;
END;
$$;

-- Grant execution privileges to all authenticated users
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb, text, text) TO authenticated;

-- Allow email column in user_profiles
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email text;

-- Allow assignee_id column in work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES public.user_profiles(user_id) ON DELETE SET NULL;

-- Restrict SELECT policy on user_profiles to own profile or authorized roles
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.user_profiles;
CREATE POLICY "Authenticated users can read profiles if authorized" ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  public.user_has_role(ARRAY[
    'plant_manager',
    'maintenance_engineer',
    'plant_ops',
    'reliability_engineer',
    'quality_engineer',
    'safety_officer',
    'document_controller',
    'digital_transformation'
  ])
);


