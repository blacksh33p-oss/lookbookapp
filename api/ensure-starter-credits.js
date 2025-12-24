import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase service credentials' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, tier, credits')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return res.status(500).json({ error: profileError.message });
    }

    if (!profile) {
      const { data: createdProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email || 'unknown',
          tier: 'Free',
          credits: 50
        })
        .select('id, tier, credits')
        .single();

      if (createError) {
        return res.status(500).json({ error: createError.message });
      }

      return res.status(200).json({ profile: createdProfile, updated: true });
    }

    const needsStarterCredits =
      profile.tier === 'Free' &&
      (profile.credits == null || (typeof profile.credits === 'number' && profile.credits < 50));

    if (!needsStarterCredits) {
      return res.status(200).json({ profile, updated: false });
    }

    const { count: generationCount, error: generationError } = await supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (generationError) {
      return res.status(500).json({ error: generationError.message });
    }

    if ((generationCount ?? 0) > 0) {
      return res.status(200).json({ profile, updated: false });
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ credits: 50 })
      .eq('id', userId)
      .select('id, tier, credits')
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ profile: updatedProfile, updated: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
