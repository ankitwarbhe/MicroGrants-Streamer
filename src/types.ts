export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'pending_signature'
  | 'signed';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'INR';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹'
};

export type DisbursementStage = 'pending' | 'in_progress' | 'completed';

export interface DisbursementMilestone {
  id: string;
  application_id: string;
  milestone_number: number;
  title: string;
  description?: string;
  amount: number;
  stage: DisbursementStage;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  user_email?: string;
  first_name: string;
  last_name: string;
  title: string;
  description: string;
  amount_requested: number;
  currency: Currency;
  status: ApplicationStatus;
  feedback?: string;
  created_at: string;
  updated_at: string;
  envelope_id?: string;
  payment_details?: {
    beneficiary_name: string;
    bank_branch: string;
    ifsc_code: string;
    account_type: string;
    account_number: string;
    upi_id: string;
  };
  has_submitted_payment_details?: boolean;
  disbursement_milestones?: DisbursementMilestone[];
} 