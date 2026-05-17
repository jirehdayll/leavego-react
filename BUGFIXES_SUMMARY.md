# Bug Fixes Summary

## All Issues Fixed

### 1. Invalid UUID Error When Creating Leave/Travel Requests
**Error:** `invalid input syntax for type uuid: "31t9gqnaa"`

**Root Cause:** The `user.id` stored in localStorage (`basicAuth`) could contain an invalid UUID format, which caused PostgreSQL to reject the insert operation.

**Solution:** 
- Added UUID validation in both `LeaveForm.jsx` and `TravelForm.jsx`
- Before submitting, the code now validates `user.id` using `isValidUUID()`
- If invalid, a new valid UUID is generated using `generateUUID()`
- The stored session is also updated with the valid UUID to prevent future issues

**Files Modified:**
- `src/pages/LeaveForm.jsx`
- `src/pages/TravelForm.jsx`

### 2. Archive Page Restore Button Logic
**Issue:** Restore button was showing for all items in the archive, including approved/denied applications that weren't archived.

**Solution:** Modified the restore button to only display when `is_archived === true`

**Files Modified:**
- `src/pages/Archive.jsx`

### 3. Duplicate Key Errors (T and S)
**Error:** `Encountered two children with the same key, 'T'` and `Encountered two children with the same key, 'S'`

**Root Cause:** In `MonthlySummary.jsx`, the days of the week array `['S','M','T','W','T','F','S']` has duplicate values (two 'T's for Tuesday/Thursday and two 'S's for Sunday/Saturday), and these were used directly as keys.

**Solution:** Changed the key to include the index: `key={`${d}-${index}`}`

**Files Modified:**
- `src/pages/MonthlySummary.jsx`

### 4. Archive Page Not Showing Data
**Issue:** The archive page was empty because it was only reading from localStorage, but data is stored in Supabase.

**Solution:** Updated the `fetch` function to query Supabase for archived and declined forms, with localStorage as a fallback.

**Files Modified:**
- `src/pages/Archive.jsx`

### 5. Double Tab Issue on First Run
**Issue:** Two tabs of the website would open on first run.

**Root Cause:** This was related to how the authentication state was being checked. The app was using the `user` state directly, which could be populated from various sources.

**Solution:** 
- Introduced a new `hasSession` state in `useAuth` hook that specifically tracks explicit login sessions (stored in `basicAuth` localStorage)
- Updated `App.jsx` to use `hasSession` instead of `user` for route protection
- This ensures the app only considers a user logged in when they've explicitly logged in, not just when there's residual data

**Files Modified:**
- `src/hooks/useAuth.ts`
- `src/App.jsx`

### 6. Login Page Not Showing First
**Issue:** When opening the website, the employee dashboard was displayed instead of the login page.

**Root Cause:** Similar to issue #5, the app was checking the `user` state which could be populated from localStorage even without an explicit login.

**Solution:** 
- Using the new `hasSession` flag that only becomes `true` after an explicit login
- The app now correctly shows the login page on first visit
- Only after logging in will the user be redirected to the dashboard

**Files Modified:**
- `src/hooks/useAuth.ts`
- `src/App.jsx`

## Technical Details

### UUID Validation Function
```typescript
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
```

### Auth Session Management
The `useAuth` hook now tracks two separate concepts:
- `user`: The current user data (can be null)
- `hasSession`: Boolean flag indicating if there's an active login session

This separation allows the app to distinguish between:
- A user who has explicitly logged in (hasSession = true)
- A user who has never logged in (hasSession = false)

### Archive Page Data Fetching
The archive page now fetches from Supabase with a query that filters for archived or declined forms:
```javascript
const { data, error } = await supabase
  .from('leave_requests')
  .select('*')
  .or(`is_archived.eq.true,status.eq.${REQUEST_STATUS.DECLINED}`)
  .order('submitted_at', { ascending: false });
```

## Testing Recommendations

1. **UUID Fix:**
   - Clear localStorage and try creating a leave/travel request
   - Verify that the request is submitted successfully without UUID errors

2. **Archive Restore:**
   - Go to admin archive page
   - Verify restore button only appears for items with `is_archived === true`
   - Approved/denied items that are not archived should not show the restore button

3. **Archive Data:**
   - Verify that archived and declined forms from Supabase appear in the archive page
   - Test restore functionality to ensure it updates the database correctly

4. **Duplicate Keys:**
   - Navigate to Monthly Summary page
   - Verify no console warnings about duplicate keys

5. **Login Flow:**
   - Clear all localStorage data
   - Open the website in a new browser window
   - Verify login page appears first
   - Only one tab should open
   - After logging in, verify you're redirected to the appropriate dashboard

6. **Session Persistence:**
   - Log in, then refresh the page
   - Verify you remain logged in
   - Log out, then verify you're redirected to login page

## Files Changed

1. `src/App.jsx` - Updated to use `hasSession` for route protection
2. `src/hooks/useAuth.ts` - Added `hasSession` state and validation
3. `src/pages/LeaveForm.jsx` - Added UUID validation before submission
4. `src/pages/TravelForm.jsx` - Added UUID validation before submission
5. `src/pages/Archive.jsx` - Fixed restore button conditional rendering and data fetching
6. `src/pages/MonthlySummary.jsx` - Fixed duplicate keys in day-of-week headers

## Prevention Measures

To prevent similar issues in the future:

1. Always validate UUIDs before sending to the database
2. Use explicit session flags rather than relying on user object existence
3. Clear separation between "user data exists" and "user has active session"
4. Ensure all list mappings use unique keys (combine value with index if needed)
5. Fetch data from the primary data source (Supabase) rather than localStorage for critical pages
6. Add proper error handling for invalid data formats