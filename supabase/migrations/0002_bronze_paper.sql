/*
  # Update Application Policies

  1. Changes
    - Add policies for applicants to create and read their own applications
    - Add policies for admins to manage all applications
  
  2. Security
    - Enable RLS on applications table
    - Restrict access based on user role and ownership
*/

-- Ensure RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Applicants can read own applications" ON applications;
DROP POLICY IF EXISTS "Applicants can create applications" ON applications;
DROP POLICY IF EXISTS "Admins can read all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update applications" ON applications;

-- Create new policies
CREATE POLICY "Applicants can read own applications"
ON applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Applicants can create own applications"
ON applications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    SELECT raw_user_meta_data->>'role' 
    FROM auth.users 
    WHERE id = auth.uid()
  ) = 'applicant'
);

CREATE POLICY "Admins can read all applications"
ON applications FOR SELECT
TO authenticated
USING (
  (
    SELECT raw_user_meta_data->>'role' 
    FROM auth.users 
    WHERE id = auth.uid()
  ) = 'admin'
);

CREATE POLICY "Admins can update all applications"
ON applications FOR UPDATE
TO authenticated
USING (
  (
    SELECT raw_user_meta_data->>'role' 
    FROM auth.users 
    WHERE id = auth.uid()
  ) = 'admin'
);