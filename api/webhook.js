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
    bodyParser: false, // We need raw body for processing
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await buffer(req);
    // Note: FastSpring HMAC verification usually goes here using headers['x-fs-signature'] if enabled in FastSpring settings.
    
    const payload = JSON.parse(rawBody.toString());
    
    // FastSpring sends an object with an 'events' array
    const events = payload.events || [];

    for (const event of events) {
        // We care about 'order.completed' or 'subscription.activated'
        if (event.type === 'order.completed' || event.type === 'subscription.activated') {
            const data = event.data;
            
            // Extract the User ID we passed via URL tags
            // FastSpring returns tags as a key-value object in data.tags
            const tags = data.tags || {};
            const userId = tags.userId;
            
            if (!userId) {
                console.log('Webhook skipped: No userId tag found in order.');
                continue;
            }

            // Determine Plan & Credits based on Product Path/Name
            const items = data.items || [];
            let newCredits = 0;
            let newTier = 'Free';
            let foundPlan = false;

            for (const item of items) {
                const productPath = (item.product || '').toLowerCase();
                const productName = (item.display || '').toLowerCase();
                
                // Match your FastSpring Product Paths or Names here
                if (productPath.includes('creator') || productName.includes('creator')) {
                    newCredits += 500;
                    newTier = 'Creator';
                    foundPlan = true;
                } else if (productPath.includes('studio') || productName.includes('studio')) {
                    newCredits += 2000;
                    newTier = 'Studio';
                    foundPlan = true;
                }
            }

            if (foundPlan) {
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
                    console.error('Supabase Update Error for user ' + userId, error);
                } else {
                    console.log(`Successfully credited user ${userId} with ${newCredits} credits.`);
                }
            }
        }
    }

    // Always return 200 to FastSpring to confirm receipt
    res.status(200).send("Webhook processed");
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(500).send(`Webhook Error: ${err.message}`);
  }
}