// Supabase Edge Function: create-event-notification
// Deploy: supabase functions deploy create-event-notification
//
// Receives { event_id } → fetches event → resolves targeted members
// based on event_level → sends Expo push notifications + saves to DB.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase        = createClient(supabaseUrl, supabaseService);

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

// ── Resolve targeted auth user IDs based on event level ───────
async function getTargetedAuthIds(event: Record<string, any>): Promise<string[]> {
  let houseIds: string[] = [];

  if (event.event_level === 'house') {
    if (!event.house_id) return [];
    houseIds = [event.house_id];

  } else if (event.event_level === 'zone') {
    if (!event.zone) return [];
    const { data } = await supabase.from('houses').select('id').eq('zone', event.zone);
    houseIds = (data || []).map((h: any) => h.id);

  } else if (event.event_level === 'state') {
    if (!event.state) return [];
    const { data } = await supabase.from('houses').select('id').eq('state', event.state);
    houseIds = (data || []).map((h: any) => h.id);

  } else if (event.event_level === 'country') {
    if (!event.country) return [];
    const { data } = await supabase.from('houses').select('id').eq('country', event.country);
    houseIds = (data || []).map((h: any) => h.id);

  } else if (event.event_level === 'global') {
    // All approved members
    const { data } = await supabase
      .from('profiles')
      .select('id, auth_user_id')
      .eq('approval_status', 'approved');
    return (data || []).map((p: any) => p.auth_user_id || p.id);
  }

  if (houseIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, auth_user_id')
    .in('house_id', houseIds)
    .eq('approval_status', 'approved');

  return (profiles || []).map((p: any) => p.auth_user_id || p.id);
}

// ── Build notification text based on level ────────────────────
function buildNotification(event: Record<string, any>, houseName: string) {
  const date = new Date(event.event_date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const time = event.event_time
    ? ` at ${event.event_time.slice(0, 5)}`
    : '';

  const scopeLabel: Record<string, string> = {
    house:   `Your house "${houseName}"`,
    zone:    `${event.zone} Zone`,
    state:   event.state,
    country: event.country,
    global:  'WeVysya Global',
  };
  const scope = scopeLabel[event.event_level] || 'WeVysya';

  return {
    title: `📅 ${event.title}`,
    body:  `${scope} has an event on ${date}${time}.${event.location ? ` 📍 ${event.location}` : ''} Tap to view details.`,
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  try {
    const { event_id } = await req.json();
    if (!event_id) return json({ error: 'event_id is required' }, 400);

    // ── Fetch event ──────────────────────────────────────────
    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('*, house:house_id(name)')
      .eq('id', event_id)
      .single();

    if (evErr || !event) return json({ error: 'Event not found' }, 404);
    if (!event.send_notification)
      return json({ message: 'Notifications disabled for this event.' });

    const houseName = event.house?.name || '';

    // ── Resolve targeted users ───────────────────────────────
    const targetUserIds = await getTargetedAuthIds(event);
    if (targetUserIds.length === 0)
      return json({ message: 'No targeted members found.', sentCount: 0 });

    const { title, body } = buildNotification(event, houseName);
    const notifData = {
      event_id:    event.id,
      event_level: event.event_level,
      event_date:  event.event_date,
      house_id:    event.house_id,
      zone:        event.zone,
      state:       event.state,
      country:     event.country,
      meeting_link: event.meeting_link,
      location:    event.location,
    };

    // ── Save notifications to DB ─────────────────────────────
    const notifRecords = targetUserIds.map(uid => ({
      user_id:         uid,
      type:            'event_created',
      title,
      body,
      data:            notifData,
      read:            false,
      delivery_status: 'pending',
      created_at:      new Date().toISOString(),
    }));

    // Insert in chunks of 500 to avoid payload limits
    for (let i = 0; i < notifRecords.length; i += 500) {
      await supabase.from('notifications').insert(notifRecords.slice(i, i + 500));
    }

    // ── Fetch push tokens ────────────────────────────────────
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('user_id, expo_push_token')
      .in('user_id', targetUserIds);

    if (!tokens || tokens.length === 0)
      return json({ message: 'Notifications saved. No push tokens found.', sentCount: 0 });

    // ── Check notification preferences ───────────────────────
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', targetUserIds);

    const prefMap = new Map((prefs || []).map((p: any) => [p.user_id, p.push_enabled]));
    const validTokens = tokens.filter((t: any) => prefMap.get(t.user_id) !== false);

    if (validTokens.length === 0)
      return json({ message: 'Notifications saved. Push disabled by users.', sentCount: 0 });

    // ── Send to Expo Push API in batches of 100 ───────────────
    const messages = validTokens.map((t: any) => ({
      to:       t.expo_push_token,
      sound:    'default',
      title,
      body,
      data:     { type: 'event_created', ...notifData },
      priority: 'high',
      channelId: 'default',
    }));

    let sentCount = 0;
    for (let i = 0; i < messages.length; i += 100) {
      const batch = messages.slice(i, i + 100);
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(batch),
      });
      if (res.ok) sentCount += batch.length;
    }

    // ── Update delivery status ────────────────────────────────
    await supabase
      .from('notifications')
      .update({ delivery_status: 'sent' })
      .in('user_id', targetUserIds)
      .eq('type', 'event_created')
      .eq('delivery_status', 'pending');

    return json({ success: true, targetedMembers: targetUserIds.length, sentCount });

  } catch (err: any) {
    console.error('create-event-notification error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
});
