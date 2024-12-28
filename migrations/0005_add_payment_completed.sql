-- Add payment_completed column to applications table
ALTER TABLE applications 
ADD COLUMN payment_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing applications to have payment_completed as false
UPDATE applications 
SET payment_completed = FALSE
WHERE payment_completed IS NULL; 