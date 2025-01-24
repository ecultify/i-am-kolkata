import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedBefore');
    if (!hasVisited) {
      setIsOpen(true);
      localStorage.setItem('hasVisitedBefore', 'true');
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Welcome to I Am Kolkata!
        </h2>

        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <p className="text-gray-600">
              Click "Locate Me" to detect your location and explore nearby para stories
            </p>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <p className="text-gray-600">
              Select up to 3 tags that best describe your para's unique character
            </p>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <p className="text-gray-600">
              Share your experiences about each selected aspect of your para
            </p>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              4
            </div>
            <p className="text-gray-600">
              Give your para a unique name and save your story
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(false)}
          className="w-full bg-rose-600 text-white py-2 px-4 rounded-md hover:bg-rose-700 transition-colors"
        >
          Get Started
        </button>
      </div>
    </div>
  );
};