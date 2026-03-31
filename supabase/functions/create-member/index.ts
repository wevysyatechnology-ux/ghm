import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  email: string;
  password: string;
  full_name: string;
  role?: string;
  membership_status?: string;
  house_id?: string | null;
  zone?: string | null;
  business?: string | null;
  industry?: string | null;
  mobile?: string | null;
  keywords?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the caller is authenticated
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify the caller is an admin
    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      throw new Error('Unable to verify permissions');
    }

    if (!['super_admin', 'global_admin'].includes(callerProfile.role)) {
      throw new Error('Only super admins and global admins can create members');
    }

    // Parse request body
    const body: RequestBody = await req.json();

    if (!body.email || !body.password || !body.full_name) {
      throw new Error('Missing required fields: email, password, full_name');
    }

    const statusAliasMap: Record<string, string> = {
      active: 'active',
      inactive: 'inactive',
      resigned: 'resigned',
      expired: 'expired',
      terminated: 'terminated',
      suspended: 'inactive',
      left: 'resigned',
    };
    const rawStatus = (body.membership_status || 'active').toLowerCase().trim();
    const membershipStatus = statusAliasMap[rawStatus] ?? 'active';
    const isSuspended = membershipStatus !== 'active';

    // Create the auth user with service role
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
        mobile: body.mobile || null,
        business: body.business || null,
        industry: body.industry || null,
        house_id: body.house_id || null,
      },
    });

    if (createError) {
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    // Wait for trigger to run, then upsert profile with all correct values
    await new Promise(resolve => setTimeout(resolve, 1000));

    const upsertData: any = {
      id: authData.user.id,
      auth_user_id: authData.user.id,
      email: body.email,
      full_name: body.full_name,
      role: body.role || 'member',
      membership_status: membershipStatus,
      approval_status: 'approved',
      house_id: body.house_id || null,
      zone: body.zone || null,
      business: body.business || null,
      industry: body.industry || null,
      mobile: body.mobile || null,
      keywords: body.keywords || [],
    };

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert(upsertData, { onConflict: 'id' });

    if (upsertError) {
      console.error('Profile upsert error:', upsertError);
      throw new Error(`Failed to update profile: ${upsertError.message}`);
    }

    await supabase
      .from('users_profile')
      .upsert({
        id: authData.user.id,
        full_name: body.full_name,
        phone_number: body.mobile || null,
        business_category: body.business || null,
        membership_status: membershipStatus,
        is_suspended: isSuspended,
        attendance_status: 'normal',
        absence_count: 0,
      }, { onConflict: 'id' });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Create member error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create member',
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    );
  }
});
