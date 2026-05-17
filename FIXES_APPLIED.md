# Fixes Applied

## Issue 1: Invalid UUID Format in Leave Request Creation

### Problem
When creating a leave request, the system was throwing an error:
```
invalid input syntax for type uuid: "31t9gqnaa"
```

The error occurred because user IDs were being generated using `Math.random().toString(36).substr(2, 9)`, which produces strings like "31t9gqnaa" — these are NOT valid UUID format. PostgreSQL's UUID type expects a proper UUID format like "550e8400-e29b-41d4-a716-446655440000".

### Solution
1. Created a new utility file `src/utils/uuid.ts` that provides:
   - `generateUUID()` - Generates proper UUID v4 strings using `crypto.randomUUID()` with a fallback for older browsers
   - `isValidUUID()` - Validates if a string is a valid UUID format

2. Updated `src/hooks/useAuth.ts` to use the new `generateUUID()` function instead of the random string generator:
   - When creating hardcoded credential user data
   - When creating new accounts
   - When initializing default accounts

### Files Modified
- `src/utils/uuid.ts` (new file)
- `src/hooks/useAuth.ts`

---

## Issue 2: Admin Approval Status Check Constraint Error

### Problem
When admin/cenro tried to approve a request, the system threw:
```
leaveRequestsAPI.adminApproval: new row for relation "leave_requests" violates check constraint "leave_requests_status_check"
```

The database check constraint did not include the "Pending CENRO Approval" status value.

### Solution
Created a migration file `migrations/fix_status_check_constraint.sql` that updates the status check constraint to include all valid status values:
- 'Pending'
- 'Pending CENRO Approval'
- 'Approved'
- 'Declined'
- 'Archived'

**Note:** This migration must be run in Supabase Dashboard → SQL Editor.

### Files Modified
- `migrations/fix_status_check_constraint.sql` (new file)

---

## Issue 3: Account Management Department Selection

### Problem
Admin/CENRO accounts did not have a department field, and when they created leave/travel requests, the department was not auto-filled.

### Solution
1. Added department selection dropdown to the Create Account modal
2. Added department selection dropdown to the Edit Account modal
3. Department is now saved with the account and auto-filled when making forms

### Files Modified
- `src/pages/AccountManagement.jsx`

---

## Issue 4: Declined Form Archive/Restore Issue

### Problem
1. Declined forms could not be restored from the archive
2. The restore function explicitly blocked restoring approved/declined forms

### Solution
Updated the `restore` function in Archive.jsx to:
1. Allow restoring both archived pending AND declined forms
2. Reset the status back to "Pending" when restored
3. Reset approval fields (admin_approved, cenro_approved, etc.) to allow re-approval workflow
4. Added confirmation dialog before restoring

### Files Modified
- `src/pages/Archive.jsx`

---

## Issue 5: QR Scanner Camera Not Visible

### Problem
The QR scanner requested camera permissions successfully, but the camera feed was not visible in the UI. The user only saw "Accessing camera..." then "Start Camera" button, but no video feed.

### Solution
Completely rewrote the QRScanner component with:
1. Added comprehensive CSS styles to ensure video element visibility
2. Added `display: block !important` to force video display
3. Added proper z-index for canvas overlay
4. Added `videoConstraints: { facingMode: 'environment' }` for back camera preference
5. Improved cleanup and initialization logic
6. Added `containerRef` for better DOM element tracking
7. Added proper error handling with HTTPS requirement note

### Files Modified
- `src/components/QRScanner.jsx`

---

## Testing Recommendations

### 1. UUID Fix
- Clear localStorage to reset user accounts
- Log in with default credentials (admin@denr.gov.ph / admin)
- Create a new leave request
- Verify the request is submitted successfully without UUID errors

### 2. Admin Approval Fix
- **Run the migration:** `migrations/fix_status_check_constraint.sql` in Supabase Dashboard
- Log in as admin
- Approve a pending request
- Verify it moves to "Pending CENRO Approval" status
- Log in as CENRO and approve
- Verify it moves to "Approved" status

### 3. Department Selection
- Go to Account Management
- Create a new account and select a department
- Log in as that user
- Create a leave request
- Verify the department is auto-filled

### 4. Archive Restore
- Go to Archive page
- Find a declined form
- Click the restore button
- Verify the form is restored to pending status
- Check the admin dashboard to see the restored form

### 5. QR Scanner
- Log in as admin
- Open the QR scanner
- Grant camera permissions
- Verify the camera feed is visible
- Test scanning a QR code

## Build Status
✅ Build completed successfully with `npm run build`

## Migration Required
⚠️ **IMPORTANT:** Run `migrations/fix_status_check_constraint.sql` in Supabase Dashboard → SQL Editor to fix the admin approval issue.