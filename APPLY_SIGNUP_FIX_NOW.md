# 🚀 Fix Signup Issues - Step by Step Guide

## What This Fixes
✅ New member signup errors  
✅ Profile creation issues  
✅ Approval workflow problems  
✅ Database trigger failures  

---

## 📋 Step 1: Apply Database Fix

### Go to Your Supabase Dashboard

1. **Open Supabase Dashboard**  
   Navigate to: https://app.supabase.com/project/vlwppdpodavowfnyhtkh

2. **Open SQL Editor**  
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Fix SQL**  
   - Open file: `FIX_SIGNUP_COMPLETE.sql`
   - Copy ALL the content
   - Paste into Supabase SQL Editor
   - Click **"Run"** button (or press Ctrl+Enter)

4. **Wait for Success**  
   You should see messages like:
   ```
   ✓ users_profile table created/verified
   ✓ profiles table approval_status added
   ✓ Unified trigger creates both tables
   ✓ RLS policies configured correctly
   ✓ approve_member function created
   ```

---

## 🔄 Step 2: Code Already Updated

The signup code has been automatically updated in:
- ✅ `src/components/Signup.tsx`

### What Changed:
1. **Trigger now creates both tables** - `users_profile` AND `profiles`
2. **Business info updated** - After signup, business and industry fields are added
3. **Better error handling** - More informative error messages
4. **Approval workflow** - New users get `approval_status = 'pending'`

---

## 🧪 Step 3: Test the Fix

### Test New Member Signup

1. **Open your app** in browser
2. **Go to Signup page**
3. **Fill in the form:**
   - Full Name: `Test User`
   - Email: `testuser@example.com`
   - Mobile: `9876543210`
   - Business: `Test Business`
   - Industry: `Technology`
   - Password: `test123` (minimum 6 characters)
   - Confirm Password: `test123`

4. **Click "Create Account"**

5. **Expected Result:**
   ```
   ✓ "Registration Successful!"
   ✓ "Your account has been created and is pending approval"
   ✓ Message about waiting for admin review
   ```

### Verify in Database

Go to Supabase Dashboard → Table Editor:

1. **Check `auth.users` table**
   - Should have new user with email `testuser@example.com`

2. **Check `users_profile` table**
   - Should have entry with `full_name` and `phone_number`

3. **Check `profiles` table**
   - Should have entry with:
     - `full_name`: Test User
     - `email`: testuser@example.com
     - `mobile`: 9876543210
     - `business`: Test Business
     - `industry`: Technology
     - `approval_status`: **pending**
     - `role`: member

### Test Admin Approval

1. **Login as admin** (super_admin or global_admin)
2. **Go to "Pending Approvals"** menu
3. **You should see** the test user in pending list
4. **Click on the user** to see details
5. **Click "Approve"** button
6. **Verify** approval_status changed to 'approved'

### Test Login After Approval

1. **Logout** from admin account
2. **Try to login** with test user credentials:
   - Email: `testuser@example.com`
   - Password: `test123`
3. **Expected Result:**
   - ✓ Should login successfully
   - ✓ Should see dashboard

---

## 🔍 Troubleshooting

### Issue: "Failed to create account"

**Check:**
- Did you run the SQL script completely?
- Check Supabase logs for errors
- Verify trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```

### Issue: "Account is pending approval" on first admin

**Solution:**
If you need to manually approve the first admin:
```sql
-- Run this in Supabase SQL Editor
UPDATE profiles 
SET approval_status = 'approved', role = 'super_admin'
WHERE email = 'your-email@example.com';
```

### Issue: No profile created after signup

**Check Trigger Function:**
```sql
-- View trigger function
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

**Check Logs:**
- Go to Database → Logs in Supabase Dashboard
- Look for errors during signup

### Issue: RLS Policy blocking updates

**Verify Policies:**
```sql
-- Check profiles policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## 📊 Verify Everything Works

Run these queries in Supabase SQL Editor to verify setup:

```sql
-- 1. Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('users_profile', 'profiles');

-- 2. Check trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 3. Check function exists
SELECT proname 
FROM pg_proc 
WHERE proname IN ('handle_new_user', 'approve_member');

-- 4. Check approval_status column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'approval_status';

-- 5. View all pending members
SELECT id, email, full_name, approval_status, role, created_at
FROM profiles
WHERE approval_status = 'pending'
ORDER BY created_at DESC;
```

---

## ✨ What Happens Now

### For New Signups:
1. User fills signup form
2. Auth account created
3. **Trigger automatically creates:**
   - Entry in `users_profile` (full_name, phone_number)
   - Entry in `profiles` (all fields, approval_status = 'pending')
4. User sees success message
5. User cannot login until approved

### For Admins:
1. New signups appear in "Pending Approvals"
2. Admin reviews member details
3. Admin clicks "Approve" or "Reject"
4. `approve_member()` function updates status
5. Approved users can now login

### For Approved Users:
1. Login with credentials
2. System checks `approval_status`
3. If 'approved' → login successful
4. If 'pending' → show "waiting for approval"
5. If 'rejected' → show rejection message

---

## 🎉 Success Checklist

- [ ] SQL script executed successfully
- [ ] No errors in Supabase logs
- [ ] Test signup completed
- [ ] `users_profile` entry created
- [ ] `profiles` entry created with pending status
- [ ] Pending member appears in admin panel
- [ ] Admin can approve member
- [ ] Approved member can login
- [ ] Dashboard loads correctly

---

## 🆘 Need Help?

If you encounter any issues:

1. **Check Supabase Logs**
   - Dashboard → Database → Logs
   - Look for red error messages

2. **Verify Database Schema**
   - Table Editor → Check tables exist
   - SQL Editor → Run verification queries above

3. **Check Browser Console**
   - Press F12 → Console tab
   - Look for JavaScript errors during signup

4. **Test with Different Email**
   - Some email providers block test emails
   - Try with a real email address

---

## 📝 Notes

- **Email Confirmation**: If Supabase has email confirmation enabled, users need to verify email first
- **Rate Limiting**: Supabase may rate-limit signups (check project settings)
- **RLS Policies**: All policies are now correctly configured for the approval workflow
- **Trigger**: The unified trigger handles both table insertions automatically

---

## 🔐 Security Features

✅ **Row Level Security (RLS)** enabled on all tables  
✅ Users can only view their own profile  
✅ Admins can view all profiles  
✅ Users can only insert their own profile  
✅ Approval required before login  
✅ Secure `approve_member()` function checks admin role  

---

**Last Updated:** February 18, 2026  
**Project:** WeVysya GHM 2.0  
**Supabase Project:** vlwppdpodavowfnyhtkh
