-- Enable Row Level Security on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: User can read if they are the direct target or if the notification is role-wide and they have that role
DROP POLICY IF EXISTS "Users can read own or role-based notifications" ON public.notifications;
CREATE POLICY "Users can read own or role-based notifications" ON public.notifications
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  (user_id IS NULL AND public.user_has_role(ARRAY[metadata->>'role']))
);

-- 2. UPDATE Policy: User can mark read/unread if they are the target or if it is role-wide and they have the role
DROP POLICY IF EXISTS "Users can update own or role-based notifications" ON public.notifications;
CREATE POLICY "Users can update own or role-based notifications" ON public.notifications
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR
  (user_id IS NULL AND public.user_has_role(ARRAY[metadata->>'role']))
)
WITH CHECK (
  user_id = auth.uid() OR
  (user_id IS NULL AND public.user_has_role(ARRAY[metadata->>'role']))
);

-- 3. DELETE Policy: User can archive if they are the target or if it is role-wide and they have the role
DROP POLICY IF EXISTS "Users can delete own or role-based notifications" ON public.notifications;
CREATE POLICY "Users can delete own or role-based notifications" ON public.notifications
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR
  (user_id IS NULL AND public.user_has_role(ARRAY[metadata->>'role']))
);

-- 4. Purge existing seed/mock notifications
DELETE FROM public.notifications
WHERE title IN (
  'Vibration anomaly on P-401',
  'ISO 9001 audit completed',
  'New SOP: Reactor R-3 start-up',
  'AI insight generated',
  'Weekly digest ready'
);
