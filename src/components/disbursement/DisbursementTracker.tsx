import React from 'react';
import { Check, Clock, ArrowRight } from 'lucide-react';
import type { DisbursementStep, DisbursementStatus } from '../../types';
import { updateApplication } from '../../services/applications';

const defaultSteps: DisbursementStep[] = [
  { label: 'Payment Details Verification', status: 'pending' },
  { label: 'Fund Allocation', status: 'pending' },
  { label: 'Bank Transfer Initiated', status: 'pending' },
  { label: 'Disbursement Complete', status: 'pending' }
];

interface Props {
  applicationId: string;
  steps?: DisbursementStep[];
  isAdmin: boolean;
  onUpdate?: (steps: DisbursementStep[]) => void;
}

export function DisbursementTracker({ applicationId, steps = defaultSteps, isAdmin, onUpdate }: Props) {
  const handleStepUpdate = async (index: number) => {
    if (!isAdmin) return;

    const newSteps = [...steps];
    const currentStep = newSteps[index];

    // Update status based on current status
    switch (currentStep.status) {
      case 'pending':
        currentStep.status = 'initiated';
        break;
      case 'initiated':
        currentStep.status = 'processing';
        break;
      case 'processing':
        currentStep.status = 'completed';
        currentStep.date = new Date().toISOString();
        break;
      default:
        return;
    }

    try {
      // Update application with new steps
      const updated = await updateApplication(applicationId, {
        disbursement_steps: newSteps
      });
      onUpdate?.(updated.disbursement_steps || []);
    } catch (error) {
      console.error('Failed to update disbursement status:', error);
    }
  };

  const getStepIcon = (status: DisbursementStatus) => {
    switch (status) {
      case 'completed':
        return <Check className="h-5 w-5 text-white" />;
      case 'processing':
        return <div className="h-2 w-2 bg-white rounded-full animate-pulse" />;
      case 'initiated':
        return <Clock className="h-5 w-5 text-white" />;
      default:
        return <div className="h-2 w-2 bg-white rounded-full" />;
    }
  };

  const getStepColor = (status: DisbursementStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'processing':
        return 'bg-blue-500';
      case 'initiated':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Disbursement Status</h3>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleStepUpdate(index)}
                disabled={!isAdmin}
                className={`w-10 h-10 rounded-full flex items-center justify-center ${getStepColor(step.status)} 
                  ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-colors duration-200`}
                title={isAdmin ? 'Click to update status' : undefined}
              >
                {getStepIcon(step.status)}
              </button>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium text-gray-900">{step.label}</p>
                {step.date && (
                  <p className="text-xs text-gray-500">
                    {new Date(step.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-2">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{
                    width: step.status === 'completed' ? '100%' : '0%'
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
} 