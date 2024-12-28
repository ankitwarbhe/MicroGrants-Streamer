import { supabase } from '../lib/supabase';
import type { DisbursementMilestone, DisbursementStage } from '../types';

export async function getMilestones(applicationId: string): Promise<DisbursementMilestone[]> {
  const { data: milestones, error } = await supabase
    .from('disbursement_milestones')
    .select('*')
    .eq('application_id', applicationId)
    .order('milestone_number', { ascending: true });

  if (error) {
    console.error('Error fetching milestones:', error);
    throw new Error('Failed to fetch disbursement milestones');
  }

  return milestones || [];
}

export async function updateMilestoneStage(
  milestoneId: string,
  stage: DisbursementStage
): Promise<DisbursementMilestone> {
  const updates: Partial<DisbursementMilestone> = {
    stage,
    completed_at: stage === 'completed' ? new Date().toISOString() : null
  };

  const { data: milestone, error } = await supabase
    .from('disbursement_milestones')
    .update(updates)
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) {
    console.error('Error updating milestone:', error);
    throw new Error('Failed to update milestone stage');
  }

  return milestone;
}

export async function createMilestone(
  data: Omit<DisbursementMilestone, 'id' | 'created_at' | 'updated_at' | 'completed_at'>
): Promise<DisbursementMilestone> {
  const { data: milestone, error } = await supabase
    .from('disbursement_milestones')
    .insert([data])
    .select()
    .single();

  if (error) {
    console.error('Error creating milestone:', error);
    throw new Error('Failed to create disbursement milestone');
  }

  return milestone;
} 