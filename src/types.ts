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

export type DisbursementStatus = 'not_started' | 'pending' | 'initiated' | 'processing' | 'completed';

export interface DisbursementStep {
  label: string;
  status: DisbursementStatus;
  date?: string;
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
  payment_completed?: boolean;
  disbursement_steps?: DisbursementStep[];
} 