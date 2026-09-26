import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveData } from "@/hooks/useLiveData";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Play, Code2, Users as UsersIcon, MessageSquare,
  Award, XCircle, Search, RefreshCw, Filter, ChevronDown, ChevronRight,
  CheckCircle2, Circle, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type App = any;

interface Props {
  companyId: string;
  onViewResume: (url: string | null) => void;
  onViewTest: (app: App) => void;
  onViewVideo: (app: App) => void;
  onViewTech: (app: App) => void;
}

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied",
  ai_scored: "AI Resume Scored",
  shortlisted: "Shortlisted",
  aptitude_test: "Aptitude Test",
  test_completed: "Aptitude Done",
  video_intro: "Video Intro",
  video_submitted: "Video Done",
  technical_round: "Technical Round",
  technical_test: "Technical Test",
  technical_completed: "Technical Done",
  group_discussion: "Group Discussion",
  gd_completed: "GD Done",
  hr_interview: "HR Interview",
  interview: "HR Interview",
  offer_sent: "Offer Sent",
  hired: "Hired",
  selected: "Selected",
  bgv: "BGV",
  onboarded: "Onboarded",
  rejected: "Rejected",
};

const STAGE_TONE: Record<string, string> = {
  applied: "bg-muted text-muted-foreground",
  ai_scored: "bg-blue-500/10 text-blue-500",
  shortlisted: "bg-amber-500/10 text-amber-500",
  test_completed: "bg-purple-500/10 text-purple-500",
  video_submitted: "bg-pink-500/10 text-pink-500",
  technical_completed: "bg-orange-500/10 text-orange-500",
  gd_completed: "bg-cyan-500/10 text-cyan-500",
  hr_interview: "bg-indigo-500/10 text-indigo-500",
  interview: "bg-indigo-500/10 text-indigo-500",
  offer_sent: "bg-emerald-500/10 text-emerald-500",
  hired: "bg-primary/10 text-primary",
  selected: "bg-primary/10 text-primary",
  onboarded: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

// Canonical journey checkpoints, ordered.
const JOURNEY = [
  { key: "applied", label: "Applied" },
  { key: "ai_scored", label: "Resume Screened" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "test_completed", label: "Aptitude Test" },
  { key: "video_submitted", label: "Video Intro" },
  { key: "technical_completed", label: "Technical Round" },
  { key: "gd_completed", label: "Group Discussion" },
  { key: "interview", label: "HR Interview" },
  { key: "offer_sent", label: "Offer Sent" },
  { key: "hired", label: "Hired" },
];

const stageRank = (stage: string): number => {
  const idx = JOURNEY.findIndex((s) => s.key === stage);
  if (idx !== -1) return idx;
  // map variants
  const map: Record<string, string> = {
    aptitude_test: "test_completed",
    video_intro: "video_submitted",
    technical_round: "technical_completed",
    technical_test: "technical_completed",
    group_discussion: "gd_completed",
    hr_interview: "interview",
    selected: "hired",
    bgv: "hired",
    onboarded: "hired",
  };
  const j = JOURNEY.findIndex((s) => s.key === map[stage]);
  return j === -1 ? 0 : j;
};

const rejectionActor = (app: App) => {
  const rs = (app.rejection_stage || "").toLowerCase();
  if (!rs) return "Staff";
  if (rs.includes("manager") || rs.includes("technical")) return "Hiring Manager";
  return "HR";
};

export default function AdminPipelineBoard({ companyId, onViewResume, onViewTest, onViewVideo, onViewTech }: Props) {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data: jobsData } = await supabase
      .from("jobs").select("id, title").eq("company_id", companyId);
    const jobList = jobsData || [];
    setJobs(jobList);
    const ids = jobList.map((j: any) => j.id);
    if (ids.length === 0) { setApps([]); setLoading(false); return; }

    // EXCLUDE deleted / suspended — keeps super admin in sync with HR + Hiring Manager actions.
    // EXCLUDE hired/selected/onboarded — those move to "Hiring History".
    const { data } = await supabase
      .from("applications")
      .select("*")
      .in("job_id", ids)
      .not("status", "in", "(deleted,suspended,archived)")
      .not("current_stage", "in", "(hired,selected,onboarded)")
      .order("updated_at", { ascending: false });

    const list = data || [];
    const candIds = [...new Set(list.map((a: any) => a.candidate_id))];
    const jobMap = Object.fromEntries(jobList.map((j: any) => [j.id, j.title]));
    let candMap: Record<string, any> = {};
    if (candIds.length) {
      const { data: u } = await supabase.from("users").select("id, full_name, email").in("id", candIds);
      candMap = Object.fromEntries((u || []).map((c: any) => [c.id, c]));
    }
    setApps(list.map((a: any) => ({
      ...a,
      candidate_name: candMap[a.candidate_id]?.full_name || "Unknown",
      candidate_email: candMap[a.candidate_id]?.email || "",
      job_title: jobMap[a.job_id] || "—",
    })));
    setLoading(false);
  };

  useEffect(() => { if (companyId) load(); }, [companyId]);

  useLiveData(["applications", "interviews", "offer_letters"], () => load(), {
    key: `admin-pipeline-${companyId}`,
    enabled: !!companyId,
  });

  const filtered = useMemo(() => apps.filter((a) => {
    if (jobFilter !== "all" && a.job_id !== jobFilter) return false;
    if (stageFilter !== "all") {
      if (stageFilter === "rejected") {
        if (a.status !== "rejected" && a.current_stage !== "rejected") return false;
      } else if (a.current_stage !== stageFilter) return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.candidate_name?.toLowerCase().includes(q) ||
      a.candidate_email?.toLowerCase().includes(q) ||
      a.job_title?.toLowerCase().includes(q)
    );
  }), [apps, search, jobFilter, stageFilter]);

  const totalActive = apps.filter((a) => a.status !== "rejected" && a.current_stage !== "rejected").length;
  const totalRejected = apps.length - totalActive;
  const totalHired = apps.filter((a) => ["hired", "selected", "onboarded"].includes(a.current_stage)).length;

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const renderJourney = (a: App) => {
    const isRejected = a.status === "rejected" || a.current_stage === "rejected";
    const rejRank = isRejected ? stageRank(a.rejection_stage || "applied") : -1;
    const currentRank = isRejected ? rejRank : stageRank(a.current_stage);
    return (
      <ol className="relative border-l-2 border-border ml-2 pl-5 space-y-3">
        {JOURNEY.map((s, idx) => {
          const isRejectionPoint = isRejected && idx === rejRank;
          const done = !isRejectionPoint && idx < (isRejected ? rejRank : currentRank);
          const current = !isRejected && idx === currentRank;
          const passed = done; // ✓ passed
          const failed = isRejectionPoint; // ✗ rejected here
          const Icon = failed ? XCircle : passed ? CheckCircle2 : current ? Clock : Circle;
          const color = failed
            ? "text-destructive"
            : passed
            ? "text-emerald-500"
            : current
            ? "text-primary"
            : "text-muted-foreground/50";
          return (
            <li key={s.key} className="relative">
              <span className="absolute -left-[27px] top-0.5 h-4 w-4 rounded-full bg-card flex items-center justify-center">
                <Icon className={`h-4 w-4 ${color}`} />
              </span>
              <p className={`text-xs font-semibold ${failed ? "text-destructive" : passed || current ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
                {failed && <span className="ml-1.5 text-[10px] font-bold uppercase">— Rejected by {rejectionActor(a)}</span>}
              </p>
              {current && (
                <p className="text-[10px] text-muted-foreground">Currently here • updated {new Date(a.updated_at || a.applied_at).toLocaleString()}</p>
              )}
              {failed && a.rejection_reason && (
                <p className="text-[11px] text-muted-foreground">{a.rejection_reason}</p>
              )}
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Candidate Pipeline — Oversight</h2>
            <p className="text-sm text-muted-foreground">All active candidates across HR & Hiring Manager activity. Click a name to view their journey.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search candidate, job…" className="pl-8 h-9 w-56" />
            </div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="h-9 pl-8 pr-3 rounded-md bg-background border border-border text-sm">
                <option value="all">All Jobs</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="h-9 px-3 rounded-md bg-background border border-border text-sm">
              <option value="all">All Stages</option>
              {Object.entries(STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">In Pipeline</p>
            <p className="text-2xl font-bold text-foreground">{totalActive}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-muted-foreground">Hired / Selected</p>
            <p className="text-2xl font-bold text-emerald-500">{totalHired}</p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-red-500">{totalRejected}</p>
          </div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading pipeline…</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No candidates match the current filters.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
          {filtered.map((a) => {
            const isOpen = expanded.has(a.id);
            const isRejected = a.status === "rejected" || a.current_stage === "rejected";
            const stageKey = isRejected ? "rejected" : a.current_stage;
            const tone = STAGE_TONE[stageKey] || "bg-muted text-muted-foreground";
            return (
              <div key={a.id}>
                <button
                  onClick={() => toggle(a.id)}
                  className="w-full px-5 py-3.5 hover:bg-secondary/30 transition-colors flex items-center gap-3 text-left"
                >
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {a.candidate_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">{a.candidate_name}</p>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${tone}`}>{STAGE_LABEL[stageKey] || stageKey}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{a.candidate_email} • {a.job_title}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {typeof a.overall_score === "number" && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">★ {Math.round(a.overall_score)}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{new Date(a.updated_at || a.applied_at).toLocaleDateString()}</span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden bg-secondary/10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-12 py-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Stage Journey</p>
                          {renderJourney(a)}
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Inspect</p>
                          <div className="flex flex-wrap gap-1.5">
                            {a.resume_url && (
                              <button onClick={() => onViewResume(a.resume_url)} className="text-[11px] px-2.5 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground flex items-center gap-1">
                                <FileText className="h-3 w-3" />Resume {a.resume_score ? `(${a.resume_score})` : ""}
                              </button>
                            )}
                            {(a.test_score !== null && a.test_score !== undefined) && (
                              <button onClick={() => onViewTest(a)} className="text-[11px] px-2.5 py-1.5 rounded-md bg-purple-500/10 text-purple-500 flex items-center gap-1">
                                <Award className="h-3 w-3" />Aptitude {a.test_score}
                              </button>
                            )}
                            {a.video_url && (
                              <button onClick={() => onViewVideo(a)} className="text-[11px] px-2.5 py-1.5 rounded-md bg-pink-500/10 text-pink-500 flex items-center gap-1">
                                <Play className="h-3 w-3" />Video {a.video_score ? `(${a.video_score})` : ""}
                              </button>
                            )}
                            {(a.technical_score !== null && a.technical_score !== undefined) && (
                              <button onClick={() => onViewTech(a)} className="text-[11px] px-2.5 py-1.5 rounded-md bg-orange-500/10 text-orange-500 flex items-center gap-1">
                                <Code2 className="h-3 w-3" />Tech {a.technical_score}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div className="rounded-md bg-background/60 border border-border p-2">
                              <p className="text-[10px] text-muted-foreground">Applied</p>
                              <p className="text-xs font-medium text-foreground">{new Date(a.applied_at).toLocaleDateString()}</p>
                            </div>
                            <div className="rounded-md bg-background/60 border border-border p-2">
                              <p className="text-[10px] text-muted-foreground">Last Activity</p>
                              <p className="text-xs font-medium text-foreground">{new Date(a.updated_at || a.applied_at).toLocaleString()}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
