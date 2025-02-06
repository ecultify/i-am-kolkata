import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wand2, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TagSelector } from './TagSelector';
import { generateContent } from '../utils/api';

export const ParaDescription: React.FC = () => {
    const [showAIHelp, setShowAIHelp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        paraName,
        selectedTags,
        experiences,
        generatedContent,
        setGeneratedContent,
        setExperience
    } = useStore();

    const handleGenerateContent = async () => {
        if (!paraName) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const content = await generateContent(paraName, selectedTags, experiences);
            setGeneratedContent(content);
        } catch (err) {
            setError('Failed to generate description');
        } finally {
            setLoading(false);
        }
    };

    const countWords = (text: string): number => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">
                What do you love about your para?
            </h2>

            {/* Description Input */}
            <div className="space-y-2">
                <textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    placeholder="Tell us about your para in your own words..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-md 
                             focus:ring-rose-500 focus:border-rose-500"
                />

                {/* AI Help Toggle Button */}
                <button
                    onClick={() => setShowAIHelp(!showAIHelp)}
                    className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800"
                >
                    <Wand2 className="w-4 h-4" />
                    <span>Need help? Use AI to generate description</span>
                    {showAIHelp ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* AI Help Section */}
            {showAIHelp && (
                <div className="space-y-4">
                    {/* Tag Selector */}
                    <TagSelector />

                    {/* Experience Inputs */}
                    <div className="space-y-4">
                        {[0, 1, 2].map((index) => {
                            const experience = experiences[index] || { content: '', tag: '' };
                            const wordCount = countWords(experience.content);

                            return (
                                <div key={index} className="relative">
                                    <textarea
                                        value={experience.content}
                                        onChange={(e) => setExperience(index, e.target.value, experience.tag)}
                                        placeholder="Write a line describing your favourite thing about your para..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md 
                                                 focus:ring-rose-500 focus:border-rose-500 text-sm"
                                        rows={3}
                                    />
                                    <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                                        {wordCount}/30 words
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerateContent}
                        disabled={loading || (!experiences.some(exp => exp.content.trim().length > 0) && selectedTags.length === 0)}
                        className="w-full flex items-center justify-center space-x-2 
                                 bg-rose-600 hover:bg-rose-700 text-white py-2 px-4 
                                 rounded-md transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <span>Generate Description</span>
                        )}
                    </button>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}
                </div>
            )}
        </div>
    );
};