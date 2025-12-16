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

            // 1. Attempt to find userId in tags (Best Practice)
            const tagsSource = data.tags || (data.order && data.order.tags);

            if (tagsSource) {
                if (typeof tagsSource === 'object' && tagsSource.userId) {
                    userId = tagsSource.userId;
                } else if (typeof tagsSource === 'string') {
                     const parts = tagsSource.split(',');
                     for (const part of parts) {
                         const [key, value] = part.split(':');
                         if (key && key.trim() === 'userId') {
                             userId = value.trim().replace(/['"]+/g, '');
                             break;
                         }
                     }
                }
            }

            // 2. Fallback: Lookup by Email (If tags failed)
            if (!userId) {
                const customerEmail = data.email || (data.customer && data.customer.email);
                if (customerEmail && process.env.SUPABASE_SERVICE_ROLE_KEY) {
                    console.log(`[Webhook] Tags missing. Attempting email lookup for: ${customerEmail}`);
                    
                    // Use Admin API to find user by email
                    // Note: 'listUsers' is paginated, but usually returns exact match if filtered?
                    // Supabase Admin doesn't have a direct 'getUserByEmail' in older versions, 
                    // but we can try to assume the profile exists or use admin.listUsers
                    
                    // Actually, simpler fallback: Do we have a profile with this email? Not usually stored in profile.
                    // We must use auth admin.
                    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
                    
                    if (!userError && users) {
                        const matchedUser = users.find(u => u.email && u.email.toLowerCase() === customerEmail.toLowerCase());
                        if (matchedUser) {
                            userId = matchedUser.id;
                            console.log(`[Webhook] Resolved Email ${customerEmail} to UserId ${userId}`);
                        }
                    }
                }
            }
            
            if (!userId) {
                console.error('[Webhook] Skipped: No userId tag found and email lookup failed.', tagsSource);
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
            
            // Fallback for generic test orders
            if (!foundPlan && data.live === false) {
                 console.log('[Webhook] Test Mode Fallback: Defaulting to Creator tier.');
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
                
                // Handle missing profile
                if (fetchError && fetchError.code === 'PGRST116') {
                    await supabase.from('profiles').insert([{ id: userId, tier: 'Free', credits: 0 }]);
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
            }
        }
    }

    res.status(200).send("Processed");
  } catch (err) {
    console.error(`[Webhook] Error: ${err.message}`);
    res.status(500).send(`Error: ${err.message}`);
  }
}