-- Add new status values for DocuSign states
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_signature';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'signed';

-- Add envelope_id column to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS envelope_id text;

-- Add index for faster lookups by envelope_id
CREATE INDEX IF NOT EXISTS idx_applications_envelope_id ON applications(envelope_id);

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 