import React, { useState } from 'react';
import { DisbursementMilestone, Application } from '../../types';
import { supabase } from '../../lib/supabase';
import { Clock, CheckCircle, AlertCircle, DollarSign, Calendar } from 'lucide-react';

interface Props {
  application: Application;
  isAdmin: boolean;
  onUpdate: () => void;
}

const STATUS_BADGES = {
  pending: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  released: { color: 'bg-green-100 text-green-800', icon: DollarSign },
  completed: { color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle }
};

export function DisbursementMilestones({ application, isAdmin, onUpdate }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    amount: '',
    due_date: ''
  });

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('disbursement_milestones')
        .insert({
          application_id: application.id,
          milestone_number: (application.disbursement_milestones?.length || 0) + 1,
          title: newMilestone.title,
          description: newMilestone.description,
          amount: parseFloat(newMilestone.amount),
          due_date: newMilestone.due_date,
          status: 'pending'
        })
        .select();

      if (insertError) throw insertError;

      setShowAddForm(false);
      setNewMilestone({ title: '', description: '', amount: '', due_date: '' });
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add milestone');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (milestoneId: string, newStatus: DisbursementMilestone['status']) => {
    setLoading(true);
    setError(null);

    try {
      const updates: any = {
        status: newStatus
      };

      if (newStatus === 'completed') {
        updates.completed_date = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('disbursement_milestones')
        .update(updates)
        .eq('id', milestoneId);

      if (updateError) throw updateError;

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update milestone status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Disbursement Milestones</h3>
        {isAdmin && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Add Milestone
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddMilestone} className="bg-gray-50 rounded-md p-4 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              required
              value={newMilestone.title}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
              Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="amount"
              required
              min="0"
              step="0.01"
              value={newMilestone.amount}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, amount: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              id="due_date"
              value={newMilestone.due_date}
              onChange={(e) => setNewMilestone(prev => ({ ...prev, due_date: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Adding...' : 'Add Milestone'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {application.disbursement_milestones?.map((milestone) => {
          const StatusIcon = STATUS_BADGES[milestone.status].icon;
          return (
            <div key={milestone.id} className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-lg font-medium">
                    Milestone {milestone.milestone_number}: {milestone.title}
                  </h4>
                  {milestone.description && (
                    <p className="text-sm text-gray-500">{milestone.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {application.currency} {milestone.amount.toLocaleString()}
                    </span>
                    {milestone.due_date && (
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Due: {new Date(milestone.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[milestone.status].color}`}>
                    <StatusIcon className="h-4 w-4 mr-1" />
                    {milestone.status.charAt(0).toUpperCase() + milestone.status.slice(1)}
                  </span>
                  {isAdmin && milestone.status !== 'completed' && (
                    <select
                      value={milestone.status}
                      onChange={(e) => handleUpdateStatus(milestone.id, e.target.value as DisbursementMilestone['status'])}
                      className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="released">Released</option>
                      <option value="completed">Completed</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 