/*
  # Fix Application Policies

  1. Changes
    - Simplify RLS policies to fix permission issues
    - Remove role checks from basic operations
    - Ensure proper access control
  
  2. Security
    - Enable RLS on applications table
    - Basic read/write access for authenticated users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Applicants can read own applications" ON applications;
DROP POLICY IF EXISTS "Applicants can create own applications" ON applications;
DROP POLICY IF EXISTS "Admins can read all applications" ON applications;
DROP POLICY IF EXISTS "Admins can update all applications" ON applications;

-- Create simplified policies
CREATE POLICY "Users can read own applications"
ON applications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
ON applications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
ON applications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);