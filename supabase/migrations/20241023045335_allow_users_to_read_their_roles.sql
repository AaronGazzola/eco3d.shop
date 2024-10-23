-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all users to select their own roles" ON public.user_roles;

-- Create a new policy to allow all users (authenticated and anonymous) to select their own roles
CREATE POLICY "Allow all users to select their own roles"
ON public.user_roles
AS PERMISSIVE
FOR SELECT
TO authenticated, anon
USING (user_id = auth.uid());

-- Ensure Row Level Security is enabled on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Grant SELECT permission to authenticated users
GRANT SELECT ON public.user_roles TO authenticated;