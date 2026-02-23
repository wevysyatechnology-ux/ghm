# Member Self-Signup & Approval System

## Overview

Your WeVysya Global House Management system now has a complete member self-signup system with admin approval workflow. Members can register themselves, and super admins/global admins can review and approve or reject their registrations.

## Features Implemented

### 1. **Self-Signup Page**
- Beautiful registration form matching your app design
- Fields: Full Name, Email, Mobile, Business, Industry, Password
- Password confirmation validation
- Success screen with clear instructions
- Mobile-responsive design

### 2. **Admin Approval Interface**
- Dedicated "Pending Approvals" page
- Card-based layout showing all pending members
- One-click approve/reject buttons
- Detailed member information modal
- Real-time pending count display

### 3. **Enhanced Login Flow**
- Sign Up button on login page
- Approval status checks during login
- Clear error messages for pending/rejected accounts
- Seamless navigation between login and signup

### 4. **Database Integration**
- New `approval_status` field in profiles table
- Three statuses: pending, approved, rejected
- Secure RPC function for approvals
- Automatic status checking

## Setup Instructions

### Step 1: Run Database Migration

**IMPORTANT: You must run this SQL in your Supabase SQL Editor:**

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `ADD_MEMBER_APPROVAL.sql`
4. Click "Run" to execute

**What this does:**
- Adds `approval_status` column to profiles table
- Creates the `approve_member()` function
- Sets existing members to "approved" status
- Adds database indexes for performance

### Step 2: Deploy Edge Function (Manual)

**Note:** The edge function deployment encountered an issue. You'll need to deploy it manually:

1. Go to your Supabase Dashboard → Edge Functions
2. Create a new function named `create-member`
3. Copy the code from `supabase/functions/create-member/index.ts`
4. Deploy the function

**Alternative:** If you have Supabase CLI installed:
```bash
supabase functions deploy create-member
```

### Step 3: Verify the Setup

1. **Test Member Signup:**
   - Logout from the web portal
   - Click "Sign Up" on the login page
   - Fill in the registration form
   - Submit and verify success screen

2. **Test Admin Approval:**
   - Login as super_admin (admin@wevysya.com)
   - Click "Pending Approvals" in sidebar
   - Verify you see the test registration
   - Click "Approve" button

3. **Test Login Flow:**
   - Logout and try logging in with the test user
   - Should see appropriate message based on approval status

## How It Works

### Member Registration Flow

1. **Member visits signup page** → Fills in personal and business information
2. **Account created** → Auth user created with `pending` approval status
3. **Confirmation screen** → Member sees success message with next steps
4. **Login blocked** → Member cannot login until approved

### Admin Approval Flow

1. **Admin sees notification** → "Pending Approvals" menu item shows count
2. **Reviews details** → Views member information in card or modal
3. **Makes decision** → Clicks Approve or Reject
4. **Status updated** → Member's approval_status changes
5. **Member notified** → (Future: Email notification)

### Login Behavior

| Approval Status | Can Login? | Message Shown |
|----------------|-----------|---------------|
| `pending` | ❌ No | "Your account is pending approval..." |
| `approved` | ✅ Yes (if admin role) | Normal login |
| `approved` | ❌ No (if member role) | "Members can only login through mobile app..." |
| `rejected` | ❌ No | "Your account registration was not approved..." |

## Files Created/Modified

### New Components
- `src/components/Signup.tsx` - Member registration page
- `src/components/PendingMembers.tsx` - Admin approval interface

### Modified Components
- `src/App.tsx` - Added signup routing and pending members view
- `src/components/Login.tsx` - Added Sign Up button
- `src/components/Sidebar.tsx` - Added Pending Approvals menu item
- `src/contexts/AuthContext.tsx` - Added approval status checks
- `src/types/index.ts` - Added approval_status field

### Database Files
- `ADD_MEMBER_APPROVAL.sql` - Database migration
- `supabase/functions/create-member/index.ts` - Edge function for member creation

### Documentation
- `SETUP_CHECKLIST.md` - Detailed setup guide
- `MEMBER_SIGNUP_APPROVAL.md` - This file

## User Interface

### Navigation
**Super Admin Sidebar:**
- Dashboard
- Houses
- Members
- **Pending Approvals** ← NEW!
- Users
- Links
- Deals
- I2WE
- Attendance
- Reports

### Login Page
- Email field
- Password field
- Sign In button
- **"Sign Up" link** ← NEW!

### Pending Approvals Page
- Header with pending count
- Grid of pending member cards
- Quick approve/reject buttons
- Click card for detailed view

## Security Features

### Authorization
- Only super_admin and global_admin can approve members
- RLS policies prevent unauthorized access
- Secure RPC function for approvals

### Data Validation
- Email format validation
- Password strength requirements (min 6 characters)
- Password confirmation matching
- Required field validation

### Login Protection
- Pending members blocked from login
- Rejected members blocked from login
- Role-based access control maintained

## Status Badge System

Members list now shows approval status badges:

- **Pending** → Yellow badge with "Pending" text
- **Rejected** → Red badge with "Rejected" text
- **Approved** → No badge (normal display)

## Future Enhancements

Consider adding:
1. Email notifications when members are approved/rejected
2. Bulk approve/reject functionality
3. Search and filter in pending members list
4. Comments/notes on approval decisions
5. Approval history/audit log
6. Auto-rejection after X days of inactivity

## Troubleshooting

### Issue: "Function approve_member does not exist"
**Solution:** Run the `ADD_MEMBER_APPROVAL.sql` migration in Supabase SQL Editor

### Issue: Pending Approvals menu not showing
**Solution:** Verify you're logged in as super_admin or global_admin

### Issue: Sign Up link not visible
**Solution:** Make sure you're on the login page (logout if needed)

### Issue: Edge function error when creating member
**Solution:** Deploy the edge function manually (see Step 2)

### Issue: Members stuck in pending status
**Solution:** Check that the approve_member RPC function is properly created

## API Reference

### RPC Function: approve_member

```sql
approve_member(
  member_id uuid,
  new_status text  -- 'approved' or 'rejected'
)
```

**Usage in code:**
```typescript
await supabase.rpc('approve_member', {
  member_id: memberId,
  new_status: 'approved',
});
```

## Testing Checklist

- [ ] Member can access signup page
- [ ] Signup form validation works
- [ ] Member account created successfully
- [ ] Success screen displayed
- [ ] Pending member cannot login
- [ ] Pending Approvals menu visible to admin
- [ ] Admin can see pending member details
- [ ] Approve button works
- [ ] Reject button works
- [ ] Approved member can login (based on role)
- [ ] Rejected member cannot login
- [ ] Status badges show correctly in Members list

## Support

If you encounter any issues:
1. Check Supabase logs for errors
2. Verify database migration ran successfully
3. Ensure edge function is deployed
4. Check browser console for client-side errors
5. Verify RLS policies are in place

---

**Implementation Complete!** ✅

All features are ready to use. Run the database migration, deploy the edge function, and start testing!
