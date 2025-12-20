import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. IP Extraction (Must match api/generate.js logic)
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (Array.isArray(ip)) ip = ip[0];
    if (ip.includes(',')) ip = ip.split(',')[0];
    ip = ip.trim();

    // 2. Localhost Bypass
    if (ip === '127.0.0.1' || ip === '::1') {
        return res.status(200).json({ remaining: 3 });
    }

    if (!supabase) {
        // Fallback if DB not configured
        return res.status(200).json({ remaining: 3 });
    }

    // 3. Query Usage
    const { data: usageRecord, error } = await supabase
        .from('guest_usage')
        .select('*')
        .eq('ip_address', ip)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error("Supabase Error:", error);
        throw error;
    }

    // 4. Default State (New Guest)
    if (!usageRecord) {
        return res.status(200).json({ remaining: 3 });
    }

    // 5. Check Expiry/Reset
    const now = new Date();
    const lastUpdate = new Date(usageRecord.last_updated);
    const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

    // If > 24 hours, logic effectively resets to 3 (even if we don't write to DB on GET)
    if (hoursSinceUpdate > 24) {
        return res.status(200).json({ remaining: 3 });
    }

    // 6. Calculate Remaining
    const remaining = Math.max(0, 3 - usageRecord.usage_count);
    return res.status(200).json({ remaining });

  } catch (err) {
    console.error("Guest Status API Error:", err);
    // On error, we default to 0 to prevent abuse loops if DB is down
    return res.status(200).json({ remaining: 0 });
  }
}