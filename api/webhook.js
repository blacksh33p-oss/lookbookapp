import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function (Node.js ESM)
// rewritten to use native response methods to avoid 500 crashes from missing helper methods.

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  // 1. Set Headers (CORS & Content-Type)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Helper function to send JSON safely using native Node.js methods
  const sendJSON = (code, data) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };

  try {
    // 2. Handle Preflight
    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    // 3. Health Check (GET)
    // Always return 200 for GET to verify the function is reachable
    if (req.method === 'GET') {
      const hasUrl = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      return sendJSON(200, { 
        status: 'online', 
        timestamp: Date.now(),
        config: { supabaseUrl: hasUrl, serviceKey: hasKey }
      });
    }

    // 4. Validate Method
    if (req.method !== 'POST') {
      return sendJSON(405, { error: 'Method Not Allowed' });
    }

    console.log(`${LOG_PREFIX} Received POST request.`);

    // 5. Validate Environment
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error(`${LOG_PREFIX} CRITICAL: Missing Environment Variables.`);
        return sendJSON(500, { error: 'Server Configuration Error' });
    }

    // 6. Parse Body
    // Vercel usually parses JSON automatically. We handle both object and string cases.
    let payload = req.body;
    
    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload);
        } catch (e) {
            console.error(`${LOG_PREFIX} JSON Parse Error:`, e);
            return sendJSON(400, { error: 'Invalid JSON Body' });
        }
    }

    if (!payload || !payload.events) {
        return sendJSON(200, { message: 'No events to process.' });
    }

    // 7. Initialize Supabase
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const events = payload.events;
    let processedCount = 0;

    // 8. Process Events
    for (const event of events) {
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            if (!data) continue;

            let userId = null;

            // Resolve User ID via Tags
            const tags = data.tags || (data.order && data.order.tags);
            if (tags) {
                if (typeof tags === 'object' && tags.userId) userId = tags.userId;
                else if (typeof tags === 'string') {
                    const match = tags.match(/userId:([a-f0-9-]+)/i);
                    if (match) userId = match[1];
                }
            }

            // Resolve User ID via Email
            if (!userId) {
                const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                if (email) {
                    const { data: { users } } = await supabase.auth.admin.listUsers();
                    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                    if (user) userId = user.id;
                }
            }

            if (userId) {
                // Determine Credits/Tier
                const items = data.items || (data.original && data.original.items) || [];
                const allText = JSON.stringify(items).toLowerCase();
                let credits = 0;
                let tier = null;

                if (allText.includes('studio') || allText.includes('agency')) {
                    credits = 2000; tier = 'Studio';
                } else if (allText.includes('creator') || allText.includes('pro')) {
                    credits = 500; tier = 'Creator';
                } else if (data.live === false) {
                    credits = 500; tier = 'Creator'; // Test orders
                }

                if (credits > 0) {
                    const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                    const current = profile?.credits || 0;
                    
                    await supabase.from('profiles').upsert({
                        id: userId,
                        credits: current + credits,
                        tier: tier
                    });
                    processedCount++;
                    console.log(`${LOG_PREFIX} User ${userId} credited +${credits}.`);
                }
            }
        }
    }

    return sendJSON(200, { success: true, processed: processedCount });

  } catch (error) {
    console.error(`${LOG_PREFIX} CRASH:`, error);
    // Safety check to ensure we haven't already sent a response
    if (!res.writableEnded) {
        return sendJSON(500, { error: 'Internal Server Error', details: error.message });
    }
  }
}