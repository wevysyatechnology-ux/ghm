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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: callerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !callerProfile) {
      throw new Error('Unable to verify permissions');
    }

    if (!['super_admin', 'global_admin', 'collaborator'].includes(callerProfile.role)) {
      throw new Error('Only admins and collaborators can create members');
    }

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

    let userId: string;
    let wasExisting = false;

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
      const msg = createError.message.toLowerCase();
      const alreadyRegistered =
        msg.includes('already registered') ||
        msg.includes('already exists') ||
        msg.includes('duplicate') ||
        msg.includes('unique');

      if (!alreadyRegistered) {
        throw new Error(`Failed to create auth user: ${createError.message}`);
      }

      // Auth user already exists — look them up by email using a paginated search
      let existingUser: { id: string; email?: string } | undefined;
      let page = 1;
      const perPage = 1000;

      while (!existingUser) {
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
          page,
          perPage,
        });
        if (listError) {
          throw new Error(`Failed to look up existing user: ${listError.message}`);
        }
        existingUser = listData.users.find(
          (u) => u.email?.toLowerCase() === body.email.toLowerCase()
        );
        if (listData.users.length < perPage) break;
        page++;
      }

      if (!existingUser) {
        throw new Error('User already registered but could not be found');
      }

      userId = existingUser.id;
      wasExisting = true;
    } else {
      if (!authData.user) {
        throw new Error('Failed to create auth user');
      }
      userId = authData.user.id;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const upsertData: Record<string, unknown> = {
      id: userId,
      auth_user_id: userId,
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
        id: userId,
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
        user_id: userId,
        was_existing: wasExisting,
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
