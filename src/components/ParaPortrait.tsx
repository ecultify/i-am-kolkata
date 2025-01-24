import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ParaPortraitProps {
  bgRemovedImage: string;
  paraSceneImage: string;
  paraName: string;         // Added para name
  paraDescription: string;  // Added para description
  onImageGenerated?: (dataUrl: string) => void;
}

export const ParaPortrait: React.FC<ParaPortraitProps> = ({
  bgRemovedImage,
  paraSceneImage,
  paraName,
  paraDescription,
  onImageGenerated
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const frameImagePath = '/frames/Frame_2.png';

  const generatePortrait = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      setError(null);

      canvas.width = 1080;
      canvas.height = 1080;

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

      // Load all three images in parallel
      const [userImg, scene, frame] = await Promise.all([
        loadImageWithTimeout(bgRemovedImage),
        loadImageWithTimeout(paraSceneImage),
        loadImageWithTimeout(frameImagePath)
      ]);

      if (abortControllerRef.current.signal.aborted) return;

      // 1. Draw the para scene as background
      ctx.drawImage(scene, 0, 0, canvas.width, canvas.height);

      // 2. Add translucent overlay (reduced opacity)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Made more translucent
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 3. Draw the user's image (centered and scaled)
      const scale = Math.min(
        (canvas.width * 0.8) / userImg.width,
        (canvas.height * 0.8) / userImg.height
      );
      const x = (canvas.width - userImg.width * scale) / 2;
      const y = (canvas.height - userImg.height * scale) / 2;
      ctx.drawImage(userImg, x, y, userImg.width * scale, userImg.height * scale);

      // 4. Draw the frame overlay
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

      // 5. Setup text rendering
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 6. Draw Para Name
      ctx.font = 'bold 56px Arial';
      ctx.fillStyle = '#FFFFFF';
      
      // Add shadow for better readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      // Draw para name near the top
      ctx.fillText(paraName, canvas.width / 2, 80);

      // 7. Draw Para Description
      const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        const lines = [];

        for (const word of words) {
          const testLine = line + word + ' ';
          const metrics = context.measureText(testLine);
          const testWidth = metrics.width;

          if (testWidth > maxWidth && line !== '') {
            lines.push(line);
            line = word + ' ';
          } else {
            line = testLine;
          }
        }
        lines.push(line);

        // Draw each line
        lines.forEach((line, i) => {
          context.fillText(line.trim(), x, y + (i * lineHeight));
        });

        return lines.length * lineHeight; // Return total height
      };

      // Style for description
      ctx.font = '28px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      
      // Draw description with word wrap
      wrapText(
        ctx,
        paraDescription,
        canvas.width / 2,
        canvas.height - 180, // Position from bottom
        canvas.width - 120,  // Max width
        36                   // Line height
      );

      // Reset shadow effects
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [bgRemovedImage, paraSceneImage, paraName, paraDescription]);

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