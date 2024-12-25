/*
  # Initial Schema for Micro-Grants System

  1. New Tables
    - applications
      - id (uuid, primary key)
      - user_id (references auth.users)
      - title (text)
      - description (text)
      - amount_requested (numeric)
      - status (enum)
      - feedback (text, nullable)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on applications table
    - Add policies for:
      - Applicants can read their own applications
      - Applicants can create applications
      - Admins can read all applications
      - Admins can update application status and feedback
*/

-- Create custom types
CREATE TYPE application_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected'
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  amount_requested numeric NOT NULL CHECK (amount_requested > 0),
  status application_status NOT NULL DEFAULT 'draft',
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Policies for applicants
CREATE POLICY "Applicants can read own applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Applicants can create applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Applicants can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
    )
  );

-- Policies for admins
CREATE POLICY "Admins can read all applications"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can update applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Allow authenticated users to read basic user information
CREATE POLICY "Allow users to read basic user info"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant permissions to read auth.users
GRANT SELECT ON auth.users TO authenticated;

-- Create function to update user role
CREATE OR REPLACE FUNCTION update_user_role(user_id UUID, new_role TEXT)
RETURNS void AS $$
BEGIN
  UPDATE auth.users 
  SET raw_user_meta_data = 
    CASE 
      WHEN raw_user_meta_data IS NULL THEN jsonb_build_object('role', new_role)
      ELSE raw_user_meta_data || jsonb_build_object('role', new_role)
    END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated;

-- Add user_email column to applications table
ALTER TABLE applications 
ADD COLUMN user_email text REFERENCES;

-- Create trigger to automatically set user_email from auth.users
CREATE OR REPLACE FUNCTION set_user_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_email := (
    SELECT email 
    FROM auth.users 
    WHERE id = NEW.user_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER;

CREATE TRIGGER set_user_email_trigger
BEFORE INSERT OR UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION set_user_email();


--SELECT update_user_role('e463c1ec-746f-457f-9d9e-f5db158b8592', 'admin');