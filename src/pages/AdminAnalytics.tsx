import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Briefcase, Building2, CheckCircle2, FileSignature, Sparkles, UserCheck, UserCog, Users } from "lucide-react";
import {
  KpiCard, ChartCard, RangeFilter, RangeKey, rangeToDays, FunnelChart, EmptyState, ExportPdfButton,
} from "@/components/analytics/primitives";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RTooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";

const FUNNEL_STAGES: { label: string; matches: string[] }[] = [
  { label: "Applied", matches: ["applied","resume_review","ai_scored","aptitude_test","video_intro","technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { label: "Screened", matches: ["ai_scored","aptitude_test","video_intro","technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { label: "Aptitude", matches: ["aptitude_test","video_intro","technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { label: "Video", matches: ["video_intro","technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { label: "Technical", matches: ["technical_round","group_discussion","interview","hr_interview","offered","hired"] },
  { label: "GD", matches: ["group_discussion","interview","hr_interview","offered","hired"] },
  { label: "Interview", matches: ["interview","hr_interview","offered","hired"] },
  { label: "Offered", matches: ["offered","hired"] },
  { label: "Hired", matches: ["hired"] },
];

const PIE_COLORS = ["hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);

  const [range, setRange] = useState<RangeKey>("30");
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [bgvDocs, setBgvDocs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: me } = await supabase
        .from("users").select("id, role, company_id").eq("user_id", session.user.id).maybeSingle();
      if (!me || !["superadmin", "owner"].includes((me.role || "").toLowerCase())) {
        toast({ title: "Admins only", variant: "destructive" });
        navigate("/");
        return;
      }
      setCompanyId(me.company_id);

      const [{ data: us }, { data: js }] = await Promise.all([
        supabase.from("users").select("id, role, full_name, created_at").eq("company_id", me.company_id),
        supabase.from("jobs").select("id, title, status, manager_id, created_at, department").eq("company_id", me.company_id),
      ]);
      setUsers(us || []);
      setJobs(js || []);

      const jobIds = (js || []).map((j) => j.id);
      if (jobIds.length) {
        const { data: ap } = await supabase
          .from("applications")
          .select("id, job_id, candidate_id, current_stage, status, applied_at, updated_at, rejection_stage")
          .in("job_id", jobIds);
        setApps(ap || []);
        const appIds = (ap || []).map((a) => a.id);
        if (appIds.length) {
          const [{ data: of }, { data: bgv }] = await Promise.all([
            supabase.from("offer_letters").select("id, status, created_at, application_id").in("application_id", appIds),
            supabase.from("bgv_documents").select("id, status, application_id").in("application_id", appIds),
          ]);
          setOffers(of || []);
          setBgvDocs(bgv || []);
        }
      }
      setLoading(false);
    })();
  }, [navigate, toast]);

  const days = rangeToDays(range);
  const fromDate = days ? subDays(new Date(), days) : new Date(0);
  const periodJobs = useMemo(() => jobs.filter((j) => new Date(j.created_at) >= fromDate), [jobs, fromDate]);
  const periodApps = useMemo(() => apps.filter((a) => new Date(a.applied_at) >= fromDate), [apps, fromDate]);

  const kpis = useMemo(() => {
    const hrCount = users.filter((u) => u.role === "hr").length;
    const mgrCount = users.filter((u) => u.role === "manager").length;
    const candidates = users.filter((u) => u.role === "candidate").length;
    const periodHires = periodApps.filter((a) => a.status === "hired").length;
    return {
      totalUsers: users.length,
      hrCount,
      mgrCount,
      candidates,
      periodJobs: periodJobs.length,
      periodHires,
    };
  }, [users, periodJobs, periodApps]);

  const funnel = useMemo(() =>
    FUNNEL_STAGES.map((s) => ({
      label: s.label,
      value: periodApps.filter((a) => s.matches.includes(a.current_stage)).length,
    })), [periodApps]);

  const hrLeaderboard = useMemo(() => {
    const byMgr: Record<string, { jobs: number; hires: number; name: string }> = {};
    jobs.forEach((j) => {
      const m = users.find((u) => u.id === j.manager_id);
      if (!m) return;
      const key = m.id;
      byMgr[key] ||= { jobs: 0, hires: 0, name: m.full_name || "—" };
      byMgr[key].jobs += 1;
      const jobApps = apps.filter((a) => a.job_id === j.id);
      byMgr[key].hires += jobApps.filter((a) => a.status === "hired").length;
    });
    return Object.values(byMgr).sort((a, b) => b.jobs - a.jobs).slice(0, 8);
  }, [users, jobs, apps]);

  const deptPerf = useMemo(() => {
    const grouped: Record<string, { apps: number; hires: number }> = {};
    jobs.forEach((j) => {
      const d = j.department || "Unspecified";
      grouped[d] ||= { apps: 0, hires: 0 };
      const list = apps.filter((a) => a.job_id === j.id);
      grouped[d].apps += list.length;
      grouped[d].hires += list.filter((a) => a.status === "hired").length;
    });
    return Object.entries(grouped).map(([dept, v]) => ({ dept, ...v }));
  }, [jobs, apps]);

  const jobsTrend = useMemo(() => {
    const end = new Date();
    const start = days ? subDays(end, days - 1) : subDays(end, 29);
    const arr = eachDayOfInterval({ start, end });
    return arr.map((d) => {
      const k = format(d, "yyyy-MM-dd");
      return {
        date: format(d, "MMM d"),
        jobs: jobs.filter((j) => format(new Date(j.created_at), "yyyy-MM-dd") === k).length,
        apps: apps.filter((a) => format(new Date(a.applied_at), "yyyy-MM-dd") === k).length,
      };
    });
  }, [jobs, apps, days]);

  const offerStats = useMemo(() => {
    const sent = offers.filter((o) => ["sent","pending","viewed"].includes((o.status||"").toLowerCase())).length;
    const accepted = offers.filter((o) => (o.status||"").toLowerCase() === "accepted").length;
    const declined = offers.filter((o) => (o.status||"").toLowerCase() === "declined").length;
    return [
      { name: "Pending", value: sent },
      { name: "Accepted", value: accepted },
      { name: "Declined", value: declined },
    ];
  }, [offers]);

  const bgvStats = useMemo(() => {
    const pending = bgvDocs.filter((b) => (b.status||"").toLowerCase() === "pending").length;
    const verified = bgvDocs.filter((b) => (b.status||"").toLowerCase() === "verified").length;
    const rejected = bgvDocs.filter((b) => (b.status||"").toLowerCase() === "rejected").length;
    return { pending, verified, rejected };
  }, [bgvDocs]);

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
              <h1 className="text-xl font-semibold text-foreground">Company Analytics</h1>
              <p className="text-xs text-muted-foreground">Org-wide hiring performance, team activity, and compliance.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RangeFilter value={range} onChange={setRange} />
            <ExportPdfButton targetRef={reportRef} fileName="admin-analytics" />
          </div>
        </div>

        <div ref={reportRef} className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <KpiCard label="Total Users" value={kpis.totalUsers} icon={<Users className="h-4 w-4" />} accent="primary" />
            <KpiCard label="HR" value={kpis.hrCount} icon={<UserCheck className="h-4 w-4" />} accent="sky" />
            <KpiCard label="Managers" value={kpis.mgrCount} icon={<UserCog className="h-4 w-4" />} accent="violet" />
            <KpiCard label="Candidates" value={kpis.candidates} icon={<Users className="h-4 w-4" />} accent="amber" />
            <KpiCard label="Jobs Posted" value={kpis.periodJobs} hint="In selected period" icon={<Briefcase className="h-4 w-4" />} accent="primary" />
            <KpiCard label="Hires" value={kpis.periodHires} hint="In selected period" icon={<CheckCircle2 className="h-4 w-4" />} accent="emerald" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Company Funnel" subtitle="All applications" className="lg:col-span-2">
              {funnel.some((f) => f.value > 0) ? <FunnelChart data={funnel} /> : <EmptyState title="No applications yet" />}
            </ChartCard>
            <ChartCard title="Offer Outcomes" subtitle="Current cycle">
              {offerStats.some((o) => o.value > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={offerStats} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {offerStats.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No offers yet" />}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartCard title="Jobs & Applications Trend" subtitle="Daily activity" className="lg:col-span-2">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={jobsTrend}>
                  <defs>
                    <linearGradient id="adAppsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adJobsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="apps" name="Applications" stroke="hsl(var(--primary))" fill="url(#adAppsFill)" />
                  <Area type="monotone" dataKey="jobs" name="Jobs" stroke="#10b981" fill="url(#adJobsFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Compliance" subtitle="Background verification">
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md bg-amber-500/10 px-3 py-2 text-xs">
                  <span>Pending</span><span className="font-semibold text-amber-500">{bgvStats.pending}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-emerald-500/10 px-3 py-2 text-xs">
                  <span>Verified</span><span className="font-semibold text-emerald-500">{bgvStats.verified}</span>
                </div>
                <div className="flex items-center justify-between rounded-md bg-rose-500/10 px-3 py-2 text-xs">
                  <span>Rejected</span><span className="font-semibold text-rose-500">{bgvStats.rejected}</span>
                </div>
                <div className="mt-4 rounded-md border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3" />
                  BGV throughput keeps onboarding on schedule.
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard title="Team Leaderboard" subtitle="Top hiring managers by jobs owned">
              {hrLeaderboard.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hrLeaderboard} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="jobs" name="Jobs" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="hires" name="Hires" fill="#10b981" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No team activity yet" />}
            </ChartCard>

            <ChartCard title="Department Performance" subtitle="Applications vs. hires">
              {deptPerf.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={deptPerf}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dept" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <RTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="apps" name="Applications" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="hires" name="Hires" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No department data" />}
            </ChartCard>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
