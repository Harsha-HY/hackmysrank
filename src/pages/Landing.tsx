import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight, Menu, X, ArrowRight, Check, Plus, Palette, Globe, LogOut,
  Sparkles, ShieldCheck, Layers, GitBranch, Bot, Award, FileText, CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import CandidateAnalyzerDemo from "@/components/landing/CandidateAnalyzerDemo";
import WorkflowVisualizer from "@/components/landing/WorkflowVisualizer";
import ScorecardPreview from "@/components/landing/ScorecardPreview";

/**
 * HireZap — Complete AI-Powered Hiring Workflow + Candidate AI Analyzer
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
              className={`flex items-center justify-between w-full px-3 py-2 text-[13px] hover:bg-ink/5 ${theme === t.id ? "text-forest font-medium" : "text-ink"}`}>
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
              className={`block w-full text-left px-3 py-1.5 text-[13px] hover:bg-ink/5 ${lang === l.code ? "text-forest font-medium" : "text-ink"}`}>
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
    { label: "AI Sandbox", href: "#demo" },
    { label: "12-Step Method", href: "#how" },
    { label: "Scorecard Layer", href: "#scorecard" },
    { label: "Studio", href: "#features" },
    { label: "Pricing", href: "#pricing" },
  ];
  const user = useSessionUser();
  return (
    <header
      className="fixed top-0 inset-x-0 z-50 bg-paper/85 backdrop-blur-xl"
      style={{ borderBottom: "1px solid var(--hz-ink-soft-border)" }}
    >
      <div className="max-w-[1320px] mx-auto h-[68px] px-6 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Wordmark />
          <nav className="hidden lg:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[13px] tracking-wide text-ink-soft hover:text-ink transition-colors font-medium"
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
                Launch Studio
                <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </>
          )}
        </div>
        <button className="lg:hidden text-ink" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </button>
      </div>

      {open && (
        <div
          className="lg:hidden fixed inset-0 z-[100] flex flex-col bg-paper"
        >
          <div
            className="flex items-center justify-between px-6 h-[60px] shrink-0 border-b border-ink/10"
          >
            <Wordmark />
            <button onClick={() => setOpen(false)} className="text-ink" aria-label="Close menu"><X /></button>
          </div>
          <nav className="flex-1 flex flex-col justify-center px-8 gap-5">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-serif-display text-2xl text-ink border-b border-ink/10 pb-3"
              >
                {l.label}
              </a>
            ))}
            <Link
              to={user ? (roleRoutes[user.role || ""] || "/select-role") : "/login"}
              onClick={() => setOpen(false)}
              className="mt-4 rounded-full h-12 inline-flex items-center justify-center font-medium bg-ink text-paper"
            >
              {user ? "View your dashboard" : "Launch Studio"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

const Chapter = ({ num, label }: { num: string; label: string }) => (
  <div className="flex items-center gap-3 text-[11px] tracking-[0.28em] uppercase text-ink-muted">
    <span className="font-mono text-ink font-semibold">{num}</span>
    <span className="h-px w-8 bg-[rgba(14,14,14,0.25)]" />
    <span>{label}</span>
  </div>
);

const Hero = () => {
  const user = useSessionUser();
  const dashHref = user ? (roleRoutes[user.role || ""] || "/select-role") : "/login";

  return (
    <section className="relative pt-[130px] pb-20 px-6 md:px-10">
      <div className="max-w-[1320px] mx-auto">
        <motion.div {...fadeUp}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider bg-forest/10 text-forest border border-forest/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Complete AI-Powered Hiring Workflow + Candidate AI Analyzer
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-8 font-serif-display text-ink"
            style={{ fontSize: "clamp(46px, 7.6vw, 108px)", lineHeight: 0.96, letterSpacing: "-0.02em" }}
          >
            Hiring, personalized —
            <span className="italic text-forest"> with proof</span>,
            patience &amp; precision.
          </motion.h1>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-4 lg:pb-3">
            <p className="text-[15px] leading-[1.65] text-ink-soft">
              HireZap personalizes screening using the job description, resume, GitHub evidence, projects and candidate responses. Transparent scorecard for candidates, grounded evidence for HR.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row lg:flex-col gap-3">
              <a
                href="#demo"
                className="group inline-flex items-center justify-between rounded-full px-5 h-12 bg-forest text-paper text-[14px] font-medium hover:bg-ink transition-colors shadow-md"
              >
                Try Interactive AI Sandbox
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <Link
                to={dashHref}
                className="inline-flex items-center justify-between rounded-full px-5 h-12 border border-ink text-ink text-[14px] font-medium hover:bg-ink hover:text-paper transition-colors"
              >
                {user ? "Go to Dashboard" : "Sign in to Studio"}
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Strongest USP Callout Quote Banner */}
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-14 p-6 md:p-8 rounded-3xl border border-forest/30 bg-forest/5"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-forest text-paper grid place-items-center shrink-0 shadow">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-forest font-semibold mb-1">
                The HireZap Core Principle
              </div>
              <blockquote className="font-serif-display text-lg md:text-2xl text-ink leading-snug">
                “HireZap doesn't just screen candidates. It analyzes what they claim, checks available evidence, personalizes what they are tested on, adapts the interview to their answers, and gives both the candidate and HR an evidence-based view of the hiring journey.”
              </blockquote>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const Marquee = () => (
  <section className="border-y border-ink-soft py-5 overflow-hidden bg-paper">
    <div className="flex ink-marquee whitespace-nowrap">
      {[...Array(2)].map((_, dup) => (
        <div key={dup} className="flex items-center gap-12 px-6 shrink-0">
          {[
            "ATS Resume Compatibility",
            "GitHub Code Signals",
            "5-MCQ Personalized Tests",
            "Adaptive DSA Sandboxes",
            "Dynamic AI Probing",
            "Continuous Candidate Scorecard",
            "Demonstrated Skill Map",
            "Explainable Recruiter Evidence",
          ].map((t) => (
            <span key={t + dup} className="flex items-center gap-12 font-serif-display text-[24px] text-ink">
              {t}
              <span className="text-forest">✦</span>
            </span>
          ))}
        </div>
      ))}
    </div>
  </section>
);

const DemoSection = () => (
  <section id="demo" className="py-24 px-6 md:px-10 bg-paper-2">
    <div className="max-w-[1320px] mx-auto">
      <motion.div {...fadeUp}>
        <Chapter num="01" label="Interactive Experience" />
        <h2
          className="mt-6 font-serif-display text-ink"
          style={{ fontSize: "clamp(36px, 5.2vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
        >
          See how HireZap adapts to <span className="italic text-forest">each candidate's DNA.</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft max-w-2xl">
          Compare two distinct engineers applying for technical roles. Observe how the 5-MCQ technical exam, adaptive DSA coding problems, project interviews, and skill scorecards dynamically shift.
        </p>
      </motion.div>

      <div className="mt-12">
        <CandidateAnalyzerDemo />
      </div>
    </div>
  </section>
);

const MethodSection = () => (
  <section id="how" className="py-24 px-6 md:px-10 bg-paper">
    <div className="max-w-[1320px] mx-auto">
      <motion.div {...fadeUp}>
        <Chapter num="02" label="The 12-Step Architecture" />
        <h2
          className="mt-6 font-serif-display text-ink"
          style={{ fontSize: "clamp(36px, 5.2vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
        >
          From Job Specification to <span className="italic text-forest">Evidence-Based Decision</span>.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft max-w-2xl">
          A seamless flow connecting HR job definitions, candidate submissions, AI evidence parsing, personalized assessments, and human hiring decisions.
        </p>
      </motion.div>

      <div className="mt-12">
        <WorkflowVisualizer />
      </div>
    </div>
  </section>
);

const ScorecardSection = () => (
  <section id="scorecard" className="py-24 px-6 md:px-10 bg-paper-2">
    <div className="max-w-[1320px] mx-auto">
      <motion.div {...fadeUp}>
        <Chapter num="03" label="Candidate Experience" />
        <h2
          className="mt-6 font-serif-display text-ink"
          style={{ fontSize: "clamp(36px, 5.2vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
        >
          A continuous AI layer. <span className="italic text-forest">Not just a pass/fail.</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft max-w-2xl">
          After applying, candidates receive an evolving personal scorecard showing verified skills, areas developing, and actionable improvement recommendations.
        </p>
      </motion.div>

      <div className="mt-12">
        <ScorecardPreview />
      </div>
    </div>
  </section>
);

const featureSets = [
  {
    name: "Engineering Tracks",
    cards: [
      { tag: "Screening", title: "ATS & Resume Intelligence", body: "Scored against JD with missing keywords, role alignment, and quantified suggestions." },
      { tag: "Code Signals", title: "GitHub & Repo Inspection", body: "Validates libraries, dependencies, and commits under the Integrity Principle." },
      { tag: "Precision", title: "5-MCQ Personalized Tests", body: "Generated at the exact intersection of Job Requirements + Candidate Skills + Project Proof." },
      { tag: "Algorithms", title: "Adaptive 2-Round DSA", body: "Round 1 evaluates execution correctness; Round 2 adapts difficulty based on performance." },
      { tag: "Probing", title: "Dynamic AI Project Interview", body: "Conversational multi-turn interview where subsequent questions explore knowledge boundaries." },
      { tag: "Rubrics", title: "Transparent Skill Matrix", body: "Categorizes competencies as Demonstrated, Developing, or Needs Improvement." },
      { tag: "Actionable", title: "Personalized Improvement Plan", body: "Converts detected gaps into concrete learning steps even when not selected." },
      { tag: "Decision", title: "Recruiter Evidence Dossier", body: "Grounded explainable signals empowering HR to make confident hiring choices." },
    ],
  },
  {
    name: "Product / Design",
    cards: [
      { tag: "Screening", title: "Portfolio-aware Brief Analysis", body: "Case studies and design craft signals weighed alongside resume against the brief." },
      { tag: "Voice", title: "Video Intro Readings", body: "Clarity, confidence, and story-telling distilled into structured rubrics." },
      { tag: "Assignment", title: "Design Task Sandbox", body: "Attach design briefs or live links for candidates to submit directly." },
      { tag: "Interview", title: "Contextual Interview Room", body: "Prior portfolio scores and submission evidence sit beside the scorecard." },
      { tag: "Integrity", title: "Quiet Fairness Checks", body: "Background signals ensure judgment focuses entirely on actual work." },
      { tag: "Close", title: "Offer & Onboarding", body: "Letters generated, negotiated, and signed with zero spreadsheet overhead." },
      { tag: "Pulse", title: "Realtime Pipeline Sync", body: "Stage moves propagate instantly with live candidate notifications." },
      { tag: "Proof", title: "Plain Language Analytics", body: "Time-to-hire, funnel conversion, and fairness surfaced cleanly." },
    ],
  },
];

const Features = () => {
  const [setIdx, setSetIdx] = useState(0);
  const set = featureSets[setIdx];

  return (
    <section id="features" className="py-24 px-6 md:px-10 bg-paper">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          <motion.div {...fadeUp} className="lg:col-span-7">
            <Chapter num="04" label="Recruiting Studio" />
            <h2
              className="mt-6 font-serif-display text-ink"
              style={{ fontSize: "clamp(36px, 5.2vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
            >
              One studio. <span className="italic text-forest">End to end.</span> Nothing manual.
            </h2>
          </motion.div>
          <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-5 text-[15px] leading-[1.7] text-ink-soft">
            HireZap replaces fragmented assessment portals, proctoring plugins, and spreadsheets with a single evidence-driven platform.
          </motion.p>
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] tracking-[0.28em] uppercase text-forest font-semibold">
            {set.name} · Studio Capabilities
          </div>
          <div className="flex items-center gap-2">
            {featureSets.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setSetIdx(i)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  i === setIdx ? "bg-ink text-paper" : "bg-ink/5 text-ink hover:bg-ink/10"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={set.name}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4 }}
            className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {set.cards.map((f) => (
              <article
                key={f.title}
                className="group relative p-6 rounded-2xl border border-ink/10 bg-paper-2 hover:border-forest/40 transition-all flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className="text-[11px] font-mono tracking-wider uppercase text-forest font-semibold">{f.tag}</div>
                  <h3 className="mt-3 font-serif-display text-[22px] leading-snug text-ink">{f.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{f.body}</p>
                </div>
                <ArrowUpRight className="self-end w-4 h-4 text-ink-muted group-hover:text-forest transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </article>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};

const tiers = [
  {
    name: "Studio",
    price: "₹4,999",
    per: "per month",
    desc: "For fast-moving teams wanting evidence-based hiring.",
    features: ["5 active job tracks", "100 candidate assessments / mo", "AI ATS Resume Scoring", "Personalized 5-MCQ Engine", "Adaptive DSA Sandbox", "1 HR Seat"],
    cta: "Start Free Trial",
    featured: false,
  },
  {
    name: "Atelier",
    price: "₹14,999",
    per: "per month",
    desc: "For growing companies scaling technical engineering teams.",
    features: ["20 active job tracks", "500 candidate assessments / mo", "GitHub Code Signal Analyzer", "Dynamic AI Project Probing", "Candidate Skill Map & Improvement Plans", "HR Evidence Decision Dossier", "5 HR + Manager Seats"],
    cta: "Start Free Trial",
    featured: true,
  },
  {
    name: "Enterprise House",
    price: "Custom",
    per: "tailored",
    desc: "For high-volume hiring with custom rubrics and ATS integration.",
    features: ["Unlimited job tracks", "Unlimited candidates", "Custom ATS/HRIS Webhook Sync", "Dedicated AI Models & Calibrations", "SLA & 24/7 Priority Support", "Named Hiring Architect"],
    cta: "Contact Team",
    featured: false,
  },
];

const Pricing = () => (
  <section id="pricing" className="py-24 px-6 md:px-10 bg-paper-2">
    <div className="max-w-[1320px] mx-auto">
      <div className="grid lg:grid-cols-12 gap-10 items-end">
        <motion.div {...fadeUp} className="lg:col-span-7">
          <Chapter num="05" label="Plans &amp; Pricing" />
          <h2
            className="mt-6 font-serif-display text-ink"
            style={{ fontSize: "clamp(36px, 5.2vw, 72px)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
          >
            Transparent pricing. <span className="italic text-forest">Zero hidden costs.</span>
          </h2>
        </motion.div>
        <motion.p {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-5 text-[15px] leading-[1.7] text-ink-soft">
          Start exploring without a card. Move plans as your hiring pipelines scale. Full exportability whenever you need.
        </motion.p>
      </div>

      <div className="mt-14 grid md:grid-cols-3 gap-6">
        {tiers.map((t, i) => (
          <motion.div
            key={t.name}
            {...fadeUp}
            transition={{ delay: i * 0.08 }}
            className={`p-8 rounded-3xl border flex flex-col justify-between ${
              t.featured
                ? "bg-ink text-paper border-ink shadow-2xl"
                : "bg-paper text-ink border-ink/10 shadow-sm"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-serif-display text-2xl">{t.name}</span>
                {t.featured && (
                  <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-full bg-forest text-paper font-semibold">
                    Most Popular
                  </span>
                )}
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <span className="font-serif-display text-5xl leading-none">{t.price}</span>
                <span className={`text-xs ${t.featured ? "text-paper/70" : "text-ink-muted"}`}>{t.per}</span>
              </div>
              <p className={`mt-3 text-xs ${t.featured ? "text-paper/80" : "text-ink-soft"}`}>{t.desc}</p>
              <div className={`my-6 h-px ${t.featured ? "bg-white/15" : "bg-ink/10"}`} />
              <ul className="space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-xs">
                    <Check className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/login"
              className={`mt-8 group inline-flex items-center justify-between rounded-full px-5 h-12 text-xs font-medium transition-colors ${
                t.featured
                  ? "bg-forest text-paper hover:bg-white hover:text-ink"
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
    <section className="px-6 md:px-10 py-24 bg-paper">
      <motion.div {...fadeUp} className="max-w-[1320px] mx-auto p-10 md:p-16 rounded-[32px] bg-ink text-paper shadow-2xl">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <div className="text-xs font-mono uppercase tracking-widest text-forest font-semibold mb-2">
              Ready to modernize hiring?
            </div>
            <h2
              className="font-serif-display"
              style={{ fontSize: "clamp(36px, 5.2vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
            >
              Screen with proof. <span className="italic text-forest">Hire with confidence.</span>
            </h2>
            <p className="mt-4 text-sm text-paper/80 max-w-xl leading-relaxed">
              Experience the personalized 5-MCQ assessments, adaptive DSA sandboxes, and explainable recruiter evidence today.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3">
            <Link
              to={dashHref}
              className="group inline-flex items-center justify-between rounded-full px-6 h-14 bg-forest text-paper text-[15px] font-medium hover:bg-paper hover:text-ink transition-colors shadow-lg"
            >
              {user ? "Go to Dashboard" : "Launch HireZap Studio"}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <div className="text-[11px] text-paper/60 text-center font-mono">
              Setup under 3 minutes · Free live demo included
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

const Footer = () => (
  <footer className="bg-paper-2 border-t border-ink/10 pt-16 pb-10 px-6 md:px-10">
    <div className="max-w-[1320px] mx-auto grid md:grid-cols-12 gap-10">
      <div className="md:col-span-5">
        <Wordmark />
        <p className="mt-4 text-[13px] leading-relaxed text-ink-soft max-w-sm">
          Complete AI-Powered Hiring Workflow + Continuous Candidate AI Analyzer. Evidence-based evaluation for modern engineering teams.
        </p>
      </div>
      {[
        { h: "Platform", l: [["Live AI Sandbox", "#demo"], ["12-Step Method", "#how"], ["Candidate Scorecard", "#scorecard"], ["Studio Features", "#features"]] },
        { h: "Company", l: [["Manifesto", "#"], ["Case Studies", "#"], ["Contact HR Architects", "mailto:hello@hirezap.com"]] },
        { h: "Legal", l: [["Privacy Policy", "/privacy-policy"], ["Terms of Service", "/terms-of-service"], ["Security & Integrity", "/privacy-policy"]] },
      ].map((col) => (
        <div key={col.h} className="md:col-span-2 lg:col-span-2">
          <div className="text-[11px] tracking-[0.28em] uppercase text-ink-muted mb-4 font-semibold">{col.h}</div>
          <ul className="space-y-2.5">
            {col.l.map(([label, href]) => (
              <li key={label}>
                {href.startsWith("/") ? (
                  <Link to={href} className="text-[13px] text-ink hover:text-forest transition-colors">{label}</Link>
                ) : (
                  <a href={href} className="text-[13px] text-ink hover:text-forest transition-colors">{label}</a>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="max-w-[1320px] mx-auto mt-14 pt-6 border-t border-ink/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-ink-muted font-mono">
      <div className="flex items-center gap-2">
        <BrandLogo markClassName="h-6 w-6" textClassName="text-[18px]" />
        <span>— Complete AI-Powered Hiring Workflow</span>
      </div>
      <div>© 2026 HireZap Inc. Precision Recruiting &amp; AI Candidate Analyzer.</div>
    </div>
  </footer>
);

const Landing = () => (
  <div className="min-h-screen bg-paper text-ink selection:bg-forest selection:text-paper">
    <Nav />
    <Hero />
    <Marquee />
    <DemoSection />
    <MethodSection />
    <ScorecardSection />
    <Features />
    <Pricing />
    <CTABanner />
    <Footer />
  </div>
);

export default Landing;
