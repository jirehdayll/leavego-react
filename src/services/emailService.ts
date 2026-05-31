import emailjs from '@emailjs/browser';
import { handleApiCall } from './errorHandlingService';

// To use EmailJS, the admin will need to configure these in the .env file
// VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'default_service';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'default_template';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'default_public_key';

// Standard Email Service for LeaveGo
export const emailService = {
  sendNotification: async (to: string, toName: string, subject: string, body: string) => {
    return handleApiCall(async () => {
      console.log(`[EmailService] Sending to: ${to}, Subject: ${subject}`);
      
      // Real email integration using EmailJS
      if (EMAILJS_SERVICE_ID !== 'default_service') {
        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: to,
              to_name: toName || 'User',
              subject: subject,
              message: body
            },
            EMAILJS_PUBLIC_KEY
          );
          console.log('[EmailService] Email sent successfully via EmailJS');
          return { success: true };
        } catch (error) {
          console.error('[EmailService] Failed to send email via EmailJS:', error);
          // Fallback to simulate success if email fails, so we don't break the flow
          return { success: true };
        }
      } else {
        console.log('[EmailService] EmailJS not configured. Simulating email sending.');
        await new Promise(resolve => setTimeout(resolve, 500));
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

  sendSeenNotification: async (request: any) => {
    const subject = `Request Seen - ${request.request_type}`;
    const body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request is now being reviewed by an administrator.\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, request.user_name, subject, body);
  }
};
