# 🚨 URGENT: Fix Login Issue

## The Problem

You're experiencing an **infinite recursion error** in the database. This happens when Row Level Security (RLS) policies reference the same table they're protecting, creating an infinite loop.

**Error:** `infinite recursion detected in policy for relation "profiles"`

## The Solution (2 Simple Steps)

### Step 1: Run the Fix Script (REQUIRED)

1. **Open your Supabase SQL Editor:**
   - Go to: https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/editor
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Run the fix:**
   - Open the file **`FIX_RLS_POLICIES.sql`** in this project
   - Copy **ALL** the contents
   - Paste into the SQL Editor
   - Click **"Run"**

3. **Wait for success message:**
   - You should see: `✅ ✅ ✅ RLS POLICIES FIXED! ✅ ✅ ✅`

### Step 2: Clear Browser Cache and Login

1. **Clear your browser's local storage:**
   - Press **F12** to open Developer Tools
   - Go to **"Application"** tab (Chrome) or **"Storage"** tab (Firefox)
   - Click **"Local Storage"** → `http://localhost:5173`
   - Click **"Clear All"** or right-click and delete
   - Close Developer Tools

2. **Refresh the page:**
   - Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)

3. **Login with:**
   - **Email:** admin@wevysya.com
   - **Password:** Admin@123

## What the Fix Does

The `FIX_RLS_POLICIES.sql` script:

✅ Removes all existing RLS policies that cause recursion
✅ Creates helper functions that bypass RLS checks safely
✅ Adds new non-recursive policies
✅ Ensures your admin account is approved
✅ Makes all tables accessible without infinite loops

## Alternative: Full Database Setup

If you haven't set up your database yet, you can run **`SETUP_DATABASE.sql`** instead. It includes:
- All table creation
- RLS policies (non-recursive)
- Admin user creation
- Complete schema setup

## Why This Happened

The original RLS policies had this pattern:

```sql
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles  -- ❌ This queries profiles while checking profiles!
      WHERE profiles.id = auth.uid()
    )
  );
```

When you try to SELECT from `profiles`, the policy checks by running another SELECT on `profiles`, which triggers the policy again, creating infinite recursion.

## The Fix

The new approach uses helper functions with `SECURITY DEFINER` that bypass RLS:

```sql
-- This function runs without RLS checks
CREATE FUNCTION auth.user_role()
RETURNS text
SECURITY DEFINER  -- ✅ Bypasses RLS
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

-- Now policies can use this function safely
CREATE POLICY "Admins can insert houses"
  ON houses FOR INSERT
  WITH CHECK (
    auth.user_role() IN ('super_admin', 'global_admin')  -- ✅ No recursion!
  );
```

## Troubleshooting

### Still getting "infinite recursion" error?
- Make sure you ran **`FIX_RLS_POLICIES.sql`** completely
- Check the SQL Editor for any error messages
- Clear browser cache and local storage
- Restart your dev server

### "Invalid login credentials" error?
- The admin user might not exist
- Run **`SETUP_DATABASE.sql`** to create it
- Make sure you're using: admin@wevysya.com / Admin@123

### "Account pending approval" error?
- Your account exists but isn't approved
- Run **`FIX_RLS_POLICIES.sql`** which will approve the admin
- Or manually update in Supabase dashboard

### Can't connect to database?
- Check your `.env` file has correct credentials
- Verify your Supabase project is active
- Try running **`SETUP_DATABASE.sql`** first

## Files in This Project

| File | Purpose |
|------|---------|
| **`FIX_RLS_POLICIES.sql`** | ⚡ **RUN THIS FIRST** - Fixes infinite recursion |
| **`SETUP_DATABASE.sql`** | Complete database setup (includes tables + fix) |
| **`APPLY_THIS_SQL.sql`** | Adds approval system only |
| **`LOGIN_FIX.md`** | This file |
| **`START_HERE.md`** | General setup instructions |

## Quick Reference

**Your Database:** https://vlwppdpodavowfnyhtkh.supabase.co
**SQL Editor:** https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/editor

**Admin Credentials:**
- Email: admin@wevysya.com
- Password: Admin@123

---

**Need help?** Make sure you:
1. ✅ Ran `FIX_RLS_POLICIES.sql` in Supabase SQL Editor
2. ✅ Saw the success message
3. ✅ Cleared browser cache/local storage
4. ✅ Refreshed the page
5. ✅ Used correct credentials
