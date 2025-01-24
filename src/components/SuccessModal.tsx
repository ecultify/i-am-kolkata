import React from 'react';
import { X, Image as ImageIcon } from 'lucide-react';

interface SuccessModalProps {
  onClose: () => void;
  onMaybeLater: () => void;
  onCreateImage: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ 
  onClose, 
  onMaybeLater,
  onCreateImage 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 mb-4">
            <ImageIcon className="h-6 w-6 text-rose-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Bring Your Para to Life!
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Create a stunning visual portrait of your para using the tags and experiences you just shared. 
            Download and share it with your community!
          </p>
          
          <div className="space-y-3">
            <button
              onClick={onCreateImage}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent 
                       text-sm font-medium rounded-md text-white bg-rose-600 hover:bg-rose-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
            >
              Create Now
            </button>
            <button
              onClick={onMaybeLater}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 
                       text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};