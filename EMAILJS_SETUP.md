# EmailJS Configuration for LeaveGo

This document provides instructions for configuring EmailJS to enable working email notifications in the LeaveGo system.

## Prerequisites

1. Create an EmailJS account at https://www.emailjs.com/
2. Sign up for a free account (200 emails/month on free tier)

## Setup Steps

### 1. Create an Email Service

1. Log in to your EmailJS dashboard
2. Go to "Email Services" → "Add New Service"
3. Choose your email provider (e.g., Gmail, Outlook, or custom SMTP)
4. Follow the authentication steps for your provider
5. Once connected, note your **Service ID**

### 2. Create an Email Template

1. Go to "Email Templates" → "Create New Template"
2. Create a template with the following variables:
   - `{{to_email}}` - Recipient email address
   - `{{to_name}}` - Recipient name
   - `{{subject}}` - Email subject
   - `{{message}}` - Email body/message

3. Example template structure:
   ```
   Subject: {{subject}}
   
   Hi {{to_name}},
   
   {{message}}
   
   Regards,
   LeaveGo System
   ```

4. Save the template and note your **Template ID**

### 3. Get Your Public Key

1. Go to "Integration" → "SDK Installation"
2. Copy your **Public Key** (also called Public Key)

### 4. Configure Environment Variables

Add the following environment variables to your `.env` file:

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

### 5. Restart Development Server

After updating the `.env` file, restart your development server:

```bash
npm run dev
```

## Testing

Email notifications will now be sent automatically when:
- Admin views a request (SEEN notification)
- Admin approves a request (APPROVED notification)
- Admin declines a request (DECLINED notification)
- Admin archives a request (ARCHIVED notification)

## Troubleshooting

### Emails not sending:
- Check browser console for errors
- Verify your EmailJS service is properly connected
- Ensure you have not exceeded your monthly email quota
- Check that the template variables match the code expectations

### Template variables not working:
- Ensure your template uses the exact variable names: `{{to_email}}`, `{{to_name}}`, `{{subject}}`, `{{message}}`
- Check that the template is active in EmailJS dashboard

### Service authentication issues:
- Re-authenticate your email service in EmailJS dashboard
- Some providers (like Gmail) may require app-specific passwords
- Check your email provider's security settings

## Alternative: Backend Email Service

If you prefer to use a backend email service instead of EmailJS, you can:

1. Set up a backend API endpoint for sending emails
2. Configure the following environment variables:
   ```env
   VITE_EMAIL_API_URL=https://your-backend-api.com/send-email
   VITE_EMAIL_API_KEY=your_api_key_here
   ```
3. The system will automatically use the backend API when these variables are configured

## Email Templates

The system uses the following email templates:

### Approval Notification
```
Subject: Leave/Travel Request Approved - [Request Type]

Hi [User Name],

Your [Request Type] request submitted on [Date] has been approved.

[Admin Comment if provided]

Regards,
LeaveGo System
```

### Decline Notification
```
Subject: Leave/Travel Request Declined - [Request Type]

Hi [User Name],

Your [Request Type] request submitted on [Date] has been declined.

[Admin Comment if provided]

Regards,
LeaveGo System
```

### Seen Notification
```
Subject: Request Seen - [Request Type]

Hi [User Name],

Your [Request Type] request is now being reviewed by an administrator.

Regards,
LeaveGo System
```

## Support

For EmailJS-specific issues, visit: https://www.emailjs.com/docs/
