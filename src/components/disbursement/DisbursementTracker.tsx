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

  const getArrowColor = (stage: DisbursementStage) => {
    switch (stage) {
      case 'completed':
        return 'bg-gradient-to-r from-green-500 to-green-600';
      case 'in_progress':
        return 'bg-gradient-to-r from-blue-500 to-blue-600';
      default:
        return 'bg-gradient-to-r from-gray-200 to-gray-300';
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
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-gray-900">Disbursement Timeline</h3>
      
      {/* Timeline Track */}
      <div className="relative">
        {/* Horizontal Timeline */}
        <div className="flex items-center justify-between">
          {milestones.map((milestone, index) => (
            <React.Fragment key={milestone.id}>
              {/* Milestone Circle */}
              <div className="relative flex flex-col items-center">
                <button
                  onClick={() => handleStageClick(milestone)}
                  disabled={!isAdmin}
                  className={`relative flex items-center justify-center w-16 h-16 rounded-full border-4 ${
                    getStageColor(milestone.stage)
                  } ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                >
                  {milestone.stage === 'completed' ? (
                    <Check className="w-8 h-8" />
                  ) : (
                    <span className="text-xl font-bold">{milestone.milestone_number}</span>
                  )}
                </button>

                {/* Milestone Details Below Circle */}
                <div className="absolute top-20 w-48 text-center">
                  <h4 className="font-medium text-gray-900">{milestone.title}</h4>
                  <p className="mt-1 text-sm text-gray-500">{milestone.description}</p>
                  <div className="mt-2">
                    <span className="text-sm font-medium text-gray-900">
                      ₹{milestone.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      milestone.stage === 'completed' ? 'bg-green-100 text-green-800' :
                      milestone.stage === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {milestone.stage.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  {milestone.completed_at && (
                    <div className="mt-1 text-xs text-gray-500">
                      Completed on {new Date(milestone.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Arrow connecting to next milestone */}
              {index < milestones.length - 1 && (
                <div className={`h-2 flex-1 mx-4 rounded ${getArrowColor(milestone.stage)}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
} 