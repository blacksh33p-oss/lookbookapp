import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Disable body parsing so 'micro' can handle the raw buffer (required for some signature verifications, though we skip that here for simplicity)
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  // 1. Method Check
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  console.log(`${LOG_PREFIX} Incoming request...`);

  // 2. Environment Check (Critical for Credits)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
      console.error(`${LOG_PREFIX} CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing. Cannot update user credits.`);
      return res.status(500).json({ error: 'Server misconfiguration: Missing Service Role Key' });
  }

  // 3. Initialize Admin Supabase Client
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    serviceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
  );

  try {
    // 4. Parse Body
    const rawBody = await buffer(req);
    const payload = JSON.parse(rawBody.toString());
    const events = payload.events || [];

    if (events.length === 0) {
        console.log(`${LOG_PREFIX} Payload contained no events. Ignoring.`);
        return res.status(200).send("No events found");
    }

    console.log(`${LOG_PREFIX} Processing ${events.length} event(s). IDs: ${events.map(e => e.id).join(', ')}`);

    for (const event of events) {
        // We handle 'order.completed' (one-time or first sub) and 'subscription.activated'
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            if (!data) continue;

            console.log(`${LOG_PREFIX} Handling event type: ${event.type}`);

            // --- STEP A: RESOLVE USER ID ---
            let userId = null;

            // Strategy 1: Check Tags Object (Standard FastSpring)
            // Tags can be in data.tags OR data.order.tags
            const tags = data.tags || (data.order && data.order.tags);

            if (tags) {
                if (typeof tags === 'object' && tags.userId) {
                    userId = tags.userId;
                    console.log(`${LOG_PREFIX} Found userId in tags object: ${userId}`);
                } else if (typeof tags === 'string') {
                    // Handle "userId:123, key:value" format
                    const match = tags.match(/userId:([^,]+)/);
                    if (match && match[1]) {
                        userId = match[1].trim();
                        console.log(`${LOG_PREFIX} Found userId in tags string: ${userId}`);
                    }
                }
            }

            // Strategy 2: Fallback to Email Lookup
            // If tags failed, we look up the user by email in Supabase
            if (!userId) {
                const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                
                if (email) {
                    console.log(`${LOG_PREFIX} Tags missing. Attempting lookup for email: ${email}`);
                    const { data: { users }, error } = await supabase.auth.admin.listUsers();
                    
                    if (!error && users) {
                        const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                        if (user) {
                            userId = user.id;
                            console.log(`${LOG_PREFIX} Resolved email to userId: ${userId}`);
                        }
                    }
                }
            }

            if (!userId) {
                console.warn(`${LOG_PREFIX} SKIPPING: Could not resolve a User ID from tags or email.`);
                continue; // Skip this event
            }

            // --- STEP B: DETERMINE CREDITS & TIER ---
            // Look at 'items' array. Handles both direct items and 'original' items structure
            const items = data.items || (data.original && data.original.items) || [];
            
            let creditsToAdd = 0;
            let targetTier = null; // Don't change tier unless we match a product

            console.log(`${LOG_PREFIX} Analyzing ${items.length} item(s) for user ${userId}...`);

            for (const item of items) {
                // Combine product path and display name for loose matching
                // e.g. path: "fashion-creator-monthly", display: "Creator Plan"
                const productIdentifier = `${item.product || ''} ${item.display || ''} ${item.sku || ''}`.toLowerCase();
                
                console.log(`${LOG_PREFIX} Checking item: ${productIdentifier}`);

                if (productIdentifier.includes('creator')) {
                    creditsToAdd += 500;
                    targetTier = 'Creator';
                } else if (productIdentifier.includes('studio')) {
                    creditsToAdd += 2000;
                    targetTier = 'Studio';
                }
            }

            // Fallback for test transactions if no product matched but it's a valid order
            if (targetTier === null && (process.env.NODE_ENV === 'development' || data.live === false)) {
                console.log(`${LOG_PREFIX} Test Mode: No product matched, defaulting to Creator (500 credits).`);
                creditsToAdd = 500;
                targetTier = 'Creator';
            }

            if (creditsToAdd === 0) {
                console.log(`${LOG_PREFIX} No relevant products found in this order. No credits added.`);
                continue;
            }

            // --- STEP C: EXECUTE DATABASE UPDATE ---
            // 1. Get current profile
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('credits, tier')
                .eq('id', userId)
                .single();
            
            // 2. Create profile if missing (Self-healing)
            if (fetchError && fetchError.code === 'PGRST116') {
                console.log(`${LOG_PREFIX} Profile missing. Creating new profile for ${userId}`);
                await supabase.from('profiles').insert([{ id: userId, tier: 'Free', credits: 0 }]);
            }

            const currentCredits = profile?.credits || 0;
            const newCreditTotal = currentCredits + creditsToAdd;
            const newTier = targetTier || profile?.tier || 'Free';

            console.log(`${LOG_PREFIX} Updating User ${userId}: Credits ${currentCredits} -> ${newCreditTotal}, Tier -> ${newTier}`);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                    credits: newCreditTotal,
                    tier: newTier
                })
                .eq('id', userId);

            if (updateError) {
                console.error(`${LOG_PREFIX} DB UPDATE FAILED:`, updateError);
                return res.status(500).send("Database update failed");
            } else {
                console.log(`${LOG_PREFIX} DB Update Successful.`);
            }
        }
    }

    res.status(200).send("Webhook Processed Successfully");

  } catch (err) {
    console.error(`${LOG_PREFIX} UNHANDLED ERROR:`, err);
    res.status(500).json({ error: err.message });
  }
}