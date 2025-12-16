import { createClient } from '@supabase/supabase-js';

// 1. Disable Vercel's default body parser so we can read the raw stream securely
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2. Robust Body Reader (Callback style wrapped in Promise for max compatibility)
const readBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
};

// 3. Helper for response
const send = (res, code, data) => {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

export default async function handler(req, res) {
  const LOG_PREFIX = '[FastSpring Webhook]';

  try {
    // --- HEALTH CHECK (GET) ---
    if (req.method === 'GET') {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      
      return send(res, 200, {
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
      return send(res, 405, { error: 'Method Not Allowed' });
    }

    // Read the raw body string
    const bodyString = await readBody(req);
    
    if (!bodyString) {
      console.warn(`${LOG_PREFIX} Empty body received.`);
      return send(res, 400, { error: 'Empty Body' });
    }

    // Parse JSON
    let payload;
    try {
      payload = JSON.parse(bodyString);
    } catch (e) {
      console.error(`${LOG_PREFIX} JSON Parse Error:`, e);
      return send(res, 400, { error: 'Invalid JSON' });
    }

    // Server Config Validation
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      console.error(`${LOG_PREFIX} CRITICAL: Missing Env Vars`);
      return send(res, 500, { error: 'Server Misconfigured' });
    }

    const events = payload.events || [];
    if (events.length === 0) {
      return send(res, 200, { message: 'No events' });
    }

    console.log(`${LOG_PREFIX} Processing ${events.length} event(s).`);

    // Initialize Supabase (Admin)
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    let processed = 0;

    for (const event of events) {
      if (event.type === 'order.completed' || event.type === 'subscription.activated') {
        const data = event.data;
        if (!data) continue;

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

        // Strategy B: Email
        if (!userId) {
          const email = data.email || (data.customer && data.customer.email) || (data.account && data.account.email);
          if (email) {
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
            if (user) userId = user.id;
          }
        }

        if (!userId) {
          console.log(`${LOG_PREFIX} Skip: No User ID for ${event.id}`);
          continue;
        }

        // Determine Credits
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
           credits = 500;
           tier = 'Creator';
        }

        if (credits > 0) {
          console.log(`${LOG_PREFIX} Adding ${credits} credits to ${userId}`);
          
          const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
          const current = profile?.credits || 0;
          
          await supabase.from('profiles').upsert({
            id: userId,
            credits: current + credits,
            tier: tier
          });
          processed++;
        }
      }
    }

    return send(res, 200, { success: true, processed });

  } catch (err) {
    console.error(`${LOG_PREFIX} CRITICAL CRASH:`, err);
    return send(res, 500, { error: 'Internal Error', details: err.message });
  }
}