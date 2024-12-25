/*
  # Fix Admin Dashboard Access

  1. Changes
    - Drop all existing read policies
    - Create a single comprehensive read policy for both admins and users
    - Ensure proper admin access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own applications" ON applications;
DROP POLICY IF EXISTS "Admins can read all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;
DROP POLICY IF EXISTS "application_read_policy" ON applications;

-- Create comprehensive read policy
CREATE POLICY "application_read_policy"
ON applications FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
);

-- Add admin update policy
CREATE POLICY "Admins can update all applications"
ON applications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'admin'
      OR auth.users.raw_app_meta_data->>'role' = 'admin'
    )
  )
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated; 