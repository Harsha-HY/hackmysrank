import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

async function callAI(prompt: string, system: string): Promise<string> {
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gemini-3.6-flash',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');

    const _authHeader = req.headers.get("Authorization") || "";
    if (!_authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: _authHeader } } });
    const { data: { user: _u } } = await _userClient.auth.getUser();
    if (!_u) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { type, payload } = await req.json();


    if (type === 'about') {
      const text = await callAI(
        `Candidate info: ${JSON.stringify(payload)}. Write a crisp 3-4 sentence first-person professional bio (under 600 chars). Plain text only.`,
        'You are a resume bio writer. Return only the bio text, no preface.',
      );
      return Response.json({ result: text.trim() }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (type === 'experience') {
      const text = await callAI(
        `Improve this work experience description to be impactful, metric-driven, and concise (3-5 bullet points using •). Input: ${JSON.stringify(payload)}`,
        'You are a resume coach. Return only the improved description.',
      );
      return Response.json({ result: text.trim() }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (type === 'skills') {
      const text = await callAI(
        `Based on this candidate profile, suggest exactly 5 relevant skills as a JSON array of strings. Profile: ${JSON.stringify(payload)}`,
        'You return ONLY a JSON array of 5 short skill strings. No prose.',
      );
      let arr: string[] = [];
      try {
        const m = text.match(/\[[\s\S]*\]/);
        arr = JSON.parse(m ? m[0] : text);
      } catch { arr = []; }
      return Response.json({ result: arr.slice(0, 5) }, { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'unknown type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
