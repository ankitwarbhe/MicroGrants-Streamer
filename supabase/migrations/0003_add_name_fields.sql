-- Add first_name and last_name columns to applications table
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS first_name text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_name text NOT NULL DEFAULT '';

-- Update existing applications to use email username as first_name (temporary migration)
UPDATE applications 
SET first_name = SPLIT_PART(user_email, '@', 1)
WHERE first_name = ''; 