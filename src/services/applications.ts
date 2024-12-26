import { supabase } from '../lib/supabase';
import type { Application } from '../types';

type ApplicationInput = Omit<Application, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'user_email'>;

export async function createApplication(data: ApplicationInput) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to create an application');
  }

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      title: data.title,
      description: data.description,
      amount_requested: data.amount_requested,
      status: 'draft',
      user_id: user.id
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating application:', error);
    throw new Error('Failed to create application. Please try again.');
  }

  return application;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
}

export async function getUserApplications(
  page: number = 1,
  pageSize: number = 5,
  status?: Application['status'] | 'all'
): Promise<PaginatedResponse<Application>> {
  // Build the base query
  let query = supabase
    .from('applications')
    .select('*', { count: 'exact' });

  // Add status filter if specified and not 'all'
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  // Get the total count
  const { count, error: countError } = await query;

  if (countError) {
    console.error('Error getting applications count:', countError);
    throw new Error('Failed to fetch applications count. Please try again.');
  }

  // Build the data query
  let dataQuery = supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  // Add status filter if specified and not 'all'
  if (status && status !== 'all') {
    dataQuery = dataQuery.eq('status', status);
  }

  // Add pagination
  dataQuery = dataQuery.range((page - 1) * pageSize, page * pageSize - 1);

  const { data: applications, error } = await dataQuery;

  if (error) {
    console.error('Error fetching applications:', error);
    throw new Error('Failed to fetch applications. Please try again.');
  }

  return {
    data: applications || [],
    count: count || 0
  };
}

export async function getApplicationById(id: string) {
  const { data: application, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching application:', error);
    throw new Error('Failed to fetch application details. Please try again.');
  }

  if (!application) {
    throw new Error('Application not found');
  }

  return application;
}

export async function updateApplication(id: string, data: Partial<ApplicationInput>) {
  const { data: application, error } = await supabase
    .from('applications')
    .update(data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating application:', error);
    throw new Error('Failed to update application. Please try again.');
  }

  return application;
}

export async function submitApplication(id: string) {
  const { data: application, error } = await supabase
    .from('applications')
    .update({ status: 'submitted' })
    .eq('id', id)
    .eq('status', 'draft') // Only allow submitting draft applications
    .select('*')
    .single();

  if (error) {
    console.error('Error submitting application:', error);
    throw new Error('Failed to submit application. Please try again.');
  }

  if (!application) {
    throw new Error('Application not found or already submitted');
  }

  return application;
}

export async function approveApplication(id: string, feedback?: string) {
  const { data: application, error } = await supabase
    .from('applications')
    .update({ 
      status: 'approved',
      feedback: feedback || null 
    })
    .eq('id', id)
    .eq('status', 'submitted') // Only allow approving submitted applications
    .select('*')
    .single();

  if (error) {
    console.error('Error approving application:', error);
    throw new Error('Failed to approve application. Please try again.');
  }

  if (!application) {
    throw new Error('Application not found or not in submitted state');
  }

  return application;
}

export async function rejectApplication(id: string, feedback: string) {
  if (!feedback) {
    throw new Error('Feedback is required when rejecting an application');
  }

  const { data: application, error } = await supabase
    .from('applications')
    .update({ 
      status: 'rejected',
      feedback: feedback 
    })
    .eq('id', id)
    .eq('status', 'submitted') // Only allow rejecting submitted applications
    .select('*')
    .single();

  if (error) {
    console.error('Error rejecting application:', error);
    throw new Error('Failed to reject application. Please try again.');
  }

  if (!application) {
    throw new Error('Application not found or not in submitted state');
  }

  return application;
}