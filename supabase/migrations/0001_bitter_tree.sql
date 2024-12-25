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

-- Allow applicants to update their own applications
CREATE POLICY "Applicants can update own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id 
    AND status = 'draft' -- Only allow updates when application is in draft status
  );