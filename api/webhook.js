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
  const LOG_PREFIX = '[FastSpring Webhook v3]'; 
  const trace = []; // We will return this trace to FastSpring for debugging

  const log = (msg) => {
      console.log(`${LOG_PREFIX} ${msg}`);
      trace.push(msg);
  };

  // 1. CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Health Check
  if (req.method === 'GET') return res.status(200).json({ status: 'Webhook Active', version: 'v3' });
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
      // Allow VITE_ prefix or standard env vars.
      const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
      const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

      log(`Config Check: URL=${!!supabaseUrl}, KeyLength=${serviceRoleKey?.length || 0}`);

      if (!supabaseUrl || !serviceRoleKey) {
          log("CRITICAL: Missing Supabase Credentials.");
          return res.status(500).json({ error: 'Server Config Error', trace });
      }

      // 2. Fail-Safe Body Parsing
      let payload = req.body;
      let rawBody = '';

      if (!payload) {
          log("req.body is empty, reading stream...");
          rawBody = await readStream(req);
          if (rawBody) {
              try { payload = JSON.parse(rawBody); } catch (e) {
                  log(`JSON Parse Error: ${e.message}`);
              }
          }
      } else if (Buffer.isBuffer(payload)) {
          log("req.body is Buffer");
          rawBody = payload.toString('utf8');
          try { payload = JSON.parse(rawBody); } catch (e) {}
      } else if (typeof payload === 'string') {
          log("req.body is String");
          try { payload = JSON.parse(payload); } catch (e) {}
      }

      if (!payload || !payload.events) {
          log("No 'events' array in payload.");
          return res.status(200).json({ message: 'No events found', trace });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      let successCount = 0;

      for (const event of payload.events) {
          const evtType = event.type;
          const evtId = event.id;
          log(`Processing Event: ${evtType} (ID: ${evtId})`);

          // Filter Events
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(evtType)) {
             log(`Skipping irrelevant event type: ${evtType}`);
             continue;
          }

          const data = event.data;
          let userId = null;

          // --- STRATEGY 1: TAGS ---
          // Check deep inside the object structure for tags
          const findTags = (obj) => {
              if (!obj) return null;
              // FastSpring sometimes puts tags in data.tags, or data.order.tags
              return obj.tags || (obj.order ? obj.order.tags : null) || (obj.subscription ? obj.subscription.tags : null);
          };

          const extractUserIdFromTags = (tags) => {
              if (!tags) return null;
              // Case A: Tags is an Object { userId: "..." }
              if (typeof tags === 'object' && tags.userId) return tags.userId;
              // Case B: Tags is a String "userId:..."
              if (typeof tags === 'string') {
                  const match = tags.match(/userId:([a-f0-9-]{36})/i); // UUID regex
                  return match ? match[1] : null;
              }
              return null;
          };

          const tags = findTags(data);
          userId = extractUserIdFromTags(tags);
          
          if (userId) log(`Found UserID in Tags: ${userId}`);

          // --- STRATEGY 2: EMAIL LOOKUP (Fallback) ---
          if (!userId) {
              // FastSpring puts email in different spots depending on event
              const email = data.email || 
                            data.customer?.email || 
                            data.recipient?.email || 
                            data.account?.email || 
                            data.contact?.email;

              if (email) {
                  log(`Tags missing. Searching via Email: ${email}`);
                  
                  // Use Admin API to find user by email
                  // Note: listUsers has a limit. If you have >1000 users, this might miss. 
                  // Ideally use `supabase.rpc` if available, but listUsers is standard.
                  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ 
                      perPage: 1000 
                  });
                  
                  if (listError) {
                      log(`Auth Lookup Error: ${listError.message}`);
                  } else if (users) {
                      const cleanEmail = email.toLowerCase().trim();
                      const match = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
                      if (match) {
                          userId = match.id;
                          log(`Match found via email: ${userId}`);
                      } else {
                          log(`No user found in Supabase with email: ${cleanEmail}`);
                      }
                  }
              } else {
                  log("No email field found in event data.");
              }
          }

          if (!userId) {
              log("FAILED: Could not identify user. Skipping.");
              continue;
          }

          // --- DETERMINE CREDITS ---
          const itemsJSON = JSON.stringify(data.items || data.lineItems || []).toLowerCase();
          log(`Items JSON: ${itemsJSON.substring(0, 100)}...`);

          let tier = 'Creator'; 
          let creditsToAdd = 500;

          // Simple keyword check
          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              creditsToAdd = 2000;
          }
          
          log(`Determined Tier: ${tier}, Credits to Add: ${creditsToAdd}`);

          // --- UPDATE DATABASE ---
          // 1. Get current credits
          const { data: profile, error: fetchError } = await supabase
              .from('profiles')
              .select('credits')
              .eq('id', userId)
              .single();

          if (fetchError && fetchError.code !== 'PGRST116') {
              log(`Profile Fetch Error: ${fetchError.message}`);
          }

          const currentCredits = profile?.credits || 0;
          const newTotal = currentCredits + creditsToAdd;

          log(`Updating Profile: ${userId} | ${currentCredits} -> ${newTotal}`);

          const { error: updateError } = await supabase.from('profiles').upsert({
              id: userId,
              tier: tier,
              credits: newTotal,
              updated_at: new Date().toISOString()
          });

          if (updateError) {
              log(`DB Update FAILED: ${updateError.message}`);
          } else {
              log("DB Update SUCCESS");
              successCount++;
          }
      }

      return res.status(200).json({ success: true, processed: successCount, trace });

  } catch (err) {
      log(`CRITICAL EXCEPTION: ${err.message}`);
      return res.status(200).json({ error: true, message: err.message, trace });
  }
}