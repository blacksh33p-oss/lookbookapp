import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'node:buffer';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to send JSON response using native Node.js methods
const sendJSON = (res, statusCode, data) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
};

// Helper to read raw body
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  try {
      // --- HEALTH CHECK (GET) ---
      if (req.method === 'GET') {
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
          const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
          
          return sendJSON(res, 200, {
              status: 'online',
              timestamp: new Date().toISOString(),
              config: {
                  hasUrl: !!supabaseUrl,
                  hasKey: !!serviceKey,
                  keyLength: serviceKey ? serviceKey.length : 0
              }
          });
      }

      // --- WEBHOOK (POST) ---
      if (req.method !== 'POST') {
          res.setHeader('Allow', 'POST, GET');
          return sendJSON(res, 405, { error: 'Method Not Allowed' });
      }

      console.log(`${LOG_PREFIX} Request received.`);

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!serviceRoleKey) {
          console.error(`${LOG_PREFIX} CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY`);
          return sendJSON(res, 500, { error: 'Server Misconfigured: Missing Key' });
      }

      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      if (!supabaseUrl) {
           console.error(`${LOG_PREFIX} CRITICAL: Missing Supabase URL`);
           return sendJSON(res, 500, { error: 'Server Misconfigured: Missing URL' });
      }

      // Initialize Client
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Read Body
      const rawBody = await getRawBody(req);
      const bodyString = rawBody.toString('utf8');

      if (!bodyString) {
          return sendJSON(res, 400, { error: 'Empty Body' });
      }

      let payload;
      try {
          payload = JSON.parse(bodyString);
      } catch (e) {
          console.error(`${LOG_PREFIX} JSON Parse Error`, e);
          return sendJSON(res, 400, { error: 'Invalid JSON' });
      }

      const events = payload.events || [];
      if (events.length === 0) {
          return sendJSON(res, 200, { message: 'No events' });
      }

      console.log(`${LOG_PREFIX} Processing ${events.length} event(s).`);

      for (const event of events) {
          if (event.type === 'order.completed' || event.type === 'subscription.activated') {
              const data = event.data;
              if (!data) continue;

              // 1. Resolve User ID
              let userId = null;
              
              // Strategy A: Tags
              const tags = data.tags || (data.order && data.order.tags);
              if (tags) {
                  if (typeof tags === 'object' && tags.userId) userId = tags.userId;
                  else if (typeof tags === 'string') {
                      const match = tags.match(/userId:([a-f0-9-]+)/i);
                      if (match) userId = match[1];
                  }
              }

              // Strategy B: Email Lookup
              if (!userId) {
                  const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
                  if (email) {
                      const { data: { users } } = await supabase.auth.admin.listUsers();
                      const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
                      if (user) userId = user.id;
                  }
              }

              if (!userId) {
                  console.log(`${LOG_PREFIX} Skipped: No User ID found for event ${event.id}`);
                  continue;
              }

              // 2. Determine Credits
              const items = data.items || (data.original && data.original.items) || [];
              const productStr = JSON.stringify(items).toLowerCase();
              
              let credits = 0;
              let tier = null;

              if (productStr.includes('studio') || productStr.includes('agency')) {
                  credits = 2000;
                  tier = 'Studio';
              } else if (productStr.includes('creator') || productStr.includes('pro') || productStr.includes('monthly')) {
                  credits = 500;
                  tier = 'Creator';
              } else if (data.live === false) {
                   // Test Mode Fallback
                   credits = 500;
                   tier = 'Creator';
                   console.log(`${LOG_PREFIX} Test Order detected. applying Creator tier.`);
              }

              if (credits > 0) {
                  console.log(`${LOG_PREFIX} Adding ${credits} credits to user ${userId}`);
                  
                  const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                  const current = profile?.credits || 0;
                  
                  await supabase.from('profiles').upsert({
                      id: userId,
                      credits: current + credits,
                      tier: tier
                  });
              }
          }
      }

      return sendJSON(res, 200, { success: true });

  } catch (error) {
      console.error(`${LOG_PREFIX} CRASH:`, error);
      // Ensure we send a response even if it crashed
      if (!res.writableEnded) {
          sendJSON(res, 500, { error: 'Internal Server Error', details: error.message });
      }
  }
}