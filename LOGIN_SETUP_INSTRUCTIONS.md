# Login Setup Instructions

## Issue
The login button shows "Signing in..." but stays on the login page without errors.

## Root Cause
This happens when:
1. The admin user doesn't exist in the database yet
2. The profile is not created for the authenticated user
3. The database schema needs the `auth_user_id` column

## Solution

### Step 1: Run the SQL Script

1. **Open Supabase Dashboard**
   - Go to: https://vlwppdpodavowfnyhtkh.supabase.co
   - Log in to your Supabase account

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query" button

3. **Run the Setup Script**
   - Open the file `CREATE_ADMIN_USER.sql` from your project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click **RUN** (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   - You should see a success message showing:
     - User ID
     - Email: admin@wevysya.com
     - Role: super_admin
     - Message: "✓ Super admin user created successfully!"

### Step 2: Test Login

1. **Refresh Your Application**
   - Go back to your application
   - Hard refresh the page (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

2. **Login with Admin Credentials**
   - Email: `admin@wevysya.com`
   - Password: `Admin@123`

3. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to the Console tab
   - You should see debug logs:
     - "Starting sign in..."
     - "Sign in successful!"
     - "Fetching profile for user ID: [uuid]"
     - "Profile fetch result: {data: {...}, error: null}"
     - "AppContent state: {user: true, profile: true, loading: false}"

### Step 3: Troubleshooting

If login still doesn't work, check the following:

#### Issue: "Invalid login credentials"
- **Solution**: The SQL script didn't run successfully
- **Fix**: Run the `CREATE_ADMIN_USER.sql` script again

#### Issue: "Profile Not Found" message appears
- **Solution**: The profile wasn't created or RLS policies are blocking it
- **Fix**:
  1. Check the Console for error messages
  2. Go to Supabase Dashboard → SQL Editor
  3. Run this query to manually check:
     ```sql
     SELECT * FROM profiles WHERE email = 'admin@wevysya.com';
     ```
  4. If no results, run the `CREATE_ADMIN_USER.sql` script again

#### Issue: Stuck on "Signing in..." forever
- **Solution**: Check browser console for errors
- **Common causes**:
  - Network issue with Supabase
  - Wrong Supabase URL or API key
  - RLS policies blocking the request

#### Issue: Console shows "Profile fetch error"
- **Solution**: RLS policies need to be updated
- **Fix**: Run the `CREATE_ADMIN_USER.sql` script which includes RLS policy updates

## What Changed in the Code

1. **AuthContext.tsx**: Added detailed logging for debugging authentication flow
2. **Login.tsx**: Added better error messages and logging
3. **App.tsx**: Added separate handling for missing profile vs missing user
4. **SQL Scripts**: Created simplified script to set up admin user correctly

## After Successful Login

Once logged in as super admin, you can:
- ✓ Add new houses
- ✓ Add new members (without requiring them to have login credentials)
- ✓ Manage all users and roles
- ✓ View all reports and analytics

## Support

If you're still having issues:
1. Check the browser console for error messages
2. Check the Network tab for failed requests
3. Verify your Supabase credentials in `.env` file
4. Make sure you're using the correct Supabase project
