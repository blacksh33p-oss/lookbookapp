
import { GoogleGenAI } from "@google/genai";
import { PhotoshootOptions, ModelVersion, OutfitItem, PhotoStyle, FacialExpression } from "../types";

const STYLE_PROMPTS: Record<PhotoStyle, string> = {
  [PhotoStyle.Studio]: 'High Key Studio Lighting, Clean White Cyclorama, Commercial Look',
  [PhotoStyle.Urban]: 'Urban Editorial, Concrete Textures, Natural City Light, Streetwear Context',
  [PhotoStyle.Nature]: 'Outdoor Natural Environment, Soft Sunlight, Organic Background',
  [PhotoStyle.Coastal]: 'Coastal Golden Hour, Sand and Sky tones, Soft Breeze',
  [PhotoStyle.Luxury]: 'Modern Luxury Interior, Architectural Depth, Expensive Materials',
  [PhotoStyle.Chromatic]: 'Studio Color Gel Lighting, Neon Accents, High Contrast, Chromatic Aberration',
  [PhotoStyle.Minimalist]: 'Minimalist Brutalist Architecture, Sharp Shadows, Clean Lines',
  [PhotoStyle.Film]: 'Analog Film Grain, Kodak Portra 400 aesthetic, Soft focus, Emotional',
  [PhotoStyle.Newton]: 'Helmut Newton Style, High Contrast Black and White, Powerful Stance, Voyeuristic',
  [PhotoStyle.Lindbergh]: 'Peter Lindbergh Style, Raw Realism, Cinematic Black and White, Emotional',
  [PhotoStyle.Leibovitz]: 'Annie Leibovitz Style, Dramatic Painterly Lighting, Environmental Portrait',
  [PhotoStyle.Avedon]: 'Richard Avedon Style, Minimalist White Background, Dynamic Motion',
  [PhotoStyle.LaChapelle]: 'David LaChapelle Style, Hyper-Realistic Pop Surrealism, Vibrant Saturation',
  [PhotoStyle.Testino]: 'Mario Testino Style, Glamorous, Vibrant, High Energy'
};

const EXPRESSION_PROMPTS: Record<FacialExpression, string> = {
  [FacialExpression.Neutral]: 'Neutral Expression, High Fashion Pout, Detached',
  [FacialExpression.Confident]: 'Confident Gaze, Strong Eye Contact, Powerful',
  [FacialExpression.Fierce]: 'Fierce Intensity, Editorial Edge, Sharp',
  [FacialExpression.Candid]: 'Laughing, Candid Moment, Genuine Smile, Relaxed',
  [FacialExpression.Ethereal]: 'Ethereal, Soft Gaze, Dreamy, Serene'
};

const extractBase64 = (dataUrl: string): string => dataUrl.split(',')[1] || dataUrl;
const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(.*);base64,/);
  return match ? match[1] : 'image/jpeg';
};

const getModelName = (version: ModelVersion): string => {
  switch (version) {
    case ModelVersion.Pro: return 'gemini-3-pro-image-preview';
    case ModelVersion.Flash:
    default: return 'gemini-2.5-flash-image';
  }
};

export const generatePhotoshootImage = async (options: PhotoshootOptions): Promise<string> => {
  // Use the API key exclusively from process.env.API_KEY as per guidelines.
  // A fresh instance is created right before the call to ensure the latest key is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const heightStr = options.height ? `Model Height: ${options.height} ${options.measurementUnit}` : 'Height: Standard Model Height';
  const bodyTypeStr = `Body Type: ${options.bodyType}`;

  const outfitParts: string[] = [];
  const imageInputs: { type: string; data: string; mimeType: string }[] = [];

  const processSlot = (role: string, item: OutfitItem) => {
    const hasImages = item.images && item.images.length > 0;
    if (!item.garmentType && !hasImages && !item.description) return;
    let description = `- ${role.toUpperCase()}: ${item.garmentType || role}`;
    if (item.description) description += `. Style notes: ${item.description}`;
    if (hasImages) {
      item.images.forEach((img: string) => {
          imageInputs.push({ type: role, data: extractBase64(img), mimeType: getMimeType(img) });
      });
    }
    outfitParts.push(description);
  };

  processSlot('Top', options.outfit.top);
  processSlot('Bottoms', options.outfit.bottom);
  processSlot('Shoes', options.outfit.shoes);
  processSlot('Accessories', options.outfit.accessories);

  if (options.referenceModelImage) {
      imageInputs.push({ 
        type: 'IDENTITY', 
        data: extractBase64(options.referenceModelImage), 
        mimeType: getMimeType(options.referenceModelImage) 
      });
  }

  const richStylePrompt = STYLE_PROMPTS[options.style] || options.style;
  const richExpressionPrompt = EXPRESSION_PROMPTS[options.facialExpression] || options.facialExpression;

  const prompt = `
    Create a professional high-fashion photoshoot image.
    ${options.referenceModelImage ? 'MANDATORY: Maintain the exact facial features and identity from the IDENTITY image.' : ''}

    OUTFIT REQUIREMENTS:
    ${outfitParts.join('\n')}

    MODEL SPECS:
    - Sex: ${options.sex}
    - Age: ${options.age}
    - Ethnicity: ${options.ethnicity}
    - Hair: ${options.hairColor}, ${options.hairStyle}
    - Expression: ${richExpressionPrompt}
    - ${heightStr}
    - ${bodyTypeStr}
    - Additional Features: ${options.modelFeatures || 'Standard'}
    - Pose: ${options.pose || 'Standing naturally'}

    PHOTOGRAPHY DIRECTION:
    - Environment/Style: ${richStylePrompt}
    - Quality: Commercial studio quality, ultra-realistic skin textures, sharp focus on garments.

    INSTRUCTIONS:
    - Output ONLY the generated image.
    - If garment references are provided, match the silhouettes and details faithfully.
  `;

  const targetModel = getModelName(options.modelVersion);
  const imageConfig: any = { aspectRatio: options.aspectRatio };
  const tools: any[] = [];

  if (options.modelVersion === ModelVersion.Pro) {
    imageConfig.imageSize = options.enable4K ? '4K' : '2K';
    // Using google_search tool specifically for Pro image generation as per SDK example
    tools.push({ google_search: {} });
  }

  const parts: any[] = [{ text: prompt }];
  imageInputs.forEach(img => {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.data }
    });
  });

  try {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: { parts },
      config: { 
        imageConfig: imageConfig, 
        seed: options.seed,
        tools: tools.length > 0 ? tools : undefined
      }
    });

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("The model generated text but no image. Please try again.");
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};
