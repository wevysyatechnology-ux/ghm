# Signup Database Error - Fix Guide

## Problem
Users see the error **"Database error saving new user"** when trying to sign up on the WeVysya application.

## Root Cause
The `profiles` table is missing the `approval_status` column, which is required for the signup workflow. When a new user signs up:
1. The auth user is created successfully
2. The trigger creates a profile row
3. The application tries to update the profile with `approval_status = 'pending'`
4. **Error occurs because the `approval_status` column doesn't exist**

## Solution

### Option 1: Quick Fix via Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://app.supabase.com
   - Select your project

2. **Run the SQL Fix**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"** button
   - Open [QUICK_FIX_SIGNUP.sql](./QUICK_FIX_SIGNUP.sql) and copy the entire content
   - Paste it into the SQL Editor
   - Click **"Run"** button
   - Wait for the success messages

3. **Verify the Fix**
   - The query results should show the `approval_status` column
   - You should see success messages in green

### Option 2: Deploy via Migration (For Git-based deployment)

The migration file has been created at:
```
supabase/migrations/20260217130000_add_approval_status_column.sql
```

This migration will automatically run when you next deploy your Supabase changes.

## What Changed in the Code

### 1. New Migration File
- **File**: `supabase/migrations/20260217130000_add_approval_status_column.sql`
- **Purpose**: Adds the missing `approval_status` column to the `profiles` table

### 2. Updated Signup Component
- **File**: `src/components/Signup.tsx`
- **Changes**:
  - Always sets `approval_status: 'pending'` for new signups (no longer checks if column exists)
  - Throws error if profile update fails
  - Simpler and more robust error handling

### 3. Enhanced RLS Security
- **File**: `supabase/migrations/20260205083502_fix_all_rls_policies.sql`
- **Change**: Updated INSERT policy for profiles to `WITH CHECK (auth.uid() = id)`
  - Users can now only insert their own profile (more secure)

## Testing the Fix

After applying the fix:

1. **Try Signup Again**
   - Go to http://localhost:5174 (or your app URL)
   - Click "Create Account"
   - Fill in the form with test data
   - Click "Create Account"
   - Should see success message: "Registration Successful! Your account has been created and is pending approval."

2. **Check Admin Approval Panel**
   - Login as admin user
   - Navigate to "Pending Approvals"
   - New signup should appear in the list
   - Admin can approve/reject the account

3. **Check User Approval Status**
   - User tries to login before approval
   - Should see: "Your account is pending approval. Please contact an administrator."

## Database Schema

The `profiles` table now includes:
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text DEFAULT 'member',
  approval_status text DEFAULT 'pending',  -- ← NEW COLUMN
  house_id uuid,
  zone text,
  business text,
  industry text,
  keywords text[],
  avatar_url text,
  mobile text,
  created_at timestamptz
);
```

## Troubleshooting

**Still getting "Database error saving new user" after fix?**
1. Make sure you ran the SQL query and saw success messages
2. Try a different email address for signup
3. Check browser console (F12) for more detailed error messages
4. Check Supabase project logs for database errors

**Approval button not working?**
- Make sure you're logged in as a super_admin user
- Check PendingMembers component in Sidebar

**"Your account is pending approval" message on login?**
- This is correct behavior - user needs to wait for admin approval
- Admin should go to "Pending Approvals" and approve the account

## Related Files
- [Signup Component](./src/components/Signup.tsx)
- [PendingMembers Component](./src/components/PendingMembers.tsx)
- [Auth Context](./src/contexts/AuthContext.tsx) - Checks approval_status on login
- [Database Migration](./supabase/migrations/20260217130000_add_approval_status_column.sql)
