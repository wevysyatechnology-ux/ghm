# Auth Signup Error - Complete Fix Guide

## Problem
Users see **"Database error saving new user"** (500 Internal Server Error) from Supabase Auth when signing up.

## Root Cause
The database trigger `handle_new_user()` that creates user profiles was **silently catching all errors**, preventing the Auth API from knowing what went wrong. Additionally, it wasn't initializing the `approval_status` field.

### The Broken Code
```sql
-- OLD BROKEN TRIGGER:
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;  -- ❌ ERROR SILENTLY IGNORED!
```

When an error occurred:
1. ❌ Trigger catches the error
2. ❌ Just logs it
3. ❌ Returns NEW anyway (pretends success)
4. ❌ Auth API thinks signup succeeded
5. ❌ User is created but no profile or incomplete profile
6. ❌ User cannot login, doesn't understand why

## The Fixes

### Fix #1: Proper Error Handling in Trigger
**File**: `supabase/migrations/20260217131000_fix_auth_signup_trigger.sql`

```sql
-- NEW FIXED TRIGGER:
EXCEPTION
  WHEN unique_violation THEN
    -- Email already exists (safe to ignore)
    RAISE LOG 'Email already exists: %', NEW.email;
    RETURN NEW;
  
  WHEN foreign_key_violation THEN
    -- FK issue (safe to ignore during auth)
    RAISE LOG 'FK violation: %', SQLERRM;
    RETURN NEW;
  
  WHEN others THEN
    -- Unexpected error - LET AUTH API KNOW!
    RAISE LOG 'Unexpected error: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create user profile: %', SQLERRM;
```

**What This Does:**
- ✅ Expected errors (duplicate email, etc.) are silently handled
- ✅ **Unexpected errors now PROPAGATE to Auth API** (the key fix!)
- ✅ Auth API returns proper error message to user
- ✅ User knows signup failed and why

### Fix #2: Add Missing Column
**File**: `supabase/migrations/20260217130000_add_approval_status_column.sql`

Ensures the `approval_status` column exists:
```sql
ALTER TABLE profiles
ADD COLUMN approval_status text DEFAULT 'pending'
CHECK (approval_status IN ('pending', 'approved', 'rejected'));
```

### Fix #3: Trigger Sets approval_status
The trigger now explicitly sets `approval_status = 'pending'`:
```sql
INSERT INTO public.profiles (id, email, full_name, role, approval_status)
VALUES (
  NEW.id,
  NEW.email,
  COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
  COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
  'pending'  -- ✅ Now set explicitly
);
```

### Fix #4: Improved RLS (Already Applied)
**File**: `supabase/migrations/20260205083502_fix_all_rls_policies.sql`

Users can only insert their own profiles (security improvement):
```sql
WITH CHECK (auth.uid() = id)
```

## How to Apply the Fix

### Option 1: Quick Fix (Recommended) ⚡
1. Open [QUICK_FIX_AUTH_SIGNUP.sql](./QUICK_FIX_AUTH_SIGNUP.sql)
2. Copy the entire content
3. Go to Supabase Dashboard → SQL Editor → New Query
4. Paste and click "Run"
5. You'll see verification messages confirming all fixes applied

**This single script applies:**
- ✅ Add approval_status column
- ✅ Fix the trigger function
- ✅ Recreate the trigger
- ✅ Verify all changes

### Option 2: Git Migration (For CI/CD)
The migration files are already committed:
- `supabase/migrations/20260217130000_add_approval_status_column.sql`
- `supabase/migrations/20260217131000_fix_auth_signup_trigger.sql`

They will auto-apply on next deployment.

## Testing the Fix

### Test 1: Verify Changes Applied
Run this in Supabase SQL Editor:
```sql
-- Should show the new trigger code
SELECT prosrc FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Should show approval_status column
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' 
AND column_name = 'approval_status';
```

### Test 2: Test Signup
1. Start the app: `npm run dev`
2. Go to http://localhost:5174
3. Click "Create Account" tab
4. Fill in test data and submit
5. Should either:
   - **✅ Success**: "Registration Successful! Your account is pending approval."
   - **❌ Error**: Get a clear error message explaining what went wrong

### Test 3: Verify Profile Created
```sql
-- Check if new user profile was created
SELECT id, email, full_name, approval_status
FROM profiles
WHERE email = 'test@example.com';

-- Should show approval_status = 'pending'
```

### Test 4: Test Admin Approval
1. Login as admin (admin@wevysya.com)
2. Go to "Pending Approvals" (only visible to super_admin)
3. New signup should appear
4. Click "Approve"
5. User can now login

## Explanation of Solutions

### Why the Original Error Occurred
```
User submits signup form
    ↓
Auth API calls database trigger to create profile
    ↓
Trigger encounters error (column missing, constraint issue, etc.)
    ↓
❌ OLD CODE: Catches error, logs it, returns success anyway
    ↓
Auth API returns 500 error (confused - trigger "succeeded")
    ↓
User sees "Database error saving new user"
```

### Why the Fix Works
```
User submits signup form
    ↓
Auth API calls database trigger to create profile
    ↓
✅ NEW CODE: Handles expected errors, propagates unexpected ones
    ↓
If error: Auth API immediately knows and returns proper error
If success: Profile created with approval_status = 'pending'
    ↓
User sees either success message or clear error description
```

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `supabase/migrations/20260217131000_fix_auth_signup_trigger.sql` | NEW - Fixes trigger with proper error handling | ✅ Created |
| `supabase/migrations/20260217130000_add_approval_status_column.sql` | NEW - Adds approval_status column | ✅ Created |
| `src/components/Signup.tsx` | Enhanced error handling | ✅ Updated |
| `QUICK_FIX_AUTH_SIGNUP.sql` | NEW - One-click fix script | ✅ Created |
| `QUICK_FIX_SIGNUP.sql` | Legacy (column-only fix) | ✅ Exists |

## Troubleshooting

### Still seeing signup errors after fix?
1. Make sure you ran the entire [QUICK_FIX_AUTH_SIGNUP.sql](./QUICK_FIX_AUTH_SIGNUP.sql) script
2. Check that you see "✅ ALL FIXES APPLIED!" message
3. Try a different email address for signup
4. Check browser console (F12) for detailed errors

### Users say "account pending approval" on login?
**This is correct behavior!** After signup, the admin must approve the account.
1. Login as admin
2. Go to "Pending Approvals"
3. Find the user
4. Click "Approve"
5. User can now login

### How do I know if the trigger is working?
Run this after creating a test account:
```sql
SELECT email, approval_status, role, full_name
FROM profiles
WHERE email = 'test@example.com';
```

You should see:
- `approval_status = 'pending'` ✅
- `role = 'member'` ✅
- `full_name = <what user entered>` ✅

## Architecture After Fix

```
SIGNUP FLOW (FIXED):

User fills form → Click "Create Account"
       ↓
supabase.auth.signUp() creates auth user
       ↓
Database trigger fires: handle_new_user()
       ↓
✅ Trigger creates profile row with approval_status='pending'
       ↓
✅ Trigger sets full_name, role, email
       ↓
If error: RAISE EXCEPTION → Auth API returns error to user
If success: Return NEW → User created, approval_status=pending
       ↓
Frontend shows: "Registration Successful! Account pending approval"
       ↓
Admin reviews in "Pending Approvals"
       ↓
Admin approves: UPDATE approval_status='approved'
       ↓
User can login: Auth checks approval_status='approved' ✅
```

## Member Approval Workflow

The complete flow with the approval system:

1. **User Signup** → Creates account with `approval_status = 'pending'`
2. **Admin Review** → Goes to "Pending Approvals" section
3. **Admin Decision** → Click Approve or Reject
4. **User Notification** → Check approval status on next login attempt
5. **Login** → Can only login if `approval_status = 'approved'`

## Next Steps

1. ✅ Run [QUICK_FIX_AUTH_SIGNUP.sql](./QUICK_FIX_AUTH_SIGNUP.sql)
2. ✅ Test signup flow
3. ✅ Verify profile creation with approval_status
4. ✅ Test admin approval process
5. ✅ Verify user can login after approval

## Support

If you're still experiencing issues:
1. Check browser console (F12) for JavaScript errors
2. Check Supabase logs for database errors
3. Verify the fix script ran without errors
4. Make sure you're using the latest browser version
5. Try clearing browser cache and reloading

---
**Status**: ✅ All fixes ready
**Last Updated**: February 17, 2026
