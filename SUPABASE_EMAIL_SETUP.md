# Supabase Email Notification System for LeaveGo

This document provides instructions for setting up the Supabase-based email notification system for LeaveGo.

## Overview

The LeaveGo system now uses Supabase for email notifications instead of EmailJS. This provides:
- Automatic email registration when accounts are created
- Reliable email delivery via Supabase Edge Functions
- Support for multiple email providers (Resend, SendGrid)
- Centralized email notification management in Supabase

## Setup Steps

### 1. Run SQL Setup Script

Run the SQL script in `supabase/setup-email-system.sql` in your Supabase SQL Editor to create the required tables:
- `user_emails` - Stores registered user emails
- `email_notifications` - Stores email notifications to be sent

### 2. Configure Email Service Provider

Choose one of the supported email providers:

#### Option A: Resend (Recommended)

1. Create an account at https://resend.com/
2. Get your API key from the dashboard
3. Add the following environment variables to your Supabase project:
   - `EMAIL_SERVICE` = `resend`
   - `RESEND_API_KEY` = `your_resend_api_key`

#### Option B: SendGrid

1. Create an account at https://sendgrid.com/
2. Get your API key from the dashboard
3. Add the following environment variables to your Supabase project:
   - `EMAIL_SERVICE` = `sendgrid`
   - `SENDGRID_API_KEY` = `your_sendgrid_api_key`

### 3. Deploy Edge Function

1. Install Supabase CLI: `npm install -g supabase`
2. Link your Supabase project: `supabase link`
3. Deploy the Edge Function: `supabase functions deploy send-email`

### 4. Configure Environment Variables

Add the following to your project's `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Install Dependencies

Remove EmailJS and ensure Supabase is installed:

```bash
npm uninstall @emailjs/browser
npm install
```

## How It Works

### Account Creation

When an account is created in Account Management:
1. The account is saved to localStorage (existing behavior)
2. The user's email is automatically registered in the `user_emails` table in Supabase
3. This enables email notifications for that user

### Application Submission

When a user submits a leave/travel application:
1. The application is saved to the `leave_requests` table
2. Email notifications are stored in the `email_notifications` table
3. The Edge Function is triggered to send the actual email
4. The notification status is updated to `sent` or `failed`

### Admin Actions

When an admin performs actions on applications:
- **View**: Sends a "seen" notification to the user
- **Approve**: Sends an approval notification to the user
- **Decline**: Sends a decline notification to the user
- **Archive**: Sends an archive notification to the user

## Monitoring

You can monitor email notifications in Supabase by querying the `email_notifications` table:

```sql
-- View all notifications
SELECT * FROM email_notifications ORDER BY created_at DESC;

-- View failed notifications
SELECT * FROM email_notifications WHERE status = 'failed';

-- View pending notifications
SELECT * FROM email_notifications WHERE status = 'pending';
```

## Troubleshooting

### Emails not sending:
1. Check the `email_notifications` table for failed status
2. Verify your email service API key is correct
3. Check Edge Function logs in Supabase dashboard
4. Ensure the Edge Function is deployed and accessible

### User not receiving emails:
1. Check if the user's email is registered in `user_emails` table
2. Verify the email address is correct
3. Check if the email is marked as `is_active = true`

### Edge Function not triggering:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set correctly
2. Check browser console for errors
3. Ensure the Edge Function is deployed

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

## Customization

### Change Email Sender

Edit the Edge Function at `supabase/functions/send-email/index.ts` to change the sender email address:

```typescript
from: 'LeaveGo System <your-email@domain.com>'
```

### Add Custom Email Templates

Modify the email notification methods in `src/services/emailService.ts` to customize email content.

## Security Notes

- Email service API keys are stored in Supabase environment variables (server-side only)
- The Edge Function uses Supabase service role key for database access
- User emails are stored securely in Supabase with Row Level Security (RLS) enabled
- Email notifications are logged for audit purposes

## Migration from EmailJS

If you were previously using EmailJS:
1. EmailJS has been completely removed from the codebase
2. All email notifications now flow through Supabase
3. Existing accounts will need to be re-registered for email notifications
4. No data migration is needed - new system is independent

## Support

For Supabase-specific issues: https://supabase.com/docs
For Resend issues: https://resend.com/docs
For SendGrid issues: https://docs.sendgrid.com
