import { GoogleGenAI } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

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

const getInferredDimensions = (aspectRatio, isPro, is4K) => {
  const base = is4K ? 4096 : (isPro ? 2048 : 1024);
  switch (aspectRatio) {
    case '3:4': return { width: Math.round(base * 0.75), height: base };
    case '4:3': return { width: base, height: Math.round(base * 0.75) };
    case '9:16': return { width: Math.round(base * 0.5625), height: base };
    case '16:9': return { width: base, height: Math.round(base * 0.5625) };
    default: return { width: base, height: base }; // 1:1
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const options = req.body;
    
    // --- AUTH & RATE LIMITING ---
    const isPro = options.modelVersion.includes('Pro');
    const authUserId = req.headers['x-user-id'];
    
    // Debug variables to return in response
    let debugIp = null;
    let debugUsageCount = null;

    // 1. Pro Access Check
    // Pro models strictly require a User ID (Logged in)
    if (isPro && !authUserId && !process.env.DEV_MODE) {
       return res.status(403).json({ error: "Guest mode is limited to Flash 2.5. Please login to use Pro models." });
    }

    // 2. Guest Rate Limiting (IP Based)
    // We instantiate a specific admin client here to ensure we have write access to guest_usage
    if (!authUserId) {
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Explicitly use Service Role

        // Strict Check for Service Key
        if (!supabaseServiceKey) {
            console.error("CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing. Database writes will fail.");
            throw new Error("Server Misconfiguration: Missing Service Key");
        }

        if (supabaseUrl && supabaseServiceKey) {
            const adminClient = createClient(supabaseUrl, supabaseServiceKey);
            
            // --- IP LOGIC MUST MATCH guest-status.js EXACTLY ---
            let ip = 'unknown';
            if (req.headers && req.headers['x-forwarded-for']) {
                ip = req.headers['x-forwarded-for'];
            } else if (req.socket && req.socket.remoteAddress) {
                ip = req.socket.remoteAddress;
            }
            
            if (Array.isArray(ip)) ip = ip[0];
            if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0];
            ip = (ip || 'unknown').trim();
            
            // Normalize IP for local testing consistency
            if (ip === '::1') ip = '127.0.0.1';
            // ---------------------------------------------------

            debugIp = ip;
            console.log("VERCEL_DEBUG: IP:", ip, " | Action: Incrementing Usage");

            // Check tracking table
            try {
                const { data: usageRecord, error: fetchError } = await adminClient
                    .from('guest_usage')
                    .select('*')
                    .eq('ip_address', ip)
                    .maybeSingle();

                if (fetchError) {
                    console.error("Guest DB Fetch Error:", fetchError);
                }

                const now = new Date();
                const RESET_HOURS = 24;
                let shouldBlock = false;
                let newCount = 0;

                if (usageRecord) {
                    const lastUpdate = new Date(usageRecord.last_updated);
                    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

                    if (hoursSinceUpdate > RESET_HOURS) {
                        // Reset period passed
                        newCount = 1;
                        console.log("VERCEL_DEBUG: Resetting guest usage for IP:", ip);
                        const { error: resetError } = await adminClient
                            .from('guest_usage')
                            .update({ usage_count: 1, last_updated: now.toISOString() })
                            .eq('ip_address', ip);
                            
                        if (resetError) console.error("Guest DB Reset Error:", resetError);
                    } else {
                        // Within period
                        if (usageRecord.usage_count >= 3) {
                            shouldBlock = true;
                        } else {
                            newCount = usageRecord.usage_count + 1;
                            console.log("VERCEL_DEBUG: Incrementing guest usage to", newCount, "for IP:", ip);
                            const { error: updateError } = await adminClient
                                .from('guest_usage')
                                .update({ usage_count: newCount, last_updated: now.toISOString() })
                                .eq('ip_address', ip);

                            if (updateError) console.error("Guest DB Increment Error:", updateError);
                        }
                    }
                } else {
                    // New record
                    newCount = 1;
                    console.log("VERCEL_DEBUG: Creating new guest record for IP:", ip);
                    const { error: insertError } = await adminClient
                        .from('guest_usage')
                        .insert([{ ip_address: ip, usage_count: 1, last_updated: now.toISOString() }]);
                    
                    if (insertError) console.error("Guest DB Insert Error:", insertError);
                }

                debugUsageCount = shouldBlock ? 3 : newCount;

                if (shouldBlock) {
                    console.log("VERCEL_DEBUG: Guest blocked due to rate limit:", ip);
                    return res.status(429).json({ error: "Daily guest limit reached. Please sign up for more credits.", debug_ip: ip });
                }
            } catch (dbEx) {
                console.error("Guest DB Operation Exception:", dbEx);
                // We do not fail the request here to allow generation to proceed if DB is down, 
                // but usually we want to know.
            }
        }
    }
    // -----------------------------

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
    const customFeaturesContext = options.modelFeatures ? `UNIQUE FEATURES: ${options.modelFeatures}` : '';

    const layoutInstruction = options.layout.includes('Diptych') 
      ? `CRITICAL LAYOUT: Produce a professional diptych editorial split. Left: full-body action. Right: material fabric close-up.`
      : '';

    const promptText = `
      Professional high-fashion lookbook photograph.
      ${options.isModelLocked ? 'IDENTITY: Match the facial structure from reference EXACTLY.' : ''}
      ${layoutInstruction}
      
      ART DIRECTION: ${richStylePrompt}. ${sceneryContext}
      MODEL IDENTITY: ${options.sex}, ${options.age}, ${options.ethnicity}. Hair: ${options.hairColor}, ${options.hairStyle}. ${customFeaturesContext} Expression: ${richExpressionPrompt}. Stats: ${heightStr}, ${bodyTypeStr}.
      WARDROBE:
      ${outfitParts.join('\n')}
      POSE & STAGING: ${options.pose || 'Standing naturally'}
    `;

    const modelName = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
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
          const dims = getInferredDimensions(options.aspectRatio, isPro, options.enable4K);
          return res.status(200).json({ 
            image: `data:image/png;base64,${part.inlineData.data}`,
            width: dims.width,
            height: dims.height,
            debug_ip: debugIp,
            debug_usage_count: debugUsageCount
          });
        }
      }
    }
    
    throw new Error("Generation completed but no image was returned. Check safety filters.");

  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: err.message || "Internal server error during generation" });
  }
}