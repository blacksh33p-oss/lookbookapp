import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Initialize Supabase (Service Role)
// We need the SERVICE_ROLE_KEY to bypass Row Level Security and write credits
// Fallback to ANON key for development/local testing if service key is missing, 
// though this will fail RLS if not handled correctly.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: false, // We need raw body for processing
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    const payload = JSON.parse(rawBody.toString());
    
    console.log('[Webhook] Received payload:', JSON.stringify(payload));
    
    // FastSpring sends an object with an 'events' array
    const events = payload.events || [];

    if (events.length === 0) {
        console.log('[Webhook] No events found in payload.');
        return res.status(200).send("No events");
    }

    for (const event of events) {
        // We care about 'order.completed' or 'subscription.activated'
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            
            // Extract the User ID we passed via URL tags
            // FastSpring returns tags as a key-value object in data.tags, 
            // BUT sometimes as a string if configured via Popup Storefront URL parameters incorrectly.
            let userId = null;

            if (data.tags) {
                if (typeof data.tags === 'object' && data.tags.userId) {
                    userId = data.tags.userId;
                } else if (typeof data.tags === 'string') {
                     // Try to parse string like "userId:123,email:abc"
                     console.log('[Webhook] Tags received as string, parsing:', data.tags);
                     const parts = data.tags.split(',');
                     for (const part of parts) {
                         const [key, value] = part.split(':');
                         if (key && key.trim() === 'userId') {
                             userId = value.trim();
                             break;
                         }
                     }
                }
            }
            
            if (!userId) {
                console.error('[Webhook] Skipped: No userId tag found in order.', data.tags);
                continue;
            }

            // Determine Plan & Credits based on Product Path/Name
            const items = data.items || [];
            let newCredits = 0;
            let newTier = 'Free';
            let foundPlan = false;

            for (const item of items) {
                const productPath = (item.product || '').toLowerCase();
                const productName = (item.display || '').toLowerCase();
                
                console.log(`[Webhook] Processing item: ${productName} (${productPath})`);

                // Match your FastSpring Product Paths or Names here
                if (productPath.includes('creator') || productName.includes('creator')) {
                    newCredits += 500;
                    newTier = 'Creator';
                    foundPlan = true;
                } else if (productPath.includes('studio') || productName.includes('studio')) {
                    newCredits += 2000;
                    newTier = 'Studio';
                    foundPlan = true;
                }
            }

            if (foundPlan) {
                // 3. Update Supabase
                const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', userId)
                    .single();
                
                if (fetchError) {
                    console.error('[Webhook] Failed to fetch user profile:', fetchError);
                    continue;
                }
                
                const currentCredits = profile?.credits || 0;
                
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ 
                        credits: currentCredits + newCredits,
                        tier: newTier
                    })
                    .eq('id', userId);

                if (updateError) {
                    console.error(`[Webhook] Supabase Update Error for user ${userId}:`, updateError);
                } else {
                    console.log(`[Webhook] Success! Credited user ${userId} with ${newCredits} credits. New Tier: ${newTier}`);
                }
            } else {
                console.warn('[Webhook] No matching plan found in order items.');
            }
        }
    }

    // Always return 200 to FastSpring to confirm receipt
    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error(`[Webhook] Fatal Error: ${err.message}`);
    res.status(500).send(`Webhook Error: ${err.message}`);
  }
}