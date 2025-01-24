import React from 'react';
import { useStore } from '../store/useStore';

export const ProgressBar: React.FC = () => {
  const { location, selectedTags, experiences, paraName, generatedContent } = useStore();

  const steps = [
    { 
      label: 'Location', 
      completed: !!location.area && !!location.pincode && location.lat !== 0 && location.lng !== 0 
    },
    { 
      label: 'Para Name', 
      completed: !!paraName && paraName.trim().length > 0
    },
    { 
      label: 'Experiences', 
      completed: experiences.some(exp => exp.content.trim().length > 0)
    },
    { 
      label: 'Description', 
      completed: !!generatedContent && generatedContent.trim().length > 0
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className="flex items-center"
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                ${step.completed ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-600'}`}
            >
              {index + 1}
            </div>
            <span className="ml-2 text-sm text-gray-600">{step.label}</span>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-12 mx-2 ${step.completed ? 'bg-rose-600' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}