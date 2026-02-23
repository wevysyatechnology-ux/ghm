# 🚨 QUICK FIX: Run This Now!

## The Error You're Seeing

**ERROR: 42501: permission denied for schema auth**

This means the first fix script tried to create functions in the `auth` schema, which requires super admin permissions.

## ✅ The Solution: Use the New Fix Script

### Run This File: **`FIX_RLS_POLICIES_V2.sql`**

**Step-by-Step Instructions:**

1. **Open Supabase SQL Editor:**
   - Go to: https://vlwppdpodavowfnyhtkh.supabase.co/project/vlwppdpodavowfnyhtkh/editor
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Copy the new fix script:**
   - Open **`FIX_RLS_POLICIES_V2.sql`** (the NEW file)
   - Select ALL content (Ctrl+A / Cmd+A)
   - Copy it (Ctrl+C / Cmd+C)

3. **Paste and run:**
   - Paste into the SQL Editor
   - Click **"Run"** button
   - Wait for success message: `✅ ✅ ✅ RLS FIXED! ✅ ✅ ✅`

4. **Clear browser cache:**
   - Press **F12** to open Developer Tools
   - Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
   - Click **Local Storage** → `http://localhost:5173`
   - Right-click and select **"Clear"**
   - Close Developer Tools

5. **Refresh and login:**
   - Press **Ctrl+Shift+R** (Windows/Linux) or **Cmd+Shift+R** (Mac)
   - Login with:
     - **Email:** admin@wevysya.com
     - **Password:** Admin@123

## What Changed in V2?

✅ Helper functions now created in `public` schema (not `auth`)
✅ Uses `SECURITY DEFINER` to safely bypass RLS
✅ Simpler policies that work within your permissions
✅ No more permission errors!

## Files Overview

| File | Status | Purpose |
|------|--------|---------|
| ~~`FIX_RLS_POLICIES.sql`~~ | ❌ Don't use | Old version (permission error) |
| **`FIX_RLS_POLICIES_V2.sql`** | ✅ **USE THIS** | New working version |
| `SETUP_DATABASE.sql` | ℹ️ Alternative | Full database setup from scratch |

## Still Having Issues?

### If you get "admin user does not exist":
1. Run **`SETUP_DATABASE.sql`** first to create the admin user
2. Then run **`FIX_RLS_POLICIES_V2.sql`**

### If you get "invalid login credentials":
1. The admin user might not be created yet
2. Run **`SETUP_DATABASE.sql`** to create it
3. Use credentials: admin@wevysya.com / Admin@123

### If you get "pending approval":
1. Run **`FIX_RLS_POLICIES_V2.sql`** again
2. It will automatically approve the admin user

### If nothing works:
1. Run **`SETUP_DATABASE.sql`** (creates everything from scratch)
2. Clear browser cache completely
3. Restart your dev server
4. Try logging in again

## Why V2 Works

**The Problem with V1:**
```sql
-- V1: Tried to create in auth schema (requires super admin)
CREATE FUNCTION auth.user_role() ...  -- ❌ Permission denied!
```

**The Fix in V2:**
```sql
-- V2: Creates in public schema (works with your permissions)
CREATE FUNCTION public.get_user_role(user_id uuid) ...  -- ✅ Works!
```

The `SECURITY DEFINER` flag lets these functions run with elevated privileges to bypass RLS, but they're created in the `public` schema which you have access to.

---

**Quick Summary:**
1. Run **`FIX_RLS_POLICIES_V2.sql`** in Supabase SQL Editor
2. Clear browser cache
3. Refresh page
4. Login: admin@wevysya.com / Admin@123
