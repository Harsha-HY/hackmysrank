import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Briefcase, Calendar, CheckCircle2, ClipboardList, Clock, FileSignature, Users,
} from "lucide-react";
import {
  KpiCard, ChartCard, RangeFilter, RangeKey, rangeToDays, FunnelChart, EmptyState, ExportPdfButton, SectionHeader,
} from "@/components/analytics/primitives";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, CartesianGrid,
  AreaChart, Area,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

const STAGE_ORDER = [
  "applied", "resume_review", "ai_scored", "aptitude_test", "video_intro",
  "technical_round", "group_discussion", "interview", "hr_interview", "offered", "hired",
];

const FUNNEL_STAGES: { key: string; label: string; matches: string[] }[] = [
  { key: "applied", label: "Applied", matches: STAGE_ORDER },
  { key: "screened", label: "Resume Screened", matches: STAGE_ORDER.slice(1) },
  { key: "aptitude", label: "Aptitude", matches: ["aptitude_test","video_intro","technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { key: "video", label: "Video", matches: ["video_intro","technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { key: "technical", label: "Technical", matches: ["technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { key: "gd", label: "Group Discussion", matches: ["group_discussion","interview","hr_interview","offered","hired"] },
  { key: "interview", label: "HR Interview", matches: ["interview","hr_interview","offered","hired"] },
  { key: "offered", label: "Offer", matches: ["offered","hired"] },
  { key: "hired", label: "Hired", matches: ["hired"] },
];

const ManagerAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<RangeKey>("30");
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: me } = await supabase
        .from("users").select("id, role, company_id").eq("user_id", session.user.id).maybeSingle();
      if (!me || !["manager", "hr", "superadmin", "owner"].includes((me.role || "").toLowerCase())) {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/");
        return;
      }
      setMeId(me.id);
      setCompanyId(me.company_id);

      // Jobs: managed by me OR (fallback) company-wide if HR
      const { data: js } = await supabase
        .from("jobs").select("id, title, status, manager_id, created_at, applications_count")
        .eq("company_id", me.company_id);
      const myJobs = (js || []).filter((j) => !j.manager_id || j.manager_id === me.id || me.role !== "manager");
      setJobs(myJobs);
      const jobIds = myJobs.map((j) => j.id);

      if (jobIds.length) {
        const { data: ap } = await supabase
          .from("applications")
          .select("id, job_id, candidate_id, current_stage, status, applied_at, updated_at, technical_score, video_score, resume_score, interview_score, test_score, overall_score, rejection_stage")
          .in("job_id", jobIds);
        setApps(ap || []);
        const { data: iv } = await supabase
          .from("interviews").select("id, scheduled_at, status, application_id").in("application_id", (ap || []).map((a) => a.id));
        setInterviews(iv || []);
        const { data: of } = await supabase
          .from("offer_letters").select("id, status, created_at, application_id").in("application_id", (ap || []).map((a) => a.id));
        setOffers(of || []);
      }
      setLoading(false);
    })();
  }, [navigate, toast]);

  const days = rangeToDays(range);
  const fromDate = days ? subDays(new Date(), days) : new Date(0);

  const filteredApps = useMemo(
    () => apps.filter((a) => new Date(a.applied_at) >= fromDate),
    [apps, fromDate]
  );

  const kpis = useMemo(() => {
    const openJobs = jobs.filter((j) => j.status === "open").length;
    const pipeline = apps.filter((a) => !["rejected", "hired"].includes(a.status)).length;
    const pending = apps.filter((a) => ["resume_review", "ai_scored"].includes(a.current_stage)).length;
    const weekAhead = new Date(Date.now() + 7 * 86400_000);
    const upcoming = interviews.filter((i) => i.scheduled_at && new Date(i.scheduled_at) <= weekAhead && new Date(i.scheduled_at) >= new Date()).length;
    const offersOut = offers.filter((o) => ["sent", "pending"].includes((o.status || "").toLowerCase())).length;
    return { openJobs, pipeline, pending, upcoming, offersOut };
  }, [jobs, apps, interviews, offers]);

  const funnel = useMemo(() => {
    return FUNNEL_STAGES.map((s) => ({
      label: s.label,
      value: filteredApps.filter((a) => s.matches.includes(a.current_stage)).length,
    }));
  }, [filteredApps]);

  const stageSla = useMemo(() => {
    // Approx: average days from applied_at to updated_at, grouped by current_stage
    const groups: Record<string, number[]> = {};
    filteredApps.forEach((a) => {
      const stage = a.current_stage || "applied";
      const start = new Date(a.applied_at).getTime();
      const end = new Date(a.updated_at || a.applied_at).getTime();
      const days = Math.max(0, (end - start) / 86400_000);
      (groups[stage] ||= []).push(days);
    });
    return Object.entries(groups)
      .map(([k, arr]) => ({ stage: k.replace(/_/g, " "), avgDays: +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) }))
      .sort((a, b) => b.avgDays - a.avgDays)
      .slice(0, 8);
  }, [filteredApps]);

  const scoreDist = useMemo(() => {
    const fields: { key: keyof any; label: string }[] = [
      { key: "resume_score", label: "Resume" },
      { key: "test_score", label: "Aptitude" },
      { key: "video_score", label: "Video" },
      { key: "technical_score", label: "Technical" },
      { key: "interview_score", label: "Interview" },
    ];
    return fields.map((f) => {
      const vals = filteredApps.map((a) => a[f.key]).filter((v) => v != null && !isNaN(Number(v))).map(Number);
      const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { round: f.label, avg: +avg.toFixed(1) };
    });
  }, [filteredApps]);

  const trend = useMemo(() => {
    const end = new Date();
    const start = days ? subDays(end, days - 1) : subDays(end, 29);
    const arr = eachDayOfInterval({ start, end });
    return arr.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      const count = filteredApps.filter((a) => format(new Date(a.applied_at), "yyyy-MM-dd") === k).length;
      return { date: format(d, "MMM d"), applications: count };
    });
  }, [filteredApps, days]);

  const perRole = useMemo(() => {
    return jobs.map((j) => {
      const list = apps.filter((a) => a.job_id === j.id);
      const hired = list.filter((a) => a.status === "hired").length;
      const rejected = list.filter((a) => a.status === "rejected").length;
      return { title: j.title, total: list.length, hired, rejected, active: list.length - hired - rejected };
    }).sort((a, b) => b.total - a.total);
  }, [jobs, apps]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading analytics…</div>;
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
              <h1 className="text-xl font-semibold text-foreground">Hiring Manager Analytics</h1>
              <p className="text-xs text-muted-foreground">Pipeline health, SLA, and scorecards for your roles.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RangeFilter value={range} onChange={setRange} />
            <ExportPdfButton targetRef={reportRef} fileName="manager-analytics" />
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <KpiCard label="My Open Roles" value={kpis.openJobs} icon={<Briefcase className="h-4 w-4" />} accent="primary" />
            <KpiCard label="In Pipeline" value={kpis.pipeline} icon={<Users className="h-4 w-4" />} accent="sky" />
            <KpiCard label="Pending Review" value={kpis.pending} icon={<ClipboardList className="h-4 w-4" />} accent="amber" />
            <KpiCard label="Interviews / 7d" value={kpis.upcoming} icon={<Calendar className="h-4 w-4" />} accent="violet" />
            <KpiCard label="Offers Out" value={kpis.offersOut} icon={<FileSignature className="h-4 w-4" />} accent="emerald" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Pipeline Funnel" subtitle="Counts at each stage" className="lg:col-span-2">
              {funnel.some((f) => f.value > 0) ? <FunnelChart data={funnel} /> : <EmptyState title="No pipeline data" />}
            </ChartCard>
            <ChartCard title="Avg Round Scores" subtitle="Out of 100">
              {scoreDist.some((s) => s.avg > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDist} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis dataKey="round" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="avg" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No scored applications yet" />}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Application Volume" subtitle="Daily inflow" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="mgrAreaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="applications" stroke="hsl(var(--primary))" fill="url(#mgrAreaFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Stage SLA" subtitle="Avg days in current stage">
              {stageSla.length ? (
                <div className="space-y-2">
                  {stageSla.map((s) => (
                    <div key={s.stage} className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                      <span className="text-xs capitalize text-foreground">{s.stage}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        <Clock className="h-3 w-3 text-muted-foreground" /> {s.avgDays}d
                      </span>
                    </div>
                  ))}
                </div>
              ) : <EmptyState title="No timing data" />}
            </ChartCard>
          </div>

          <ChartCard title="Per-Role Breakdown" subtitle="Outcomes for each of your roles">
            {perRole.length === 0 ? (
              <EmptyState title="No jobs assigned to you yet" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Active</th>
                      <th className="px-3 py-2 text-right font-medium">Hired</th>
                      <th className="px-3 py-2 text-right font-medium">Rejected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {perRole.map((r) => (
                      <tr key={r.title} className="text-foreground">
                        <td className="px-3 py-2">{r.title}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.total}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.active}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-500">{r.hired}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-500">{r.rejected}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ChartCard>

          <SectionHeader title="" />
        </div>
      </div>
    </div>
  );
};

export default ManagerAnalytics;
