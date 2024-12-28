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
  };
  has_submitted_payment_details?: boolean;
} 