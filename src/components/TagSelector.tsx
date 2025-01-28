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
    experiences,
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

  // Find next available slot for a new tag
  const canAddMore = experiences.filter(exp => exp?.content && exp.content.trim() !== '').length < 3;

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
          {tags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag);
            const uniqueKey = `${tag}-${index}`;
            return (
              <button
                key={uniqueKey}
                onClick={() => isSelected ? removeSelectedTag(tag) : addSelectedTag(tag)}
                disabled={!isSelected && !canAddMore}
                className={`group relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm
                           transition-all duration-200 ${
                             isSelected
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
      )}

      <div className="mt-4 text-sm text-gray-500">
        Click a tag to add it to your para description. You can edit the text after adding.
      </div>
    </div>
  );
};