import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, CheckCircle2, FileText, Sparkles, Target, Trophy, XCircle } from "lucide-react";
import {
  KpiCard, ChartCard, RangeFilter, RangeKey, rangeToDays, EmptyState, ExportPdfButton, ActivityHeatmap,
} from "@/components/analytics/primitives";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from "recharts";
import { format, subDays } from "date-fns";

const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  resume_review: "Resume Review",
  ai_scored: "Resume Review",
  aptitude_test: "Aptitude",
  video_intro: "Video",
  technical_round: "Technical",
  group_discussion: "Group Discussion",
  interview: "HR Interview",
  hr_interview: "HR Interview",
  offered: "Offered",
  hired: "Hired",
};

const CandidateAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<RangeKey>("90");
  const [loading, setLoading] = useState(true);
  const [candidateUserId, setCandidateUserId] = useState<string | null>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [jobsById, setJobsById] = useState<Record<string, any>>({});
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: me } = await supabase
        .from("users").select("id, role").eq("user_id", session.user.id).maybeSingle();
      if (!me || me.role !== "candidate") {
        toast({ title: "Candidates only", variant: "destructive" });
        navigate("/");
        return;
      }
      setCandidateUserId(me.id);
      const { data: ap } = await supabase
        .from("applications")
        .select("id, job_id, current_stage, status, applied_at, updated_at, resume_score, test_score, video_score, technical_score, interview_score, overall_score, rejection_stage")
        .eq("candidate_id", me.id)
        .order("applied_at", { ascending: false });
      setApps(ap || []);
      const ids = Array.from(new Set((ap || []).map((a) => a.job_id)));
      if (ids.length) {
        const { data: js } = await supabase
          .from("jobs").select("id, title, company_id, location, salary_min, salary_max").in("id", ids);
        const map: Record<string, any> = {};
        (js || []).forEach((j) => (map[j.id] = j));
        setJobsById(map);
      }
      const { data: cp } = await supabase
        .from("candidate_profiles")
        .select("skills, experiences, education, completion_percentage")
        .eq("user_id", me.id)
        .maybeSingle();
      setProfile(cp);
      setLoading(false);
    })();
  }, [navigate, toast]);

  const days = rangeToDays(range);
  const fromDate = days ? subDays(new Date(), days) : new Date(0);
  const filtered = useMemo(() => apps.filter((a) => new Date(a.applied_at) >= fromDate), [apps, fromDate]);

  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((a) => !["rejected", "hired"].includes(a.status)).length;
    const shortlisted = filtered.filter((a) => ["technical_round","group_discussion","interview","hr_interview","offered","hired"].includes(a.current_stage)).length;
    const rejected = filtered.filter((a) => a.status === "rejected").length;
    const offers = filtered.filter((a) => ["offered","hired"].includes(a.current_stage)).length;
    const overall = filtered.map((a) => a.overall_score).filter((v) => v != null);
    const avg = overall.length ? overall.reduce((s, v) => s + Number(v), 0) / overall.length : 0;
    return { total, active, shortlisted, rejected, offers, avg: +avg.toFixed(1) };
  }, [filtered]);

  const radar = useMemo(() => {
    const fields = [
      { key: "resume_score", label: "Resume" },
      { key: "test_score", label: "Aptitude" },
      { key: "video_score", label: "Video" },
      { key: "technical_score", label: "Technical" },
      { key: "interview_score", label: "Interview" },
    ];
    return fields.map((f) => {
      const vals = filtered.map((a: any) => a[f.key]).filter((v) => v != null).map(Number);
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { dim: f.label, score: +avg.toFixed(1) };
    });
  }, [filtered]);

  const heatmap = useMemo(() => {
    const map: Record<string, number> = {};
    apps.forEach((a) => {
      const k = format(new Date(a.applied_at), "yyyy-MM-dd");
      map[k] = (map[k] ?? 0) + 1;
    });
    return map;
  }, [apps]);

  const stageBars = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((a) => {
      const lbl = STAGE_LABELS[a.current_stage] || a.current_stage || "Unknown";
      counts[lbl] = (counts[lbl] ?? 0) + 1;
    });
    return Object.entries(counts).map(([stage, count]) => ({ stage, count }));
  }, [filtered]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading your analytics…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">My Analytics</h1>
              <p className="text-xs text-muted-foreground">Track your applications, scores, and progress.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RangeFilter value={range} onChange={setRange} />
            <ExportPdfButton targetRef={reportRef} fileName="my-analytics" />
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <KpiCard label="Applications" value={kpis.total} icon={<Briefcase className="h-4 w-4" />} accent="primary" />
            <KpiCard label="Active" value={kpis.active} icon={<Sparkles className="h-4 w-4" />} accent="sky" />
            <KpiCard label="Shortlisted" value={kpis.shortlisted} icon={<Trophy className="h-4 w-4" />} accent="emerald" />
            <KpiCard label="Offers" value={kpis.offers} icon={<CheckCircle2 className="h-4 w-4" />} accent="violet" />
            <KpiCard label="Rejected" value={kpis.rejected} icon={<XCircle className="h-4 w-4" />} accent="rose" />
            <KpiCard label="Avg Score" value={kpis.avg || "—"} hint="Overall" icon={<Target className="h-4 w-4" />} accent="amber" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Skill Radar" subtitle="Your average score per round">
              {radar.some((r) => r.score > 0) ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radar} outerRadius={90}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No scored rounds yet" message="Complete a round to see your radar." />}
            </ChartCard>

            <ChartCard title="Where You Are" subtitle="Your applications by current stage" className="lg:col-span-2">
              {stageBars.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stageBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} angle={-12} textAnchor="end" height={50} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No applications in range" />}
            </ChartCard>
          </div>

          <ChartCard title="Application Activity" subtitle="Last 12 weeks">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <ActivityHeatmap values={heatmap} />
              <div className="text-xs text-muted-foreground">
                Profile completion:&nbsp;
                <span className="font-semibold text-foreground">{profile?.completion_percentage ?? 0}%</span>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="My Application Journey" subtitle="Per-job progress">
            {filtered.length === 0 ? (
              <EmptyState title="No applications yet" message="Browse jobs and apply to see your journey here." icon={<FileText className="h-6 w-6" />} />
            ) : (
              <div className="space-y-3">
                {filtered.map((a) => {
                  const job = jobsById[a.job_id];
                  const reached = ["applied","ai_scored","aptitude_test","video_intro","technical_round","group_discussion","interview","offered","hired"];
                  const order: Record<string, number> = { applied:0, resume_review:1, ai_scored:1, aptitude_test:2, video_intro:3, technical_round:4, group_discussion:5, interview:6, hr_interview:6, offered:7, hired:8 };
                  const idx = order[a.current_stage] ?? 0;
                  const pct = ((idx + 1) / 9) * 100;
                  const isRejected = a.status === "rejected";
                  return (
                    <div key={a.id} className="rounded-lg border border-border/60 bg-card/40 p-3">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{job?.title || "Job"}</p>
                          <p className="text-xs text-muted-foreground">Applied {format(new Date(a.applied_at), "MMM d, yyyy")}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isRejected ? "bg-rose-500/15 text-rose-500" :
                          a.status === "hired" ? "bg-emerald-500/15 text-emerald-500" :
                          "bg-primary/15 text-primary"
                        }`}>
                          {STAGE_LABELS[a.current_stage] || a.current_stage}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${isRejected ? "bg-rose-500" : "bg-gradient-to-r from-primary to-primary/60"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default CandidateAnalytics;
