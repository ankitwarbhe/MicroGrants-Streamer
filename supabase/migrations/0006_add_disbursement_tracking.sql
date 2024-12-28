-- Create disbursement_stages enum type
CREATE TYPE disbursement_stage AS ENUM (
  'pending',
  'in_progress',
  'completed'
);

-- Create disbursement_milestones table
CREATE TABLE disbursement_milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  milestone_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,
  stage disbursement_stage DEFAULT 'pending',
  completed_at TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX idx_disbursement_milestones_application_id 
ON disbursement_milestones(application_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_disbursement_milestones_updated_at
  BEFORE UPDATE ON disbursement_milestones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 