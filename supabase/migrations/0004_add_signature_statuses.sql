-- Add new status values for DocuSign states
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_signature_applicant';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'pending_signature_admin';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'terminated'; 