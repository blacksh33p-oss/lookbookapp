import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Set JSON content type explicitly to avoid client parsing errors
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. IP Extraction (Defensive)
    let ip = 'unknown';
    if (req.headers && req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'];
    } else if (req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    }
    
    if (Array.isArray(ip)) ip = ip[0];
    if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0];
    ip = (ip || 'unknown').trim();

    // 2. Localhost Bypass (Removed for testing persistence)
    // if (ip === '127.0.0.1' || ip === '::1') {
    //     return res.status(200).json({ remaining: 3 });
    // }

    // 3. Initialize Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    // Fail Open if DB not configured (allow 3 credits)
    if (!supabaseUrl || !supabaseKey) {
        return res.status(200).json({ remaining: 3 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 4. Query Usage
    const { data: usageRecord, error } = await supabase
        .from('guest_usage')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle();

    if (error) {
        console.error("Supabase Error:", error);
        // Fail Open
        return res.status(200).json({ remaining: 3 });
    }

    // 5. Default State (New Guest - No Record Found)
    if (!usageRecord) {
        return res.status(200).json({ remaining: 3 });
    }

    // 6. Check Expiry/Reset
    const now = new Date();
    const lastUpdate = new Date(usageRecord.last_updated);
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    // If > 24 hours, logic effectively resets to 3
    if (hoursSinceUpdate > 24) {
        return res.status(200).json({ remaining: 3 });
    }

    // 7. Calculate Remaining
    const remaining = Math.max(0, 3 - usageRecord.usage_count);
    return res.status(200).json({ remaining });

  } catch (err) {
    console.error("Guest Status API Error:", err);
    // Absolute Fail Safe
    return res.status(200).json({ remaining: 3 });
  }
}