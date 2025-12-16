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
  const LOG_PREFIX = '[FastSpring V11-SafeUpdate]'; 
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
  
  if (req.method === 'GET') {
      return res.status(200).json({ status: 'Active', version: 'v11' });
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

          // STEP A: Extract Email Candidates
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
          if (uniqueEmails.length > 0) emailFound = uniqueEmails[0];

          // STEP B: PRIORITY 1 - Email Lookup
          if (emailFound) {
              log(`Lookup by Email: ${emailFound}`);
              const { data: userResult } = await supabase.auth.admin.listUsers({ perPage: 1000 });
              if (userResult && userResult.users) {
                  const cleanEmail = emailFound.toLowerCase().trim();
                  const match = userResult.users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
                  if (match) {
                      userId = match.id;
                      log(`Match Found via Email: ${userId}`);
                  }
              }
          }

          // STEP C: PRIORITY 2 - Tags
          if (!userId) {
              const tags = data.tags || (data.order && data.order.tags) || (data.subscription && data.subscription.tags);
              if (tags) {
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
          }

          if (!userId) {
              log("SKIPPING: User ID could not be resolved.");
              continue;
          }

          // STEP D: Determine Plan
          const itemsJSON = JSON.stringify(data.items || []).toLowerCase();
          let tier = 'Creator';
          let creditsToAdd = 500;
          
          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              creditsToAdd = 2000;
          }
          log(`Tier: ${tier} | Adding: ${creditsToAdd} credits`);

          // STEP E: DB UPDATE (SAFE MODE)
          
          // 1. Fetch current credits
          const { data: preProfile, error: preError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
          
          const currentCredits = preProfile ? preProfile.credits : 0;
          const newCredits = currentCredits + creditsToAdd;

          log(`Attempting UPDATE: ${currentCredits} -> ${newCredits}`);

          // 2. Try UPDATE first (This is safer than Upsert if row exists but constraints are strict)
          const { data: updateData, error: updateError } = await supabase
              .from('profiles')
              .update({ 
                  credits: newCredits, 
                  tier: tier, 
                  updated_at: new Date().toISOString() 
              })
              .eq('id', userId)
              .select();

          let success = false;
          
          if (!updateError && updateData && updateData.length > 0) {
              log("UPDATE Successful.");
              success = true;
          } else {
              // 3. If UPDATE failed (row doesn't exist), try INSERT
              log("UPDATE failed/empty. Attempting INSERT.");
              const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                      id: userId,
                      tier: tier,
                      credits: newCredits,
                      updated_at: new Date().toISOString()
                  });
              
              if (!insertError) {
                  log("INSERT Successful.");
                  success = true;
              } else {
                  log(`INSERT Error: ${insertError.message}`);
              }
          }

          if (success) processedCount++;
      }

      return res.status(200).json({ success: true, processed: processedCount, trace });

  } catch (err) {
      log(`EXCEPTION: ${err.message}`);
      return res.status(200).json({ error: true, message: err.message, trace });
  }
}