import OpenAI from 'openai';
import { Location, Experience } from '../types';
import { ShotstackRenderResponse, ShotstackStatusResponse, ShotstackMergeFields } from '../types/shotstack';

interface ProcessingConfig {
  maxAttempts: number;
  timeouts: {
    request: number;
    processing: number;
    render: number;
  };
  intervals: {
    initial: number;
    max: number;
  };
  fetchOptions: {
    mode: 'cors';
    cache: 'no-cache';
    credentials: 'same-origin';
    redirect: 'follow';
    referrerPolicy: 'no-referrer';
  };
}

interface ImageValidationResult {
  isValid: boolean;
  directUrl?: string;
  error?: string;
}

// Environment variable validation
const requiredEnvVars = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  SHOTSTACK_API_KEY: import.meta.env.VITE_SHOTSTACK_API_KEY,
  SHOTSTACK_TEMPLATE_ID: import.meta.env.VITE_SHOTSTACK_TEMPLATE_ID,
  IMGBB_API_KEY: import.meta.env.VITE_IMGBB_API_KEY
} as const;

Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
});

const CONFIG = {
  openai: new OpenAI({
    apiKey: requiredEnvVars.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  }),
  bgRemove: {
    apiKey: 'cNuV4JbjTeXTkPh3QCcP7LSG',
    apiUrl: 'https://api.remove.bg/v1.0/removebg'
  },
  shotstack: {
    apiKey: requiredEnvVars.SHOTSTACK_API_KEY,
    templateId: requiredEnvVars.SHOTSTACK_TEMPLATE_ID,
    endpoints: {
      render: '/shotstack-api/templates/render',
      renderStatus: '/shotstack-api/render',
      ingest: '/shotstack-api/ingest/sources',
      ingestStatus: '/shotstack-api/ingest/sources'
    }
  },
  imgbb: {
    apiKey: requiredEnvVars.IMGBB_API_KEY,
    endpoint: '/imgbb-api/upload'
  }
} as const;

class APIError extends Error {
  constructor(message: string, public readonly context: Record<string, any> = {}) {
    super(message);
    this.name = 'APIError';
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to validate and transform image URLs
const validateImageUrl = async (url: string): Promise<ImageValidationResult> => {
  try {
    // Transform ImgBB share URLs to direct URLs
    if (url.includes('ibb.co/') && !url.includes('i.ibb.co/')) {
      const parts = url.split('/');
      const id = parts[parts.length - 1];
      if (!id.includes('.')) {
        return {
          isValid: false,
          error: 'Invalid ImgBB URL format'
        };
      }
      url = `https://i.ibb.co/${id}`;
    }

    // Validate URL format
    if (!url.match(/^https:\/\/i\.ibb\.co\/.+\.(jpg|jpeg|png|gif)$/i)) {
      return {
        isValid: false,
        error: 'Invalid image URL format'
      };
    }

    try {
      await fetch(url, {
        method: 'HEAD',
        mode: 'no-cors', // This means we can't actually check response.ok
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // If we get here, the fetch didn't throw, so we consider it valid
      return {
        isValid: true,
        directUrl: url
      };
    } catch (fetchError) {
      return {
        isValid: false,
        error: 'Image URL not accessible'
      };
    }

  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Failed to validate image URL'
    };
  }
};

export const removeBg = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('size', 'auto');
  formData.append('format', 'auto');  // This ensures we get PNG with transparency

  try {
    const response = await fetch(CONFIG.bgRemove.apiUrl, {
      method: 'POST',
      headers: {
        'X-Api-Key': CONFIG.bgRemove.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remove.bg API error:', errorText);
      throw new APIError('Failed to remove background', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Background removal error:', error);
    throw error instanceof APIError ? error : new APIError('Background removal failed', { cause: error });
  }
};

export const uploadToImgBB = async (imageData: string, retries = 3): Promise<string> => {
  const compressImage = async (base64: string): Promise<string> => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });

    const maxDim = 1024;
    const { width: newWidth, height: newHeight } = calculateDimensions(img.width, img.height, maxDim);

    canvas.width = newWidth;
    canvas.height = newHeight;
    ctx?.drawImage(img, 0, 0, newWidth, newHeight);

    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const base64Image = imageData.includes('data:image')
        ? imageData.split(',')[1]
        : imageData;

      const compressedImage = await compressImage(base64Image);

      const formData = new FormData();
      formData.append('key', CONFIG.imgbb.apiKey);
      formData.append('image', compressedImage);

      const response = await fetch(`${CONFIG.imgbb.endpoint}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ImgBB error:', errorText);
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error('Upload failed: ' + (data.error?.message || 'Unknown error'));
      }

      const imageUrl = data.data?.url;
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      // Return without validation
      return imageUrl.replace(/^https?:\/\/ibb.co\//, 'https://i.ibb.co/');
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt === retries - 1) throw error;
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error('Maximum retry attempts reached');
};

export const fetchTags = async (pincode: string): Promise<string[]> => {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);

    if (!response.ok) {
      throw new APIError('Failed to fetch area details', {
        status: response.status,
        pincode
      });
    }

    const data = await response.json();
    const areaDetails = data[0]?.PostOffice?.[0];

    if (!areaDetails) {
      throw new APIError('Area details not found', { pincode });
    }

    const { District, State } = areaDetails;
    const completion = await CONFIG.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: `Generate 10 unique, location-specific landmark names or cultural features for ${District}, ${State} (Pincode: ${pincode}).
                 Focus on actual local elements like:
                 - Specific landmark names and places (e.g., "Raigarh Fort", "Khandoba Temple")
                 - Cultural institutions or gathering spots (e.g., "Ganesh Talkies", "College Square")
                 - Famous local establishments (e.g., "Paramount Sherbets", "Indian Coffee House")
                 - Historic or heritage sites
                 - Important community spaces
                 
                 Format: Return ONLY a comma-separated list of specific place names, nothing else.
                 Each name should be 1-3 words long and be an actual place name, not a description.
                 
                 Example format: "Victoria Memorial, College Street, Millennium Park, Princep Ghat"
                 
                 Important: Return only real, verifiable place names. No generic descriptions.`
      }],
      temperature: 0.7,
    });

    return completion.choices[0].message.content
      ?.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !tag.includes('#') && tag.length > 0)
      .slice(0, 10) || [];
  } catch (error) {
    console.error('Tag generation error:', error);
    throw error instanceof APIError ? error : new APIError('Failed to generate tags', { cause: error });
  }
};

export const generateContent = async (
  paraName: string,
  _tags: string[],
  experiences: Experience[]
): Promise<string> => {
  try {
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);

    const prompt = `Create a brief 40-50 word description of "${paraName}" based on these local experiences:
                   ${validExperiences.map(exp => `- ${exp.content.trim()}`).join('\n')}
                   
                   Guidelines:
                   - Focus on capturing the essence of the community and its unique character
                   - Highlight the specific places and experiences mentioned
                   - Use warm, inclusive language that resonates with Indian readers
                   - Include local cultural elements when relevant
                   
                   Keep it personal and authentic to the neighborhood experience.`;

    const response = await CONFIG.openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Content generation error:', error);
    throw new APIError('Failed to generate content', { cause: error });
  }
};

export const generateParaImage = async (
  _tags: string[],
  experiences: Experience[],
  location: Location
): Promise<string> => {
  try {
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);

    const prompt = `Create a photorealistic digital art of a vibrant Indian neighborhood scene in ${location.area}, Kolkata.
                   Featured landmarks and elements:
                   ${validExperiences.map(exp => `- ${exp.content}`).join('\n')}

                   Scene requirements:
                   - Create a balanced composition showing the specific landmarks mentioned
                   - Include authentic Bengali architectural details
                   - Show natural community interaction and street life
                   - Use warm, golden-hour lighting
                   - Include cultural elements specific to Kolkata
                   - Maintain photorealistic quality
                   - Compose the scene to work well as a portrait background

                   Style notes:
                   - Rich, warm colors that capture Kolkata's essence
                   - Focus on architectural accuracy for the mentioned landmarks
                   - Natural street atmosphere with subtle environmental details`;

    const response = await CONFIG.openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural",
      response_format: "b64_json"
    });

    if (!response.data[0]?.b64_json) {
      throw new APIError('No image data received from OpenAI');
    }

    return `data:image/png;base64,${response.data[0].b64_json}`;
  } catch (error) {
    console.error('Para image generation error:', error);
    throw new APIError('Failed to generate para scene', { cause: error });
  }
};

export class ShotstackService {
  private static readonly CONFIG: ProcessingConfig = {
    maxAttempts: 5,  // Increased for better reliability
    timeouts: {
      request: 20000,
      processing: 30000,
      render: 45000
    },
    intervals: {
      initial: 1500,
      max: 8000
    },
    fetchOptions: {
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      redirect: 'follow',
      referrerPolicy: 'no-referrer'
    }
  };

  private static readonly headers = {
    'x-api-key': CONFIG.shotstack.apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  };

  private static readonly RATE_LIMIT = {
    requestsPerSecond: 1,
    minRetryDelay: 1500,
    maxRetryDelay: 20000,
    maxAttempts: 5
  };

  private static async rateLimitDelay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 800));
  }

  private static getFetchOptions(options: RequestInit = {}): RequestInit {
    return {
      ...this.CONFIG.fetchOptions,
      ...options,
      headers: {
        ...this.headers,
        ...(options.headers || {})
      }
    };
  }

  private static async processImageLocally(
    bgImage: string,
    userImage: string,
    mergeFields: ShotstackMergeFields
  ): Promise<string> {
    try {
      console.log('Starting local image processing...');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      canvas.width = 1080;
      canvas.height = 1080;

      const loadImage = async (url: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          const timeout = setTimeout(() => reject(new Error('Image load timeout')), 30000);
          img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
          };
          img.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Image load failed'));
          };
          img.src = url;
        });
      };

      console.log('Loading images...');
      const [bgImg, userImg] = await Promise.all([
        loadImage(bgImage).then(img => {
          console.log('Background image loaded');
          return img;
        }),
        loadImage(userImage).then(img => {
          console.log('User image loaded');
          return img;
        })
      ]);

      console.log('Processing background...');
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      console.log('Processing user image...');
      const scale = Math.min(
        (canvas.width * 0.8) / userImg.width,
        (canvas.height * 0.8) / userImg.height
      );
      const x = (canvas.width - userImg.width * scale) / 2;
      const y = (canvas.height - userImg.height * scale) / 2;

      ctx.drawImage(userImg, x, y, userImg.width * scale, userImg.height * scale);

      console.log('Adding text overlays...');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Para name
      ctx.font = 'bold 56px Arial';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(mergeFields.paraName || 'Untitled Para', canvas.width / 2, 80);

      // Description
      ctx.font = '28px Arial';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const wrapText = (text: string, maxWidth: number, lineHeight: number): void => {
        const words = text.split(' ');
        let line = '';
        let y = canvas.height - 180;

        words.forEach(word => {
          const testLine = line + word + ' ';
          const metrics = ctx.measureText(testLine);

          if (metrics.width > maxWidth && line !== '') {
            ctx.fillText(line, canvas.width / 2, y);
            line = word + ' ';
            y += lineHeight;
          } else {
            line = testLine;
          }
        });

        ctx.fillText(line, canvas.width / 2, y);
      };

      wrapText(mergeFields.paraDescription || '', canvas.width - 120, 36);

      console.log('Finalizing image processing...');
      return canvas.toDataURL('image/jpeg', 0.9); // Changed to JPEG with high quality
    } catch (error) {
      console.error('Local processing error:', error);
      throw new APIError('Failed to process image locally', { cause: error });
    }
  }

  private static async ingestUrl(url: string): Promise<string> {
    const validationResult = await validateImageUrl(url);
    if (!validationResult.isValid) {
      console.warn('URL validation failed:', validationResult.error);
      throw new APIError('Invalid image URL', { error: validationResult.error });
    }

    const validUrl = validationResult.directUrl!;
    try {
      console.log('Attempting to ingest URL:', validUrl);
      // Simplify the payload to just include the URL
      const response = await fetch(CONFIG.shotstack.endpoints.ingest, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          url: validUrl
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Ingest API error:', {
          status: response.status,
          text: errorText
        });
        throw new APIError('Failed to ingest URL', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      }

      const data = await response.json();
      console.log('Ingest response:', data);

      const sourceId = data.data?.id;
      if (!sourceId) {
        throw new APIError('Invalid source ID response');
      }
      return await this.waitForSourceReady(sourceId);
    } catch (error) {
      console.error('Ingestion error:', error);
      throw error;
    }
  }

  private static async waitForSourceReady(sourceId: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 20;
    const initialDelay = 1500;

    const handleFailedAttempt = async (error: any, attempt: number) => {
      if (attempt === maxAttempts - 1) throw error;

      const delay = Math.min(
        initialDelay * Math.pow(1.5, attempt),
        this.CONFIG.intervals.max
      );

      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    };

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `${CONFIG.shotstack.endpoints.ingestStatus}/${sourceId}`,
          {
            method: 'GET',
            headers: {
              ...this.headers,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new APIError('Failed to check source status', {
            status: response.status,
            statusText: response.statusText
          });
        }

        const data = await response.json();
        console.log('Source status:', data.data?.attributes?.status);

        if (!data.data?.attributes) {
          throw new APIError('Invalid response format', { data });
        }

        const { status, source, error } = data.data.attributes;

        switch (status) {
          case 'ready':
            if (source) return source;
            throw new APIError('Source URL missing from ready response');

          case 'failed':
            throw new APIError('Source processing failed', {
              sourceId,
              error: error || 'Unknown error'
            });

          case 'queued':
          case 'importing':
            if (attempts < maxAttempts - 1) {
              const delay = initialDelay * Math.pow(1.5, attempts);
              await new Promise(resolve => setTimeout(resolve, delay));
              attempts++;
              continue;
            }
            throw new APIError('Source processing timeout');

          default:
            throw new APIError('Unknown source status', { status });
        }
      } catch (error) {
        await handleFailedAttempt(error, attempts++);
      }
    }

    throw new APIError('Max attempts reached waiting for source');
  }

  private static async initiateRender(payload: any): Promise<string> {
    const renderPayload = {
      ...payload,
      output: {
        ...payload.output,
        format: "image",
        imageFormat: "jpeg",
        quality: "high"
      }
    };

    try {
      await this.rateLimitDelay();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.timeouts.request);
      const headers = {
        ...this.headers,
        'x-output-format': 'image/jpeg'
      };

      const response = await fetch(CONFIG.shotstack.endpoints.render,
        this.getFetchOptions({
          method: 'POST',
          body: JSON.stringify(renderPayload),
          signal: controller.signal,
          headers
        })
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError('Failed to initiate render', {
          status: response.status,
          error: errorText
        });
      }

      const data: ShotstackRenderResponse = await response.json();

      if (!data.success || !data.response?.id) {
        throw new APIError('Invalid render response', { data });
      }

      return data.response.id;
    } catch (error) {
      throw error instanceof APIError ? error : new APIError('Render initiation failed', { cause: error });
    }
  }

  private static async waitForRenderComplete(renderId: string): Promise<string> {
    console.log('Waiting for render completion...', renderId);
    let attempts = 0;
    let interval = this.CONFIG.intervals.initial;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      try {
        await this.rateLimitDelay();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.CONFIG.timeouts.request);

        const response = await fetch(
          `${CONFIG.shotstack.endpoints.renderStatus}/${renderId}`,
          this.getFetchOptions({
            signal: controller.signal
          })
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new APIError('Failed to check render status', {
            status: response.status,
            statusText: response.statusText
          });
        }

        const status: ShotstackStatusResponse = await response.json();
        console.log(`Render status check ${attempts + 1}/${maxAttempts}: ${status.response.status}`);

        switch (status.response.status) {
          case 'ready':
          case 'done':
            if (!status.response.url) {
              throw new APIError('Render URL missing');
            }
            console.log('Render complete:', status.response.url);
            // Convert video URL to image URL if needed
            return status.response.url.replace(/\.mp4$/, '.jpg');

          case 'failed':
            throw new APIError('Render failed', {
              error: status.response.error
            });

          case 'queued':
          case 'rendering':
          case 'fetching':
          case 'saving':
            interval = Math.min(interval * 1.5, this.CONFIG.intervals.max);
            await new Promise(resolve => setTimeout(resolve, interval));
            attempts++;
            continue;

          default:
            console.warn('Unknown render status received:', status.response.status);
            throw new APIError('Unknown render status', {
              status: status.response.status
            });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('Render status check timed out, retrying...');
          continue;
        }

        console.error(`Render status check error (attempt ${attempts + 1}):`, error);

        if (attempts === maxAttempts - 1) {
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT.minRetryDelay));
        attempts++;
      }
    }

    throw new APIError('Render timeout after maximum attempts');
  }

  public static async renderParaPortrait(mergeFields: ShotstackMergeFields): Promise<string> {
    console.log('Rendering para portrait with merge fields:', {
      paraName: mergeFields.paraName,
      paraDescription: mergeFields.paraDescription,
      pincode: mergeFields.pincode
    });
    if (!mergeFields.bgImage || !mergeFields.userImage) {
      throw new APIError('Missing required image URLs');
    }

    // Always try API first, fallback to local processing only on failure
    console.log('Attempting Shotstack API processing first...');

    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.CONFIG.maxAttempts) {
      try {
        if (lastError?.message.includes('ETIMEDOUT') && attempts > 0) {
          console.log('Previous timeout errors detected, falling back to local processing...');
          return await this.processImageLocally(
            mergeFields.bgImage,
            mergeFields.userImage,
            mergeFields
          );
        }

        console.log(`Attempt ${attempts + 1}: Using Shotstack API...`);

        const images = await Promise.all([
          this.ingestUrl(mergeFields.bgImage),
          this.ingestUrl(mergeFields.userImage)
        ]);

        const renderPayload = {
          id: CONFIG.shotstack.templateId,
          merge: [
            { find: "backgroundImage", replace: images[0] },
            { find: "userImage", replace: images[1] },
            { find: "paraName", replace: mergeFields.paraName || 'Untitled Para' },
            { find: "paraDescription", replace: mergeFields.paraDescription || '' },
            { find: "pincode", replace: mergeFields.pincode || '' }
          ],
          output: {
            // Change format specification to explicitly request image
            format: "image",
            imageFormat: "jpg",
            quality: "high",
            width: 1920,
            height: 1080
          }
        };

        const renderId = await this.initiateRender(renderPayload);
        const result = await this.waitForRenderComplete(renderId);

        // Convert video URL to image URL if needed
        return result.replace(/\.mp4$/, '.jpg');
      } catch (error) {
        console.error(`Attempt ${attempts + 1} failed:`, error);
        lastError = error as Error;
        attempts++;

        if (attempts < this.CONFIG.maxAttempts) {
          const delay = Math.min(
            1500 * Math.pow(1.5, attempts),
            20000
          );
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Fall back to local processing if all API attempts failed
    console.log('All API attempts failed, falling back to local processing...');
    return await this.processImageLocally(
      mergeFields.bgImage,
      mergeFields.userImage,
      mergeFields
    );
  }
}

function calculateDimensions(width: number, height: number, maxDim: number): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) {
    return { width, height };
  }

  if (width > height) {
    const newWidth = maxDim;
    const newHeight = Math.round((height * maxDim) / width);
    return { width: newWidth, height: newHeight };
  } else {
    const newHeight = maxDim;
    const newWidth = Math.round((width * maxDim) / height);
    return { width: newWidth, height: newHeight };
  }
}