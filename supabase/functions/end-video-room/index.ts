import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VIDEOSDK_API_KEY = (Deno.env.get('VIDEOSDK_API_KEY') ?? '').trim();
const VIDEOSDK_SECRET_KEY = (Deno.env.get('VIDEOSDK_SECRET_KEY') ?? '').trim();
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

async function makeToken() {
  const enc = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    apikey: VIDEOSDK_API_KEY,
    permissions: ['allow_join', 'allow_mod'],
    version: 2,
    iat: now,
    exp: now + 600,
  };
  const data = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(VIDEOSDK_SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
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
    .from('users').select('id, role, company_id').eq('user_id', user.id).maybeSingle();
  return (profile as { id: string; role: string; company_id: string | null } | null) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET_KEY) return json({ error: 'Video service not configured' }, 500);

    const caller = await requireUser(req);
    if (!caller) return json({ error: 'unauthorized' }, 401);
    if (!STAFF_ROLES.includes(caller.role)) return json({ error: 'forbidden' }, 403);

    const { interviewId = null, gdId = null } = await req.json().catch(() => ({}));
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const table = interviewId ? 'interviews' : gdId ? 'group_discussions' : null;
    const rowId = interviewId || gdId;
    if (!table || !rowId) return json({ error: 'interviewId or gdId required' }, 400);

    const { data: row } = await admin.from(table).select('id, company_id, daily_room_name').eq('id', rowId).maybeSingle();
    if (!row) return json({ error: 'not found' }, 404);
    if (caller.role !== 'owner' && row.company_id !== caller.company_id) return json({ error: 'forbidden' }, 403);

    if (row.daily_room_name) {
      const token = await makeToken();
      try {
        await fetch('https://api.videosdk.live/v2/rooms/deactivate', {
          method: 'POST',
          headers: { Authorization: token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: row.daily_room_name }),
        });
      } catch (e) {
        console.warn('deactivate failed', e);
      }
    }

    // Clear the saved room so a future session provisions a fresh one.
    await admin.from(table).update({ daily_room_name: null, daily_room_url: null, meeting_link: null }).eq('id', row.id);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
