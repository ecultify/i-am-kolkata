import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ParaPortraitProps {
  bgRemovedImage: string;
  paraSceneImage: string;
  onImageGenerated?: (dataUrl: string) => void;
}

export const ParaPortrait: React.FC<ParaPortraitProps> = ({
  bgRemovedImage,
  paraSceneImage,
  onImageGenerated
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generatePortrait = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      // Set canvas size (1080x1080 for Instagram-friendly square format)
      canvas.width = 1080;
      canvas.height = 1080;

      // Load images with timeout and signal
      const loadImageWithTimeout = async (src: string, timeout = 10000): Promise<HTMLImageElement> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
          });
          clearTimeout(timeoutId);
          return img;
        } catch (error) {
          clearTimeout(timeoutId);
          throw new Error(`Failed to load image: ${src}`);
        }
      };

      // Load images in parallel
      const [userImg, scene] = await Promise.all([
        loadImageWithTimeout(bgRemovedImage),
        loadImageWithTimeout(paraSceneImage)
      ]);

      if (abortControllerRef.current.signal.aborted) return;

      // 1. Draw the para scene as background
      ctx.drawImage(scene, 0, 0, canvas.width, canvas.height);

      // 2. Add translucent overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Draw the user's image (centered and scaled)
      const scale = Math.min(
        (canvas.width * 0.8) / userImg.width,
        (canvas.height * 0.8) / userImg.height
      );
      const x = (canvas.width - userImg.width * scale) / 2;
      const y = (canvas.height - userImg.height * scale) / 2;
      ctx.drawImage(userImg, x, y, userImg.width * scale, userImg.height * scale);

      // Get the final composite image
      const compositeImage = canvas.toDataURL('image/png');

      if (onImageGenerated) {
        onImageGenerated(compositeImage);
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error generating portrait:', error);
      setError(error.message || 'Failed to generate portrait. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePortrait();

    return () => {
      // Cleanup: abort any ongoing operations when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [bgRemovedImage, paraSceneImage]);

  return (
    <div className="relative w-full aspect-square">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{ display: loading ? 'none' : 'block' }}
      />
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-rose-600 mb-4" />
          <p className="text-sm text-gray-600">Creating your para portrait...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center p-4">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={generatePortrait}
              className="px-4 py-2 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};