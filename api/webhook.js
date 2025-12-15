
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    if (userId) {
      // 1. Fetch current credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      const currentCredits = profile?.credits || 0;
      
      // 2. Add 100 credits (simplified for demo)
      // In a real app, you'd lookup the priceId to decide how many credits to add
      const { error } = await supabase
        .from('profiles')
        .update({ credits: currentCredits + 100, tier: 'Creator' })
        .eq('id', userId);

      if (error) {
        console.error('Error updating credits:', error);
        return res.status(500).send('Database Update Failed');
      }
    }
  }

  res.status(200).json({ received: true });
}
