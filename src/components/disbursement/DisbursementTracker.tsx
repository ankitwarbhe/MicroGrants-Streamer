import React from 'react';
import { Check, Clock, ArrowRight } from 'lucide-react';
import type { DisbursementStep, DisbursementStatus } from '../../types';
import { updateApplication } from '../../services/applications';

const defaultSteps: DisbursementStep[] = [
  { label: 'Payment Details Verification', status: 'initiated' },
  { label: 'Fund Allocation', status: 'not_started' },
  { label: 'Bank Transfer Initiated', status: 'not_started' },
  { label: 'Disbursement Complete', status: 'not_started' }
];

interface Props {
  applicationId: string;
  steps?: DisbursementStep[];
  isAdmin: boolean;
  onUpdate?: (steps: DisbursementStep[]) => void;
}

export function DisbursementTracker({ applicationId, steps = defaultSteps, isAdmin, onUpdate }: Props) {
  const currentSteps = React.useMemo(() => {
    // If no steps provided, initialize with default steps
    if (!steps?.length) {
      return defaultSteps;
    }
    
    // If steps exist but first step isn't initiated or further, initialize it
    const initializedSteps = [...steps];
    if (!initializedSteps[0].status || initializedSteps[0].status === 'not_started' || initializedSteps[0].status === 'pending') {
      initializedSteps[0] = { ...initializedSteps[0], status: 'initiated' };
    }
    return initializedSteps;
  }, [steps]);

  const handleStepUpdate = async (index: number) => {
    if (!isAdmin) return;

    // Only allow updating if previous steps are completed
    if (index > 0) {
      const previousStep = currentSteps[index - 1];
      if (previousStep.status !== 'completed') {
        return;
      }
    }

    const newSteps = [...currentSteps];
    const currentStep = newSteps[index];

    // Update status based on current status
    switch (currentStep.status) {
      case 'initiated':
        currentStep.status = 'processing';
        break;
      case 'processing':
        currentStep.status = 'completed';
        currentStep.date = new Date().toISOString();
        // Set next step to initiated if it exists
        if (index < newSteps.length - 1) {
          newSteps[index + 1] = {
            ...newSteps[index + 1],
            status: 'initiated',
            date: undefined
          };
        }
        break;
      default:
        return;
    }

    try {
      // Update application with new steps
      const updated = await updateApplication(applicationId, {
        disbursement_steps: newSteps
      });
      if (updated.disbursement_steps) {
        onUpdate?.(updated.disbursement_steps);
      }
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
      case 'not_started':
        return <div className="h-2 w-2 bg-gray-400 rounded-full" />;
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
      case 'not_started':
        return 'bg-gray-200';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Disbursement Status</h3>
      <div className="flex items-center justify-between">
        {currentSteps.map((step, index) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleStepUpdate(index)}
                disabled={!isAdmin || (index > 0 && currentSteps[index - 1].status !== 'completed')}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${getStepColor(step.status)} 
                  ${isAdmin && (index === 0 || currentSteps[index - 1].status === 'completed') 
                    ? 'cursor-pointer hover:opacity-80' 
                    : 'cursor-default'} 
                  transition-colors duration-200`}
                title={isAdmin ? 'Click to update status' : undefined}
              >
                {getStepIcon(step.status)}
              </button>
              <div className="mt-2 text-center max-w-[120px]">
                <p className="text-sm font-medium text-gray-900">{step.label}</p>
                {step.date && (
                  <p className="text-xs text-gray-500">
                    {new Date(step.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            {index < currentSteps.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-4">
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