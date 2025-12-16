import { createClient } from '@supabase/supabase-js';

// NOTE: We have REMOVED 'export const config' to enable Vercel's automatic JSON body parsing.
// This prevents runtime crashes associated with manual stream reading in ESM.

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  // 1. Enable CORS & JSON Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 2. Handle Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Health Check (GET) - Fail-safe early return
  if (req.method === 'GET') {
      const hasUrl = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      return res.status(200).json({ 
          status: 'online', 
          message: 'Webhook endpoint is active.',
          config: {
              supabaseUrl: hasUrl,
              serviceKey: hasKey
          }
      });
  }

  // 4. Validate Method
  if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
      console.log(`${LOG_PREFIX} Incoming POST request.`);

      // 5. Validate Server Config
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
          console.error(`${LOG_PREFIX} CRITICAL: Missing Environment Variables.`);
          // Return 500 so you can see it in logs, but strictly this is a server config error
          return res.status(500).json({ error: 'Server Misconfigured: Missing Key or URL' });
      }

      // 6. Access Body (Automatically parsed by Vercel)
      let payload = req.body;

      // Handle edge case where body might be a string (unlikely with Vercel but possible)
      if (typeof payload === 'string') {
          try {
              payload = JSON.parse(payload);
          } catch (e) {
              console.error(`${LOG_PREFIX} Failed to parse string body:`, e);
              return res.status(400).json({ error: 'Invalid JSON body' });
          }
      }

      // If payload is empty/undefined, it usually means Content-Type wasn't application/json
      if (!payload || !payload.events) {
          console.warn(`${LOG_PREFIX} Payload missing 'events'. Body:`, payload);
          return res.status(200).json({ message: 'No events found in payload.' });
      }

      const events = payload.events;
      console.log(`${LOG_PREFIX} Processing ${events.length} event(s).`);

      // 7. Initialize Supabase
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      // 8. Process Events
      let processedCount = 0;

      for (const event of events) {
          // FastSpring events: order.completed or subscription.activated
          if (event.type === 'order.completed' || event.type === 'subscription.activated') {
              const data = event.data;
              if (!data) continue;

              console.log(`${LOG_PREFIX} Processing Event ${event.id} (${event.type})`);

              // --- Resolve User ID ---
              let userId = null;

              // Priority 1: Tags (Passed from frontend)
              const tags = data.tags || (data.order && data.order.tags);
              if (tags) {
                  if (typeof tags === 'object' && tags.userId) {
                      userId = tags.userId;
                  } else if (typeof tags === 'string') {
                      // Handle "userId:abc,other:xyz" format
                      const match = tags.match(/userId:([a-f0-9-]+)/i);
                      if (match) userId = match[1];
                  }
              }

              // Priority 2: Email Lookup (Fallback)
              if (!userId) {
                  const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                  if (email) {
                      const { data: { users } } = await supabase.auth.admin.listUsers();
                      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                      if (user) userId = user.id;
                  }
              }

              if (!userId) {
                  console.error(`${LOG_PREFIX} SKIP: Could not resolve User ID for event ${event.id}`);
                  continue;
              }

              // --- Determine Credits & Tier ---
              // Inspect all items in the order
              const items = data.items || (data.original && data.original.items) || [];
              const allText = JSON.stringify(items).toLowerCase();
              
              let credits = 0;
              let tier = null;

              if (allText.includes('studio') || allText.includes('agency')) {
                  credits = 2000;
                  tier = 'Studio';
              } else if (allText.includes('creator') || allText.includes('pro') || allText.includes('monthly')) {
                  credits = 500;
                  tier = 'Creator';
              } else if (data.live === false) {
                  // Test Mode Fallback
                  credits = 500;
                  tier = 'Creator';
                  console.log(`${LOG_PREFIX} Test Order detected. Defaulting to Creator/500.`);
              }

              if (credits > 0) {
                  console.log(`${LOG_PREFIX} Action: Adding ${credits} credits to User ${userId}`);
                  
                  // Get current credits first
                  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                  const currentCredits = profile?.credits || 0;
                  
                  // Update Profile
                  const { error: updateError } = await supabase.from('profiles').upsert({
                      id: userId,
                      credits: currentCredits + credits,
                      tier: tier
                  });

                  if (updateError) {
                      console.error(`${LOG_PREFIX} DB Error:`, updateError);
                  } else {
                      processedCount++;
                      console.log(`${LOG_PREFIX} Success: User ${userId} updated.`);
                  }
              }
          }
      }

      return res.status(200).json({ success: true, processed: processedCount });

  } catch (err) {
      console.error(`${LOG_PREFIX} CRASH:`, err);
      // Ensure we return JSON so the client doesn't hang, but 500 for error
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}