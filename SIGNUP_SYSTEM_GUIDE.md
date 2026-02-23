# WeVysya Signup System - Architecture & Setup Guide

## Overview
The signup system uses a **member approval workflow** where:
1. Users create an account with signup form
2. Account is created with `approval_status = 'pending'`
3. Admins review and approve pending accounts
4. Users can only login after approval

## Database Changes Made

### 1. Added `approval_status` Column
**File**: `supabase/migrations/20260217130000_add_approval_status_column.sql`

The `profiles` table now has an `approval_status` column:
```sql
ALTER TABLE profiles
ADD COLUMN approval_status text DEFAULT 'pending'
CHECK (approval_status IN ('pending', 'approved', 'rejected'));
```

**Possible values**:
- `'pending'` - Waiting for admin review (default for new signups)
- `'approved'` - Account approved, user can login
- `'rejected'` - Account rejected by admin

### 2. Updated RLS Policy
**File**: `supabase/migrations/20260205083502_fix_all_rls_policies.sql`

Made the INSERT policy more restrictive for security:
```sql
CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);  -- Users can only insert their own profile
```

### 3. Enhanced Signup Component
**File**: `src/components/Signup.tsx`

Changes:
- Always sets `approval_status: 'pending'` for new signups
- Throws error if profile update fails (better error handling)
- Removed complex column existence checking

### 4. Fixed RLS Security Issue
**File**: `supabase/migrations/20260205083502_fix_all_rls_policies.sql`

Before: `WITH CHECK (true)` - Any authenticated user could insert any profile
After: `WITH CHECK (auth.uid() = id)` - Users can only insert their own profile

## Signup Flow

### User Signs Up
```
User Fill Form → Click "Create Account"
  ↓
Supabase Auth creates auth user
  ↓
Database Trigger `handle_new_user()` fires
  ↓
Trigger inserts into profiles table with auth user id
  ↓
Signup component updates profile with:
  - full_name
  - mobile
  - business
  - industry
  - approval_status = 'pending'  ← KEY FIELD
  ↓
Success: "Registration Successful! Your account is pending approval"
```

### Admin Reviews Signup
```
Admin Login → Click "Pending Approvals"
  ↓
Application queries: SELECT * FROM profiles WHERE approval_status = 'pending'
  ↓
Admin clicks "Approve" or "Reject"
  ↓
Application updates: UPDATE profiles SET approval_status = 'approved'|'rejected'
  ↓
Approved: User can now login
```

### User Attempts Login
```
User Enter Credentials → Click "Login"
  ↓
AuthContext.signIn() called
  ↓
Check approval_status:
  - IF 'pending' → Logout user, show "Account pending approval" message
  - IF 'rejected' → Logout user, show "Account rejected" message
  - IF 'approved' → Allow login
  ↓
User sees Dashboard or Error Message
```

## Component Architecture

### Signup Component (`src/components/Signup.tsx`)
- Handles user registration form
- Calls `supabase.auth.signUp()` to create auth user
- Updates profile table with additional info
- Shows success message: "Your account is pending approval"

### PendingMembers Component (`src/components/PendingMembers.tsx`)
- Only accessible to super_admin users
- Fetches profiles with `approval_status = 'pending'`
- Shows list of pending signups with approve/reject buttons
- Updates `approval_status` when admin takes action

### AuthContext (`src/contexts/AuthContext.tsx`)
- Handles login via `signIn(email, password)`
- Fetches user profile after auth login
- Checks `approval_status` field
- Logs out user if account is pending or rejected
- Shows appropriate error messages

### Sidebar (`src/components/Sidebar.tsx`)
- Shows "Pending Approvals" menu item only for super_admin
- Routes to PendingMembers component

## Error Messages

### "Database error saving new user"
**Cause**: `approval_status` column doesn't exist
**Fix**: Run [QUICK_FIX_SIGNUP.sql](./QUICK_FIX_SIGNUP.sql) in Supabase SQL Editor

### "Your account is pending approval"
**Cause**: User account exists but approval_status is 'pending'
**Fix**: Admin must approve the account in "Pending Approvals" section

### "Your account has been rejected"
**Cause**: Admin rejected the signup request
**Fix**: User needs to contact administrator for clarification, may need to re-signup

### "User profile not found"
**Cause**: Auth user exists but no profile row
**Fix**: Ensure trigger `handle_new_user()` is properly set up

## Testing Signup Locally

### Prerequisites
- Node.js and npm installed
- Supabase project created and configured
- Environment variables set (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
- Run `npm run dev` to start the application

### Test Steps

1. **Test Signup with Valid Data**
   ```
   1. Go to http://localhost:5174
   2. Click "Create Account" tab
   3. Fill in form with test data
   4. Click "Create Account"
   5. Should see "Registration Successful!" message
   ```

2. **Verify Profile Created**
   ```
   1. Go to Supabase SQL Editor
   2. Run: SELECT * FROM profiles WHERE email = 'test@example.com'
   3. Should see approval_status = 'pending'
   ```

3. **Test Pending Approval Login**
   ```
   1. Go to http://localhost:5174
   2. Try to login with the new account
   3. Should see error: "Your account is pending approval..."
   ```

4. **Test Admin Approval**
   ```
   1. Login as admin (email: admin@wevysya.com)
   2. Click "Pending Approvals" in sidebar
   3. Find the new signup
   4. Click "Approve"
   5. Go back to PendingMembers, verify it's gone
   ```

5. **Test Login After Approval**
   ```
   1. Logout
   2. Login with the approved account
   3. Should successfully login and see Dashboard
   ```

## Database Schema Reference

### profiles table
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  approval_status text DEFAULT 'pending',    -- ← NEW
  house_id uuid REFERENCES houses(id),
  zone text,
  business text,
  industry text,
  keywords text[],
  avatar_url text,
  mobile text,
  created_at timestamptz DEFAULT now()
);
```

### Key Query Examples

```sql
-- Get all pending signups
SELECT id, email, full_name, created_at 
FROM profiles 
WHERE approval_status = 'pending'
ORDER BY created_at DESC;

-- Approve a signup
UPDATE profiles 
SET approval_status = 'approved' 
WHERE id = ? AND approval_status = 'pending';

-- Get approved users
SELECT id, email, full_name, role 
FROM profiles 
WHERE approval_status = 'approved';

-- Get all approval statuses
SELECT approval_status, COUNT(*) 
FROM profiles 
GROUP BY approval_status;
```

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `src/components/Signup.tsx` | Enhanced error handling, always set approval_status | ✅ Done |
| `supabase/migrations/20260217130000_add_approval_status_column.sql` | New migration to add column | ✅ Done |
| `supabase/migrations/20260205083502_fix_all_rls_policies.sql` | Fixed INSERT policy security | ✅ Done |
| `QUICK_FIX_SIGNUP.sql` | One-click SQL fix | ✅ Created |
| `SIGNUP_ERROR_FIX.md` | User-facing fix guide | ✅ Created |

## Rollback (If Needed)

If you need to rollback the changes:

```sql
-- Remove approval_status column
ALTER TABLE profiles DROP COLUMN IF EXISTS approval_status CASCADE;

-- Revert RLS policy to allow any authenticated insert
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
CREATE POLICY "Enable insert for authenticated users"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

## Next Steps

1. **Apply the Migration**
   - Run [QUICK_FIX_SIGNUP.sql](./QUICK_FIX_SIGNUP.sql) in Supabase SQL Editor

2. **Test the Fix**
   - Follow "Testing Signup Locally" section above

3. **Deploy to Production**
   - The migration file will deploy automatically from supabase/migrations directory

4. **Monitor**
   - Watch for signup errors in application logs
   - Check Supabase logs for any database issues

## Support

For issues or questions:
1. Check the [SIGNUP_ERROR_FIX.md](./SIGNUP_ERROR_FIX.md) guide
2. Review this comprehensive guide
3. Check browser console (F12) for detailed error messages
4. Check Supabase project logs for database errors
