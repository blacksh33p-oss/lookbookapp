import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  // --- HEALTH CHECK (GET Request) ---
  // Visit https://your-domain.com/api/webhook to check configuration
  if (req.method === 'GET') {
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const hasUrl = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      
      return res.status(200).json({ 
          status: 'online', 
          configuration: {
              hasServiceKey,
              hasSupabaseUrl: hasUrl,
              serviceKeyLength: hasServiceKey ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0
          },
          message: hasServiceKey 
            ? "Webhook is configured correctly. Waiting for POST requests." 
            : "CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in Vercel Environment Variables."
      });
  }

  // --- WEBHOOK HANDLER (POST Request) ---
  if (req.method !== 'POST') {
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
    // 2. Parse Payload
    const rawBody = await buffer(req);
    const payload = JSON.parse(rawBody.toString());
    const events = payload.events || [];

    if (!events.length) return res.status(200).send("No events");

    console.log(`${LOG_PREFIX} Processing ${events.length} event(s).`);

    for (const event of events) {
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            if (!data) continue;

            // --- RESOLVE USER ID ---
            let userId = null;

            // 1. Check Tags (Standard)
            const tags = data.tags || (data.order && data.order.tags);
            if (tags && typeof tags === 'object' && tags.userId) userId = tags.userId;
            
            // 2. Check Tags (String format)
            if (!userId && typeof tags === 'string') {
                const match = tags.match(/userId:([a-f0-9-]+)/i); // Match UUID-like strings
                if (match) userId = match[1];
            }

            // 3. Fallback: Check Email
            if (!userId) {
                const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                if (email) {
                    console.log(`${LOG_PREFIX} Looking up user by email: ${email}`);
                    const { data: { users } } = await supabase.auth.admin.listUsers();
                    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                    if (user) userId = user.id;
                }
            }

            if (!userId) {
                console.error(`${LOG_PREFIX} FAILED: Could not find User ID for order ${event.id}`);
                continue;
            }

            // --- RESOLVE PRODUCT ---
            const items = data.items || (data.original && data.original.items) || [];
            let credits = 0;
            let tier = null;

            // Loose string matching to catch any product naming variation
            const allProductText = JSON.stringify(items).toLowerCase();
            
            if (allProductText.includes('studio') || allProductText.includes('agency')) {
                credits = 2000;
                tier = 'Studio';
            } else if (allProductText.includes('creator') || allProductText.includes('pro') || allProductText.includes('monthly')) {
                credits = 500;
                tier = 'Creator';
            } else {
                 // Fallback for testing: If valid order but unknown product, verify via 'live' flag
                 if (data.live === false) {
                     credits = 500;
                     tier = 'Creator';
                     console.log(`${LOG_PREFIX} Test Order detected. Defaulting to Creator.`);
                 }
            }

            if (credits > 0) {
                // --- UPDATE DATABASE ---
                console.log(`${LOG_PREFIX} Crediting User ${userId}: +${credits} Credits, Tier: ${tier}`);
                
                // Fetch current first
                const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                const currentCredits = profile?.credits || 0;
                
                // Update
                const { error } = await supabase.from('profiles').upsert({
                    id: userId,
                    credits: currentCredits + credits,
                    tier: tier
                });

                if (error) console.error(`${LOG_PREFIX} DB Error:`, error);
                else console.log(`${LOG_PREFIX} Success.`);
            }
        }
    }

    res.status(200).send("Processed");

  } catch (err) {
    console.error(`${LOG_PREFIX} Error:`, err);
    res.status(500).json({ error: err.message });
  }
}