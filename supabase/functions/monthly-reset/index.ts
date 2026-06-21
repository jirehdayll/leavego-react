// =========================================================
// Monthly Leave Reset Edge Function
// =========================================================
// This function resets fixed-cap leaves (Forced, Special, Wellness)
// to their default values at the start of each month.
// Should be scheduled to run on the 1st of each month.
//
// Deploy: supabase functions deploy monthly-reset
// Schedule: supabase functions deploy monthly-reset --no-verify-jwt
// =========================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting monthly leave reset...')

    // Call the PostgreSQL function to reset fixed-cap leaves
    const { data, error } = await supabase.rpc('reset_fixed_cap_leaves')

    if (error) {
      console.error('Error resetting leaves:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Monthly leave reset completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Monthly leave reset completed successfully',
        reset_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
