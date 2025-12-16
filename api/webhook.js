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
  const LOG_PREFIX = '[FastSpring Webhook v6]'; 
  const trace = []; 

  const log = (msg) => {
      console.log(`${LOG_PREFIX} ${msg}`);
      trace.push(msg);
  };

  // 1. CORS & Methods
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // SETUP SUPABASE
  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();
  
  // --- DIAGNOSTIC MODE (GET) ---
  if (req.method === 'GET') {
      const { check_email } = req.query;
      const status = {
          status: 'Active',
          version: 'v6-Production',
          config: {
              hasUrl: !!supabaseUrl,
              hasKey: !!serviceRoleKey,
              keyLength: serviceRoleKey ? serviceRoleKey.length : 0
          }
      };

      if (check_email && serviceRoleKey) {
          const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
          try {
              const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
              if (error) status.lookupError = error;
              else {
                  const match = data.users.find(u => u.email?.toLowerCase() === check_email.toLowerCase());
                  status.userFound = !!match;
                  status.userId = match ? match.id : null;
              }
          } catch(e) { status.exception = e.message; }
      }

      return res.status(200).json(status);
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
      if (!supabaseUrl || !serviceRoleKey) {
          log("CRITICAL: Missing Supabase Credentials.");
          return res.status(500).json({ error: 'Server Config Error', trace });
      }

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
              // Handle URL encoded tags
              let decodedTags = tags;
              if (typeof tags === 'string' && tags.includes('%')) {
                   try { decodedTags = decodeURIComponent(tags); } catch(e) {}
              }

              if (typeof decodedTags === 'object' && decodedTags.userId) userId = decodedTags.userId;
              else if (typeof decodedTags === 'string') {
                  const match = decodedTags.match(/userId:([a-f0-9-]{36})/i);
                  if (match) userId = match[1];
              }
          }

          // STEP B: Look for Email (Fallback)
          if (!userId) {
              // Deep extraction of email candidates
              const candidates = [
                  data.email, 
                  data.customer?.email, 
                  data.account?.contact?.email, 
                  data.contact?.email, 
                  data.recipient?.email
              ];

              if (Array.isArray(data.recipients)) {
                  data.recipients.forEach(r => {
                      if (r.recipient?.email) candidates.push(r.recipient.email);
                      if (r.recipient?.account?.contact?.email) candidates.push(r.recipient.account.contact.email);
                  });
              }

              const uniqueEmails = [...new Set(candidates.filter(Boolean))];
              log(`Email Candidates: ${JSON.stringify(uniqueEmails)}`);

              if (uniqueEmails.length > 0) {
                  emailFound = uniqueEmails[0]; 
                  log(`Looking up email: ${emailFound}`);

                  const { data: userResult, error: userError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
                  
                  if (userError) {
                      log(`Auth Lookup ERROR: ${userError.message}`);
                  } else {
                      const users = userResult.users || [];
                      const cleanEmail = emailFound.toLowerCase().trim();
                      const match = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
                      
                      if (match) {
                          userId = match.id;
                          log(`User Found: ${userId}`);
                      } else {
                          log(`No user found for ${cleanEmail}`);
                      }
                  }
              }
          }

          if (!userId) {
              log("SKIPPING: User ID could not be resolved.");
              continue;
          }

          // STEP C: Determine Plan
          const itemsJSON = JSON.stringify(data.items || []).toLowerCase();
          let tier = 'Creator';
          let creditsToAdd = 500; // Default
          
          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              creditsToAdd = 2000;
          }
          log(`Plan identified: ${tier} (+${creditsToAdd} credits)`);

          // STEP D: Update DB (Robust Upsert)
          
          // 1. Fetch existing profile first to preserve other fields (like username)
          const { data: currentProfile, error: fetchErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
          
          const currentCredits = currentProfile?.credits || 0;
          const newCredits = currentCredits + creditsToAdd;
          
          // 2. Prepare Payload
          // If profile doesn't exist, we MUST provide a username if the DB requires it
          const username = currentProfile?.username || emailFound?.split('@')[0] || 'Studio User';
          
          const payload = {
              id: userId,
              tier: tier,
              credits: newCredits,
              updated_at: new Date().toISOString(),
              username: username // Ensure username is present for new rows
          };

          log(`Upserting Profile: ${userId} -> ${newCredits} credits`);

          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert(payload);

          if (upsertErr) {
              log(`DB Update FAILED: ${upsertErr.message}`);
          } else {
              log(`DB Update SUCCESS`);
              processedCount++;
          }
      }

      return res.status(200).json({ success: true, processed: processedCount, trace });

  } catch (err) {
      log(`EXCEPTION: ${err.message}`);
      return res.status(200).json({ error: true, message: err.message, trace });
  }
}