import { supabase } from '../lib/supabase';
import type { Application } from '../types';

type ApplicationInput = Omit<Application, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at'>;

export async function createApplication(data: ApplicationInput) {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('You must be logged in to create an application');
  }

  const { data: application, error } = await supabase
    .from('applications')
    .insert({
      title: data.title,
      description: data.description,
      amount_requested: data.amount_requested,
      status: 'draft',
      user_id: user.data.user.id
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating application:', error);
    throw new Error('Failed to create application. Please try again.');
  }

  return application;
}

export async function getUserApplications() {
  const { data: applications, error } = await supabase
    .from('applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching applications:', error);
    throw new Error('Failed to fetch applications. Please try again.');
  }

  return applications;
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