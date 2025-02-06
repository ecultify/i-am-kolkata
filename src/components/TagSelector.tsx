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

  // Update the selection limit logic
  const canAddMore = selectedTags.length < 3;

  return (
    <div className="space-y-4">
      {!hideTitle && (
        <h3 className="text-sm font-medium text-gray-700">
          Select up to 3 features that best describe your para
        </h3>
      )}

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {tags.length === 0 && !loading ? (
        <p className="text-sm text-gray-500 italic">
          No features available for this location
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={`${tag}-${index}`}
                  onClick={() => isSelected ? removeSelectedTag(tag) : addSelectedTag(tag)}
                  disabled={!isSelected && !canAddMore}
                  className={`group relative flex items-center space-x-1.5 px-3 py-1.5 
                             rounded-full text-sm transition-all duration-200 
                             ${isSelected
                               ? 'bg-rose-600 text-white hover:bg-rose-700'
                               : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                             } ${!isSelected && !canAddMore ? 'opacity-50 cursor-not-allowed' : ''}`}
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

          <div className="text-sm text-gray-500 flex items-center justify-between">
            <span>Selected features: {selectedTags.length}/3</span>
            {selectedTags.length > 0 && (
              <span className="text-rose-600">
                Click generate to create your description
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};