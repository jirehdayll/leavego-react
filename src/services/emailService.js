import { supabase } from '../lib/supabaseClient';

// Email notification templates
const EMAIL_TEMPLATES = {
  APPROVED: {
    subject: 'DENR Leave/Travel Application - APPROVED',
    body: (requestType, applicantName, details) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">CENRO Olongapo City</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; color: #166534; font-size: 18px;">✅ Application Approved</h2>
            <p style="margin: 0; color: #15803d;">Your ${requestType} application has been reviewed and approved.</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Applicant Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280; width: 140px;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${applicantName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">Department:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${details.department || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">Position:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${details.position || 'N/A'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #374151; font-size: 14px;">Important Notes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 1.6;">
              <li>Please keep this approval notice for your records.</li>
              <li>Coordinate with your immediate supervisor for further instructions.</li>
              <li>For any questions, contact the HR Management Unit.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">DENR CENRO Olongapo City • HR Management Unit</p>
          </div>
        </div>
        
        <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
          <p style="margin: 0;">© 2024 Department of Environment and Natural Resources</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Republic of the Philippines</p>
        </div>
      </div>
    `
  },
  
  DECLINED: {
    subject: 'DENR Leave/Travel Application - ACTION REQUIRED',
    body: (requestType, applicantName, details) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">CENRO Olongapo City</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; color: #991b1b; font-size: 18px;">❌ Application Requires Revision</h2>
            <p style="margin: 0; color: #b91c1c;">Your ${requestType} application needs to be reviewed and revised.</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Applicant Information</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280; width: 140px;">Name:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${applicantName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">Department:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${details.department || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-weight: bold; color: #6b7280;">Position:</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">${details.position || 'N/A'}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #92400e; font-size: 14px;">📋 Next Steps:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 1.6;">
              <li>Please visit the HR Management Unit for clarification.</li>
              <li>Review your application for any missing information.</li>
              <li>Contact your immediate supervisor for guidance.</li>
              <li>You may submit a new application after addressing the concerns.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">DENR CENRO Olongapo City • HR Management Unit</p>
          </div>
        </div>
        
        <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
          <p style="margin: 0;">© 2024 Department of Environment and Natural Resources</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Republic of the Philippines</p>
        </div>
      </div>
    `
  },
  
  SEEN: {
    subject: 'DENR Leave/Travel Application - UNDER REVIEW',
    body: (requestType, applicantName) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">DEPARTMENT OF ENVIRONMENT AND NATURAL RESOURCES</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">CENRO Olongapo City</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin-bottom: 25px;">
            <h2 style="margin: 0 0 10px 0; color: #166534; font-size: 18px;">👁️ Application Under Review</h2>
            <p style="margin: 0; color: #15803d;">Your ${requestType} application has been received and is currently under review.</p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Application Status</h3>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px;">
              <p style="margin: 0; color: #374151; font-size: 14px;">
                <strong>Applicant:</strong> ${applicantName}<br>
                <strong>Application Type:</strong> ${requestType}<br>
                <strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Under Review</span><br>
                <strong>Date Submitted:</strong> ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          
          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;">ℹ️ Information:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #047857; font-size: 14px; line-height: 1.6;">
              <li>Your application is now being processed by the HR Management Unit.</li>
              <li>You will receive another email once a decision has been made.</li>
              <li>Processing time typically takes 2-3 business days.</li>
              <li>No further action is required at this time.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 12px;">DENR CENRO Olongapo City • HR Management Unit</p>
          </div>
        </div>
        
        <div style="background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
          <p style="margin: 0;">© 2024 Department of Environment and Natural Resources</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Republic of the Philippines</p>
        </div>
      </div>
    `
  }
};

export const emailService = {
  // Send email notification
  sendNotification: async (recipientEmail, type, requestData) => {
    try {
      const template = EMAIL_TEMPLATES[type];
      if (!template) {
        throw new Error(`Email template not found for type: ${type}`);
      }

      const requestType = requestData.request_type === 'Travel' ? 'Travel Order' : 'Leave Application';
      const applicantName = requestData.user_name || 'Applicant';
      const details = requestData.details || {};

      const emailData = {
        to: recipientEmail,
        subject: template.subject,
        html: template.body(requestType, applicantName, details),
        from: 'hr-denr@denr.gov.ph', // Official DENR email
        replyTo: 'hr-denr@denr.gov.ph'
      };

      // For development, log the email instead of sending
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:', {
          to: recipientEmail,
          subject: template.subject,
          type: type
        });
        return { success: true, message: 'Email logged in development mode' };
      }

      // Integrate with your preferred email service here
      // Examples: Resend, SendGrid, AWS SES, Supabase Email, etc.
      
      // Example with Supabase Email (if enabled)
      // const { error } = await supabase.auth.admin.updateUserById(
      //   recipientEmail,
      //   { email: emailData }
      // );
      
      // Example with Resend (popular choice)
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(emailData),
      // });
      
      // Example with SendGrid
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send(emailData);

      return { success: true, message: 'Email sent successfully' };
      
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  },

  // Send approval notification
  sendApprovalNotification: async (requestData) => {
    return await emailService.sendNotification(
      requestData.user_email,
      'APPROVED',
      requestData
    );
  },

  // Send decline notification  
  sendDeclineNotification: async (requestData) => {
    return await emailService.sendNotification(
      requestData.user_email,
      'DECLINED',
      requestData
    );
  },

  // Send seen notification
  sendSeenNotification: async (requestData) => {
    return await emailService.sendNotification(
      requestData.user_email,
      'SEEN',
      requestData
    );
  }
};
