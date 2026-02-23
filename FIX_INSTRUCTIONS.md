# Fix Login Issue - Step by Step Instructions

## The Problem
You're seeing "Profile Not Found" because the database schema needs to be updated and the admin user needs to be created properly.

## The Solution (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to: https://vlwppdpodavowfnyhtkh.supabase.co
2. Log in to your Supabase account
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"** button

### Step 2: Run the Fix Script
1. Open the file `FIX_LOGIN_COMPLETE.sql` from your project folder
2. Copy the **ENTIRE** contents of the file
3. Paste it into the SQL Editor
4. Click **"RUN"** button (or press Cmd+Enter / Ctrl+Enter)

### Step 3: Verify the Fix
You should see output showing:
- ✓ AUTH USER - showing the admin user
- ✓ PROFILE - showing the admin profile
- ✓ IDENTITY - showing the email identity
- ✓✓✓ SETUP COMPLETE ✓✓✓

### Step 4: Test the Login
1. Go back to your application
2. **Hard refresh** the page:
   - Mac: Cmd + Shift + R
   - Windows: Ctrl + Shift + F5
   - Or close the tab and reopen it
3. Login with:
   - **Email:** `admin@wevysya.com`
   - **Password:** `Admin@123`

### Step 5: Check Browser Console (Optional)
1. Open Developer Tools (F12)
2. Go to the **Console** tab
3. You should see:
   - "Starting sign in..."
   - "Sign in successful!"
   - "Fetching profile for user ID: [uuid]"
   - "Profile fetch result: {data: {...}, error: null}"
   - "AppContent state: {user: true, profile: true, loading: false}"

---

## Still Not Working?

### Option A: Run the Test Script
1. Go to SQL Editor in Supabase
2. Open the file `TEST_LOGIN.sql`
3. Copy and paste the entire contents
4. Click **RUN**
5. Check which tests are failing and report back

### Option B: Check for Errors
Open browser console (F12) and look for error messages. Common issues:

**Error: "Invalid login credentials"**
- The SQL script didn't run successfully
- Run `FIX_LOGIN_COMPLETE.sql` again

**Error: "Profile fetch error"**
- RLS policies are blocking the read
- Run `FIX_LOGIN_COMPLETE.sql` again

**Still shows "Profile Not Found"**
- Clear browser cache and cookies
- Try incognito/private window
- Check console for the actual error

### Option C: Manual Verification
Run these queries in SQL Editor one by one:

```sql
-- Check if user exists
SELECT * FROM auth.users WHERE email = 'admin@wevysya.com';

-- Check if profile exists
SELECT * FROM profiles WHERE email = 'admin@wevysya.com';

-- Check if auth_user_id column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'auth_user_id';
```

If any of these return no results, run `FIX_LOGIN_COMPLETE.sql` again.

---

## What Changed?

The fix script does the following:

1. **Adds `auth_user_id` column** - This allows profiles to link to auth users properly
2. **Removes old constraints** - Removes foreign key on `id` that was causing issues
3. **Updates RLS policies** - Allows authenticated users to read all profiles
4. **Creates admin user** - Creates the user in auth.users with confirmed email
5. **Creates admin profile** - Creates the profile with both `id` and `auth_user_id` set
6. **Creates identity** - Ensures the email provider is set up correctly

---

## Success Criteria

You know it's working when:
- ✅ Login button works and doesn't get stuck
- ✅ No "Profile Not Found" error
- ✅ You see the dashboard with sidebar
- ✅ Console shows successful authentication logs

---

## Need Help?

If you're still having issues after running the fix script:
1. Run `TEST_LOGIN.sql` and share which tests are failing
2. Share any error messages from the browser console
3. Share the output from running `FIX_LOGIN_COMPLETE.sql`
