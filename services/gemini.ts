import { GoogleGenAI } from "@google/genai";
import { PhotoshootOptions, ModelVersion, OutfitItem } from "../types";

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
      // VERIFICATION: This ID maps to "Nano Banana Pro" / Gemini 3 Pro Image
      return 'gemini-3-pro-image-preview';
    case ModelVersion.Flash:
    default:
      return 'gemini-2.5-flash-image';
  }
};

export const generatePhotoshootImage = async (
  options: PhotoshootOptions
): Promise<string> => {
  
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    throw new Error(
      "Configuration Error: API Key is missing.\nPlease check your VITE_API_KEY environment variable in Vercel settings."
    );
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });

  // 1. Prompt Construction
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

  // 2. Outfit Strategy
  const outfitParts: string[] = [];
  const imageInputs: { type: string; data: string }[] = [];

  const processSlot = (role: string, item: OutfitItem) => {
    const hasImages = item.images && item.images.length > 0;
    if (!item.garmentType && !hasImages && !item.description) return;

    const label = item.garmentType || role;
    let description = `- ${role.toUpperCase()}: ${label}`;
    
    if (item.description) description += `. Visuals: ${item.description}`;
    if (item.fitNotes) description += `. Fit: ${item.fitNotes}`;
    
    if (hasImages) {
      item.images.forEach((img: string, idx: number) => {
          imageInputs.push({ type: `${role} Reference ${idx + 1}`, data: img });
      });
    }
    
    if (item.sizeChart) imageInputs.push({ type: `${role} Size Chart`, data: item.sizeChart });
    if (item.sizeChartDetails) description += `. Specs: ${item.sizeChartDetails}`;

    outfitParts.push(description);
  };

  processSlot('Top', options.outfit.top);
  processSlot('Bottoms', options.outfit.bottom);
  processSlot('Shoes', options.outfit.shoes);
  processSlot('Accessories', options.outfit.accessories);

  if (outfitParts.length === 0) {
    throw new Error("Please configure at least one item in the Outfit Composition section.");
  }

  if (options.referenceModelImage) {
      imageInputs.push({ type: 'CHARACTER_REFERENCE', data: options.referenceModelImage });
  }

  const sceneInstruction = options.sceneDetails 
    ? `SCENE: ${options.sceneDetails}`
    : `SCENE: Professional ${options.style} setting.`;

  const hasImages = imageInputs.length > 0;
  const hasRefImage = !!options.referenceModelImage;
  
  const taskInstructions = hasImages 
    ? "Composite a photorealistic full-body fashion image. Use the provided product images. Dress the model in these exact items. For items described only by text, generate them photorealistically."
    : "Generate a photorealistic full-body fashion image based on the text descriptions. Create high-fidelity garments.";

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
    1. **Product Fidelity**: Match provided reference images exactly (Color, Texture, Shape).
    2. **Model**: ${hasRefImage ? 'Use the provided CHARACTER_REFERENCE image for the face/body identity.' : 'Create the model based on the specifications.'}
    3. **Format**: OUTPUT ONLY THE IMAGE. NO TEXT.

    IMPORTANT: Do not output any text. Just generate the image.
  `;

  // 4. Execution Helper with Fallback
  const executeGeneration = async (modelName: string, config: any) => {
      // EXPLICIT LOGGING FOR VERIFICATION
      // This allows you to verify in the browser console that the correct model ID is being used.
      console.log(`%c[VERIFICATION] Generating with Model: ${modelName}`, 'background: #0f3d0f; color: #00ff00; font-size: 12px; font-weight: bold; padding: 4px; border-radius: 4px;');
      
      const parts: any[] = [{ text: prompt }];
      imageInputs.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: getMimeType(img.data),
            data: extractBase64(img.data)
          }
        });
      });

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          imageConfig: config,
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
      
      if (response.text) {
          throw new Error(`Model returned text instead of image: ${response.text.substring(0, 100)}...`);
      }
      throw new Error("No image generated in response.");
  };

  try {
    const targetModel = getModelName(options.modelVersion);
    
    const imageConfig: any = { aspectRatio: options.aspectRatio };
    if (options.modelVersion === ModelVersion.Pro && options.enable4K) {
      imageConfig.imageSize = '4K';
    }

    // ATTEMPT 1: Target Model
    try {
        return await executeGeneration(targetModel, imageConfig);
    } catch (err: any) {
        // Check for Permission/Existence errors to trigger fallback
        const errMsg = JSON.stringify(err);
        const isPermissionError = errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('not found');
        
        // STRICT VERIFICATION MODE: 
        // If Pro model fails, DO NOT fallback to Flash. 
        // This ensures that if you get an image, it is GUARANTEED to be from the Pro model.
        if (isPermissionError && options.modelVersion === ModelVersion.Pro) {
             console.error("Pro Model Verification Failed: Access Denied to gemini-3-pro-image-preview.");
             throw new Error("Gemini 3 Pro (Nano Banana Pro) Access Denied. Please ensure your Google Cloud Project has billing enabled. We stopped the generation to prevent falling back to a lower quality model.");
        }
        
        // Only fallback if we were NOT strictly requesting Pro (e.g. if we add other tiers later)
        // or if it's a different kind of transient error where fallback might be acceptable (though rare)
        if (isPermissionError && options.modelVersion !== ModelVersion.Pro) {
            console.warn("Model failed. Falling back to Flash model automatically.");
            const fallbackConfig = { aspectRatio: options.aspectRatio }; 
            return await executeGeneration(getModelName(ModelVersion.Flash), fallbackConfig);
        }
        
        throw err; 
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    let msg = error.message || "Failed to generate image.";
    
    // Attempt to parse JSON error message from Google
    try {
        if (msg.includes('{')) {
             const parsed = JSON.parse(msg);
             if (parsed.error && parsed.error.message) msg = parsed.error.message;
        }
    } catch(e) {}

    // Final user-friendly message formatting
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        msg = `ACCESS DENIED (403): Your API Key cannot access the Gemini 3 Pro Model. \n\n1. Enable "Generative Language API" in Google Cloud Console.\n2. Ensure your Google Cloud Project has billing enabled (Required for Pro).\n3. Check your API Key permissions.`;
    }

    throw new Error(msg);
  }
};