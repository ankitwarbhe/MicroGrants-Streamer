-- Add disbursement_steps column as JSONB to store all disbursement tracking information
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS disbursement_steps JSONB DEFAULT '[]'::jsonb; 