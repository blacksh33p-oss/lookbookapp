import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body buffer from stream (replaces 'micro' dependency)
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  // --- HEALTH CHECK (GET Request) ---
  // Visit https://your-domain.com/api/webhook to check configuration
  if (req.method === 'GET') {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const hasServiceKey = !!serviceKey;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      
      // Prevent caching of health check
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      
      return res.status(200).json({ 
          status: 'online', 
          timestamp: new Date().toISOString(),
          configuration: {
              hasSupabaseUrl: !!supabaseUrl,
              hasServiceKey: hasServiceKey,
              serviceKeyLength: hasServiceKey ? serviceKey.length : 0
          },
          message: hasServiceKey 
            ? "Webhook is configured correctly. Waiting for POST requests." 
            : "CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in Vercel Environment Variables."
      });
  }

  // --- WEBHOOK HANDLER (POST Request) ---
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).send('Method Not Allowed');
  }

  console.log(`${LOG_PREFIX} Received POST request.`);

  // 1. Initialize Admin Supabase Client
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
      console.error(`${LOG_PREFIX} FATAL: SUPABASE_SERVICE_ROLE_KEY is missing.`);
      return res.status(500).json({ error: 'Server Configuration Error: Missing Service Role Key' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 2. Parse Payload (Native Buffer Read)
    const rawBody = await getRawBody(req);
    const bodyString = rawBody.toString('utf8');
    
    if (!bodyString) {
        console.warn(`${LOG_PREFIX} Empty body received.`);
        return res.status(400).send("Empty body");
    }

    let payload;
    try {
        payload = JSON.parse(bodyString);
    } catch (e) {
        console.error(`${LOG_PREFIX} Failed to parse JSON body:`, e);
        return res.status(400).send("Invalid JSON");
    }

    const events = payload.events || [];
    if (!events.length) {
        console.log(`${LOG_PREFIX} No events in payload.`);
        return res.status(200).send("No events");
    }

    console.log(`${LOG_PREFIX} Processing ${events.length} event(s).`);

    for (const event of events) {
        // We listen for order.completed (one-time) and subscription.activated (subs)
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            if (!data) continue;

            console.log(`${LOG_PREFIX} Processing Event ID: ${event.id}, Type: ${event.type}`);

            // --- RESOLVE USER ID ---
            let userId = null;

            // 1. Check Tags (Standard FastSpring)
            // Tags might be in data.tags or data.order.tags
            const tags = data.tags || (data.order && data.order.tags);
            
            if (tags) {
                if (typeof tags === 'object' && tags.userId) {
                    userId = tags.userId;
                    console.log(`${LOG_PREFIX} Found userId in tags object: ${userId}`);
                } else if (typeof tags === 'string') {
                    // FastSpring sometimes sends tags as a string: "userId:xxx, other:yyy"
                    const match = tags.match(/userId:([a-f0-9-]+)/i);
                    if (match) {
                        userId = match[1];
                        console.log(`${LOG_PREFIX} Found userId in tags string: ${userId}`);
                    }
                }
            }

            // 2. Fallback: Check Email
            if (!userId) {
                const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                if (email) {
                    console.log(`${LOG_PREFIX} Tags missing/empty. Looking up user by email: ${email}`);
                    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
                    
                    if (!listError && users) {
                        const user = users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
                        if (user) {
                            userId = user.id;
                            console.log(`${LOG_PREFIX} Email resolved to userId: ${userId}`);
                        }
                    }
                }
            }

            if (!userId) {
                console.error(`${LOG_PREFIX} FAILED: Could not resolve User ID for order ${event.id}. Skipping.`);
                continue;
            }

            // --- RESOLVE PRODUCT & CREDITS ---
            const items = data.items || (data.original && data.original.items) || [];
            let credits = 0;
            let tier = null;

            // Loose string matching on the entire items array to catch product name variations
            const allProductText = JSON.stringify(items).toLowerCase();
            console.log(`${LOG_PREFIX} Product Data: ${allProductText}`);
            
            if (allProductText.includes('studio') || allProductText.includes('agency')) {
                credits = 2000;
                tier = 'Studio';
            } else if (allProductText.includes('creator') || allProductText.includes('pro') || allProductText.includes('monthly')) {
                credits = 500;
                tier = 'Creator';
            } else {
                 // Fallback for Test Orders (FastSpring Test Store)
                 // Sometimes test orders don't have the exact product name
                 if (data.live === false) {
                     credits = 500;
                     tier = 'Creator';
                     console.log(`${LOG_PREFIX} Test Order detected (Live=false). Defaulting to Creator/500.`);
                 }
            }

            if (credits > 0) {
                console.log(`${LOG_PREFIX} Action: Crediting User ${userId} with +${credits} Credits (Tier: ${tier})`);
                
                // 1. Get current credits
                const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', userId)
                    .single();
                
                if (fetchError && fetchError.code !== 'PGRST116') {
                    console.error(`${LOG_PREFIX} Error fetching profile:`, fetchError);
                }

                const currentCredits = profile?.credits || 0;
                const newTotal = currentCredits + credits;

                // 2. Upsert profile (Handles case where profile doesn't exist yet)
                const { error: updateError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: userId,
                        credits: newTotal,
                        tier: tier // This will update tier to the latest purchased one
                    });

                if (updateError) {
                    console.error(`${LOG_PREFIX} DB Update Error:`, updateError);
                } else {
                    console.log(`${LOG_PREFIX} SUCCESS: User ${userId} now has ${newTotal} credits.`);
                }
            } else {
                console.log(`${LOG_PREFIX} No matching product found in order. Zero credits added.`);
            }
        }
    }

    res.status(200).send("Webhook Processed");

  } catch (err) {
    console.error(`${LOG_PREFIX} UNHANDLED CRASH:`, err);
    res.status(500).json({ error: err.message });
  }
}