import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VIDEOSDK_API_KEY = (Deno.env.get('VIDEOSDK_API_KEY') ?? '').trim();
const VIDEOSDK_SECRET_KEY = (Deno.env.get('VIDEOSDK_SECRET_KEY') ?? '').trim();
const API = 'https://api.videosdk.live/v2';
const STAFF_ROLES = ['hr', 'manager', 'owner', 'superadmin'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function b64url(bytes: Uint8Array) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// VideoSDK auth tokens are HS256 JWTs signed with the account secret key.
async function makeToken(extra: Record<string, unknown> = {}) {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    apikey: VIDEOSDK_API_KEY,
    permissions: ['allow_join', 'allow_mod'],
    version: 2,
    iat: now,
    exp: now + 6 * 60 * 60,
    ...extra,
  };
  const data = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(VIDEOSDK_SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

async function roomIsValid(meetingId: string, token: string) {
  try {
    const res = await fetch(`${API}/rooms/validate/${encodeURIComponent(meetingId)}`, {
      headers: { Authorization: token },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function createRoom(token: string) {
  const res = await fetch(`${API}/rooms`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;
  const { data: profile } = await client
    .from('users')
    .select('id, role, company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  return (profile as { id: string; role: string; company_id: string | null } | null) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const caller = await requireUser(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);

    if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET_KEY) {
      return json({ error: 'Video service is not configured. An admin must add the VideoSDK API key and secret.' }, 500);
    }

    const { interviewId = null, gdId = null, appOrigin = null } = await req.json().catch(() => ({}));

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let entity: 'interview' | 'gd' | null = null;
    let row: any = null;

    if (interviewId) {
      const { data } = await admin
        .from('interviews')
        .select('id, company_id, candidate_id, interviewer_id, daily_room_name, started_at, round_type')
        .eq('id', interviewId)
        .maybeSingle();
      if (!data) return json({ error: 'Interview not found' }, 404);
      entity = 'interview';
      row = data;
      const allowed =
        caller.role === 'owner' ||
        (STAFF_ROLES.includes(caller.role) && data.company_id === caller.company_id) ||
        data.candidate_id === caller.id ||
        data.interviewer_id === caller.id;
      if (!allowed) return json({ error: 'forbidden' }, 403);
    } else if (gdId) {
      const { data } = await admin
        .from('group_discussions')
        .select('id, company_id, daily_room_name')
        .eq('id', gdId)
        .maybeSingle();
      if (!data) return json({ error: 'Group discussion not found' }, 404);
      entity = 'gd';
      row = data;
      let allowed = caller.role === 'owner' || (STAFF_ROLES.includes(caller.role) && data.company_id === caller.company_id);
      if (!allowed) {
        const { data: groups } = await admin.from('gd_groups').select('candidate_ids').eq('gd_id', data.id);
        allowed = (groups || []).some((g: any) => (g.candidate_ids || []).includes(caller.id));
      }
      if (!allowed) return json({ error: 'forbidden' }, 403);
    } else if (!STAFF_ROLES.includes(caller.role)) {
      return json({ error: 'forbidden' }, 403);
    }

    const token = await makeToken();

    // Reuse the saved room so everyone lands in the SAME meeting.
    let meetingId: string | null = row?.daily_room_name || null;
    if (meetingId && !(await roomIsValid(meetingId, token))) meetingId = null;

    if (!meetingId) {
      const created = await createRoom(token);
      if (!created.ok || !created.data?.roomId) {
        const raw = created.data?.error || created.data?.message || `VideoSDK ${created.status}`;
        console.error('VideoSDK room creation failed:', created.status, created.data);
        const isAuth = created.status === 401 || created.status === 403;
        return json({
          error: isAuth
            ? 'The video provider rejected the API key. An admin needs to refresh the VideoSDK credentials.'
            : String(raw),
        }, 500);
      }
      meetingId = created.data.roomId as string;

      const link = appOrigin
        ? `${appOrigin}/${entity === 'gd' ? 'gd-room' : 'interview-room'}/${row?.id}`
        : null;

      if (entity === 'interview') {
        await admin.from('interviews').update({
          daily_room_name: meetingId,
          daily_room_url: link,
          meeting_link: link,
          started_at: row.started_at ?? new Date().toISOString(),
        }).eq('id', row.id);

        if (caller.id !== row.candidate_id) {
          await admin.from('notifications').insert({
            user_id: row.candidate_id,
            title: '🎥 Interview room is live',
            message: `Your ${String(row.round_type || 'interview').replace(/_/g, ' ')} meeting is open. Open your dashboard and press Join.`,
          });
        }
      } else if (entity === 'gd') {
        await admin.from('group_discussions').update({
          daily_room_name: meetingId,
          daily_room_url: link,
          meeting_link: link,
          started_at: new Date().toISOString(),
        }).eq('id', row.id);
      }
    }

    // Participant-scoped token for the client.
    const clientToken = await makeToken({ roomId: meetingId });

    return json({ meetingId, token: clientToken, provider: 'videosdk' });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
