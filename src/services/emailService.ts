import { supabase } from '../lib/supabaseClient';
import { handleApiCall } from './errorHandlingService';

// Standard Email Service for LeaveGo
export const emailService = {
  // Common internal function to send notifications
  // In a real app, this would call a backend or a Supabase edge function
  // For now, we simulate success or log to a 'notifications' table if it exists
  sendNotification: async (to: string, subject: string, body: string) => {
    return handleApiCall(async () => {
      console.log(`[EmailService] Sending to: ${to}, Subject: ${subject}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Attempt to log to a system_logs table if you want to track notifications
      // const { error } = await supabase.from('system_logs').insert([...]);
      
      return { success: true };
    }, 'emailService.sendNotification');
  },

  sendApprovalNotification: async (request: any) => {
    const subject = `Leave/Travel Request Approved - ${request.request_type}`;
    const body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request submitted on ${new Date(request.submitted_at).toLocaleDateString()} has been approved.\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, subject, body);
  },

  sendDeclineNotification: async (request: any) => {
    const subject = `Leave/Travel Request Declined - ${request.request_type}`;
    const body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request submitted on ${new Date(request.submitted_at).toLocaleDateString()} has been declined.\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, subject, body);
  },

  sendSeenNotification: async (request: any) => {
    // Optional: Notify user that their request has been seen by admin
    const subject = `Request Seen - ${request.request_type}`;
    const body = `Hi ${request.user_name || 'User'},\n\nYour ${request.request_type} request is now being reviewed by an administrator.\n\nRegards,\nLeaveGo System`;
    
    return emailService.sendNotification(request.user_email, subject, body);
  }
};
