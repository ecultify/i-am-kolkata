import OpenAI from 'openai';
import { Location, Experience } from '../types';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

const BG_REMOVE_API_KEY = 'DE3VFmxbTbA2bDs1WDBZDDaX';
const BG_REMOVE_API_URL = 'https://api.remove.bg/v1.0/removebg';

export const removeBg = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image_file', imageFile);
  formData.append('size', 'auto');

  try {
    const response = await fetch(BG_REMOVE_API_URL, {
      method: 'POST',
      headers: {
        'X-Api-Key': BG_REMOVE_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to remove background');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};

export const fetchTags = async (pincode: string): Promise<string[]> => {
  try {
    // First, get area details from pincode
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch area details');
    }

    const data = await response.json();
    const areaDetails = data[0]?.PostOffice?.[0];
    
    if (!areaDetails) {
      throw new Error('Area details not found');
    }

    const { District, State } = areaDetails;

    // Get location-specific tags using OpenAI
    const completion = await openai.chat.completions.create({
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

    // Process the response into an array of tags
    const tags = completion.choices[0].message.content
      ?.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !tag.includes('#') && tag.length > 0) || [];
      
    return tags.slice(0, 10); // Ensure we only return max 10 tags
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;
  }
};

export const generateContent = async (
  paraName: string,
  tags: string[],
  experiences: { tag: string; content: string }[]
): Promise<string> => {
  try {
    // Filter out experiences with empty content
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);
    const experienceText = validExperiences
      .map(exp => exp.content.trim())
      .join('\n');

    const prompt = tags.length > 0
      ? `Create a brief 40-50 word description of "${paraName}" that resonates with Indian readers.
         Include relatable elements like local chai spots, evening addas, festivals, or street food.
         Base it on these tags and experiences:\n\nTags: ${tags.join(', ')}\n\n
         Experiences:\n${experienceText}`
      : `Create a brief 40-50 word description of "${paraName}" that resonates with Indian readers.
         Include relatable elements like local chai spots, evening addas, festivals, or street food.
         Base it on these experiences:\n\n${experienceText}`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{
        role: "system",
        content: prompt
      }],
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
};

export const generateParaImage = async (
  tags: string[],
  experiences: Experience[],
  location: Location
): Promise<string> => {
  try {
    // Filter valid experiences and create a focused prompt
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);
    const experienceDescriptions = validExperiences
      .map(exp => exp.content.trim())
      .join('. ');

    // Create a more focused and descriptive prompt
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

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural",
      response_format: "b64_json"
    });

    if (!response.data[0]?.b64_json) {
      throw new Error('No image data received from OpenAI');
    }

    return `data:image/png;base64,${response.data[0].b64_json}`;
  } catch (error) {
    console.error('Error generating para image:', error);
    throw new Error('Failed to generate para scene. Please try again.');
  }
};