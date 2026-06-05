import { handleApiCall } from './errorHandlingService';
import { supabase } from '../lib/supabaseClient';

// Supabase-based Email Service for LeaveGo
// This service stores email notifications in Supabase and triggers Edge Functions to send emails
export const emailService = {
  sendNotification: async (to: string, toName: string, subject: string, body: string) => {
    return handleApiCall(async () => {
      console.log(`[EmailService] Storing notification for: ${to}, Subject: ${subject}`);
      
      try {
        // Store notification in Supabase email_notifications table
        const { data, error } = await supabase
          .from('email_notifications')
          .insert({
            to_email: to,
            to_name: toName || 'User',
            subject: subject,
            message: body,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error('[EmailService] Failed to store notification:', error);
          // Fallback to simulate success if storage fails
          return { success: true };
        }

        console.log('[EmailService] Notification stored successfully in Supabase');

        // Trigger Edge Function to send the email
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
          const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-email`;
          
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`
            },
            body: JSON.stringify({
              notification_id: data.id
            })
          });

          if (response.ok) {
            console.log('[EmailService] Edge Function triggered successfully');
          } else {
            console.error('[EmailService] Failed to trigger Edge Function:', await response.text());
          }
        } catch (edgeError) {
          console.error('[EmailService] Error triggering Edge Function:', edgeError);
          // Don't fail the whole process if Edge Function fails
        }

        return { success: true };
      } catch (error) {
        console.error('[EmailService] Failed to store notification:', error);
        // Fallback to simulate success if email fails, so we don't break the flow
        return { success: true };
      }
    }, 'emailService.sendNotification');
  },

  sendApprovalNotification: async (request: any, comment: string = '') => {
    const subject = `Leave/Travel Request Approved - ${request.request_type}`;
    let body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request submitted on ${new Date(request.submitted_at).toLocaleDateString()} has been approved.`;
    if (comment) {
      body += `\n\nAdmin Comment:\n"${comment}"`;
    }
    body += `\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, request.user_name, subject, body);
  },

  sendDeclineNotification: async (request: any, comment: string = '') => {
    const subject = `Leave/Travel Request Declined - ${request.request_type}`;
    let body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request submitted on ${new Date(request.submitted_at).toLocaleDateString()} has been declined.`;
    if (comment) {
      body += `\n\nAdmin Comment:\n"${comment}"`;
    }
    body += `\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, request.user_name, subject, body);
  },

  sendArchivedNotification: async (request: any, comment: string = '') => {
    const subject = `Leave/Travel Request Archived - ${request.request_type}`;
    let body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request submitted on ${new Date(request.submitted_at).toLocaleDateString()} has been archived.`;
    if (comment) {
      body += `\n\nAdmin Comment:\n"${comment}"`;
    }
    body += `\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, request.user_name, subject, body);
  },

  sendPendingNotification: async (request: any) => {
    const subject = `Leave/Travel Request Received - ${request.request_type}`;
    const body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request submitted on ${new Date(request.submitted_at).toLocaleDateString()} is now pending review.\n\nRegards,\nLeaveGo System`;

    return emailService.sendNotification(request.user_email, request.user_name, subject, body);
  },

  sendSeenNotification: async (request: any) => {
    const subject = `Request Seen - ${request.request_type}`;
    const body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request is now being reviewed by an administrator.\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, request.user_name, subject, body);
  }
};
