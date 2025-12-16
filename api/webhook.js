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
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
          console.error("Missing Supabase Service Key");
          return res.status(500).json({ error: 'Server Config Error: Missing SUPABASE_SERVICE_ROLE_KEY' });
      }

      let payload = req.body;
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

          console.log(`${LOG_PREFIX} Processing ${event.type} (${event.id})`);

          const data = event.data;
          let userId = null;

          // 1. Extract User ID (Tags)
          // Note: FastSpring tags structure can vary between order and subscription events
          if (data.tags) {
               if (typeof data.tags === 'object') userId = data.tags.userId;
               else if (typeof data.tags === 'string') {
                   const match = data.tags.match(/userId:([a-f0-9-]+)/i);
                   if (match) userId = match[1];
               }
          }
          // Fallback to Order tags if top-level tags missing
          if (!userId && data.order && data.order.tags) {
               if (typeof data.order.tags === 'object') userId = data.order.tags.userId;
               else if (typeof data.order.tags === 'string') {
                   const match = data.order.tags.match(/userId:([a-f0-9-]+)/i);
                   if (match) userId = match[1];
               }
          }
           // Fallback to Subscription tags
           if (!userId && data.subscription && data.subscription.tags) {
                if (typeof data.subscription.tags === 'object') userId = data.subscription.tags.userId;
                else if (typeof data.subscription.tags === 'string') {
                    const match = data.subscription.tags.match(/userId:([a-f0-9-]+)/i);
                    if (match) userId = match[1];
                }
           }

          // 2. Fallback: Email Match (Crucial for Test Orders where tags might be stripped)
          if (!userId) {
              const email = data.email || data.account?.email || data.customer?.email;
              if (email) {
                  console.log(`${LOG_PREFIX} Looking up user by email: ${email}`);
                  // Fetch users (limit 1000 to be safe)
                  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                  const match = users.find(u => u.email?.toLowerCase().trim() === email.toLowerCase().trim());
                  if (match) userId = match.id;
              }
          }

          if (!userId) {
              console.warn(`${LOG_PREFIX} Skipped: No User ID found for event.`);
              continue;
          }

          // 3. Determine Plan (Permissive Mode)
          // We check the items list. If it's a test order, it might be messy, so we default to Creator.
          const itemsJSON = JSON.stringify(data.items || data.lineItems || []).toLowerCase();
          
          let tier = 'Creator'; // Default to Creator for ANY successful payment if unidentified
          let credits = 500;

          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              credits = 2000;
          } else if (itemsJSON.includes('free')) {
              // Ignore free orders if they explicitly say free (unlikely in this webhook)
              continue; 
          }

          // 4. Update Database
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          const currentCredits = profile?.credits || 0;

          // For monthly charges, we ADD credits. We don't just set them.
          // This logic works for both initial buy and renewal.
          const { error } = await supabase.from('profiles').upsert({
              id: userId,
              tier: tier,
              credits: currentCredits + credits,
              updated_at: new Date().toISOString()
          });

          if (error) {
              console.error(`${LOG_PREFIX} DB Error:`, error);
          } else {
              console.log(`${LOG_PREFIX} Successfully upgraded ${userId} to ${tier} (+${credits} credits)`);
          }
      }

      return res.status(200).json({ success: true });

  } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
  }
}