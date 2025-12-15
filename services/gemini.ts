import { GoogleGenAI } from "@google/genai";
import { PhotoshootOptions, ModelVersion } from "../types";

// Helper to strip data:image/xyz;base64, prefix
const extractBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(.*);base64,/);
  return match ? match[1] : 'image/jpeg';
};

const getModelName = (version: ModelVersion): string => {
  switch (version) {
    case ModelVersion.Pro:
      return 'gemini-3-pro-image-preview';
    case ModelVersion.Flash:
    default:
      return 'gemini-2.5-flash-image';
  }
};

// Safe environment variable accessor for Vite/Browser/Node environments
const getApiKey = (): string | undefined => {
  // Use "as any" to bypass TypeScript errors for Vite's import.meta.env
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
    if (meta.env.VITE_API_KEY) return meta.env.VITE_API_KEY;
    if (meta.env.VITE_GEMINI_API_KEY) return meta.env.VITE_GEMINI_API_KEY;
  }
  
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env) {
      // @ts-ignore
      return process.env.API_KEY || process.env.VITE_API_KEY;
    }
  } catch (e) {
    // ignore
  }
  return undefined;
};

export const generatePhotoshootImage = async (
  options: PhotoshootOptions
): Promise<string> => {
  
  const API_KEY = getApiKey();

  if (!API_KEY) {
    throw new Error(
      "Configuration Error: API_KEY is missing. If you are the site owner, please set the 'VITE_API_KEY' environment variable in your hosting dashboard."
    );
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // 1. Model & Body Prompt
  const unit = options.measurementUnit;
  const heightStr = options.height ? `Model Height: ${options.height} ${unit}` : 'Height: Standard Model Height';
  const bodyTypeStr = `Body Type: ${options.bodyType}`;

  const m = options.measurements;
  const measureList = [];
  if(m.bust) measureList.push(`Bust: ${m.bust}`);
  if(m.waist) measureList.push(`Waist: ${m.waist}`);
  if(m.hips) measureList.push(`Hips: ${m.hips}`);
  
  const measurementsStr = measureList.length > 0 
    ? `Measurements: ${measureList.join(', ')}` 
    : '';

  // 2. Outfit Composition Strategy
  const outfitParts: string[] = [];
  const imageInputs: { type: string; data: string }[] = [];

  // Helper to process each outfit slot
  const processSlot = (role: string, item: any) => {
    // Check if we have images (array) or manual description
    const hasImages = item.images && item.images.length > 0;
    
    // Valid if it has images OR visual description OR specific garment type
    // If it's just an empty slot with no info, skip it.
    if (!item.garmentType && !hasImages && !item.description) return;

    const label = item.garmentType || role;
    let description = `- ${role.toUpperCase()}: ${label}`;
    
    if (item.description) description += `. Visuals: ${item.description}`;
    if (item.fitNotes) description += `. Fit: ${item.fitNotes}`;
    
    // Add multiple product images
    if (hasImages) {
      item.images.forEach((img: string, idx: number) => {
          imageInputs.push({ type: `${role} Reference ${idx + 1}`, data: img });
      });
    }
    
    // Add Size Chart Image
    if (item.sizeChart) {
      imageInputs.push({ type: `${role} Size Chart`, data: item.sizeChart });
    }
    
    // Add Manual Size Details
    if (item.sizeChartDetails) {
        description += `. Specs: ${item.sizeChartDetails}`;
    }

    outfitParts.push(description);
  };

  processSlot('Top', options.outfit.top);
  processSlot('Bottoms', options.outfit.bottom);
  processSlot('Shoes', options.outfit.shoes);
  processSlot('Accessories', options.outfit.accessories);

  if (outfitParts.length === 0) {
    throw new Error("Please configure at least one item in the Outfit Composition section.");
  }

  // Handle Character Reference Image (for "Same Model" consistency)
  if (options.referenceModelImage) {
      imageInputs.push({ type: 'CHARACTER_REFERENCE', data: options.referenceModelImage });
  }

  const sceneInstruction = options.sceneDetails 
    ? `SCENE: ${options.sceneDetails}`
    : `SCENE: Professional ${options.style} setting.`;

  // 3. Construct the Master Prompt
  const hasImages = imageInputs.length > 0;
  const hasRefImage = !!options.referenceModelImage;
  
  const taskInstructions = hasImages 
    ? "Composite a photorealistic full-body fashion image. Use the provided product images. Dress the model in these exact items. For items described only by text, generate them photorealistically."
    : "Generate a photorealistic full-body fashion image based on the text descriptions. Create high-fidelity garments.";

  const criticalInstructions = `
    1. **Product Fidelity**: Match provided reference images exactly (Color, Texture, Shape).
    2. **Model**: ${hasRefImage ? 'Use the provided CHARACTER_REFERENCE image for the face/body identity. Keep identity consistent.' : 'Create the model based on the specifications.'}
    3. **Fit**: Adhere to fit requirements.
    4. **Composition**: Full body shot unless specified otherwise.
    5. **Format**: OUTPUT ONLY THE IMAGE. NO TEXT.
  `;

  const prompt = `
    Create a high-fashion lookbook image.

    OUTFIT:
    ${outfitParts.join('\n')}

    MODEL:
    - Sex: ${options.sex}
    - Age: ${options.age}
    - Ethnicity: ${options.ethnicity}
    - Hair: ${options.hairColor}, ${options.hairStyle}
    - Expression: ${options.facialExpression}
    - ${heightStr}
    - ${bodyTypeStr}
    - ${measurementsStr}
    - Features: ${options.modelFeatures || 'Standard'}
    - Pose: ${options.pose || 'Standing naturally'}

    ART DIRECTION:
    - Style: ${options.style}
    - ${sceneInstruction}
    - Lighting: Professional commercial lighting.

    TASK:
    ${taskInstructions}
    ${criticalInstructions}

    IMPORTANT: Do not output any text. Just generate the image.
  `;

  try {
    const modelName = getModelName(options.modelVersion);
    
    // 4. Prepare Content Parts
    const parts: any[] = [{ text: prompt }];

    // Append All Images (Product Shots + Size Charts + Reference Model)
    imageInputs.forEach(img => {
      parts.push({
        inlineData: {
          mimeType: getMimeType(img.data),
          data: extractBase64(img.data)
        }
      });
    });

    // Configure Image Options
    const imageConfig: any = {
      aspectRatio: options.aspectRatio
    };

    // Only enable 4K if explicitly requested AND using Pro model
    if (options.modelVersion === ModelVersion.Pro && options.enable4K) {
      imageConfig.imageSize = '4K';
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig,
        seed: options.seed
      }
    });

    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    const textOutput = response.text;
    if (textOutput) {
       console.warn("Model returned text instead of image:", textOutput);
       throw new Error(`Generation failed (Model returned text): ${textOutput.substring(0, 100)}...`);
    }
    
    throw new Error("No image generated.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message || "Failed to generate image.";
    throw new Error(msg);
  }
};