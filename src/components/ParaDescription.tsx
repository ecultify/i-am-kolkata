import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Wand2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { ExperienceInputs } from './ExperienceInputs';
import { GeneratedContent } from './GeneratedContent';

export const ParaDescription: React.FC = () => {
    const [showAIHelp, setShowAIHelp] = useState(false);
    const { generatedContent, setGeneratedContent } = useStore();

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">
                What do you like about your para?
            </h2>

            {/* Manual Description Input */}
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
                    <span>Need help? Use AI to generate suggestions</span>
                    {showAIHelp ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Collapsible AI Help Section */}
            {showAIHelp && (
                <div className="pt-4 border-t">
                    <ExperienceInputs />
                    <div className="mt-4">
                        <GeneratedContent />
                    </div>
                </div>
            )}
        </div>
    );
};