import { createClient } from '@supabase/supabase-js';

// Helper to safely read stream if Vercel didn't parse body
const readStream = async (req) => {
    try {
        const buffers = [];
        for await (const chunk of req) {
            buffers.push(chunk);
        }
        return Buffer.concat(buffers).toString('utf8');
    } catch (e) {
        console.error("Stream read failed:", e);
        return null;
    }
};

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook v2]'; // Bumped version to confirm deploy

  // 1. CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Health Check
  if (req.method === 'GET') return res.status(200).json({ status: 'Webhook Active', time: new Date().toISOString() });
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
      // Allow VITE_ prefix or standard env vars. Trim to remove accidental whitespace.
      const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
      const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

      // DEBUG LOGGING
      // We log the first 5 chars of the key to verify it's loaded without leaking the whole secret
      const keyHint = serviceRoleKey ? `${serviceRoleKey.substring(0, 5)}...` : 'MISSING';
      console.log(`${LOG_PREFIX} Config Check: URL=${!!supabaseUrl}, Key=${keyHint}`);

      if (!supabaseUrl || !serviceRoleKey) {
          console.error(`${LOG_PREFIX} CRITICAL: Missing Supabase Credentials.`);
          return res.status(500).json({ error: 'Server Config Error: Missing credentials. Please redeploy.' });
      }

      // 2. Fail-Safe Body Parsing
      let payload = req.body;
      let rawBody = '';

      // Vercel usually parses JSON automatically. If not, we handle it.
      if (!payload) {
          console.log(`${LOG_PREFIX} req.body is empty, attempting to read stream...`);
          rawBody = await readStream(req);
          if (rawBody) {
              try { payload = JSON.parse(rawBody); } catch (e) {
                  console.error(`${LOG_PREFIX} Raw body parse failed:`, e.message);
              }
          }
      } else if (Buffer.isBuffer(payload)) {
          console.log(`${LOG_PREFIX} req.body is Buffer, parsing...`);
          rawBody = payload.toString('utf8');
          try { payload = JSON.parse(rawBody); } catch (e) {}
      } else if (typeof payload === 'string') {
          console.log(`${LOG_PREFIX} req.body is String, parsing...`);
          try { payload = JSON.parse(payload); } catch (e) {}
      }

      if (!payload || !payload.events) {
          console.log(`${LOG_PREFIX} Invalid payload structure received.`);
          return res.status(200).json({ message: 'No events found in payload' });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      let successCount = 0;
      const logs = [];

      for (const event of payload.events) {
          // Listen for relevant events
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(event.type)) {
             continue;
          }

          logs.push(`Processing ${event.type} (${event.id})`);

          const data = event.data;
          let userId = null;

          // 1. Extract User ID (Tags)
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
          if (!userId) {
              const email = data.email || data.account?.email || data.customer?.email;
              if (email) {
                  logs.push(`Looking up email: ${email}`);
                  
                  // This call REQUIRES the Service Role Key. If it fails, the Key is invalid.
                  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                  
                  if (listError) {
                      console.error(`${LOG_PREFIX} Supabase Auth Admin Error:`, listError);
                      logs.push(`Auth Error: ${listError.message}`);
                      // If 401, the key is definitely wrong
                      if (listError.status === 401) {
                           throw new Error("Invalid Service Role Key (401)");
                      }
                  } else if (users) {
                    const match = users.find(u => u.email?.toLowerCase().trim() === email.toLowerCase().trim());
                    if (match) {
                        userId = match.id;
                        logs.push(`Found user: ${userId}`);
                    }
                  }
              }
          }

          if (!userId) {
              console.warn(`${LOG_PREFIX} Skipped: No User ID found.`);
              logs.push('Skipped: No User ID');
              continue;
          }

          // 3. Determine Plan
          const itemsJSON = JSON.stringify(data.items || data.lineItems || []).toLowerCase();
          
          let tier = 'Creator'; 
          let credits = 500;

          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              credits = 2000;
          } else if (itemsJSON.includes('free')) {
              continue; 
          }

          // 4. Update Database
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          const currentCredits = profile?.credits || 0;
          
          const { error: dbError } = await supabase.from('profiles').upsert({
              id: userId,
              tier: tier,
              credits: currentCredits + credits,
              updated_at: new Date().toISOString()
          });

          if (dbError) {
              console.error(`${LOG_PREFIX} DB Update Error:`, dbError);
              logs.push(`DB Error: ${dbError.message}`);
          } else {
              console.log(`${LOG_PREFIX} SUCCESS: Upgraded ${userId} to ${tier}`);
              logs.push(`Success: Upgraded ${userId}`);
              successCount++;
          }
      }

      return res.status(200).json({ success: true, processed: successCount, logs });

  } catch (err) {
      console.error(`${LOG_PREFIX} CRITICAL ERROR:`, err);
      // Return 200 with error details to FastSpring so it stops retrying if it's a code error
      // (FastSpring retries on 500s)
      return res.status(200).json({ error: true, message: err.message, stack: err.stack });
  }
}