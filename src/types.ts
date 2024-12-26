export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'pending_signature'
  | 'signed';

export interface Application {
  id: string;
  user_id: string;
  user_email?: string;
  title: string;
  description: string;
  amount_requested: number;
  status: ApplicationStatus;
  feedback?: string;
  created_at: string;
  updated_at: string;
  envelope_id?: string;
} 