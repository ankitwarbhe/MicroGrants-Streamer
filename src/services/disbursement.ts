import { supabase } from '../lib/supabase';
import type { DisbursementMilestone, DisbursementStage, Application } from '../types';

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
    completed_at: stage === 'completed' ? new Date().toISOString() : undefined
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

export async function generateDefaultMilestones(application: Application): Promise<DisbursementMilestone[]> {
  const milestoneAmount = application.amount_requested * 0.25; // 25% of total amount
  
  const defaultMilestones = [
    {
      application_id: application.id,
      milestone_number: 1,
      title: 'Initial Grant Disbursement',
      description: 'First installment of 25% of the total grant amount',
      amount: milestoneAmount,
      stage: 'pending' as DisbursementStage
    },
    {
      application_id: application.id,
      milestone_number: 2,
      title: 'Second Milestone',
      description: 'Second installment of 25% upon progress review',
      amount: milestoneAmount,
      stage: 'pending' as DisbursementStage
    },
    {
      application_id: application.id,
      milestone_number: 3,
      title: 'Third Milestone',
      description: 'Third installment of 25% upon meeting project goals',
      amount: milestoneAmount,
      stage: 'pending' as DisbursementStage
    },
    {
      application_id: application.id,
      milestone_number: 4,
      title: 'Final Disbursement',
      description: 'Final installment of 25% upon project completion',
      amount: milestoneAmount,
      stage: 'pending' as DisbursementStage
    }
  ];

  const { data: milestones, error } = await supabase
    .from('disbursement_milestones')
    .insert(defaultMilestones)
    .select();

  if (error) {
    console.error('Error creating default milestones:', error);
    throw new Error('Failed to create default disbursement milestones');
  }

  return milestones || [];
} 