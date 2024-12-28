-- Create disbursement status enum
CREATE TYPE disbursement_status AS ENUM ('pending', 'approved', 'released', 'completed');

-- Create disbursement milestones table
CREATE TABLE disbursement_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    milestone_number INT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    status disbursement_status DEFAULT 'pending',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_amount CHECK (amount > 0)
);

-- Create index for faster lookups
CREATE INDEX idx_disbursement_milestones_application_id 
ON disbursement_milestones(application_id);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_disbursement_milestones_updated_at
    BEFORE UPDATE ON disbursement_milestones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 