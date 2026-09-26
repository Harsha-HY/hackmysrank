// Server-side code execution proxy.
// Primary: paiza.io (free guest API). Fallback: Wandbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const PAIZA: Record<string, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python3",
  java: "java",
  cpp: "cpp",
  c: "c",
  go: "go",
  ruby: "ruby",
  php: "php",
  rust: "rust",
};

const WANDBOX: Record<string, string> = {
  javascript: "nodejs-20.17.0",
  typescript: "nodejs-20.17.0",
  python: "cpython-3.11.10",
  java: "openjdk-jdk-21+35",
  cpp: "gcc-13.2.0",
  c: "gcc-13.2.0-c",
  go: "go-1.23.2",
  ruby: "ruby-3.3.11",
  php: "php-8.3.12",
  rust: "rust-1.82.0",
};

type Result = { stdout: string; stderr: string; code?: number; signal?: string | null };

async function runPaiza(lang: string, code: string, stdin: string): Promise<Result> {
  const body = new URLSearchParams({
    source_code: code,
    language: lang,
    input: stdin,
    api_key: "guest",
    longpoll: "true",
    longpoll_timeout: "20",
  });
  const create = await fetch("https://api.paiza.io/runners/create", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!create.ok) throw new Error(`paiza create ${create.status}: ${await create.text()}`);
  const { id } = await create.json();
  if (!id) throw new Error("paiza: no run id");

  for (let i = 0; i < 15; i++) {
    const r = await fetch(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`);
    if (!r.ok) throw new Error(`paiza details ${r.status}`);
    const d = await r.json();
    if (d.status === "completed") {
      return {
        stdout: d.stdout || "",
        stderr: [d.build_stderr, d.stderr].filter(Boolean).join("\n"),
        code: d.exit_code !== undefined && d.exit_code !== null ? Number(d.exit_code) : undefined,
        signal: null,
      };
    }
    await new Promise((res) => setTimeout(res, 1000));
  }
  throw new Error("paiza: timed out");
}

async function runWandbox(compiler: string, code: string, stdin: string): Promise<Result> {
  const r = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ compiler, code, stdin }),
  });
  if (!r.ok) throw new Error(`wandbox ${r.status}: ${await r.text()}`);
  const d = await r.json();
  const err = [d.compiler_error, d.program_error].filter(Boolean).join("\n");
  if (/OCI runtime error/i.test(err)) throw new Error("wandbox unavailable");
  return {
    stdout: d.program_output ?? "",
    stderr: err,
    code: d.status !== undefined ? Number(d.status) : undefined,
    signal: d.signal || null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    // Require a valid logged-in session — this proxies to third-party execution services.
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: caller } = await userClient.from("users").select("id").eq("user_id", user.id).maybeSingle();
    if (!caller) return json({ error: "forbidden" }, 403);

    const { language, code, stdin } = await req.json();
    if (typeof code !== "string" || !code.trim()) return json({ error: "code required" }, 400);
    if (code.length > 100_000) return json({ error: "code too large" }, 400);
    const lang = String(language || "");
    const input = typeof stdin === "string" ? stdin : "";
    if (!PAIZA[lang] && !WANDBOX[lang]) return json({ error: `Unsupported language: ${lang}` }, 400);

    try {
      if (PAIZA[lang]) return json(await runPaiza(PAIZA[lang], code, input));
    } catch (e) {
      console.error("paiza failed, falling back:", e);
    }
    try {
      if (WANDBOX[lang]) return json(await runWandbox(WANDBOX[lang], code, input));
    } catch (e) {
      console.error("wandbox failed:", e);
    }
    return json({ error: "Code execution service is temporarily unavailable. Please try again." }, 503);
  } catch (e) {
    console.error("run-code error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
