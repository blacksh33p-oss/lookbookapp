import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Initialize Supabase (Service Role)
// We need the SERVICE_ROLE_KEY to bypass Row Level Security and write credits
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false, // We need raw body for signature verification
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['x-signature'];
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

    // 1. Verify Signature
    const hmac = crypto.createHmac('sha256', secret);
    const digest = hmac.update(rawBody).digest('hex');

    if (digest !== signature) {
      return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(rawBody.toString());
    const eventName = payload.meta.event_name;
    
    // 2. Process Order Creation
    if (eventName === 'order_created' || eventName === 'subscription_created') {
        const { attributes } = payload.data;
        
        // Extract the Custom Data we sent from the frontend
        // Format: { user_id: "...", ... }
        const customData = payload.meta.custom_data;
        const userId = customData?.user_id;
        
        if (!userId) {
            console.error('Webhook Error: No user_id found in custom_data');
            return res.status(200).send('No user_id provided, ignoring.');
        }

        // Determine Plan & Credits
        // In a real app, map the 'variant_id' to specific credit amounts
        const variantId = attributes.variant_id;
        
        // Example mapping logic (customize based on your actual Variant IDs from Lemon Squeezy)
        // You can also check attributes.first_order_item.product_name
        let newCredits = 0;
        let newTier = 'Free';
        
        const productName = attributes.first_order_item.product_name.toLowerCase();
        
        if (productName.includes('creator')) {
            newCredits = 500;
            newTier = 'Creator';
        } else if (productName.includes('studio')) {
            newCredits = 2000;
            newTier = 'Studio';
        }

        // 3. Update Supabase
        const { data: profile } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
        
        const currentCredits = profile?.credits || 0;
        
        const { error } = await supabase
            .from('profiles')
            .update({ 
                credits: currentCredits + newCredits,
                tier: newTier
            })
            .eq('id', userId);

        if (error) {
            console.error('Supabase Update Error:', error);
            return res.status(500).send('Database Update Failed');
        }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(500).send(`Webhook Error: ${err.message}`);
  }
}