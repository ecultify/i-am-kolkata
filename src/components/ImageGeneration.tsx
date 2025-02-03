import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import { generateParaImage, removeBg, uploadToImgBB, ShotstackService } from '../utils/api';
import { Location, Experience } from '../types';
import { ShotstackMergeFields } from '../types/shotstack';
import { useStore } from '../store/useStore';

interface LocationState {
  experiences: Experience[];
  location: Location;
  paraName: string;
  generatedContent: string;
}

export const ImageGeneration: React.FC = () => {
  const [userImage, setUserImage] = useState<File | null>(null);
  const [finalImage, setFinalImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const store = useStore();

  useEffect(() => {
    // Check for data availability
    if (!state && !store.paraName) {
      console.warn('No data available, redirecting to main page');
      navigate('/', { replace: true });
      return;
    }

    // Use store data if router state is missing
    if (!state && store.paraName) {
      console.log('Recovering data from store');
    }
  }, [state, store.paraName, navigate]);

  const generateScene = async (): Promise<string> => {
    const paraData = state || {
      experiences: store.experiences,
      location: store.location,
      paraName: store.paraName,
      generatedContent: store.generatedContent
    };

    if (!paraData.location || !paraData.paraName) {
      throw new Error('Required data is missing');
    }

    try {
      setProcessingStep('Generating para scene...');
      const validExperiences = paraData.experiences.filter(exp => exp?.content && exp.content.trim() !== '');
      const uniqueTags = Array.from(new Set(validExperiences.map(exp => exp.tag).filter(Boolean)));
      
      const sceneImage = await generateParaImage(
        uniqueTags as string[],
        validExperiences,
        paraData.location
      );

      setProcessingStep('Processing scene...');
      const maskedSceneUrl = await uploadToImgBB(sceneImage);
      return maskedSceneUrl;
    } catch (error: any) {
      throw new Error('Failed to generate para scene: ' + error.message);
    }
  };

  const processUserImage = async (file: File): Promise<string> => {
    try {
      setProcessingStep('Removing background...');
      const removedBgImage = await removeBg(file);

      setProcessingStep('Optimizing portrait...');
      const response = await fetch(removedBgImage);
      const blob = await response.blob();

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const userImageUrl = await uploadToImgBB(base64);
      return userImageUrl;
    } catch (error: any) {
      throw new Error('Failed to process user image: ' + error.message);
    }
  };

  const generateFinalPortrait = async (bgImageUrl: string, userImageUrl: string) => {
    const paraData = state || {
      experiences: store.experiences,
      location: store.location,
      paraName: store.paraName,
      generatedContent: store.generatedContent
    };

    if (!paraData.paraName) throw new Error('Para data not available');

    try {
      setProcessingStep('Creating final composition...');
      const validExperiences = paraData.experiences
        .filter(exp => exp?.content && exp.content.trim() !== '')
        .map(exp => exp.content.trim())
        .join('. ');

      const mergeFields: Required<ShotstackMergeFields> = {
        bgImage: bgImageUrl,
        userImage: userImageUrl,
        paraName: paraData.paraName,
        paraDescription: validExperiences || paraData.generatedContent || '',
        pincode: paraData.location.pincode || ''
      };

      const finalImageUrl = await ShotstackService.renderParaPortrait(
        mergeFields,
        (progress) => {
          setProgress(progress * 100);
          setProcessingStep(
            progress < 1
              ? `Processing image... ${Math.round(progress * 100)}%`
              : 'Finalizing...'
          );
        }
      );
      setFinalImage(finalImageUrl);
    } catch (error: any) {
      throw new Error('Failed to generate final portrait: ' + error.message);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setUserImage(file);
      setProgress(0);

      const [bgImageUrl, userImageUrl] = await Promise.all([
        generateScene().catch(error => {
          throw new Error(`Failed to generate scene: ${error.message}`);
        }),
        processUserImage(file).catch(error => {
          throw new Error(`Failed to process user image: ${error.message}`);
        })
      ]);

      await generateFinalPortrait(bgImageUrl, userImageUrl);
    } catch (error: any) {
      let errorMessage = 'Failed to create portrait. ';
      
      if (error.message.includes('ETIMEDOUT')) {
        errorMessage += 'Connection timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('Failed to process user image')) {
        errorMessage += 'There was an issue processing your photo. Please try a different photo.';
      } else if (error.message.includes('Failed to generate scene')) {
        errorMessage += 'There was an issue creating your para scene. Please try again.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }

      setError(errorMessage);
      console.error('Image generation error:', error);
    } finally {
      setLoading(false);
      setProcessingStep('');
      setProgress(0);
    }
  };

  const handleDownload = () => {
    if (!finalImage) return;

    const link = document.createElement('a');
    link.href = finalImage;
    link.download = 'para-portrait.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowReturnPrompt(true);
  };

  const handleShare = async () => {
    if (!finalImage) return;

    try {
      const blob = await fetch(finalImage).then(r => r.blob());
      const file = new File([blob], 'para-portrait.png', { type: 'image/png' });

      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: `${state?.paraName || store.paraName || 'My Para'} Portrait`,
          text: `Check out my para portrait from I Am Kolkata!`
        });
        setShowReturnPrompt(true);
      } else {
        throw new Error('Sharing not supported on this device');
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      handleDownload();
    }
  };

  const handleReturn = () => {
    store.clearForm();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-8"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Para Story
        </button>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Create Your Para Portrait
          </h1>

          {!userImage ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                    <ImageIcon className="w-10 h-10 text-rose-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Upload Your Photo
                  </h2>
                  <p className="text-gray-600 mb-6">
                    We'll blend your photo with your para's unique atmosphere
                  </p>
                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="inline-flex items-center justify-center space-x-2 bg-rose-600 
                           hover:bg-rose-700 text-white py-3 px-6 rounded-md 
                           transition-colors cursor-pointer"
                >
                  <Upload className="w-5 h-5" />
                  <span>Choose Photo</span>
                </label>
              </div>

              <div className="px-8 py-4 bg-gray-50 border-t text-sm text-gray-500">
                For best results:
                <ul className="list-disc ml-5 mt-1 space-y-1">
                  <li>Use a clear photo of yourself</li>
                  <li>Ensure good lighting</li>
                  <li>Simple backgrounds work best</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {finalImage && (
                <div>
                  <img
                    src={finalImage}
                    alt="Final Para Portrait"
                    className="w-full rounded-lg shadow-lg"
                  />
                  <div className="flex justify-center space-x-4 mt-6">
                    <button
                      onClick={handleDownload}
                      className="flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 
                               text-white py-2 px-4 rounded-md transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download</span>
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 
                               text-white py-2 px-4 rounded-md transition-colors"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center space-y-4">
                <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                <p className="text-lg font-medium">{processingStep}</p>
                {progress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-rose-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
              {error}
            </div>
          )}

          {showReturnPrompt && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white p-4 rounded-lg shadow-lg z-50">
              <p className="text-gray-800 mb-4">Would you like to create another para story?</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleReturn}
                  className="px-4 py-2 bg-rose-600 text-white rounded hover:bg-rose-700"
                >
                  Return to Main Page
                </button>
                <button
                  onClick={() => setShowReturnPrompt(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Stay Here
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};