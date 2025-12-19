import { GoogleGenAI } from "@google/genai";

const STYLE_PROMPTS = {
  'Studio': 'High Key Studio Lighting, Clean White Cyclorama, Commercial Look',
  'Urban': 'Urban Editorial, Concrete Textures, Natural City Light, Streetwear Context',
  'Nature': 'Outdoor Natural Environment, Soft Sunlight, Organic Background',
  'Coastal': 'Coastal Golden Hour, Sand and Sky tones, Soft Breeze',
  'Luxury': 'Modern Luxury Interior, Architectural Depth, Expensive Materials',
  'Chromatic': 'Studio Color Gel Lighting, Neon Accent, High Contrast, Chromatic Aberration',
  'Minimalist': 'Minimalist Brutalist Architecture, Sharp Shadows, Clean Lines',
  'Analog Film': 'Analog Film Grain, Kodak Portra 400 aesthetic, Soft focus, Emotional',
  'Newton': 'Helmut Newton Style, High Contrast Black and White, Powerful Stance, Voyeuristic',
  'Lindbergh': 'Peter Lindbergh Style, Raw Realism, Cinematic Black and White, Emotional',
  'Leibovitz': 'Annie Leibovitz Style, Dramatic Painterly Lighting, Environmental Portrait',
  'Avedon': 'Richard Avedon Style, Minimalist White Background, Dynamic Motion',
  'LaChapelle': 'David LaChapelle Style, Hyper-Realistic Pop Surrealism, Vibrant Saturation',
  'Testino': 'Mario Testino Style, Glamorous, Vibrant, High Energy'
};

const EXPRESSION_PROMPTS = {
  'Neutral': 'Neutral Expression, High Fashion Pout, Detached',
  'Confident': 'Confident Gaze, Strong Eye Contact, Powerful',
  'Fierce': 'Fierce Intensity, Editorial Edge, Sharp',
  'Candid': 'Laughing, Candid Moment, Genuine Smile, Relaxed',
  'Ethereal': 'Ethereal, Soft Gaze, Dreamy, Serene'
};

const extractBase64 = (dataUrl) => dataUrl.split(',')[1] || dataUrl;
const getMimeType = (dataUrl) => {
  const match = dataUrl.match(/^data:(.*);base64,/);
  return match ? match[1] : 'image/jpeg';
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const options = req.body;
    if (!process.env.API_KEY) {
      throw new Error("Server configuration error: Missing API Key.");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const heightStr = options.height ? `Model Height: ${options.height} ${options.measurementUnit}` : 'Height: Standard Model Height';
    const bodyTypeStr = `Body Type: ${options.bodyType}`;

    const outfitParts = [];
    const imageParts = [];

    const processSlot = (role, item) => {
      const hasImages = item.images && item.images.length > 0;
      if (!item.garmentType && !hasImages && !item.description) return;
      let description = `- ${role.toUpperCase()}: ${item.garmentType || role}`;
      if (item.description) description += `. Details: ${item.description}`;
      if (hasImages) {
        item.images.forEach((img) => {
          imageParts.push({
            inlineData: { mimeType: getMimeType(img), data: extractBase64(img) }
          });
        });
      }
      outfitParts.push(description);
    };

    processSlot('Top', options.outfit.top);
    processSlot('Bottoms', options.outfit.bottom);
    processSlot('Shoes', options.outfit.shoes);
    processSlot('Accessories', options.outfit.accessories);

    if (options.referenceModelImage) {
      imageParts.push({
        inlineData: { 
          mimeType: getMimeType(options.referenceModelImage), 
          data: extractBase64(options.referenceModelImage) 
        }
      });
    }

    const richStylePrompt = STYLE_PROMPTS[options.style] || options.style;
    const richExpressionPrompt = EXPRESSION_PROMPTS[options.facialExpression] || options.facialExpression;
    const sceneryContext = options.sceneDetails ? `SCENERY & ENVIRONMENT: ${options.sceneDetails}` : '';

    const layoutInstruction = options.layout.includes('Diptych') 
      ? `CRITICAL LAYOUT: Produce a professional diptych editorial split. Left: full-body action. Right: material fabric close-up.`
      : '';

    const promptText = `
      Professional high-fashion lookbook photograph.
      ${options.isModelLocked ? 'IDENTITY: Match the facial structure from reference EXACTLY.' : ''}
      ${layoutInstruction}
      
      ART DIRECTION: ${richStylePrompt}. ${sceneryContext}
      MODEL IDENTITY: ${options.sex}, ${options.age}, ${options.ethnicity}. Hair: ${options.hairColor}, ${options.hairStyle}. Expression: ${richExpressionPrompt}. Stats: ${heightStr}, ${bodyTypeStr}.
      WARDROBE:
      ${outfitParts.join('\n')}
      POSE & STAGING: ${options.pose || 'Standing naturally'}
    `;

    const modelName = options.modelVersion.includes('Pro') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const config = {
      imageConfig: {
        aspectRatio: options.aspectRatio,
      },
      seed: options.seed
    };

    if (modelName === 'gemini-3-pro-image-preview') {
      config.imageConfig.imageSize = options.enable4K ? "4K" : "2K";
      config.tools = [{ google_search: {} }];
    }

    const result = await ai.models.generateContent({
      model: modelName,
      contents: { 
        parts: [{ text: promptText }, ...imageParts] 
      },
      config
    });

    if (result.candidates?.[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          return res.status(200).json({ image: `data:image/png;base64,${part.inlineData.data}` });
        }
      }
    }
    
    throw new Error("Generation completed but no image was returned. Check safety filters.");

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message || "Internal server error during generation" });
  }
}
