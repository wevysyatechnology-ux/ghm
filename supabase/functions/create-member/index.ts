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

    // Create the auth user with service role
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name,
      },
    });

    if (createError) {
      throw new Error(`Failed to create auth user: ${createError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create auth user');
    }

    // Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update the profile with additional details
    const updateData: any = {
      full_name: body.full_name,
      role: body.role || 'member',
      approval_status: 'approved', // Admin-created members are auto-approved
      house_id: body.house_id || null,
      zone: body.zone || null,
      business: body.business || null,
      industry: body.industry || null,
      mobile: body.mobile || null,
      keywords: body.keywords || [],
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', authData.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
      throw new Error(`Failed to update profile: ${updateError.message}`);
    }

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
