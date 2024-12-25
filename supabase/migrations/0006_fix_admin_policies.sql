-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin Access" ON auth.users;

-- Create policy for admins to access auth.users
CREATE POLICY "Admin Access"
ON auth.users
FOR SELECT
TO authenticated
USING (
  current_user = 'authenticator' OR
  (
    coalesce(
      current_setting('request.jwt.claims', true)::json->>'role',
      'authenticated'
    ) = 'admin'
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated; 