// =========================================================
// Daily Leave Accrual Edge Function
// =========================================================
// This function processes daily passive accrual for all employees
// who did not use fixed-cap leaves (Forced, Special, Wellness)
// on the previous day. It should be scheduled to run daily via cron.
//
// Deploy: supabase functions deploy daily-accrual
// Schedule: supabase functions deploy daily-accrual --no-verify-jwt
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

    console.log('Starting daily accrual processing...')

    // Call the PostgreSQL function to process daily accrual
    const { data, error } = await supabase.rpc('process_daily_accrual', {
      p_target_date: new Date().toISOString().split('T')[0]
    })

    if (error) {
      console.error('Error processing daily accrual:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    console.log('Daily accrual processing completed successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Daily accrual processed successfully',
        processed_at: new Date().toISOString()
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
