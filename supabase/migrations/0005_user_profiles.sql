-- Add user_email column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS user_email text;

-- Update existing applications with user emails from auth.users
UPDATE applications
SET user_email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = applications.user_id
); 