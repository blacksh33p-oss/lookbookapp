import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Disable Caching critical for status checks
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. IP Extraction (Enhanced for Vercel)
    // Priority: x-real-ip -> x-forwarded-for -> remoteAddress
    let ip = req.headers['x-real-ip'];
    
    if (!ip && req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'];
    } else if (!ip && req.socket && req.socket.remoteAddress) {
        ip = req.socket.remoteAddress;
    }
    
    // Handle array or comma-separated list
    if (Array.isArray(ip)) ip = ip[0];
    if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0];
    ip = (ip || 'unknown').trim();

    // Normalization
    if (ip === '::1') ip = '127.0.0.1';

    // 2. Initialize Supabase with Service Key
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

    // Debug Info Object
    const debugInfo = {
        ip,
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        table: 'guest_usage'
    };

    if (!supabaseUrl || !supabaseKey) {
        console.error("CRITICAL: Guest Status missing Service Role Key");
        return res.status(200).json({ remaining: 3, debug: { ...debugInfo, error: "Missing Config" } });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Query Usage
    const { data: usageRecord, error } = await supabase
        .from('guest_usage')
        .select('*')
        .eq('ip_address', ip)
        .maybeSingle();

    if (error) {
        console.error("Supabase Read Error:", error);
        return res.status(200).json({ remaining: 3, debug: { ...debugInfo, error: error.message } });
    }

    // 4. Default State (New Guest)
    if (!usageRecord) {
        return res.status(200).json({ remaining: 3, debug: { ...debugInfo, status: 'No Record Found' } });
    }

    // 5. Check Expiry
    const now = new Date();
    const lastUpdate = new Date(usageRecord.last_updated);
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // If > 24 hours, reset
    if (hoursSinceUpdate > 24) {
        // Optional: We could lazily reset the DB here, but just returning 3 is enough for the UI
        return res.status(200).json({ 
            remaining: 3, 
            debug: { ...debugInfo, status: 'Expired', hoursSince: hoursSinceUpdate } 
        });
    }

    // 6. Calculate Remaining
    const remaining = Math.max(0, 3 - usageRecord.usage_count);
    
    return res.status(200).json({ 
        remaining, 
        debug: { 
            ...debugInfo, 
            status: 'Active', 
            dbCount: usageRecord.usage_count, 
            hoursSince: hoursSinceUpdate 
        } 
    });

  } catch (err) {
    console.error("Guest Status API Exception:", err);
    return res.status(200).json({ remaining: 3, debug: { error: err.message } });
  }
}