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

// Tier Hierarchy for Downgrade Logic
// Higher number = Higher tier
const TIER_LEVELS = {
    'Studio': 3,
    'Creator': 2,
    'Starter': 1,
    'Free': 0
};

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]'; 
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
      return res.status(200).json({ status: 'Active', version: 'v1.7.5-Grant-Logic' });
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
          
          if (!['order.completed', 'subscription.activated', 'subscription.charge.completed', 'subscription.updated', 'subscription.deactivated', 'subscription.canceled'].includes(event.type)) {
             continue;
          }

          const data = event.data || {};
          let targetUserId = null;
          let emailFound = data.email || data.customer?.email || data.account?.contact?.email;

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

          if (!targetUserId && emailFound) {
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

          let productInfo = '';
          if (data.items && Array.isArray(data.items)) productInfo += JSON.stringify(data.items);
          if (data.subscription) productInfo += JSON.stringify(data.subscription);
          if (data.product) productInfo += String(data.product);
          
          productInfo = productInfo.toLowerCase();

          let newTier = null;
          let monthlyCredits = 0;

          if (productInfo.includes('studio') || productInfo.includes('agency')) {
              newTier = 'Studio';
              monthlyCredits = 2000;
          } else if (productInfo.includes('creator') || productInfo.includes('pro')) {
              newTier = 'Creator';
              monthlyCredits = 500;
          } else if (productInfo.includes('starter') || productInfo.includes('basic')) {
              newTier = 'Starter';
              monthlyCredits = 100;
          }

          if (event.type === 'subscription.deactivated') {
              newTier = 'Free';
              monthlyCredits = 0; // Trial finished state
              log(`Subscription Deactivated/Expired. Downgrading to Free.`);
          }

          if (!newTier) {
              log(`SKIPPING: Could not identify valid tier from product info: ${productInfo}`);
              continue;
          }

          if (event.type === 'subscription.canceled') {
              log(`Subscription canceled. User retains access until period ends. No DB Update.`);
              continue; 
          }

          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('tier, credits')
            .eq('id', targetUserId)
            .single();
          
          const currentTier = currentProfile?.tier || 'Free';
          const existingCredits = (currentProfile && typeof currentProfile.credits === 'number') ? currentProfile.credits : 0;
          
          const currentLevel = TIER_LEVELS[currentTier] !== undefined ? TIER_LEVELS[currentTier] : 0;
          const newLevel = TIER_LEVELS[newTier] !== undefined ? TIER_LEVELS[newTier] : 0;

          if (newLevel < currentLevel && event.type !== 'subscription.deactivated') {
              log(`Downgrade detected (from ${currentTier} to ${newTier}). Deferring update until 'subscription.deactivated' event.`);
              continue;
          }

          let finalCredits = existingCredits;

          if (['order.completed', 'subscription.activated', 'subscription.charge.completed'].includes(event.type)) {
              finalCredits = existingCredits + monthlyCredits;
              log(`Payment/Activation event. Adding ${monthlyCredits} credits.`);
          } else if (event.type === 'subscription.deactivated') {
              finalCredits = 0; // Exhaust trial
          } else if (newLevel > currentLevel) {
              if (finalCredits < monthlyCredits) finalCredits = monthlyCredits;
          }

          log(`Applying Update -> Tier: ${newTier}, Credits: ${finalCredits}`);

          const { data: updateData, error: updateError } = await supabase
              .from('profiles')
              .update({ 
                  tier: newTier, 
                  credits: finalCredits 
              })
              .eq('id', targetUserId)
              .select();

          let success = false;
          if (!updateError && updateData && updateData.length > 0) {
              success = true;
          } else {
              const { error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                      id: targetUserId,
                      email: emailFound || 'unknown@user.com',
                      credits: finalCredits,
                      tier: newTier
                  });
              if (!insertError) success = true;
          }

          if (success) processedCount++;
      }

      return res.status(200).json({ success: true, processed: processedCount, trace });

  } catch (err) {
      log(`EXCEPTION: ${err.message}`);
      return res.status(200).json({ error: true, message: err.message, trace });
  }
}