import { supabase } from '../lib/supabase';
import type { Application } from '../types';
import type { PaginatedResponse } from './applications';

export async function getAllApplications(
  page: number = 1,
  pageSize: number = 10,
  status?: Application['status']
): Promise<PaginatedResponse<Application & { user: { email: string } }>> {
  let query = supabase
    .from('applications')
    .select(`
      *,
      user:user_id (
        email
      )
    `, { count: 'exact' });

  // Add status filter if provided
  if (status) {
    query = query.eq('status', status);
  }

  // Add pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching applications:', error);
    throw new Error('Failed to fetch applications. Please try again.');
  }

  return {
    data: data || [],
    count: count || 0
  };
}

export async function updateApplicationStatus(
  id: string,
  status: Application['status'],
  feedback?: string
) {
  const { data: application, error } = await supabase
    .from('applications')
    .update({ 
      status,
      feedback,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating application status:', error);
    throw new Error('Failed to update application status. Please try again.');
  }

  return application;
}
