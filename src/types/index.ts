export interface User {
  id: string;
  email: string;
  role: 'applicant' | 'admin';
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  user_email: string;
  title: string;
  description: string;
  amount_requested: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'pending_signature' | 'signed';
  feedback?: string;
  created_at: string;
  updated_at: string;
}