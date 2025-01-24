import React, { useState } from 'react';
import { useStore } from '../store/useStore';

// Mock data for nearby para names (to be replaced with actual API data)
const MOCK_NEARBY_PARAS = [
  { name: "Lake Market", distance: 1.2 },
  { name: "Deshapriya Park", distance: 1.8 },
  { name: "Gariahat", distance: 2.1 },
  { name: "Golpark", distance: 2.4 },
  { name: "Southern Avenue", distance: 2.7 }
];

export const ParaNameInput: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const { paraName, setParaName, location, entries } = useStore();

  const handleParaSelect = (name: string) => {
    setError(null);
    setParaName(name);
  };

  const handleChange = (value: string) => {
    setError(null);
    
    if (value.length > 50) {
      setError('Para name must be less than 50 characters');
      return;
    }

    if (entries.some(entry => entry.paraName.toLowerCase() === value.toLowerCase())) {
      setError('This para name already exists');
      return;
    }

    if (value && !/^[a-zA-Z0-9\s-]+$/.test(value)) {
      setError('Para name can only contain letters, numbers, spaces, and hyphens');
      return;
    }

    setParaName(value);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Name Your Para</h2>

      <div className="space-y-4">
        <div>
          <input
            type="text"
            value={paraName}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Enter your para name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md 
                     focus:ring-rose-500 focus:border-rose-500"
          />
          
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
          
          <p className="mt-1 text-xs text-gray-500">
            Use a unique, meaningful name for your para (max 50 characters)
          </p>
        </div>

        {location.pincode && location.pincode !== 'Unknown Pincode' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Nearby Para Names
            </h3>
            <div className="flex flex-wrap gap-2">
              {MOCK_NEARBY_PARAS.map((para) => (
                <button
                  key={para.name}
                  onClick={() => handleParaSelect(para.name)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium 
                           transition-colors ${
                             paraName === para.name
                               ? 'bg-rose-600 text-white'
                               : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                           }`}
                >
                  {para.name} ({para.distance.toFixed(1)} km)
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};