import OpenAI from 'openai';
import { Location, Experience } from '../types';
import { ShotstackRenderResponse, ShotstackStatusResponse, ShotstackMergeFields } from '../types/shotstack';

// Environment variable validation
const requiredEnvVars = {
  OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
  SHOTSTACK_API_KEY: import.meta.env.VITE_SHOTSTACK_API_KEY,
  SHOTSTACK_TEMPLATE_ID: import.meta.env.VITE_SHOTSTACK_TEMPLATE_ID,
  IMGBB_API_KEY: import.meta.env.VITE_IMGBB_API_KEY
} as const;

// Validate all required environment variables
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
});

// Service configuration
const CONFIG = {
  openai: new OpenAI({
    apiKey: requiredEnvVars.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  }),
  bgRemove: {
    apiKey: 'mP2BUvLiu3dSgMEi6wJ3cBJL',
    apiUrl: 'https://api.remove.bg/v1.0/removebg'
  },
  shotstack: {
    apiKey: requiredEnvVars.SHOTSTACK_API_KEY,
    endpoint: 'https://api.shotstack.io/v1',
    templateId: requiredEnvVars.SHOTSTACK_TEMPLATE_ID,
    ingestEndpoint: 'https://api.shotstack.io/ingest/v1'
  },
  imgbb: {
    apiKey: requiredEnvVars.IMGBB_API_KEY,
    endpoint: 'https://api.imgbb.com/1/upload'
  }
} as const;

// Utility function for handling API errors
class APIError extends Error {
  constructor(message: string, public readonly context: Record<string, any> = {}) {
    super(message);
    this.name = 'APIError';
  }
}

// Utility for type-safe delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Background Removal Service
export const removeBg = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('size', 'auto');

  try {
    const response = await fetch(CONFIG.bgRemove.apiUrl, {
      method: 'POST',
      headers: { 'X-Api-Key': CONFIG.bgRemove.apiKey },
      body: formData,
    });

    if (!response.ok) {
      throw new APIError('Failed to remove background', {
        status: response.status,
        statusText: response.statusText
      });
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Background removal error:', error);
    throw error instanceof APIError ? error : new APIError('Background removal failed', { cause: error });
  }
};

// Image Compression and Upload Service
export const uploadToImgBB = async (imageData: string, retries = 3): Promise<string> => {
  const compressImage = async (base64: string): Promise<string> => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = `data:image/jpeg;base64,${base64}`;
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
      formData.append('image', compressedImage);

      const response = await fetch(`${CONFIG.imgbb.endpoint}?key=${CONFIG.imgbb.apiKey}`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new APIError('ImgBB upload failed', {
          status: response.status,
          error: data.error
        });
      }

      return data.data.url;
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await delay(Math.pow(2, attempt) * 1000);
    }
  }

  throw new APIError('Maximum retry attempts reached');
};

// Tag Generation Service
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
        content: `Generate 10 unique, location-specific tags for ${District}, ${State} (Pincode: ${pincode}).
                 Focus on actual local elements like:
                 - Popular local food spots and dishes specific to this area
                 - Cultural landmarks and institutions in this district
                 - Community gathering places in this neighborhood
                 - Local festivals and events celebrated here
                 - Neighborhood-specific activities and traditions
                 
                 Format: Return ONLY a comma-separated list of tags, nothing else.
                 Example: "Juhu Beach, Prithvi Theatre, Linking Road Shopping, Carter Road Jogging"
                 
                 Each tag must be a real, verifiable place or activity in this specific area.
                 Do not include generic terms or made-up places.`
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

// Content Generation Service
export const generateContent = async (
  paraName: string,
  tags: string[],
  experiences: { tag: string; content: string }[]
): Promise<string> => {
  try {
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);
    const experienceText = validExperiences.map(exp => exp.content.trim()).join('\n');

    const prompt = tags.length > 0
      ? `Create a brief 40-50 word description of "${paraName}" that resonates with Indian readers.
         Include relatable elements like local chai spots, evening addas, festivals, or street food.
         Base it on these tags and experiences:\n\nTags: ${tags.join(', ')}\n\n
         Experiences:\n${experienceText}`
      : `Create a brief 40-50 word description of "${paraName}" that resonates with Indian readers.
         Include relatable elements like local chai spots, evening addas, festivals, or street food.
         Base it on these experiences:\n\n${experienceText}`;

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

// Para Image Generation Service
export const generateParaImage = async (
  tags: string[],
  experiences: Experience[],
  location: Location
): Promise<string> => {
  try {
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);
    const experienceDescriptions = validExperiences.map(exp => exp.content.trim()).join('. ');
    
    const prompt = `Create a photorealistic digital art of a vibrant Indian neighborhood scene in ${location.area}, Kolkata.
                   Key elements to include:
                   ${tags.map(tag => `- ${tag}`).join('\n')}
                   
                   Scene details from local experiences:
                   ${experienceDescriptions}
                   
                   Style guidelines:
                   - Warm, inviting colors that capture the essence of Kolkata
                   - Include traditional Bengali architecture
                   - Show street life and community interaction
                   - Natural lighting with golden hour atmosphere
                   - Detailed textures and cultural elements
                   - Maintain photorealistic quality
                   
                   Important: Create a balanced, well-composed scene that would work well as a background.`;

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

// Shotstack Service
export class ShotstackService {
  private static readonly headers = {
    'x-api-key': CONFIG.shotstack.apiKey,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  private static async ingestUrl(url: string): Promise<string> {
    try {
      console.log('Ingesting URL:', url);

      const response = await fetch(`${CONFIG.shotstack.ingestEndpoint}/sources`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('URL ingestion failed:', errorText);
        throw new APIError('Failed to ingest URL', {
          status: response.status,
          error: errorText
        });
      }

      const data = await response.json();
      const sourceId = data.data?.id;

      if (!sourceId) {
        throw new APIError('Invalid source ID response');
      }

      return await this.waitForSourceReady(sourceId);
    } catch (error) {
      console.error('Error in ingestUrl:', error);
      throw error instanceof APIError ? error : new APIError('URL ingestion failed', { cause: error });
    }
  }

  private static async waitForSourceReady(sourceId: string, maxAttempts = 30): Promise<string> {
    console.log('Waiting for source processing...', sourceId);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `${CONFIG.shotstack.ingestEndpoint}/sources/${sourceId}`,
          { headers: this.headers }
        );

        if (!response.ok) {
          throw new APIError('Failed to check source status');
        }

        const data = await response.json();
        console.log('Source status response:', data);
        
        const status = data.data?.attributes?.status;
        const source = data.data?.attributes?.source;

        console.log(`Source status (attempt ${attempt + 1}):`, status);

        if (status === 'ready' && source) {
          console.log('Source processing complete:', source);
          return source;
        }

        if (status === 'failed') {
          const message = data.data?.attributes?.error || 'Source processing failed';
          throw new APIError(message);
        }

        await delay(3000);
      } catch (error) {
        console.error(`Error checking source status (attempt ${attempt + 1}):`, error);
        if (attempt === maxAttempts - 1) throw error;
        await delay(3000);
      }
    }

    throw new APIError('Source processing timeout');
  }

  static async renderParaPortrait(mergeFields: ShotstackMergeFields): Promise<string> {
    try {
      if (!mergeFields.bgImage || !mergeFields.userImage) {
        throw new APIError('Missing required image URLs');
      }

      console.log('Starting para portrait generation...');

      // Process images sequentially to avoid rate limiting
      console.log('Processing background image...');
      const bgImageUrl = await this.ingestUrl(mergeFields.bgImage);
      
      console.log('Processing user image...');
      const userImageUrl = await this.ingestUrl(mergeFields.userImage);

      console.log('Successfully processed images:', {
        background: bgImageUrl,
        user: userImageUrl
      });

      // Prepare render payload according to Shotstack API documentation
      const renderPayload = {
        id: CONFIG.shotstack.templateId,
        merge: [
          {
            find: "backgroundImage",
            replace: bgImageUrl
          },
          {
            find: "userImage",
            replace: userImageUrl
          },
          {
            find: "TEXT_VAR_446",
            replace: mergeFields.paraName || 'Untitled Para'
          },
          {
            find: "TEXT_VAR_648",
            replace: mergeFields.description || 'No description provided'
          },
          {
            find: "TEXT_VAR_451",
            replace: mergeFields.pincode || ''
          }
        ]
      };

      // Initiate render
      console.log('Initiating render with payload:', JSON.stringify(renderPayload, null, 2));
      const renderId = await this.initiateRender(renderPayload);
      return await this.waitForRenderComplete(renderId);
    } catch (error) {
      console.error('Para portrait rendering error:', error);
      throw error instanceof APIError ? error : new APIError('Failed to render para portrait', { cause: error });
    }
  }

  private static async initiateRender(payload: any): Promise<string> {
    try {
      console.log('Initiating render...');
      
      const response = await fetch(`${CONFIG.shotstack.endpoint}/templates/render`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Render initiation failed:', errorText);
        throw new APIError('Failed to initiate render', {
          status: response.status,
          error: errorText
        });
      }

      const data: ShotstackRenderResponse = await response.json();
      
      if (!data.success || !data.response?.id) {
        throw new APIError('Invalid render response', { data });
      }

      console.log('Render initiated:', data.response.id);
      return data.response.id;
    } catch (error) {
      console.error('Error initiating render:', error);
      throw error instanceof APIError ? error : new APIError('Render initiation failed', { cause: error });
    }
  }

  private static async waitForRenderComplete(renderId: string): Promise<string> {
    console.log('Waiting for render completion...', renderId);
    const maxAttempts = 60;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${CONFIG.shotstack.endpoint}/render/${renderId}`, {
          headers: this.headers,
        });

        if (!response.ok) {
          throw new APIError('Failed to check render status', {
            status: response.status,
            statusText: response.statusText
          });
        }

        const status: ShotstackStatusResponse = await response.json();
        console.log(`Render status (attempt ${attempt + 1}):`, status.response.status);

        switch (status.response.status) {
          case 'ready':
            if (!status.response.url) {
              throw new APIError('Render URL missing');
            }
            console.log('Render complete:', status.response.url);
            return status.response.url;
          
          case 'failed':
            throw new APIError('Render failed', {
              error: status.response.error
            });
          
          case 'queued':
          case 'rendering':
          case 'fetching':
            await delay(3000);
            continue;
          
          default:
            throw new APIError('Unknown render status', {
              status: status.response.status
            });
        }
      } catch (error) {
        console.error(`Error checking render status (attempt ${attempt + 1}):`, error);
        if (attempt === maxAttempts - 1) throw error;
        await delay(3000);
      }
    }

    throw new APIError('Render timeout');
  }
}

// Utility function for image dimensions
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