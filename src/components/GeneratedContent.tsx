import React, { useState } from 'react';
import { Loader2, RefreshCw, Edit3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateContent } from '../utils/api';

export const GeneratedContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    paraName,
    selectedTags,
    experiences,
    generatedContent,
    setGeneratedContent
  } = useStore();

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const content = await generateContent(paraName, selectedTags, experiences);
      setGeneratedContent(content);
    } catch (err) {
      setError('Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  // Check if there's at least one experience with content
  const hasValidExperience = experiences.some(exp => exp?.content && exp.content.trim().length > 0);
  
  // Allow generation if there's a para name and at least one valid experience
  const canGenerate = paraName && paraName.trim().length > 0 && hasValidExperience;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Generated Description</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={!generatedContent}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <Edit3 className="w-5 h-5" />
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !canGenerate}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            title={!canGenerate ? "Enter your para name and at least one experience" : "Generate description"}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        </div>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !canGenerate ? (
        <p className="text-sm text-gray-500 italic">
          Enter your para name and at least one experience to generate content
        </p>
      ) : (
        isEditing ? (
          <textarea
            value={generatedContent}
            onChange={(e) => setGeneratedContent(e.target.value)}
            className="w-full h-48 p-3 border border-gray-300 rounded-md 
                     focus:ring-rose-500 focus:border-rose-500"
          />
        ) : (
          <div className="prose prose-sm max-w-none">
            {generatedContent || (
              <p className="text-gray-500 italic">
                Click the refresh button to generate content
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
};