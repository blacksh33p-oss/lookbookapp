import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  // 1. CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Health Check
  if (req.method === 'GET') return res.status(200).json({ status: 'Webhook Active' });
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
      // Allow VITE_ prefix or standard env vars
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
          console.error(`${LOG_PREFIX} Missing Supabase Service Key`);
          return res.status(500).json({ error: 'Server Config Error: Missing SUPABASE_SERVICE_ROLE_KEY' });
      }

      let payload = req.body;
      // Parse body if it comes as string (standard in some Vercel configurations)
      if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch (e) { return res.status(400).json({ error: 'Invalid JSON' }); }
      }

      if (!payload || !payload.events) return res.status(200).json({ message: 'No events' });

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      for (const event of payload.events) {
          // Listen for Order Completion AND Monthly Charge Completions
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(event.type)) {
             continue;
          }

          console.log(`${LOG_PREFIX} Processing ${event.type} (ID: ${event.id})`);

          const data = event.data;
          let userId = null;

          // 1. Extract User ID (Tags)
          // Strategy: Check top-level tags, then order tags, then subscription tags
          const checkTags = (tagObj) => {
              if (!tagObj) return null;
              if (typeof tagObj === 'object' && tagObj.userId) return tagObj.userId;
              if (typeof tagObj === 'string') {
                  const match = tagObj.match(/userId:([a-f0-9-]+)/i);
                  return match ? match[1] : null;
              }
              return null;
          };

          userId = checkTags(data.tags) || 
                   checkTags(data.order?.tags) || 
                   checkTags(data.subscription?.tags);

          // 2. Fallback: Email Match
          // FastSpring test orders often strip tags, so email lookup is critical.
          if (!userId) {
              const email = data.email || data.account?.email || data.customer?.email;
              if (email) {
                  console.log(`${LOG_PREFIX} Tags missing. Looking up user by email: ${email}`);
                  // Fetch users (limit 1000 to be safe)
                  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                  
                  if (!error && users) {
                    const match = users.find(u => u.email?.toLowerCase().trim() === email.toLowerCase().trim());
                    if (match) {
                        userId = match.id;
                        console.log(`${LOG_PREFIX} Found user via email: ${userId}`);
                    }
                  }
              }
          }

          if (!userId) {
              console.warn(`${LOG_PREFIX} Skipped: No User ID found for event.`);
              continue;
          }

          // 3. Determine Plan (Permissive Mode)
          // Check items for keywords. Default to Creator if unclear.
          const itemsJSON = JSON.stringify(data.items || data.lineItems || []).toLowerCase();
          
          let tier = 'Creator'; 
          let credits = 500;

          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              credits = 2000;
          } else if (itemsJSON.includes('free')) {
              console.log(`${LOG_PREFIX} Ignoring 'free' product order.`);
              continue; 
          }

          // 4. Update Database
          // We fetch current credits first to ADD to them (handling renewals correctly)
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          const currentCredits = profile?.credits || 0;
          
          // Note: If it's a renewal, we add. If it's a new sub, we essentially set (0 + 500).
          // This logic covers both cases safely.
          const { error } = await supabase.from('profiles').upsert({
              id: userId,
              tier: tier,
              credits: currentCredits + credits,
              updated_at: new Date().toISOString()
          });

          if (error) {
              console.error(`${LOG_PREFIX} DB Update Error:`, error);
          } else {
              console.log(`${LOG_PREFIX} SUCCESS: Upgraded ${userId} to ${tier} (+${credits} credits)`);
          }
      }

      return res.status(200).json({ success: true });

  } catch (err) {
      console.error(`${LOG_PREFIX} CRITICAL ERROR:`, err);
      return res.status(500).json({ error: err.message });
  }
}