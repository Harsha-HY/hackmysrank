import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, Menu, X, ArrowRight, Check, Plus, Palette, Globe, LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";

/**
 * HireZap — Editorial Premium Landing
 */

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

const roleRoutes: Record<string, string> = {
  owner: "/owner-dashboard",
  superadmin: "/admin-dashboard",
  hr: "/hr-dashboard",
  manager: "/manager-dashboard",
  candidate: "/candidate-dashboard",
};

// ---------- Session hook ----------
type SessionUser = { id: string; email?: string; name?: string; avatar?: string; role?: string } | null;

function useSessionUser() {
  const [user, setUser] = useState<SessionUser>(null);
  useEffect(() => {
    let mounted = true;
    const hydrate = async (uid: string, meta: any) => {
      const { data } = await supabase.from("users").select("role,full_name").eq("user_id", uid).maybeSingle();
      if (!mounted) return;
      setUser({
        id: uid,
        email: meta?.email,
        name: data?.full_name || meta?.user_metadata?.full_name || meta?.user_metadata?.name || meta?.email,
        avatar: meta?.user_metadata?.avatar_url || meta?.user_metadata?.picture,
        role: data?.role,
      });
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) hydrate(data.user.id, data.user);
      else setUser(null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s?.user) hydrate(s.user.id, s.user);
      else setUser(null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);
  return user;
}


const Wordmark = () => (
  <Link to="/" className="flex items-center gap-3 text-ink group">
    <BrandLogo markClassName="transition-transform group-hover:scale-105" textClassName="text-[22px]" />
  </Link>
);

// ---------- Theme + Language toggles ----------
const THEMES = [
  { id: "paper",    name: "Paper & Ink",  swatch: ["#f6f3ec", "#0e0e0e", "#1a3c2a"] },
  { id: "noir",     name: "Noir & Gold",  swatch: ["#0d0d0d", "#f0e9d2", "#c9a84c"] },
  { id: "midnight", name: "Midnight",     swatch: ["#0a0a1a", "#e8ecff", "#7c6cff"] },
  { id: "sand",     name: "Warm Sand",    swatch: ["#faf6ef", "#2a1d10", "#b4451f"] },
  { id: "ocean",    name: "Ocean Deep",   swatch: ["#f0f6fa", "#0c2340", "#2d8a9e"] },
  { id: "forest",   name: "Forest",       swatch: ["#f2efe6", "#0f2018", "#1a3c2a"] },
  { id: "mint",     name: "Neon Mint",    swatch: ["#0d1b2a", "#e8fff5", "#2dd4a8"] },
];
const ThemeToggle = () => {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("hz-theme") || "paper");
  useEffect(() => {
    document.documentElement.dataset.hzTheme = theme;
    localStorage.setItem("hz-theme", theme);
  }, [theme]);
  const current = THEMES.find((t) => t.id === theme) || THEMES[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Theme"
        className="h-9 px-2.5 rounded-full inline-flex items-center gap-1.5 hover:bg-ink/5 text-ink-soft hover:text-ink transition-colors">
        <Palette className="w-4 h-4" />
        <span className="flex gap-0.5">
          {current.swatch.map((c) => (
            <span key={c} className="w-2 h-2 rounded-full border border-ink/20" style={{ background: c }} />
          ))}
        </span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 rounded-xl border border-ink-soft bg-paper shadow-lg py-1.5 min-w-[180px] z-50">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => { setTheme(t.id); setOpen(false); }}
              className={`flex items-center justify-between w-full px-3 py-2 text-[13px] hover:bg-ink/5 ${theme === t.id ? "text-forest" : "text-ink"}`}>
              <span className="flex items-center gap-2">
                <span className="flex gap-0.5">
                  {t.swatch.map((c) => (
                    <span key={c} className="w-2.5 h-2.5 rounded-full border border-ink/20" style={{ background: c }} />
                  ))}
                </span>
                {t.name}
              </span>
              {theme === t.id && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LANGS = [
  { code: "en", label: "EN" }, { code: "hi", label: "हिं" }, { code: "ta", label: "த" },
  { code: "te", label: "తె" }, { code: "kn", label: "ಕ" }, { code: "es", label: "ES" },
];
const LangToggle = () => {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState(() => localStorage.getItem("hz-lang") || "en");
  useEffect(() => { localStorage.setItem("hz-lang", lang); document.documentElement.lang = lang; }, [lang]);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Language"
        className="h-9 px-2.5 rounded-full inline-flex items-center gap-1.5 hover:bg-ink/5 text-ink-soft hover:text-ink transition-colors text-[12px] tracking-wide">
        <Globe className="w-4 h-4" />
        {LANGS.find((l) => l.code === lang)?.label}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 rounded-xl border border-ink-soft bg-paper shadow-lg py-1 min-w-[110px] z-50">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              className={`block w-full text-left px-3 py-1.5 text-[13px] hover:bg-ink/5 ${lang === l.code ? "text-forest" : "text-ink"}`}>
              {l.label} <span className="text-ink-muted ml-1">{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const UserPill = ({ user }: { user: NonNullable<SessionUser> }) => {
  const navigate = useNavigate();
  const dest = user.role ? roleRoutes[user.role] || "/select-role" : "/select-role";
  const initials = (user.name || user.email || "U").trim()[0]?.toUpperCase();
  return (
    <div className="flex items-center gap-2">
      <Link to={dest} className="inline-flex items-center gap-2 h-9 rounded-full pl-1.5 pr-3 border border-ink/15 hover:border-forest transition-colors">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-forest text-paper grid place-items-center text-[12px] font-semibold">{initials}</span>
        )}
        <span className="text-[12px] text-ink truncate max-w-[120px]">{user.name || user.email}</span>
      </Link>
      <button onClick={async () => { await supabase.auth.signOut(); navigate("/"); }}
        aria-label="Sign out"
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-ink/5 text-ink-soft hover:text-ink">
        <LogOut className="w-4 h-4" />
      </button>
    </div>
  );
};

const Nav = () => {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Product", href: "#features" },
    { label: "Method", href: "#how" },
    { label: "Pricing", href: "#pricing" },
    { label: "Manifesto", href: "#about" },
  ];
  const user = useSessionUser();
  return (
    <header
      className="fixed top-0 inset-x-0 z-50 bg-paper/80 backdrop-blur-xl"
      style={{ borderBottom: "1px solid var(--hz-ink-soft-border)" }}
    >

      <div className="max-w-[1280px] mx-auto h-[68px] px-6 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Wordmark />
          <nav className="hidden md:flex items-center gap-10">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] tracking-wide text-ink-soft hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <LangToggle />
          <span className="w-px h-5 bg-ink/15 mx-1" />
          {user ? (
            <UserPill user={user} />
          ) : (
            <>
              <Link to="/login" className="inline-flex items-center h-9 text-[13px] tracking-wide text-ink-soft hover:text-ink px-2">
                Sign in
              </Link>
              <Link
                to="/login"
                className="group inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-[13px] font-medium bg-ink text-paper whitespace-nowrap hover:bg-forest transition-colors"
              >
                Get started
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </>
          )}
        </div>
        <button className="md:hidden text-ink" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </button>
      </div>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-[100] flex flex-col"
          style={{ backgroundColor: "#f6f3ec", backgroundImage: "linear-gradient(180deg, #f6f3ec 0%, #ede8dc 100%)" }}
        >
          <div
            className="flex items-center justify-between px-6 h-[60px] shrink-0"
            style={{ backgroundColor: "#f6f3ec", borderBottom: "1px solid rgba(20,20,20,0.12)" }}
          >
            <Wordmark />
            <button onClick={() => setOpen(false)} className="text-ink" aria-label="Close menu"><X /></button>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-8 gap-5" style={{ backgroundColor: "transparent" }}>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => {
                  e.preventDefault();
                  const id = l.href.replace("#", "");
                  setOpen(false);
                  setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el) {
                      const y = el.getBoundingClientRect().top + window.scrollY - 72;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    } else {
                      window.location.hash = id;
                    }
                  }, 80);
                }}
                className="font-serif-display text-3xl text-ink border-b border-ink/10 pb-4"
              >
                {l.label}
              </a>
            ))}
            <Link to={user ? (roleRoutes[user.role || ""] || "/select-role") : "/login"} onClick={() => setOpen(false)} className="mt-4 rounded-full h-12 inline-flex items-center justify-center font-medium bg-ink text-paper">{user ? "View your dashboard" : "Get started"}</Link>
          </nav>
        </div>
      )}

    </header>
  );
};

const Chapter = ({ num, label }: { num: string; label: string }) => (
  <div className="flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-ink-muted">
    <span className="font-mono text-ink">{num}</span>
    <span className="h-px w-8 bg-[rgba(14,14,14,0.25)]" />
    <span>{label}</span>
  </div>
);

const PIPELINE_SETS = [
  {
    role: "Senior React Engineer",
    applicants: "142 applicants · 78% screened · 3 finalists",
    stats: [{ l: "Time to fill", v: "8d" }, { l: "AI screened", v: "111" }, { l: "Bias score", v: "0.02" }],
    rows: [
      { name: "Aarav Mehta", stage: "Aptitude", score: "92" },
      { name: "Priya Shah", stage: "Video round", score: "88" },
      { name: "Rohan Iyer", stage: "Technical", score: "84" },
      { name: "Meera Pillai", stage: "Group disc.", score: "81" },
      { name: "Karan Verma", stage: "HR review", score: "79" },
    ],
  },
  {
    role: "Product Designer",
    applicants: "96 applicants · 82% screened · 4 finalists",
    stats: [{ l: "Time to fill", v: "6d" }, { l: "AI screened", v: "79" }, { l: "Bias score", v: "0.01" }],
    rows: [
      { name: "Ananya Rao", stage: "Portfolio", score: "94" },
      { name: "Dev Patel", stage: "Video round", score: "90" },
      { name: "Sneha Kapoor", stage: "Design task", score: "87" },
      { name: "Yusuf Khan", stage: "Group disc.", score: "82" },
      { name: "Ira Joshi", stage: "HR review", score: "80" },
    ],
  },
  {
    role: "Data Scientist",
    applicants: "203 applicants · 71% screened · 5 finalists",
    stats: [{ l: "Time to fill", v: "11d" }, { l: "AI screened", v: "144" }, { l: "Bias score", v: "0.03" }],
    rows: [
      { name: "Vikram Singh", stage: "Aptitude", score: "95" },
      { name: "Tara Menon", stage: "Technical", score: "91" },
      { name: "Aditya Bose", stage: "Case study", score: "86" },
      { name: "Nisha Reddy", stage: "Group disc.", score: "83" },
      { name: "Manav Gupta", stage: "HR review", score: "78" },
    ],
  },
  {
    role: "Backend Engineer (Go)",
    applicants: "118 applicants · 84% screened · 3 finalists",
    stats: [{ l: "Time to fill", v: "9d" }, { l: "AI screened", v: "99" }, { l: "Bias score", v: "0.02" }],
    rows: [
      { name: "Harsh Jain", stage: "DSA round", score: "93" },
      { name: "Lakshmi N.", stage: "System design", score: "89" },
      { name: "Omar Sheikh", stage: "Video round", score: "85" },
      { name: "Pooja Desai", stage: "Group disc.", score: "82" },
      { name: "Ritwik Nair", stage: "HR review", score: "77" },
    ],
  },
];

const Hero = () => {
  const user = useSessionUser();
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % PIPELINE_SETS.length), 3500);
    return () => clearInterval(id);
  }, []);
  const data = PIPELINE_SETS[idx];
  const dashHref = user ? (roleRoutes[user.role || ""] || "/select-role") : "/login";

  return (
    <section className="relative pt-[140px] pb-24 px-6 md:px-10">
      <div className="max-w-[1280px] mx-auto">
        <motion.div {...fadeUp}>
          <Chapter num="00" label="A new method for hiring" />
        </motion.div>

        <div className="mt-10 grid lg:grid-cols-12 gap-10 items-end">
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-9 font-serif-display text-ink"
            style={{ fontSize: "clamp(56px, 9.2vw, 132px)", lineHeight: 0.94, letterSpacing: "-0.02em" }}
          >
            Hiring, rewritten —
            <span className="italic text-forest"> with patience</span>,
            precision and proof.
          </motion.h1>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-3 lg:pb-3">
            <p className="text-[15px] leading-[1.6] text-ink-soft max-w-xs">
              HireZap is an end-to-end recruiting studio. Build your own hiring template, one calm interface, zero spreadsheets.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              {user ? (
                <Link
                  to={dashHref}
                  className="group inline-flex items-center justify-between rounded-full px-5 h-12 bg-forest text-paper text-[14px] font-medium hover:bg-ink transition-colors"
                >
                  View your dashboard
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="group inline-flex items-center justify-between rounded-full px-5 h-12 bg-ink text-paper text-[14px] font-medium hover:bg-forest transition-colors"
                  >
                    Sign in to get started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <a
                    href="#how"
                    className="inline-flex items-center justify-between rounded-full px-5 h-12 border border-ink text-ink text-[14px] font-medium hover:bg-ink hover:text-paper transition-colors"
                  >
                    Read the method
                    <Plus className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          </motion.div>
        </div>




        {/* Featured visual — editorial cover, cycles every 3s */}
        <motion.figure
          {...fadeUp}
          transition={{ delay: 0.3, duration: 1 }}
          className="mt-16 rounded-[28px] overflow-hidden border border-ink-soft bg-paper-2"
        >
          <div className="grid md:grid-cols-12">
            <div className="md:col-span-5 p-8 md:p-12 flex flex-col justify-between bg-paper">
              <div>
                <div className="text-[11px] tracking-[0.28em] uppercase text-ink-muted">Today, 09:42</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={data.role}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45 }}
                  >
                    <div className="mt-4 font-serif-display text-[34px] leading-[1.05] text-ink">
                      {data.role}<span className="italic text-forest">.</span>
                    </div>
                    <div className="mt-2 text-[13px] text-ink-soft">{data.applicants}</div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-4 border-t border-ink-soft pt-5">
                {data.stats.map((s) => (
                  <div key={s.l}>
                    <div className="font-mono text-[22px] text-ink tabular-nums">{s.v}</div>
                    <div className="text-[11px] tracking-wide uppercase text-ink-muted mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-7 p-8 md:p-10 bg-ink text-paper">
              <div className="flex items-center justify-between text-[11px] tracking-[0.24em] uppercase text-paper-muted">
                <span>Live pipeline</span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest animate-pulse" style={{ boxShadow: "0 0 10px #1a3c2a" }} />
                  streaming
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.ol
                  key={data.role + "-rows"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="mt-7 space-y-4"
                >
                  {data.rows.map((r, i) => (
                    <li key={r.name} className="flex items-center gap-4 border-b border-white/10 pb-4 last:border-0">
                      <span className="font-mono text-[11px] text-paper-muted w-6">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-serif-display text-[22px] flex-1">{r.name}</span>
                      <span className="text-[12px] text-paper-soft hidden sm:inline">{r.stage}</span>
                      <span className="font-mono text-[18px] tabular-nums w-12 text-right">{r.score}</span>
                    </li>
                  ))}
                </motion.ol>
              </AnimatePresence>
            </div>
          </div>
        </motion.figure>
      </div>
    </section>
  );
};

const Marquee = () => (
  <section className="border-y border-ink-soft py-6 overflow-hidden bg-paper">
    <div className="flex ink-marquee whitespace-nowrap">
      {[...Array(2)].map((_, dup) => (
        <div key={dup} className="flex items-center gap-12 px-6 shrink-0">
          {[
            "AI resume scoring",
            "Proctored aptitude",
            "Video intelligence",
            "Technical rounds",
            "Group discussion",
            "Offer & onboarding",
            "Background verification",
            "Realtime dashboards",
          ].map((t) => (
            <span key={t + dup} className="flex items-center gap-12 font-serif-display text-[28px] text-ink">
              {t}
              <span className="text-forest">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  </section>
);

const problems = [
  { k: "30s", title: "per resume score", body: "What used to take hours of manual reading now happens instantly. AI maps skills, gaps and fit against the JD." },
  { k: "1 click", title: "interview scheduling", body: "No more email ping-pong. Candidates pick a slot from live availability and the meeting room is created automatically." },
  { k: "3 min", title: "hiring manager review", body: "Every score, note and recording lives in one place. Decisions that stretched across days now take one glance." },
  { k: "2 min", title: "offer letter out", body: "Pick a template, adjust CTC, generate and send. No more copying Word files or waiting for legal sign-off." },
  { k: "Realtime", title: "pipeline visibility", body: "Every stage move, score and message syncs instantly. No spreadsheet refresh, no lost context." },
  { k: "Auto", title: "candidate updates", body: "Status changes, next steps and reminders reach candidates immediately — without HR writing a single email." },
];

const Problem = () => (
  <section id="about" className="py-24 px-6 md:px-10 bg-paper-2">
    <div className="max-w-[1280px] mx-auto">
      <motion.div {...fadeUp}><Chapter num="01" label="The standing problem" /></motion.div>
      <motion.h2
        {...fadeUp}
        transition={{ delay: 0.05 }}
        className="mt-8 font-serif-display text-ink"
        style={{ fontSize: "clamp(36px, 5.6vw, 78px)", lineHeight: 1, letterSpacing: "-0.02em" }}
      >
        Hiring teams spend weeks <span className="italic text-forest">on work that should take minutes</span>.
      </motion.h2>

      <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
        {problems.map((p, i) => (
          <motion.div
            key={p.title}
            {...fadeUp}
            transition={{ delay: i * 0.04 }}
            className="border-t border-ink pt-5"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-serif-display text-[72px] leading-none text-ink">{p.k}</span>
              <span className="font-mono text-[11px] text-ink-muted tabular-nums">№ {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-4 text-[18px] font-serif-display italic text-ink">{p.title}</div>
            <div className="mt-2 text-[14px] leading-[1.6] text-ink-soft">{p.body}</div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const featureSets = [
  {
    name: "Engineering",
    cards: [
      { tag: "Screening", title: "Résumé intelligence", body: "Every CV scored against your JD in seconds. Skills mapped, gaps surfaced, verdict reasoned." },
      { tag: "Aptitude", title: "Calm proctoring", body: "Face, tab and copy-paste signals collected quietly. HR sees a single trust score." },
      { tag: "Craft", title: "Technical rounds, written by AI", body: "DSA and role-specific tasks generated from the JD. HR and Manager both approve." },
      { tag: "Managerial", title: "Manager sign-off", body: "The hiring manager reviews every score in one place, then moves or closes the candidate." },
      { tag: "Voice", title: "Video readings", body: "Grammar, vocabulary, confidence and eye contact, distilled into a one-page report." },
      { tag: "Close", title: "Offer & onboarding", body: "Letters generated, negotiated and signed. Day-one logistics handed to the candidate." },
      { tag: "Pulse", title: "Realtime dashboards", body: "Every action propagates instantly. No refresh, no email lag, no lost context." },
      { tag: "Proof", title: "Analytics with a conscience", body: "Time-to-hire, funnel conversion, fairness — surfaced as plain language, not vanity charts." },
    ],
  },
  {
    name: "Product / Design",
    cards: [
      { tag: "Screening", title: "Portfolio-aware résumé read", body: "Case studies and craft signals weighed alongside the CV, scored against your brief." },
      { tag: "Voice", title: "Video intro readings", body: "Story-telling, clarity and confidence distilled into a one-page report." },
      { tag: "Assignment", title: "Design task, your way", body: "Attach a brief as a PDF or send a live link — candidates submit right on their dashboard." },
      { tag: "Review", title: "Interview with context", body: "Every prior score and submission sits beside the scorecard while you talk." },
      { tag: "Integrity", title: "Quiet fairness checks", body: "Signals collected in the background so judgement stays on the work, not the watching." },
      { tag: "Close", title: "Offer & onboarding", body: "Letters generated, negotiated and signed. Day-one logistics handed to the candidate." },
      { tag: "Pulse", title: "Realtime dashboards", body: "Every action propagates instantly. No refresh, no email lag, no lost context." },
      { tag: "Proof", title: "Analytics with a conscience", body: "Time-to-hire, funnel conversion, fairness — surfaced as plain language, not vanity charts." },
    ],
  },
  {
    name: "Sales / Ops",
    cards: [
      { tag: "Screening", title: "Résumé intelligence", body: "Every CV scored against your JD in seconds. Skills mapped, gaps surfaced, verdict reasoned." },
      { tag: "Aptitude", title: "Calm proctoring", body: "Face, tab and copy-paste signals collected quietly. HR sees a single trust score." },
      { tag: "Together", title: "Group discussion, observed", body: "Live video call. Speaking balance, content quality and leadership signals scored." },
      { tag: "Voice", title: "Pitch readings", body: "Persuasion, vocabulary and presence read from the recorded round in minutes." },
      { tag: "Review", title: "HR conversation", body: "One scorecard, shared by everyone in the loop, filled while the call is still warm." },
      { tag: "Close", title: "Offer & onboarding", body: "Letters generated, negotiated and signed. Day-one logistics handed to the candidate." },
      { tag: "Pulse", title: "Realtime dashboards", body: "Every action propagates instantly. No refresh, no email lag, no lost context." },
      { tag: "Proof", title: "Analytics with a conscience", body: "Time-to-hire, funnel conversion, fairness — surfaced as plain language, not vanity charts." },
    ],
  },
  {
    name: "Fast-track intern",
    cards: [
      { tag: "Screening", title: "Résumé intelligence", body: "Every CV scored against your JD in seconds. Skills mapped, gaps surfaced, verdict reasoned." },
      { tag: "Craft", title: "One technical set", body: "A short AI-written round from the JD — enough signal, none of the ceremony." },
      { tag: "Integrity", title: "Calm proctoring", body: "Face, tab and copy-paste signals collected quietly. HR sees a single trust score." },
      { tag: "Close", title: "Offer in a click", body: "Letter generated, sent and accepted on the candidate's dashboard the same day." },
      { tag: "Voice", title: "Optional video read", body: "Add a short intro round whenever you want a human sense of the person." },
      { tag: "Together", title: "Add any round", body: "Group discussion, assignment, managerial — drop it into the template and it appears everywhere." },
      { tag: "Pulse", title: "Realtime dashboards", body: "Every action propagates instantly. No refresh, no email lag, no lost context." },
      { tag: "Proof", title: "Analytics with a conscience", body: "Time-to-hire, funnel conversion, fairness — surfaced as plain language, not vanity charts." },
    ],
  },
];

const Features = () => {
  const [setIdx, setSetIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSetIdx((i) => (i + 1) % featureSets.length), 3000);
    return () => clearInterval(t);
  }, []);
  const set = featureSets[setIdx];

  return (
  <section id="features" className="py-24 px-6 md:px-10 bg-paper">
    <div className="max-w-[1280px] mx-auto">
      <div className="grid lg:grid-cols-12 gap-10 items-end">
        <motion.div {...fadeUp} className="lg:col-span-7">
          <Chapter num="02" label="The studio" />
          <h2
            className="mt-8 font-serif-display text-ink"
            style={{ fontSize: "clamp(36px, 5.6vw, 78px)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            One studio. <span className="italic text-forest">End to end.</span> Nothing manual.
          </h2>
        </motion.div>
        <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-5 text-[16px] leading-[1.7] text-ink-soft">
          HireZap replaces five disconnected tools and the spreadsheets between them — without the
          interface noise of enterprise software. Built for hiring teams who care about how it feels.
        </motion.p>
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] tracking-[0.28em] uppercase text-forest">
          {set.name} template · what the studio does
        </div>
        <div className="flex items-center gap-1.5">
          {featureSets.map((s, i) => (
            <button
              key={s.name}
              aria-label={`Show ${s.name} template`}
              onClick={() => setSetIdx(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === setIdx ? 26 : 10,
                background: i === setIdx ? "var(--hz-accent)" : "color-mix(in srgb, var(--hz-ink) 22%, transparent)",
              }}
            />
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={set.name}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.45 }}
          className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4"
        >
          {set.cards.map((f) => (
            <article
              key={f.title}
              className="group relative p-8 border-t border-l border-ink-soft last:border-r lg:[&:nth-child(4n)]:border-r sm:[&:nth-child(2n)]:border-r lg:sm:[&:nth-child(2n)]:border-r-0 lg:[&:nth-child(4n)]:border-r"
              style={{ minHeight: 280 }}
            >
              <div className="text-[11px] tracking-[0.28em] uppercase text-forest">{f.tag}</div>
              <h3 className="mt-5 font-serif-display text-[28px] leading-[1.05] text-ink">{f.title}</h3>
              <p className="mt-3 text-[14px] leading-[1.6] text-ink-soft">{f.body}</p>
              <ArrowUpRight className="absolute bottom-6 right-6 w-5 h-5 text-ink-muted transition-all group-hover:text-forest group-hover:-translate-y-1 group-hover:translate-x-1" />
            </article>
          ))}
          <div className="border-t border-l border-r border-ink-soft" />
        </motion.div>
      </AnimatePresence>
    </div>
  </section>
  );
};


const steps = [
  {
    n: "I",
    title: "You post a role.",
    body: "Fill one form. The studio reads your JD and quietly drafts aptitude, technical and scoring criteria you can edit or accept.",
  },
  {
    n: "II",
    title: "We do the screening.",
    body: "Résumés scored. Tests proctored. Videos read. Technical sets generated. Group discussions observed. You see only pre-qualified people.",
  },
  {
    n: "III",
    title: "You hire the right person.",
    body: "Offer in a click. Candidate accepts on a calm dashboard. Documents collected. Day-one scheduled. The studio steps back.",
  },
];

const pipelineTemplates = [
  { name: "Engineering", stages: ["Résumé", "Aptitude", "Technical", "Interview", "Managerial", "Offer", "Hired"] },
  { name: "Product / Design", stages: ["Résumé", "Video intro", "Portfolio assignment", "Interview", "Offer", "Hired"] },
  { name: "Sales / Ops", stages: ["Résumé", "Aptitude", "Group discussion", "Interview", "Offer", "Hired"] },
  { name: "Fast-track intern", stages: ["Résumé", "Technical", "Offer", "Hired"] },
];

const HowItWorks = () => {
  const [tplIdx, setTplIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTplIdx((i) => (i + 1) % pipelineTemplates.length), 3000);
    return () => clearInterval(t);
  }, []);
  const tpl = pipelineTemplates[tplIdx];

  return (
  <section id="how" className="py-24 px-6 md:px-10 bg-ink text-paper">
    <div className="max-w-[1280px] mx-auto">
      <Chapter num="03" label="The method · for companies" />
      <p className="mt-4 text-[12px] tracking-[0.22em] uppercase" style={{ color: "color-mix(in srgb, var(--hz-paper) 60%, transparent)" }}>
        Built for HR &amp; Hiring Managers — every step below happens on your side.
      </p>
      <h2
        className="mt-6 font-serif-display"
        style={{ fontSize: "clamp(40px, 6.4vw, 92px)", lineHeight: 0.98, letterSpacing: "-0.02em", color: "var(--hz-paper)" }}
      >
        From a single brief to <span className="italic" style={{ color: "var(--hz-accent)" }}>a signed offer</span> —
        in three deliberate movements.
      </h2>

      <div className="mt-16 grid md:grid-cols-3 gap-12 md:gap-8">
        {steps.map((s, i) => (
          <motion.div key={s.n} {...fadeUp} transition={{ delay: i * 0.1 }} className="border-t border-white/15 pt-6">
            <div className="font-serif-display text-[64px] leading-none" style={{ color: "var(--hz-accent)" }}>{s.n}</div>
            <div className="mt-6 font-serif-display text-[28px] leading-[1.1]">{s.title}</div>
            <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: "color-mix(in srgb, var(--hz-paper) 72%, transparent)" }}>{s.body}</p>
          </motion.div>
        ))}
      </div>

      {/* Pipelines are templates HR builds — rotating examples */}
      <div className="mt-20 border-t border-white/15 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] tracking-[0.28em] uppercase" style={{ color: "color-mix(in srgb, var(--hz-paper) 52%, transparent)" }}>
            Your pipeline, your template
          </div>
          <div className="flex items-center gap-1.5">
            {pipelineTemplates.map((t, i) => (
              <button
                key={t.name}
                aria-label={`Show ${t.name} template`}
                onClick={() => setTplIdx(i)}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === tplIdx ? 26 : 10,
                  background: i === tplIdx ? "var(--hz-accent)" : "color-mix(in srgb, var(--hz-paper) 30%, transparent)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="mt-5 min-h-[170px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={tpl.name}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.45 }}
            >
              <div className="text-[13px] tracking-[0.18em] uppercase" style={{ color: "var(--hz-accent)" }}>
                {tpl.name} template · {tpl.stages.length} rounds
              </div>
              <p className="mt-3 font-serif-display text-[26px] md:text-[38px] leading-[1.15]" style={{ color: "var(--hz-paper)" }}>
                {tpl.stages.map((p, i, arr) => (
                  <span key={p}>
                    <span className="italic" style={{ color: i === arr.length - 1 ? "var(--hz-accent)" : "var(--hz-paper)" }}>{p}</span>
                    {i < arr.length - 1 && <span style={{ color: "color-mix(in srgb, var(--hz-paper) 32%, transparent)" }}> &nbsp;/&nbsp; </span>}
                  </span>
                ))}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-4 text-[14px] leading-[1.7] max-w-2xl" style={{ color: "color-mix(in srgb, var(--hz-paper) 68%, transparent)" }}>
          There is no fixed set of rounds. HR builds a hiring template — pick the rounds, reorder them, add custom ones —
          and every job posted with it drives exactly those stages for candidates.
        </p>
      </div>
    </div>
  </section>
  );
};


const tiers = [
  {
    name: "Studio",
    price: "₹4,999",
    per: "per month",
    desc: "For small teams hiring deliberately.",
    features: ["5 active roles", "100 candidates / month", "AI résumé scoring", "Proctored aptitude", "Email notifications", "1 HR seat"],
    cta: "Begin",
    featured: false,
  },
  {
    name: "Atelier",
    price: "₹14,999",
    per: "per month",
    desc: "For growing teams hiring across functions.",
    features: ["20 active roles", "500 candidates / month", "Everything in Studio", "Video intelligence", "Group discussion", "Technical rounds, AI-written", "Analytics", "5 HR + Manager seats"],
    cta: "Begin",
    featured: true,
  },
  {
    name: "House",
    price: "On enquiry",
    per: "tailored",
    desc: "For companies with their own hiring philosophy.",
    features: ["Unlimited roles", "Unlimited candidates", "Everything in Atelier", "Bespoke onboarding", "Priority support", "SLA guarantee", "Named account partner"],
    cta: "Enquire",
    featured: false,
  },
];

const Pricing = () => (
  <section id="pricing" className="py-24 px-6 md:px-10 bg-paper">
    <div className="max-w-[1280px] mx-auto">
      <div className="grid lg:grid-cols-12 gap-10 items-end">
        <motion.div {...fadeUp} className="lg:col-span-7">
          <Chapter num="04" label="Terms of engagement" />
          <h2
            className="mt-8 font-serif-display text-ink"
            style={{ fontSize: "clamp(36px, 5.6vw, 78px)", lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            Plain pricing. <span className="italic text-forest">No surprises.</span>
          </h2>
        </motion.div>
        <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-5 text-[16px] leading-[1.7] text-ink-soft">
          Begin without a card. Move plans when your hiring volume changes. Leave whenever you like —
          your data leaves with you.
        </motion.p>
      </div>

      <div className="mt-16 grid md:grid-cols-3 gap-px bg-ink-soft border border-ink-soft rounded-[24px] overflow-hidden">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            {...fadeUp}
            transition={{ delay: i * 0.08 }}
            className={`p-10 flex flex-col ${t.featured ? "bg-ink text-paper" : "bg-paper text-ink"}`}
          >
            <div className="flex items-center justify-between">
              <div className="font-serif-display text-[32px]">{t.name}</div>
              {t.featured && (
                <span className="text-[10px] tracking-[0.28em] uppercase px-2 py-1 border border-current" style={{ color: "var(--hz-accent)" }}>
                  Recommended
                </span>
              )}
            </div>
            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-serif-display text-[56px] leading-none">{t.price}</span>
              <span className={`text-[13px] ${t.featured ? "text-paper-soft" : "text-ink-muted"}`}>{t.per}</span>
            </div>
            <p className={`mt-3 text-[14px] ${t.featured ? "text-paper-soft" : "text-ink-soft"}`}>{t.desc}</p>
            <div className={`my-8 h-px ${t.featured ? "bg-white/15" : "bg-ink-soft"}`} />
            <ul className="space-y-3 flex-1">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-[14px]">
                  <Check className={`w-4 h-4 mt-0.5 shrink-0 ${t.featured ? "text-forest" : "text-forest"}`} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className={`mt-8 group inline-flex items-center justify-between rounded-full px-5 h-12 text-[14px] font-medium transition-colors ${
                t.featured
                  ? "bg-paper text-ink hover:bg-forest hover:text-paper"
                  : "bg-ink text-paper hover:bg-forest"
              }`}
            >
              {t.cta}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const CTABanner = () => {
  const user = useSessionUser();
  const dashHref = user ? (roleRoutes[user.role || ""] || "/select-role") : "/login";
  return (
    <section className="px-6 md:px-10 py-24 bg-paper-2">
      <motion.div {...fadeUp} className="max-w-[1280px] mx-auto border-t border-b border-ink py-16 md:py-24">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <h2
            className="lg:col-span-8 font-serif-display text-ink"
            style={{ fontSize: "clamp(40px, 6vw, 92px)", lineHeight: 0.98, letterSpacing: "-0.02em" }}
          >
            Begin hiring with <span className="italic text-forest">a quieter hand.</span>
          </h2>
          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link
              to={dashHref}
              className="group inline-flex items-center justify-between rounded-full px-6 h-14 bg-ink text-paper text-[15px] font-medium hover:bg-forest transition-colors"
            >
              {user ? "View your dashboard" : "Sign in to get started"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="text-[12px] text-ink-muted text-center">
              {user ? "Welcome back. Your pipeline is live." : "Setup under five minutes. No card required."}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

const Purpose = () => (
  <section id="purpose" className="py-24 px-6 md:px-10 bg-ink text-paper">
    <div className="max-w-[1280px] mx-auto">
      <motion.div {...fadeUp}>
        <Chapter num="05" label="Why we exist" />
      </motion.div>
      <motion.h2
        {...fadeUp}
        transition={{ delay: 0.05 }}
        className="mt-8 font-serif-display"
        style={{ fontSize: "clamp(36px, 5.6vw, 78px)", lineHeight: 1, letterSpacing: "-0.02em", color: "var(--hz-paper)" }}
      >
        Hiring is a human act. <span className="italic" style={{ color: "var(--hz-accent)" }}>We just clear the noise.</span>
      </motion.h2>
      <div className="mt-16 grid md:grid-cols-2 gap-16">
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <p className="text-[16px] leading-[1.7]" style={{ color: "color-mix(in srgb, var(--hz-paper) 82%, transparent)" }}>
            HireZap exists to restore dignity to both sides of the interview table. The candidate waiting for a response. The team drowning in spreadsheets. The hiring manager losing sleep over a bad fit. We believe every company — not just those with enterprise budgets — deserves a studio-grade recruiting process.
          </p>
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <p className="text-[16px] leading-[1.7]" style={{ color: "color-mix(in srgb, var(--hz-paper) 82%, transparent)" }}>
            Our purpose is simple: turn hiring from a cost centre into a competitive advantage. We do this with AI that assists rather than replaces, proctoring that protects rather than punishes, and dashboards that speak in plain language. No vanity metrics. No black-box decisions. Just proof, patience, and the right person in the right seat.
          </p>
        </motion.div>
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="bg-paper border-t border-ink-soft pt-16 pb-10 px-6 md:px-10">
    <div className="max-w-[1280px] mx-auto grid md:grid-cols-12 gap-10">
      <div className="md:col-span-5">
        <Wordmark />
        <p className="mt-5 text-[14px] leading-[1.7] text-ink-soft max-w-sm">
          A recruiting studio for teams that believe how you hire shapes who joins.
          Filed quietly from Bengaluru, for everywhere.
        </p>
      </div>
      {[
        { h: "Product", l: [["Features", "#features"], ["Method", "#how"], ["Pricing", "#pricing"], ["Changelog", "#"]] },
        { h: "Company", l: [["Manifesto", "#about"], ["Contact", "mailto:hello@hirezap.com"], ["Journal", "#"], ["Careers", "#"]] },
        { h: "Legal", l: [["Privacy", "/privacy-policy"], ["Terms", "/terms-of-service"], ["Cookies", "/cookie-policy"], ["Refunds", "/refund-policy"]] },
      ].map((col) => (
        <div key={col.h} className="md:col-span-2 lg:col-span-2">
          <div className="text-[11px] tracking-[0.28em] uppercase text-ink-muted mb-4">{col.h}</div>
          <ul className="space-y-3">
            {col.l.map(([label, href]) => (
              <li key={label}>
                {href.startsWith("/") ? (
                  <Link to={href} className="text-[14px] text-ink hover:text-forest transition-colors">{label}</Link>
                ) : (
                  <a href={href} className="text-[14px] text-ink hover:text-forest transition-colors">{label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="max-w-[1280px] mx-auto mt-16 pt-6 border-t border-ink-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[14px] text-ink-muted"><BrandLogo markClassName="h-7 w-7" textClassName="text-[20px]" /> <span>— Volume I, Issue 01</span></div>
      <div className="text-[12px] text-ink-muted">© 2026 HireZap. Set in Instrument Serif &amp; Inter.</div>
    </div>
  </footer>
);

const Landing = () => (
  <div className="min-h-screen bg-paper text-ink">
    <Nav />
    <Hero />
    <Marquee />
    <Problem />
    <Features />
    <HowItWorks />
    <Pricing />
    <CTABanner />
    <Purpose />
    <Footer />
  </div>
);

export default Landing;
