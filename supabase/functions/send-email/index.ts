// Supabase Edge Function for Sending Email Notifications
// This function listens for new email_notifications and sends them via Resend or SendGrid

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Email service configuration (choose one)
const EMAIL_SERVICE = Deno.env.get('EMAIL_SERVICE') || 'resend' // 'resend' or 'sendgrid'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || ''

serve(async (req) => {
  try {
    // This function is triggered by a webhook or called directly
    const { notification_id } = await req.json()

    if (!notification_id) {
      return new Response(JSON.stringify({ error: 'notification_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch the notification from Supabase
    const { data: notification, error: fetchError } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('id', notification_id)
      .single()

    if (fetchError || !notification) {
      return new Response(JSON.stringify({ error: 'Notification not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Send the email based on the configured service
    let emailResult
    if (EMAIL_SERVICE === 'resend') {
      emailResult = await sendEmailViaResend(notification)
    } else if (EMAIL_SERVICE === 'sendgrid') {
      emailResult = await sendEmailViaSendGrid(notification)
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email service configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Update notification status
    const { error: updateError } = await supabase
      .from('email_notifications')
      .update({
        status: emailResult.success ? 'sent' : 'failed',
        error_message: emailResult.error || null,
        sent_at: emailResult.success ? new Date().toISOString() : null
      })
      .eq('id', notification_id)

    if (updateError) {
      console.error('Failed to update notification status:', updateError)
    }

    return new Response(JSON.stringify({
      success: emailResult.success,
      message: emailResult.success ? 'Email sent successfully' : 'Failed to send email'
    }), {
      status: emailResult.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error in send-email function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// Send email via Resend
async function sendEmailViaResend(notification: any) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LeaveGo System <noreply@leavego.denr.gov.ph>',
        to: notification.to_email,
        subject: notification.subject,
        html: notification.message.replace(/\n/g, '<br>')
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Send email via SendGrid
async function sendEmailViaSendGrid(notification: any) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: notification.to_email }],
          subject: notification.subject
        }],
        from: { email: 'noreply@leavego.denr.gov.ph', name: 'LeaveGo System' },
        content: [{
          type: 'text/html',
          value: notification.message.replace(/\n/g, '<br>')
        }]
      })
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
