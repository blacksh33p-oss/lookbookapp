import { GoogleGenAI } from "@google/genai";
import { PhotoshootOptions, ModelVersion, OutfitItem, PhotoStyle, FacialExpression, LayoutMode } from "../types";

const STYLE_PROMPTS: Record<PhotoStyle, string> = {
  [PhotoStyle.Studio]: 'High Key Studio Lighting, Clean White Cyclorama, Commercial Look',
  [PhotoStyle.Urban]: 'Urban Editorial, Concrete Textures, Natural City Light, Streetwear Context',
  [PhotoStyle.Nature]: 'Outdoor Natural Environment, Soft Sunlight, Organic Background',
  [PhotoStyle.Coastal]: 'Coastal Golden Hour, Sand and Sky tones, Soft Breeze',
  [PhotoStyle.Luxury]: 'Modern Luxury Interior, Architectural Depth, Expensive Materials',
  [PhotoStyle.Chromatic]: 'Studio Color Gel Lighting, Neon Accent, High Contrast, Chromatic Aberration',
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
  // Always initialize with direct process.env.API_KEY access per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const heightStr = options.height ? `Model Height: ${options.height} ${options.measurementUnit}` : 'Height: Standard Model Height';
  const bodyTypeStr = `Body Type: ${options.bodyType}`;

  const outfitParts: string[] = [];
  const imageInputs: { type: string; data: string }[] = [];

  const processSlot = (role: string, item: OutfitItem) => {
    const hasImages = item.images && item.images.length > 0;
    if (!item.garmentType && !hasImages && !item.description) return;
    let description = `- ${role.toUpperCase()}: ${item.garmentType || role}`;
    if (item.description) description += `. Details: ${item.description}`;
    if (hasImages) {
      item.images.forEach((img: string, idx: number) => {
          imageInputs.push({ type: `${role} Reference ${idx + 1}`, data: img });
      });
    }
    outfitParts.push(description);
  };

  processSlot('Top', options.outfit.top);
  processSlot('Bottoms', options.outfit.bottom);
  processSlot('Shoes', options.outfit.shoes);
  processSlot('Accessories', options.outfit.accessories);

  if (options.referenceModelImage) {
      imageInputs.push({ type: 'IDENTITY_REFERENCE', data: options.referenceModelImage });
  }

  const richStylePrompt = STYLE_PROMPTS[options.style] || options.style;
  const richExpressionPrompt = EXPRESSION_PROMPTS[options.facialExpression] || options.facialExpression;
  const sceneryContext = options.sceneDetails ? `SCENERY & ENVIRONMENT: ${options.sceneDetails}` : '';

  const layoutInstruction = options.layout === LayoutMode.Diptych 
    ? `CRITICAL LAYOUT: The final output must be a professional diptych (two-panel split) fashion editorial. 
       - Panel 1 (Left Side): A full-body or medium editorial shot of the model wearing the ensemble.
       - Panel 2 (Right Side): A high-detail macro close-up focus on the garment's texture, stitching, and fabric detail.
       Maintain identical lighting, model identity, and background atmosphere across both panels for a cohesive lookbook page.`
    : '';

  const prompt = `
    Create a professional high-fashion lookbook photograph.
    ${options.isModelLocked ? 'CRITICAL: Maintain the exact facial features, hair, and identity from the IDENTITY_REFERENCE image.' : ''}
    ${layoutInstruction}

    ART DIRECTION & SCENE (PRIORITY):
    - Visual Aesthetic: ${richStylePrompt}
    - Location Details: ${sceneryContext || 'Professional Studio environment'}
    - Lighting: High-end commercial lighting setup consistent with the visual aesthetic.

    OUTFIT & GARMENTS:
    ${outfitParts.join('\n')}

    MODEL SPECIFICATIONS:
    - Sex/Identity: ${options.sex}
    - Age Range: ${options.age}
    - Ethnicity/Look: ${options.ethnicity}
    - Hair: ${options.hairColor} color, styled as ${options.hairStyle}
    - Facial Expression: ${richExpressionPrompt}
    - Physical Stats: ${heightStr}, ${bodyTypeStr}
    - Distinct Features: ${options.modelFeatures || 'Refined editorial features'}
    - Pose: ${options.pose || 'Standing naturally'}

    TASK OBJECTIVES:
    1. **Product Fidelity**: If garment reference images are provided, match the color, fabric, and design EXACTLY.
    2. **Scene Atmosphere**: The background and environment must feel high-end and cinematic.
    3. **Photographic Quality**: Focus on skin texture, fabric drapes, and realistic light shadows.
    4. **Output**: Return only the image part.
  `;

  const executeGeneration = async (modelName: string, config: any) => {
      const parts: any[] = [{ text: prompt }];
      imageInputs.forEach(img => {
        parts.push({
          inlineData: { mimeType: getMimeType(img.data), data: extractBase64(img.data) }
        });
      });

      const generationConfig: any = { 
        imageConfig: config, 
        seed: options.seed 
      };

      // Pro models support the google_search tool
      if (modelName === 'gemini-3-pro-image-preview') {
        generationConfig.tools = [{ google_search: {} }];
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: generationConfig
      });

      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("The model did not return an image. This could be due to safety filters or insufficient API key permissions for Gemini 3 Pro.");
  };

  const targetModel = getModelName(options.modelVersion);
  const imageConfig: any = { aspectRatio: options.aspectRatio };
  
  if (options.modelVersion === ModelVersion.Pro) {
    imageConfig.imageSize = options.enable4K ? '4K' : '2K';
  }

  return await executeGeneration(targetModel, imageConfig);
};