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
  const LOG_PREFIX = '[FastSpring V13-Bulletproof]'; 
  const trace = []; 

  const log = (msg) => {
      console.log(`${LOG_PREFIX} ${msg}`);
      trace.push(msg);
  };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '').trim();
  
  if (req.method === 'GET') {
      return res.status(200).json({ status: 'Active', version: 'v13-Bulletproof' });
  }
  
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
      if (!supabaseUrl || !serviceRoleKey) {
          log("CRITICAL: Missing Supabase Credentials.");
          return res.status(500).json({ error: 'Server Config Error', trace });
      }

      // Payload Parsing
      let payload = req.body;
      if (!payload) {
          const raw = await readStream(req);
          try { payload = JSON.parse(raw); } catch(e) { log("Failed to parse stream JSON"); }
      } else if (typeof payload === 'string') {
          try { payload = JSON.parse(payload); } catch(e) {}
      }

      if (!payload || !payload.events) {
          log("No events found.");
          return res.status(200).json({ message: 'Invalid payload', trace });
      }

      const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false }
      });

      let processedCount = 0;

      for (const event of payload.events) {
          log(`Event: ${event.type} (ID: ${event.id})`);
          
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(event.type)) {
             continue;
          }

          const data = event.data || {};
          let targetUserId = null;
          let emailFound = data.email || data.customer?.email || data.account?.contact?.email;

          // STRATEGY: Trust the 'tags' UserID first. It is the most reliable link to the session.
          const tags = data.tags || (data.order && data.order.tags) || (data.subscription && data.subscription.tags);
          if (tags) {
              let decodedTags = tags;
              if (typeof tags === 'string' && tags.includes('%')) {
                   try { decodedTags = decodeURIComponent(tags); } catch(e) {}
              }

              if (typeof decodedTags === 'object' && decodedTags.userId) targetUserId = decodedTags.userId;
              else if (typeof decodedTags === 'string') {
                  const match = decodedTags.match(/userId:([a-f0-9-]{36})/i);
                  if (match) targetUserId = match[1];
              }
          }

          // Fallback: If no UserID tag, look up by Email
          if (!targetUserId && emailFound) {
              log(`No UserID tag. Looking up email: ${emailFound}`);
              const { data: userResult } = await supabase.auth.admin.listUsers({ perPage: 1000 });
              if (userResult && userResult.users) {
                  const cleanEmail = emailFound.toLowerCase().trim();
                  const match = userResult.users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
                  if (match) targetUserId = match.id;
              }
          }

          if (!targetUserId) {
              log("SKIPPING: Could not resolve User ID.");
              continue;
          }

          // Determine Plan
          const itemsJSON = JSON.stringify(data.items || []).toLowerCase();
          let tier = 'Creator';
          let creditsToAdd = 500;
          
          if (itemsJSON.includes('studio') || itemsJSON.includes('agency')) {
              tier = 'Studio';
              creditsToAdd = 2000;
          }
          log(`User: ${targetUserId} | Tier: ${tier} | Adding: ${creditsToAdd}`);

          // EXECUTE UPDATE
          // 1. Get current state to ensure we add, not overwrite
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', targetUserId)
            .single();
          
          // Default to 0 if missing/null, but if it exists, use it.
          const existingCredits = (currentProfile && typeof currentProfile.credits === 'number') ? currentProfile.credits : 0;
          const finalCredits = existingCredits + creditsToAdd;

          // 2. Perform Upsert
          // We include 'email' and 'username' if we have them, to satisfy potential NOT NULL constraints on new rows
          const upsertPayload = {
              id: targetUserId,
              tier: tier,
              credits: finalCredits,
              updated_at: new Date().toISOString()
          };

          if (emailFound) {
              upsertPayload.email = emailFound;
              upsertPayload.username = emailFound.split('@')[0];
              upsertPayload.full_name = emailFound.split('@')[0];
          }

          const { error: upsertError } = await supabase
              .from('profiles')
              .upsert(upsertPayload, { onConflict: 'id' });

          if (!upsertError) {
              log(`SUCCESS: Set credits to ${finalCredits}`);
              processedCount++;
          } else {
              log(`ERROR: ${upsertError.message}`);
          }
      }

      return res.status(200).json({ success: true, processed: processedCount, trace });

  } catch (err) {
      log(`EXCEPTION: ${err.message}`);
      return res.status(200).json({ error: true, message: err.message, trace });
  }
}