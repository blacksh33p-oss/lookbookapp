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

  // 3. Health Check (GET)
  if (req.method === 'GET') {
      const hasUrl = !!(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      return res.status(200).json({ 
          status: 'online', 
          message: 'Webhook endpoint is active.',
          config: {
              supabaseUrl: hasUrl,
              serviceRoleKeyConfigured: hasKey // Don't leak the actual key
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
          console.error(`${LOG_PREFIX} Ensure SUPABASE_SERVICE_ROLE_KEY is set in Vercel Environment Variables.`);
          return res.status(500).json({ error: 'Server Misconfigured: Missing Key or URL' });
      }

      // 6. Access Body (Automatically parsed by Vercel)
      let payload = req.body;

      if (typeof payload === 'string') {
          try {
              payload = JSON.parse(payload);
          } catch (e) {
              console.error(`${LOG_PREFIX} Failed to parse string body:`, e);
              return res.status(400).json({ error: 'Invalid JSON body' });
          }
      }

      if (!payload || !payload.events) {
          console.warn(`${LOG_PREFIX} Payload missing 'events'. Body:`, JSON.stringify(payload).substring(0, 200));
          return res.status(200).json({ message: 'No events found in payload.' });
      }

      const events = payload.events;
      console.log(`${LOG_PREFIX} Processing ${events.length} event(s).`);

      // 7. Initialize Supabase Admin Client
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      let processedCount = 0;

      for (const event of events) {
          // FastSpring events: order.completed or subscription.activated
          if (event.type === 'order.completed' || event.type === 'subscription.activated') {
              const data = event.data;
              if (!data) continue;

              console.log(`${LOG_PREFIX} Processing Event ${event.id} (${event.type})`);

              // --- ROBUST USER ID EXTRACTION ---
              let userId = null;

              // 1. Try Top-Level Tags
              if (data.tags) {
                  if (typeof data.tags === 'object' && data.tags.userId) userId = data.tags.userId;
                  if (typeof data.tags === 'string') {
                      const match = data.tags.match(/userId:([a-f0-9-]+)/i);
                      if (match) userId = match[1];
                  }
              }

              // 2. Try Order-Level Tags
              if (!userId && data.order && data.order.tags) {
                  if (typeof data.order.tags === 'object' && data.order.tags.userId) userId = data.order.tags.userId;
                  if (typeof data.order.tags === 'string') {
                       const match = data.order.tags.match(/userId:([a-f0-9-]+)/i);
                       if (match) userId = match[1];
                  }
              }

              // 3. Fallback: Email Lookup (Admin API)
              // NOTE: This is fallback only. It iterates through recent users.
              if (!userId) {
                  const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                  console.warn(`${LOG_PREFIX} Tags missing userId. Attempting email lookup for: ${email}`);
                  
                  if (email) {
                      // Note: listUsers defaults to 50. This might miss older users, but works for testing.
                      const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
                      if (users) {
                          const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                          if (user) {
                              userId = user.id;
                              console.log(`${LOG_PREFIX} Resolved UserId via email: ${userId}`);
                          }
                      }
                  }
              }

              if (!userId) {
                  console.error(`${LOG_PREFIX} SKIP: Could not resolve User ID for event ${event.id}. Payload dump:`, JSON.stringify(data).substring(0, 500));
                  continue;
              }

              // --- DETERMINE CREDITS & TIER ---
              const items = data.items || (data.original && data.original.items) || [];
              const allText = JSON.stringify(items).toLowerCase();
              
              let credits = 0;
              let tier = null;

              // Check Product Names
              if (allText.includes('studio') || allText.includes('agency')) {
                  credits = 2000;
                  tier = 'Studio';
              } else if (allText.includes('creator') || allText.includes('pro') || allText.includes('monthly')) {
                  credits = 500;
                  tier = 'Creator';
              } 
              
              // TEST MODE FALLBACK
              // If we couldn't match product name, BUT it is a test order (or explicitly live=false),
              // we default to Creator so the test user gets credits.
              if (tier === null) {
                  const isTest = data.live === false || (data.order && data.order.live === false);
                  if (isTest) {
                      console.log(`${LOG_PREFIX} Test Order detected with unknown product. Defaulting to Creator/500.`);
                      credits = 500;
                      tier = 'Creator';
                  }
              }

              if (tier && credits > 0) {
                  console.log(`${LOG_PREFIX} Action: Upgrading User ${userId} to ${tier} with +${credits} credits`);
                  
                  // Get current credits first to append
                  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                  const currentCredits = profile?.credits || 0;
                  
                  // Upsert Profile
                  const { error: updateError } = await supabase.from('profiles').upsert({
                      id: userId,
                      credits: currentCredits + credits,
                      tier: tier,
                      // We don't overwrite username here to preserve user choice
                  });

                  if (updateError) {
                      console.error(`${LOG_PREFIX} DB Error:`, updateError);
                  } else {
                      processedCount++;
                      console.log(`${LOG_PREFIX} Success: User ${userId} updated.`);
                  }
              } else {
                  console.warn(`${LOG_PREFIX} Skipped: Could not determine Tier/Credits from product data.`);
              }
          }
      }

      return res.status(200).json({ success: true, processed: processedCount });

  } catch (err) {
      console.error(`${LOG_PREFIX} CRASH:`, err);
      return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}