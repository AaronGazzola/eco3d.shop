-- Policy to allow supabase_auth_admin to read role permissions
CREATE POLICY "Allow auth admin to read role permissions"
ON public.role_permissions
AS PERMISSIVE
FOR SELECT
TO supabase_auth_admin
USING (true);

-- Create a function for authorizing user permissions based on roles
CREATE OR REPLACE FUNCTION public.authorize(requested_permission public.app_permission)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  DECLARE
    bind_permissions INT;
    user_role public.app_role;
  BEGIN
    -- Fetch the user's role from the JWT
    SELECT (auth.jwt() ->> 'user_role')::public.app_role INTO user_role;

    -- Check if the user role has the requested permission
    SELECT COUNT(*)
    INTO bind_permissions
    FROM public.role_permissions
    WHERE role_permissions.permission = requested_permission
    AND role_permissions.role = user_role;

    -- Return true if the user has the required permission
    RETURN bind_permissions > 0;
  END;
$$;

-- Grant execute permission on the authorize function to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.authorize TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.authorize FROM authenticated, anon, public;
