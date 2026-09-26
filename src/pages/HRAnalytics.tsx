import { JOB_COLUMNS } from "@/lib/jobColumns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import {
  ArrowLeft, Download, Users, Clock, CheckCircle2, Activity, TrendingDown, Calendar as CalendarIcon, Sparkles,
} from "lucide-react";
import { format, subDays, eachDayOfInterval, differenceInDays, parseISO } from "date-fns";

type Preset = "7" | "30" | "90" | "custom";

const STAGES: { key: string; label: string }[] = [
  { key: "applied", label: "Applied" },
  { key: "ai_scored", label: "Resume Review" },
  { key: "aptitude_test", label: "Aptitude Test" },
  { key: "video_intro", label: "Video Round" },
  { key: "technical_round", label: "Technical" },
  { key: "group_discussion", label: "GD" },
  { key: "interview", label: "Interview" },
  { key: "offered", label: "Offered" },
  { key: "hired", label: "Hired" },
];

// Map current_stage values that imply reaching a later stage
const STAGE_REACH_ORDER: Record<string, number> = {
  applied: 0,
  ai_scored: 1,
  aptitude_test: 2,
  test_completed: 2,
  test_failed: 2,
  video_intro: 3,
  technical_round: 4,
  group_discussion: 5,
  interview: 6,
  offered: 7,
  hired: 8,
};

const GREEN = ["#10b981", "#22c55e", "#16a34a", "#15803d", "#65a30d", "#84cc16", "#a3e635", "#34d399", "#059669", "#047857"];

const HRAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [preset, setPreset] = useState<Preset>("30");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [candidatesMap, setCandidatesMap] = useState<Record<string, any>>({});
  const [exporting, setExporting] = useState(false);

  const { startDate, endDate } = useMemo(() => {
    if (preset === "custom") {
      return { startDate: new Date(customStart), endDate: new Date(customEnd + "T23:59:59") };
    }
    const days = parseInt(preset, 10);
    return { startDate: subDays(new Date(), days), endDate: new Date() };
  }, [preset, customStart, customEnd]);

  // Auth + company gate
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: me } = await supabase
        .from("users").select("role, company_id").eq("user_id", session.user.id).maybeSingle();
      if (!me || !["hr", "superadmin", "manager"].includes((me.role || "").toLowerCase())) {
        toast({ title: "Access denied", description: "Only HR or Super Admin can view analytics.", variant: "destructive" });
        navigate("/");
        return;
      }
      setCompanyId(me.company_id);
    })();
  }, [navigate, toast]);

  // Load data
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const { data: jobsData } = await supabase
        .from("jobs").select(JOB_COLUMNS).eq("company_id", companyId).order("created_at", { ascending: false });
      const jobIds = (jobsData || []).map(j => j.id);
      setJobs(jobsData || []);

      if (jobIds.length === 0) { setApplications([]); setCandidatesMap({}); setLoading(false); return; }

      const { data: appsData } = await supabase
        .from("applications").select("*").in("job_id", jobIds);
      setApplications(appsData || []);

      const candIds = Array.from(new Set((appsData || []).map(a => a.candidate_id).filter(Boolean)));
      if (candIds.length) {
        const { data: users } = await supabase
          .from("users").select("id, full_name, email").in("id", candIds);
        const map: Record<string, any> = {};
        (users || []).forEach(u => { map[u.id] = u; });
        setCandidatesMap(map);
      }
      setLoading(false);
    })();
  }, [companyId]);

  // Filter apps within date range
  const appsInRange = useMemo(
    () => applications.filter(a => {
      const d = new Date(a.applied_at);
      return d >= startDate && d <= endDate;
    }),
    [applications, startDate, endDate]
  );

  // ROW 1: KPIs
  const kpis = useMemo(() => {
    const total = appsInRange.length;
    const hired = appsInRange.filter(a => a.current_stage === "hired");
    const offered = appsInRange.filter(a => ["offered", "hired"].includes(a.current_stage || ""));
    const timeToHireDays = hired
      .map(a => differenceInDays(new Date(a.updated_at), new Date(a.applied_at)))
      .filter(n => n >= 0);
    const avgTTH = timeToHireDays.length ? Math.round(timeToHireDays.reduce((s, n) => s + n, 0) / timeToHireDays.length) : 0;
    const acceptanceRate = offered.length ? Math.round((hired.length / offered.length) * 100) : 0;
    const active = appsInRange.filter(a => a.status === "active" && !["hired", "rejected"].includes(a.current_stage || "")).length;
    return { total, avgTTH, acceptanceRate, active };
  }, [appsInRange]);

  // CHART 1: Applications over time per job
  const timeSeries = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const topJobs = [...jobs]
      .map(j => ({ j, count: applications.filter(a => a.job_id === j.id).length }))
      .sort((a, b) => b.count - a.count).slice(0, 6).map(x => x.j);
    const data = days.map(d => {
      const row: any = { date: format(d, "MMM dd") };
      topJobs.forEach(j => {
        row[j.title || "Untitled"] = appsInRange.filter(a =>
          a.job_id === j.id && format(new Date(a.applied_at), "yyyy-MM-dd") === format(d, "yyyy-MM-dd")
        ).length;
      });
      return row;
    });
    return { data, jobs: topJobs };
  }, [appsInRange, applications, jobs, startDate, endDate]);

  // CHART 2: Funnel
  const funnel = useMemo(() => {
    return STAGES.map((s, idx) => {
      const reachIdx = idx; // we treat list index as required reach order
      const count = appsInRange.filter(a => {
        const reached = STAGE_REACH_ORDER[a.current_stage || "applied"] ?? 0;
        return reached >= reachIdx;
      }).length;
      return { stage: s.label, count };
    }).map((row, idx, arr) => {
      const prev = idx === 0 ? row.count : arr[idx - 1].count;
      const conv = prev ? Math.round((row.count / prev) * 100) : 100;
      return { ...row, conv };
    });
  }, [appsInRange]);

  // CHART 3: Stage duration (avg days)
  const stageDurations = useMemo(() => {
    // Approximate: bucket apps currently sitting at each stage by (now - applied_at) for active.
    // For completed (hired/offered) use updated_at - applied_at split evenly across stages reached.
    const buckets: Record<string, number[]> = {};
    STAGES.forEach(s => (buckets[s.label] = []));
    appsInRange.forEach(a => {
      const stage = a.current_stage || "applied";
      const stageDef = STAGES.find(s => s.key === stage);
      if (!stageDef) return;
      const days = differenceInDays(new Date(), new Date(a.applied_at));
      if (days >= 0) buckets[stageDef.label].push(days);
    });
    return STAGES.map(s => {
      const arr = buckets[s.label];
      const avg = arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : 0;
      return { stage: s.label, days: avg };
    });
  }, [appsInRange]);

  const slowStage = useMemo(
    () => stageDurations.reduce((a, b) => (b.days > a.days ? b : a), { stage: "", days: 0 }),
    [stageDurations]
  );

  // CHART 4: AI score distribution
  const scoreDist = useMemo(() => {
    const buckets = [
      { range: "0-20", min: 0, max: 20, count: 0 },
      { range: "21-40", min: 21, max: 40, count: 0 },
      { range: "41-60", min: 41, max: 60, count: 0 },
      { range: "61-80", min: 61, max: 80, count: 0 },
      { range: "81-100", min: 81, max: 100, count: 0 },
    ];
    appsInRange.forEach(a => {
      const s = a.resume_score ?? a.overall_score;
      if (s == null) return;
      const b = buckets.find(x => s >= x.min && s <= x.max);
      if (b) b.count += 1;
    });
    return buckets;
  }, [appsInRange]);

  // ROW 3: Job performance
  const jobPerf = useMemo(() => {
    return jobs.map(j => {
      const apps = applications.filter(a => a.job_id === j.id);
      const scored = apps.map(a => a.resume_score).filter((x): x is number => typeof x === "number");
      const avgScore = scored.length ? Math.round(scored.reduce((s, n) => s + n, 0) / scored.length) : 0;
      const shortlisted = apps.filter(a => (STAGE_REACH_ORDER[a.current_stage || ""] ?? 0) >= 2).length;
      const hired = apps.filter(a => a.current_stage === "hired").length;
      const daysOpen = differenceInDays(new Date(), new Date(j.created_at));
      return {
        id: j.id, title: j.title, total: apps.length, avgScore, shortlisted, hired, daysOpen,
        status: j.status || "open",
      };
    }).sort((a, b) => b.total - a.total);
  }, [jobs, applications]);

  // ROW 4: Top candidates
  const topCandidates = useMemo(() => {
    return [...appsInRange]
      .map(a => ({
        ...a,
        score: a.overall_score ?? a.resume_score ?? 0,
        candidate: candidatesMap[a.candidate_id],
        job: jobs.find(j => j.id === a.job_id),
      }))
      .filter(a => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [appsInRange, candidatesMap, jobs]);

  const handleExport = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(reportRef.current, { backgroundColor: "#0a0a0a", scale: 1.2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      pdf.save(`HireZap_Analytics_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading analytics…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Hiring Analytics</h1>
              <p className="text-xs text-muted-foreground">{format(startDate, "MMM d, yyyy")} → {format(endDate, "MMM d, yyyy")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-card overflow-hidden text-xs">
              {([
                { v: "7", l: "7d" }, { v: "30", l: "30d" }, { v: "90", l: "90d" }, { v: "custom", l: "Custom" },
              ] as { v: Preset; l: string }[]).map(p => (
                <button key={p.v} onClick={() => setPreset(p.v)}
                  className={`px-3 py-2 transition-colors ${preset === p.v ? "bg-green-600 text-white" : "text-foreground hover:bg-muted"}`}>
                  {p.l}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground" />
                <span className="text-muted-foreground text-xs">→</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground" />
              </div>
            )}
            <Button onClick={handleExport} disabled={exporting} className="bg-green-600 hover:bg-green-700 text-white">
              <Download className="h-4 w-4 mr-1" /> {exporting ? "Exporting…" : "Export PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div ref={reportRef} className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ROW 1: KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Users className="h-5 w-5" />} label="Total Applications" value={kpis.total} sub="In selected period" />
          <KpiCard icon={<Clock className="h-5 w-5" />} label="Avg Time to Hire" value={`${kpis.avgTTH}d`} sub="From applied to hired" />
          <KpiCard icon={<CheckCircle2 className="h-5 w-5" />} label="Offer Acceptance" value={`${kpis.acceptanceRate}%`} sub="Hired ÷ Offered" />
          <KpiCard icon={<Activity className="h-5 w-5" />} label="Active Candidates" value={kpis.active} sub="Still in pipeline" />
        </div>

        {/* ROW 2: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Chart 1 */}
          <ChartCard title="Applications Over Time" subtitle="Daily volume per job">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeSeries.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {timeSeries.jobs.map((j, i) => (
                  <Line key={j.id} type="monotone" dataKey={j.title || "Untitled"} stroke={GREEN[i % GREEN.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Chart 2: Funnel */}
          <ChartCard title="Hiring Funnel" subtitle="Stage-to-stage conversion">
            <div className="space-y-2">
              {funnel.map((row, idx) => {
                const max = funnel[0].count || 1;
                const width = Math.max(6, (row.count / max) * 100);
                const lowConv = idx > 0 && row.conv < 50;
                return (
                  <div key={row.stage} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-muted-foreground">{row.stage}</div>
                    <div className="flex-1 h-7 rounded-md bg-muted overflow-hidden relative">
                      <div className={`h-full ${lowConv ? "bg-red-500" : "bg-green-600"} flex items-center px-2 text-xs text-white font-medium`}
                        style={{ width: `${width}%` }}>
                        {row.count}
                      </div>
                    </div>
                    <div className={`w-14 text-right text-xs font-semibold ${lowConv ? "text-red-500" : "text-green-500"}`}>
                      {idx === 0 ? "—" : `${row.conv}%`}
                    </div>
                  </div>
                );
              })}
            </div>
          </ChartCard>

          {/* Chart 3 */}
          <ChartCard title="Stage Duration" subtitle="Average days candidates spend in each stage">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageDurations}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="days" radius={[6, 6, 0, 0]}>
                  {stageDurations.map((d, i) => (
                    <Cell key={i} fill={d.days > 7 ? "#ef4444" : "#10b981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {slowStage.days > 5 && (
              <div className="mt-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 flex gap-2">
                <Sparkles className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-foreground">
                  Candidates are spending <span className="font-semibold">{slowStage.days} days</span> in the <span className="font-semibold">{slowStage.stage}</span> stage. Consider reviewing faster or adjusting your screening criteria.
                </p>
              </div>
            )}
          </ChartCard>

          {/* Chart 4 */}
          <ChartCard title="AI Score Distribution" subtitle="Resume / overall AI score buckets">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={scoreDist}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} allowDecimals={false} />
                <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ROW 3: Job performance */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Job Performance</h3>
            <span className="text-xs text-muted-foreground">{jobPerf.length} jobs</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Job Title</th>
                  <th className="py-2 px-4 font-medium">Applications</th>
                  <th className="py-2 px-4 font-medium">Avg AI Score</th>
                  <th className="py-2 px-4 font-medium">Shortlisted</th>
                  <th className="py-2 px-4 font-medium">Hired</th>
                  <th className="py-2 px-4 font-medium">Days Open</th>
                  <th className="py-2 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobPerf.map(j => (
                  <tr key={j.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 pr-4 font-medium text-foreground">{j.title}</td>
                    <td className="py-3 px-4 text-foreground">{j.total}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        j.avgScore >= 70 ? "bg-green-500/15 text-green-500"
                        : j.avgScore >= 40 ? "bg-yellow-500/15 text-yellow-500"
                        : "bg-red-500/15 text-red-500"
                      }`}>{j.avgScore}</span>
                    </td>
                    <td className="py-3 px-4 text-foreground">{j.shortlisted}</td>
                    <td className="py-3 px-4 text-foreground">{j.hired}</td>
                    <td className="py-3 px-4 text-muted-foreground">{j.daysOpen}d</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        j.status === "open" ? "bg-green-500/15 text-green-500" : "bg-muted text-muted-foreground"
                      }`}>{j.status}</span>
                    </td>
                  </tr>
                ))}
                {jobPerf.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No jobs yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ROW 4: Top candidates */}
        <Card className="bg-card border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">Top Candidates</h3>
            <span className="text-xs text-muted-foreground">By overall score</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {topCandidates.map(c => {
              const name = c.candidate?.full_name || c.candidate?.email || "Candidate";
              const initial = (name || "?").charAt(0).toUpperCase();
              return (
                <div key={c.id} className="rounded-xl border border-border bg-background/40 p-4 flex items-center gap-3">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center font-bold">{initial}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.job?.title || "—"}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-500">{Math.round(c.score)}</div>
                    <Button variant="outline" size="sm" className="mt-1 h-7 text-xs" onClick={() => navigate("/hr-dashboard")}>View</Button>
                  </div>
                </div>
              );
            })}
            {topCandidates.length === 0 && (
              <div className="md:col-span-2 xl:col-span-3 py-8 text-center text-muted-foreground text-sm">No scored candidates yet</div>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-2">
          <TrendingDown className="inline h-3 w-3 mr-1" /> Insights refresh in real time. Export the report for sharing.
        </p>
      </div>
    </div>
  );
};

const KpiCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: React.ReactNode; sub: string }) => (
  <Card className="bg-card border-border p-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="h-8 w-8 rounded-lg bg-green-500/15 text-green-500 flex items-center justify-center">{icon}</span>
    </div>
    <div className="text-3xl font-bold text-foreground">{value}</div>
    <p className="text-xs text-muted-foreground mt-1">{sub}</p>
  </Card>
);

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <Card className="bg-card border-border p-5">
    <div className="mb-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
    {children}
  </Card>
);

export default HRAnalytics;
