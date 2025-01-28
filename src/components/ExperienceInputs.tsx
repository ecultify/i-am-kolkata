import React from 'react';
import { useStore } from '../store/useStore';
import { TagSelector } from './TagSelector';

export const ExperienceInputs: React.FC = () => {
  const { experiences, setExperience, location } = useStore();

  // Always show three input boxes
  const inputBoxes = Array(3).fill(null);

  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleExperienceChange = (index: number, value: string, tag?: string) => {
    const words = countWords(value);
    if (words <= 30) {
      setExperience(index, value, tag);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">
        List 3 Things You Love About Your Para
      </h2>

      <div className="mb-6">
        {(!location.pincode || location.pincode === 'Unknown Pincode') ? (
          <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-600 mb-4">
            Set your location to discover local attractions and landmarks in your area.
          </div>
        ) : (
          <TagSelector hideTitle />
        )}
      </div>

      <div className="space-y-4">
        {inputBoxes.map((_, index) => {
          const experience = experiences[index] || { content: '', tag: '' };
          const wordCount = countWords(experience.content);

          return (
            <div key={index} className="relative">
              <textarea
                value={experience.content}
                onChange={(e) => handleExperienceChange(index, e.target.value, experience.tag)}
                rows={3}
                placeholder="Write a line describing your favourite thing about your para..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md 
                         focus:ring-rose-500 focus:border-rose-500 text-sm"
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {wordCount}/30 words
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};