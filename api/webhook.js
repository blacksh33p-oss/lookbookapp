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
  const LOG_PREFIX = '[FastSpring Debugger]'; 
  const trace = []; 

  const log = (msg) => {
      console.log(`${LOG_PREFIX} ${msg}`);
      trace.push(msg);
  };

  // 1. CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return res.status(200).json({ status: 'Webhook Active', version: 'v4-debug' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
      // 1. Credentials Check
      const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
      const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();

      if (!supabaseUrl || !serviceRoleKey) {
          log("CRITICAL: Missing Supabase Credentials in Env Vars.");
          return res.status(500).json({ error: 'Server Config Error: Missing credentials', trace });
      }
      
      log(`Credentials present. Key length: ${serviceRoleKey.length}`);

      // 2. Body Parsing
      let payload = req.body;
      if (!payload) {
          log("Reading raw stream...");
          const raw = await readStream(req);
          try { payload = JSON.parse(raw); } catch(e) { log("Failed to parse stream JSON"); }
      } else if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch(e) {}
      } else if (Buffer.isBuffer(payload)) {
          try { payload = JSON.parse(payload.toString()); } catch(e) {}
      }

      if (!payload || !payload.events) {
          log("No events found in payload.");
          return res.status(200).json({ message: 'Invalid payload', trace });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      let processedCount = 0;

      for (const event of payload.events) {
          log(`Event: ${event.type} (ID: ${event.id})`);
          
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(event.type)) {
             log("Skipping event type.");
             continue;
          }

          const data = event.data || {};
          let userId = null;
          let emailFound = null;

          // STEP A: Look for Tags (Primary)
          const tags = data.tags || (data.order && data.order.tags) || (data.subscription && data.subscription.tags);
          if (tags) {
              log(`Tags found: ${JSON.stringify(tags)}`);
              if (typeof tags === 'object' && tags.userId) userId = tags.userId;
              else if (typeof tags === 'string') {
                  const match = tags.match(/userId:([a-f0-9-]{36})/i);
                  if (match) userId = match[1];
              }
          } else {
              log("No tags found in event data.");
          }

          // STEP B: Look for Email (Fallback)
          if (!userId) {
              // Deep Search for Email based on your payload structure
              const candidates = [
                  data.email, // Top level
                  data.customer?.email, // Customer object
                  data.account?.contact?.email, // Account Contact (found in your payload)
                  data.contact?.email, 
                  data.recipient?.email,
                  // Check array of recipients
                  ...(Array.isArray(data.recipients) ? data.recipients.map(r => r.recipient?.email || r.recipient?.account?.contact?.email) : [])
              ].filter(Boolean); // Remove null/undefined

              // Deduplicate
              const uniqueEmails = [...new Set(candidates)];
              log(`Email Candidates found: ${JSON.stringify(uniqueEmails)}`);

              if (uniqueEmails.length > 0) {
                  emailFound = uniqueEmails[0]; // Take the first valid email
                  log(`Attempting lookup for email: ${emailFound}`);

                  // Supabase Admin Lookup
                  const { data: userResult, error: userError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                  
                  if (userError) {
                      log(`Auth Lookup ERROR: ${userError.message}`);
                      if (userError.code === 401) log("CHECK YOUR SERVICE_ROLE_KEY. It seems invalid.");
                  } else {
                      const users = userResult.users || [];
                      log(`Fetched ${users.length} users from Supabase.`);
                      
                      const match = users.find(u => u.email?.toLowerCase().trim() === emailFound.toLowerCase().trim());
                      
                      if (match) {
                          userId = match.id;
                          log(`MATCH FOUND! User ID: ${userId}`);
                      } else {
                          log(`No user found matching email: ${emailFound}`);
                          // Debug: Log first 3 emails in DB to verify we are looking at right DB
                          const sample = users.slice(0, 3).map(u => u.email);
                          log(`Sample DB emails: ${JSON.stringify(sample)}`);
                      }
                  }
              } else {
                  log("CRITICAL: No email found in payload structure.");
              }
          }

          if (!userId) {
              log("SKIPPING: Could not identify user ID.");
              continue;
          }

          // STEP C: Determine Credits
          const itemsJSON = JSON.stringify(data.items || []).toLowerCase();
          let tier = 'Creator';
          let creditsToAdd = 500;
          
          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              creditsToAdd = 2000;
          }
          log(`Plan: ${tier} (+${creditsToAdd} credits)`);

          // STEP D: Update DB
          const { data: currentProfile, error: fetchErr } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          
          if (fetchErr) log(`Profile fetch warning: ${fetchErr.message} (Will attempt upsert)`);
          
          const currentCredits = currentProfile?.credits || 0;
          const newCredits = currentCredits + creditsToAdd;

          const { error: upsertErr } = await supabase.from('profiles').upsert({
              id: userId,
              tier: tier,
              credits: newCredits,
              updated_at: new Date().toISOString()
          });

          if (upsertErr) {
              log(`DB Update FAILED: ${upsertErr.message}`);
          } else {
              log(`DB Update SUCCESS. ${userId} now has ${newCredits} credits.`);
              processedCount++;
          }
      }

      return res.status(200).json({ success: true, processed: processedCount, trace });

  } catch (err) {
      log(`EXCEPTION: ${err.message}`);
      return res.status(200).json({ error: true, message: err.message, trace });
  }
}