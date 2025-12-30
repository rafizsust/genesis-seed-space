import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, tokensUsed } = await req.json();
    const today = new Date().toISOString().split('T')[0];

    if (action === 'get') {
      // Get today's usage
      const { data, error } = await supabase
        .from('gemini_daily_usage')
        .select('tokens_used, requests_count, last_updated_at')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      if (error) throw error;

      return new Response(JSON.stringify({
        tokensUsed: data?.tokens_used || 0,
        requestsCount: data?.requests_count || 0,
        lastUpdatedAt: data?.last_updated_at || null,
        usageDate: today,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update') {
      if (typeof tokensUsed !== 'number' || tokensUsed < 0) {
        return new Response(JSON.stringify({ error: 'Invalid tokensUsed value' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Upsert today's usage
      const { data: existingData } = await supabase
        .from('gemini_daily_usage')
        .select('id, tokens_used, requests_count')
        .eq('user_id', user.id)
        .eq('usage_date', today)
        .maybeSingle();

      let result;
      if (existingData) {
        // Update existing record
        const { data, error } = await supabase
          .from('gemini_daily_usage')
          .update({
            tokens_used: existingData.tokens_used + tokensUsed,
            requests_count: existingData.requests_count + 1,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', existingData.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('gemini_daily_usage')
          .insert({
            user_id: user.id,
            usage_date: today,
            tokens_used: tokensUsed,
            requests_count: 1,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      console.log(`Updated usage for user ${user.id}: +${tokensUsed} tokens`);

      return new Response(JSON.stringify({
        success: true,
        tokensUsed: result.tokens_used,
        requestsCount: result.requests_count,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in gemini-quota function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
