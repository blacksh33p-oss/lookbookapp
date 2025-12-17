


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
  const LOG_PREFIX = '[FastSpring V16-Deactivation]'; 
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
      return res.status(200).json({ status: 'Active', version: 'v16-Deactivation' });
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
          
          // Added 'subscription.deactivated' and 'subscription.canceled'
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed', 'subscription.updated', 'subscription.deactivated', 'subscription.canceled'].includes(event.type)) {
             continue;
          }

          const data = event.data || {};
          let targetUserId = null;
          let emailFound = data.email || data.customer?.email || data.account?.contact?.email;

          // 1. Identify User ID (Prefer Tags)
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

          // 2. Identify User ID (Fallback to Email)
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

          // 3. Determine Plan
          // We search the entire data structure for product keys because FastSpring structure varies by event type.
          let productInfo = '';
          if (data.items && Array.isArray(data.items)) productInfo += JSON.stringify(data.items);
          if (data.subscription) productInfo += JSON.stringify(data.subscription);
          if (data.product) productInfo += String(data.product);
          
          productInfo = productInfo.toLowerCase();

          let tier = 'Creator'; // Default fallback
          let monthlyCredits = 500;
          
          if (productInfo.includes('studio') || productInfo.includes('agency')) {
              tier = 'Studio';
              monthlyCredits = 2000;
          } else if (productInfo.includes('starter') || productInfo.includes('basic')) {
              tier = 'Starter';
              monthlyCredits = 100;
          }

          // SPECIAL HANDLING: Deactivation
          if (event.type === 'subscription.deactivated' || event.type === 'subscription.canceled') {
              if (event.type === 'subscription.canceled') {
                  log(`Subscription canceled (Auto-renew off). User keeps access until end of term. No DB change.`);
                  continue; 
              }
              // If Deactivated, we force downgrade
              tier = 'Free';
              monthlyCredits = 5; // Reset to default guest amount
              log(`Subscription Deactivated. Force Downgrading to Free.`);
          } else {
             log(`User: ${targetUserId} | Detected Tier from Product: ${tier}`);
          }

          // 4. Calculate Credits
          // A. Fetch current credits
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', targetUserId)
            .single();
          
          const existingCredits = (currentProfile && typeof currentProfile.credits === 'number') ? currentProfile.credits : 0;
          let finalCredits = existingCredits;

          if (['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(event.type)) {
              finalCredits = existingCredits + monthlyCredits;
              log(`Payment event detected. Adding ${monthlyCredits} credits. New Total: ${finalCredits}`);
          } else if (event.type === 'subscription.deactivated') {
              finalCredits = 5; // Reset to guest default on deactivation
              log(`Deactivation event. Resetting credits to 5.`);
          } else {
              log(`Non-payment event (${event.type}). Updating tier only.`);
          }

          // 5. DB Operation
          // B. Attempt UPDATE
          const { data: updateData, error: updateError } = await supabase
              .from('profiles')
              .update({ 
                  tier: tier, 
                  credits: finalCredits 
              })
              .eq('id', targetUserId)
              .select();

          let success = false;

          if (!updateError && updateData && updateData.length > 0) {
              log(`UPDATE Success. New Tier: ${tier}, Credits: ${finalCredits}`);
              success = true;
          } else {
              // C. If UPDATE failed (row missing), attempt INSERT
              log(`UPDATE failed. Attempting INSERT.`);
              
              let finalEmail = emailFound;
              if (!finalEmail) {
                  const { data: authUser } = await supabase.auth.admin.getUserById(targetUserId);
                  if (authUser && authUser.user) finalEmail = authUser.user.email;
              }

              const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                      id: targetUserId,
                      email: finalEmail || 'unknown@user.com',
                      credits: finalCredits,
                      tier: tier
                  });
              
              if (!insertError) {
                  log(`INSERT Success. Tier: ${tier}, Credits: ${finalCredits}`);
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