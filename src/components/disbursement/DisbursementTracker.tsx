import React from 'react';
import { DisbursementMilestone, DisbursementStage } from '../../types';
import { Check, Circle } from 'lucide-react';

interface DisbursementTrackerProps {
  milestones: DisbursementMilestone[];
  isAdmin: boolean;
  onUpdateStage?: (milestoneId: string, stage: DisbursementStage) => Promise<void>;
}

export function DisbursementTracker({ milestones, isAdmin, onUpdateStage }: DisbursementTrackerProps) {
  const getStageColor = (stage: DisbursementStage) => {
    switch (stage) {
      case 'completed':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-400 bg-gray-50 border-gray-200';
    }
  };

  const getLineColor = (stage: DisbursementStage) => {
    switch (stage) {
      case 'completed':
        return 'border-green-500';
      case 'in_progress':
        return 'border-blue-500';
      default:
        return 'border-gray-300';
    }
  };

  const handleStageClick = async (milestone: DisbursementMilestone) => {
    if (!isAdmin || !onUpdateStage) return;

    const nextStage: Record<DisbursementStage, DisbursementStage> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'pending'
    };

    await onUpdateStage(milestone.id, nextStage[milestone.stage]);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Disbursement Milestones</h3>
      <div className="flex flex-col space-y-4">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="flex items-start">
            {/* Circle with number */}
            <button
              onClick={() => handleStageClick(milestone)}
              disabled={!isAdmin}
              className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                getStageColor(milestone.stage)
              } ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
            >
              {milestone.stage === 'completed' ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-sm font-medium">{milestone.milestone_number}</span>
              )}
            </button>

            {/* Line connecting to next milestone */}
            {index < milestones.length - 1 && (
              <div className={`flex-1 border-b-2 mx-2 translate-y-4 ${getLineColor(milestone.stage)}`} />
            )}

            {/* Milestone details */}
            <div className="flex-1 ml-4">
              <h4 className="text-sm font-medium text-gray-900">{milestone.title}</h4>
              {milestone.description && (
                <p className="mt-1 text-sm text-gray-500">{milestone.description}</p>
              )}
              <div className="mt-1 flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900">
                  Amount: ₹{milestone.amount.toLocaleString()}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  milestone.stage === 'completed' ? 'bg-green-100 text-green-800' :
                  milestone.stage === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {milestone.stage.replace('_', ' ').toUpperCase()}
                </span>
                {milestone.completed_at && (
                  <span className="text-xs text-gray-500">
                    Completed on {new Date(milestone.completed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 