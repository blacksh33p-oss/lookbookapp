import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Check for Service Role Key (Critical for RLS bypass)
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Webhook Warning] SUPABASE_SERVICE_ROLE_KEY is missing. Database updates may fail if Row Level Security is enabled.');
}

// Initialize Supabase (Service Role)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export const config = {
  api: {
    bodyParser: false, 
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    const payload = JSON.parse(rawBody.toString());
    
    console.log('[Webhook] Processing payload ID:', payload.id);
    
    const events = payload.events || [];

    if (events.length === 0) {
        console.log('[Webhook] No events found.');
        return res.status(200).send("No events");
    }

    for (const event of events) {
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            let userId = null;

            // Robust Tag Parsing
            // Tags can be in event.data.tags OR event.data.order.tags depending on webhook type
            const tagsSource = data.tags || (data.order && data.order.tags);

            if (tagsSource) {
                if (typeof tagsSource === 'object' && tagsSource.userId) {
                    userId = tagsSource.userId;
                } else if (typeof tagsSource === 'string') {
                     // Parse string format: "userId:123, email:abc"
                     console.log('[Webhook] Parsing string tags:', tagsSource);
                     const parts = tagsSource.split(',');
                     for (const part of parts) {
                         const [key, value] = part.split(':');
                         if (key && key.trim() === 'userId') {
                             userId = value.trim().replace(/['"]+/g, ''); // Remove potential quotes
                             break;
                         }
                     }
                }
            }
            
            if (!userId) {
                console.error('[Webhook] Skipped: No userId tag found.', tagsSource);
                continue;
            }

            // Determine Credits
            const items = data.items || (data.original && data.original.items) || [];
            let newCredits = 0;
            let newTier = 'Free';
            let foundPlan = false;

            for (const item of items) {
                const productPath = (item.product || '').toLowerCase();
                const productName = (item.display || '').toLowerCase();
                
                // Match Logic
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
            
            // Fallback for generic test orders if no product name match
            if (!foundPlan && data.live === false) {
                 console.log('[Webhook] Test Mode Fallback: Defaulting to Creator tier for test order.');
                 newCredits += 500;
                 newTier = 'Creator';
                 foundPlan = true;
            }

            if (foundPlan) {
                // Fetch current credits
                const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', userId)
                    .single();
                
                if (fetchError) {
                    console.error('[Webhook] Profile fetch failed:', fetchError);
                    // Try creating profile if missing
                    if (fetchError.code === 'PGRST116') {
                        await supabase.from('profiles').insert([{ id: userId, tier: 'Free', credits: 0 }]);
                    }
                }
                
                const currentCredits = profile?.credits || 0;
                
                // Update DB
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({ 
                        credits: currentCredits + newCredits,
                        tier: newTier
                    })
                    .eq('id', userId);

                if (updateError) {
                    console.error(`[Webhook] Update Failed for user ${userId}:`, updateError);
                } else {
                    console.log(`[Webhook] Success! User ${userId} updated to ${newTier} with +${newCredits} credits.`);
                }
            } else {
                console.warn('[Webhook] No matching plan found in items:', items);
            }
        }
    }

    res.status(200).send("Processed");
  } catch (err) {
    console.error(`[Webhook] Error: ${err.message}`);
    res.status(500).send(`Error: ${err.message}`);
  }
}