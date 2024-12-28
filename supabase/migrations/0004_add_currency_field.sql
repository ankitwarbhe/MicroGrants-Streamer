-- Add currency column to applications table with USD as default
ALTER TABLE applications 
ADD COLUMN currency text NOT NULL DEFAULT 'USD';

-- Update existing applications to use USD
UPDATE applications 
SET currency = 'USD'
WHERE currency = 'USD';

-- Add check constraint to ensure only valid currencies are used
ALTER TABLE applications
ADD CONSTRAINT valid_currency CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR')); 