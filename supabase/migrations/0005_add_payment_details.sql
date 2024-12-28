-- Add payment_details column as JSONB to store all payment-related fields
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- Add has_submitted_payment_details flag
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS has_submitted_payment_details BOOLEAN DEFAULT FALSE;

-- Create index for has_submitted_payment_details for faster queries
CREATE INDEX IF NOT EXISTS idx_applications_payment_status 
ON applications(has_submitted_payment_details); 