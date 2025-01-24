import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Share2, Loader2, Image as ImageIcon } from 'lucide-react';
import { ParaPortrait } from './ParaPortrait';
import { generateParaImage, removeBg } from '../utils/api';
import { Location, Experience } from '../types';

interface LocationState {
  tags: string[];
  experiences: Experience[];
  location: Location;
  paraName: string;         // Added
  generatedContent: string; // Added
}

export const ImageGeneration: React.FC = () => {
  const [userImage, setUserImage] = useState<File | null>(null);
  const [bgRemovedImage, setBgRemovedImage] = useState<string>('');
  const [paraSceneImage, setParaSceneImage] = useState<string>('');
  const [finalImage, setFinalImage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  useEffect(() => {
    if (!state) {
      navigate('/');
    }
  }, [state, navigate]);

  useEffect(() => {
    const preloadFrame = new Image();
    preloadFrame.src = '/frames/Frame_2.png';
  }, []);

  const generateScene = async () => {
    if (!state) return;
    
    try {
      setLoading(true);
      const sceneImage = await generateParaImage(
        state.tags,
        state.experiences,
        state.location
      );
      setParaSceneImage(sceneImage);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setUserImage(file);

      // First generate the para scene
      await generateScene();

      // Then remove background from uploaded image
      const processedImage = await removeBg(file);
      setBgRemovedImage(processedImage);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
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
  };

  const handleShare = async () => {
    if (!finalImage) return;

    try {
      const blob = await fetch(finalImage).then(r => r.blob());
      const file = new File([blob], 'para-portrait.png', { type: 'image/png' });
      
      if (navigator.share) {
        await navigator.share({
          files: [file],
          title: `${state?.paraName || 'My Para'} Portrait`,
          text: `Check out my para portrait from I Am Kolkata!`
        });
      } else {
        throw new Error('Sharing not supported on this device');
      }
    } catch (error: any) {
      console.error('Error sharing:', error);
      handleDownload();
    }
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
              {bgRemovedImage && paraSceneImage && (
                <ParaPortrait
                  bgRemovedImage={bgRemovedImage}
                  paraSceneImage={paraSceneImage}
                  paraName={state?.paraName || 'My Para'}
                  paraDescription={state?.generatedContent || 'A beautiful corner of Kolkata'}
                  onImageGenerated={setFinalImage}
                />
              )}

              {finalImage && (
                <div className="flex justify-center space-x-4">
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
              )}
            </div>
          )}

          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl flex items-center space-x-4">
                <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
                <p>Processing your image...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-md">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};