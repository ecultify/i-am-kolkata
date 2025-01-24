import React, { useState, useEffect } from 'react';
import { Tag, Loader2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { fetchTags } from '../utils/api';

interface TagSelectorProps {
  hideTitle?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ hideTitle = false }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    location,
    tags,
    selectedTags,
    setTags,
    addSelectedTag,
    removeSelectedTag
  } = useStore();

  useEffect(() => {
    const loadTags = async () => {
      if (location.pincode && location.pincode !== 'Unknown Pincode') {
        setLoading(true);
        setError(null);
        try {
          const newTags = await fetchTags(location.pincode);
          // Ensure tags are unique before setting them
          const uniqueTags = Array.from(new Set(newTags));
          setTags(uniqueTags);
        } catch (err) {
          setError('Failed to fetch tags');
        } finally {
          setLoading(false);
        }
      }
    };

    loadTags();
  }, [location.pincode, setTags]);

  return (
    <div>
      {!hideTitle && (
        <h2 className="text-lg font-semibold mb-4">Select Tags (max 3)</h2>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {tags.length === 0 && !loading ? (
        <p className="text-sm text-gray-500 italic">
          No tags available for this location
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {/* Use index as part of the key to ensure uniqueness */}
          {tags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag);
            const uniqueKey = `${tag}-${index}`;
            return (
              <button
                key={uniqueKey}
                onClick={() => isSelected ? removeSelectedTag(tag) : addSelectedTag(tag)}
                disabled={!isSelected && selectedTags.length >= 3}
                className={`group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm
                           transition-all duration-200 ${
                             isSelected
                               ? 'bg-rose-600 text-white hover:bg-rose-700'
                               : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                           } ${!isSelected && selectedTags.length >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSelected ? (
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                <span className="max-w-[150px] truncate">{tag}</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedTags.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              Selected Tags ({selectedTags.length}/3)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <div
                key={`selected-${tag}-${index}`}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-full 
                         bg-rose-50 text-rose-700 text-sm border border-rose-200"
              >
                <span className="truncate max-w-[200px]">{tag}</span>
                <button
                  onClick={() => removeSelectedTag(tag)}
                  className="p-0.5 hover:bg-rose-100 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};