-- Allow admin users full access to all buckets
CREATE POLICY "Allow admin users full access to all buckets"
ON storage.objects
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  (
    SELECT COUNT(*) 
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ) > 0
)
WITH CHECK (
  (
    SELECT COUNT(*) 
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  ) > 0
);
