import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  RotateCcw,
  Settings,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import AddCompanyPanel from "@/components/AddCompanyPanel";
import { useToast } from "@/hooks/use-toast";
import ThemeToggle from "@/components/ThemeToggle";
import AIAssistantWidget from "@/components/AIAssistantWidget";

interface Company {
  id: string;
  company_name: string;
  industry: string;
  location: string;
  plan: string;
  company_code: string;
  status: string;
  created_at: string;
}

interface JobRecord {
  id: string;
  company_id: string;
  status: string;
  title?: string;
  created_at?: string;
}

interface ApplicationRecord {
  id: string;
  job_id: string;
  status: string;
  current_stage: string;
  created_at?: string;
}

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: string;
  company_id: string | null;
  created_at?: string;
}

interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  created_at: string;
  read: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Building2, label: "Companies" },
  { icon: RotateCcw, label: "Restore Company" },
  { icon: UserCheck, label: "Super Admins" },
  { icon: Briefcase, label: "All Jobs" },
  { icon: Users, label: "All Candidates" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Activity, label: "Activity Log" },
  { icon: CreditCard, label: "Billing & Plans" },
  { icon: Shield, label: "Security" },
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Settings" },
];

const CHART_COLORS = ["hsl(var(--primary))", "#22c55e", "#f59e0b", "#a855f7", "#ef4444", "#06b6d4", "#ec4899"];

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("Overview");
  const [ownerName, setOwnerName] = useState("");
  const [ownerUserId, setOwnerUserId] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [companyToPermanentDelete, setCompanyToPermanentDelete] = useState<Company | null>(null);
  const [busyCompanyId, setBusyCompanyId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.status !== "deleted" && company.status !== "removed"),
    [companies],
  );

  const deletedCompanies = useMemo(
    () => companies.filter((company) => company.status === "deleted"),
    [companies],
  );

  const adminMap = useMemo(() => {
    const map: Record<string, { full_name: string; email: string }> = {};
    users
      .filter((user) => user.role === "superadmin" && user.company_id)
      .forEach((user) => {
        map[user.company_id!] = { full_name: user.full_name, email: user.email };
      });
    return map;
  }, [users]);

  const fetchData = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setOwnerUserId(session.user.id);

    const { data: user } = await supabase
      .from("users")
      .select("full_name")
      .eq("user_id", session.user.id)
      .single();
    if (user) setOwnerName(user.full_name);

    const { data: compsRaw } = await supabase.rpc("owner_companies_full" as any);
    const comps = ((compsRaw as any[]) || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const { data: codes } = await supabase.rpc("owner_company_codes");
    const codeMap = new Map<string, string>(((codes as any[]) || []).map((c) => [c.id, c.company_code]));
    const companyRows = ((comps || []) as any[]).map((c) => ({ ...c, company_code: codeMap.get(c.id) || "—" })) as Company[];
    setCompanies(companyRows);

    const companyIds = companyRows.map((company) => company.id);
    if (companyIds.length === 0) {
      setJobs([]);
      setApplications([]);
      setUsers([]);
      return;
    }

    const [{ data: userRows }, { data: jobRows }] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email, role, company_id, created_at")
        .in("company_id", companyIds),
      supabase
        .from("jobs")
        .select("id, company_id, status, title, created_at")
        .in("company_id", companyIds),
    ]);

    const jobRowsSafe = (jobRows || []) as JobRecord[];
    const jobIds = jobRowsSafe.map((job) => job.id);
    const { data: applicationRows } = jobIds.length
      ? await supabase
          .from("applications")
          .select("id, job_id, status, current_stage, created_at")
          .in("job_id", jobIds)
      : { data: [] };

    setUsers((userRows || []) as UserRecord[]);
    setJobs(jobRowsSafe);
    setApplications((applicationRows || []) as ApplicationRecord[]);

    const { data: notifs } = await supabase
      .from("notifications")
      .select("id, title, message, type, category, created_at, read")
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((notifs || []) as NotificationRecord[]);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("owner-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, fetchData)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, fetchData)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast({ title: "Could not verify account email", variant: "destructive" });
      setChangingPassword(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: passwordForm.currentPassword,
    });
    if (verifyError) {
      toast({ title: "Old password is incorrect", variant: "destructive" });
      setChangingPassword(false);
      return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    if (updateError) {
      toast({ title: "Could not update password", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
    setChangingPassword(false);
  };

  const updateCompanyStatus = async (company: Company, status: "active" | "deleted") => {
    setBusyCompanyId(company.id);
    const { error } = await supabase
      .from("companies")
      .update({ status })
      .eq("id", company.id);

    if (error) {
      toast({
        title: status === "deleted" ? "Could not delete company" : "Could not restore company",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: status === "deleted" ? "Company moved to restore list" : "Company restored",
        description:
          status === "deleted"
            ? `${company.company_name} is hidden from active companies.`
            : `${company.company_name} is active again.`,
      });
      setCompanyToDelete(null);
      await fetchData();
    }
    setBusyCompanyId(null);
  };

  const removeCompanyFromRestore = async (company: Company) => {
    setBusyCompanyId(company.id);

    // Remove the company's staff logins first, so their email/password can no
    // longer be used to sign in (previously they fell through as candidates).
    const { data: purge, error: purgeError } = await supabase.functions.invoke("purge-company-staff", {
      body: { companyId: company.id },
    });

    if (purgeError || (purge as any)?.error) {
      toast({
        title: "Could not remove company logins",
        description: (purge as any)?.error || purgeError?.message,
        variant: "destructive",
      });
      setBusyCompanyId(null);
      return;
    }

    const { error } = await supabase
      .from("companies")
      .update({ status: "removed" })
      .eq("id", company.id);

    if (error) {
      toast({ title: "Could not delete company", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Company deleted",
        description: `${company.company_name} and ${(purge as any)?.removed ?? 0} staff login(s) were removed.`,
      });
      setCompanyToPermanentDelete(null);
      await fetchData();
    }
    setBusyCompanyId(null);
  };


  const jobsByCompany = useMemo(() => {
    return jobs.reduce<Record<string, JobRecord[]>>((acc, job) => {
      acc[job.company_id] = [...(acc[job.company_id] || []), job];
      return acc;
    }, {});
  }, [jobs]);

  const applicationsByCompany = useMemo(() => {
    const jobCompanyMap = jobs.reduce<Record<string, string>>((acc, job) => {
      acc[job.id] = job.company_id;
      return acc;
    }, {});
    return applications.reduce<Record<string, ApplicationRecord[]>>((acc, application) => {
      const companyId = jobCompanyMap[application.job_id];
      if (!companyId) return acc;
      acc[companyId] = [...(acc[companyId] || []), application];
      return acc;
    }, {});
  }, [applications, jobs]);

  const activeCompanyIds = useMemo(() => new Set(activeCompanies.map((c) => c.id)), [activeCompanies]);
  const activeCompanyJobs = useMemo(() => jobs.filter((j) => activeCompanyIds.has(j.company_id)), [activeCompanyIds, jobs]);
  const activeCompanyJobIds = useMemo(() => new Set(activeCompanyJobs.map((j) => j.id)), [activeCompanyJobs]);
  const activeCompanyApplications = useMemo(
    () => applications.filter((a) => activeCompanyJobIds.has(a.job_id)),
    [activeCompanyJobIds, applications],
  );
  const activeJobs = activeCompanyJobs.filter((j) => j.status === "open" || j.status === "active").length;
  const hiredCandidates = activeCompanyApplications.filter((a) => a.current_stage === "hired").length;

  const stats = [
    { icon: Building2, label: "Total Companies", value: activeCompanies.length, color: "text-primary" },
    { icon: UserCheck, label: "Super Admins", value: Object.keys(adminMap).length, color: "text-sky-400" },
    { icon: Briefcase, label: "Active Jobs", value: activeJobs, color: "text-amber-400" },
    { icon: Users, label: "Candidates", value: activeCompanyApplications.length, color: "text-violet-400" },
  ];

  const companyAnalytics = activeCompanies.map((company) => {
    const companyJobs = jobsByCompany[company.id] || [];
    const companyApplications = applicationsByCompany[company.id] || [];
    const admins = users.filter((u) => u.company_id === company.id && u.role === "superadmin").length;
    return {
      ...company,
      admins,
      jobs: companyJobs.length,
      activeJobs: companyJobs.filter((j) => j.status === "open" || j.status === "active").length,
      applications: companyApplications.length,
      hired: companyApplications.filter((a) => a.current_stage === "hired").length,
    };
  });

  // ============ CHART DATA ============
  const growthData = useMemo(() => {
    const days = 14;
    const result: { date: string; companies: number; jobs: number; applications: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const nextDay = startOfDay(subDays(new Date(), i - 1));
      result.push({
        date: format(day, "MMM d"),
        companies: companies.filter((c) => {
          const d = new Date(c.created_at);
          return d >= day && d < nextDay;
        }).length,
        jobs: jobs.filter((j) => {
          if (!j.created_at) return false;
          const d = new Date(j.created_at);
          return d >= day && d < nextDay;
        }).length,
        applications: applications.filter((a) => {
          if (!a.created_at) return false;
          const d = new Date(a.created_at);
          return d >= day && d < nextDay;
        }).length,
      });
    }
    return result;
  }, [companies, jobs, applications]);

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeCompanies.forEach((c) => {
      const plan = c.plan || "Free";
      counts[plan] = (counts[plan] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeCompanies]);

  const stageFunnel = useMemo(() => {
    const stages = ["applied", "screened", "shortlisted", "aptitude", "video", "technical", "gd", "hr", "offered", "hired"];
    return stages.map((stage) => ({
      stage: stage.charAt(0).toUpperCase() + stage.slice(1),
      count: activeCompanyApplications.filter((a) => a.current_stage === stage).length,
    }));
  }, [activeCompanyApplications]);

  const industryData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeCompanies.forEach((c) => {
      const ind = c.industry || "Other";
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeCompanies]);

  const renderCompanyTable = (rows: Company[], mode: "active" | "deleted") => (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Company Name</TableHead>
          <TableHead>Admin Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Company Code</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
              {mode === "active" ? 'No companies yet. Click "Add Company" to get started.' : "No deleted companies to restore."}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.company_name}</TableCell>
              <TableCell>{adminMap[company.id]?.full_name || "-"}</TableCell>
              <TableCell>{adminMap[company.id]?.email || "-"}</TableCell>
              <TableCell>
                <span className="rounded bg-secondary px-2 py-1 text-xs font-mono">{company.company_code}</span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{company.plan}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={company.status === "active" ? "default" : "destructive"}>{company.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(company.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                {mode === "active" ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setCompanyToDelete(company)} className="gap-2 text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete company
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" disabled={busyCompanyId === company.id} onClick={() => updateCompanyStatus(company, "active")} className="gap-2">
                      <RefreshCcw className="h-4 w-4" />
                      Restore
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busyCompanyId === company.id} onClick={() => setCompanyToPermanentDelete(company)} className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const ChartCard = ({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) => (
    <div className={`rounded-lg border border-border bg-card p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as any}
        </ResponsiveContainer>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeNav === "Overview") {
      return (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Platform Growth (Last 14 Days)">
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Area type="monotone" dataKey="applications" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#grad1)" />
                <Area type="monotone" dataKey="jobs" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
                <Area type="monotone" dataKey="companies" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
              </AreaChart>
            </ChartCard>

            <ChartCard title="Recruitment Funnel">
              <BarChart data={stageFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={10} angle={-30} textAnchor="end" height={60} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartCard>

            <ChartCard title="Plan Distribution">
              <PieChart>
                <Pie data={planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {planDistribution.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ChartCard>

            <ChartCard title="Industries">
              <PieChart>
                <Pie data={industryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                  {industryData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ChartCard>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Top Companies by Applications
              </h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Company</TableHead><TableHead>Jobs</TableHead><TableHead>Applications</TableHead><TableHead>Hired</TableHead><TableHead>Conversion</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {[...companyAnalytics].sort((a, b) => b.applications - a.applications).slice(0, 5).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.company_name}</TableCell>
                    <TableCell>{c.jobs}</TableCell>
                    <TableCell>{c.applications}</TableCell>
                    <TableCell>{c.hired}</TableCell>
                    <TableCell>{c.applications ? `${Math.round((c.hired / c.applications) * 100)}%` : "0%"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      );
    }

    if (activeNav === "Restore Company") {
      return (
        <section className="rounded-lg border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Restore Company</h2>
            <p className="text-sm text-muted-foreground mt-1">Deleted companies stay here until you restore them.</p>
          </div>
          {renderCompanyTable(deletedCompanies, "deleted")}
        </section>
      );
    }

    if (activeNav === "Super Admins") {
      const admins = users.filter((u) => u.role === "superadmin");
      const companyName = (id: string | null) => companies.find((c) => c.id === id)?.company_name || "-";
      return (
        <section className="rounded-lg border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Super Admins</h2>
            <p className="text-sm text-muted-foreground mt-1">All super admins across companies.</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Company</TableHead><TableHead>Joined</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">No super admins yet.</TableCell></TableRow>
              ) : admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.full_name}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{companyName(a.company_id)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      );
    }

    if (activeNav === "All Jobs") {
      const companyName = (id: string) => companies.find((c) => c.id === id)?.company_name || "-";
      return (
        <section className="rounded-lg border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">All Jobs ({jobs.length})</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Title</TableHead><TableHead>Company</TableHead><TableHead>Status</TableHead><TableHead>Applications</TableHead><TableHead>Created</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No jobs posted yet.</TableCell></TableRow>
              ) : jobs.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.title || "Untitled"}</TableCell>
                  <TableCell>{companyName(j.company_id)}</TableCell>
                  <TableCell><Badge variant={j.status === "open" || j.status === "active" ? "default" : "secondary"}>{j.status}</Badge></TableCell>
                  <TableCell>{applications.filter((a) => a.job_id === j.id).length}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{j.created_at ? new Date(j.created_at).toLocaleDateString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      );
    }

    if (activeNav === "All Candidates") {
      const stageCounts: Record<string, number> = {};
      activeCompanyApplications.forEach((a) => {
        stageCounts[a.current_stage] = (stageCounts[a.current_stage] || 0) + 1;
      });
      return (
        <section className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stageCounts).map(([stage, count]) => (
              <div key={stage} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase">{stage}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
              </div>
            ))}
          </div>
          <ChartCard title="Candidates by Stage">
            <BarChart data={Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </section>
      );
    }

    if (activeNav === "Analytics") {
      return (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: "Applications per Company", value: activeCompanies.length ? (activeCompanyApplications.length / activeCompanies.length).toFixed(1) : "0" },
              { label: "Jobs per Company", value: activeCompanies.length ? (activeCompanyJobs.length / activeCompanies.length).toFixed(1) : "0" },
              { label: "Hire Conversion", value: activeCompanyApplications.length ? `${Math.round((hiredCandidates / activeCompanyApplications.length) * 100)}%` : "0%" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-3xl font-bold text-foreground mt-2">{item.value}</p>
              </div>
            ))}
          </div>

          <ChartCard title="Applications Over Time">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Line type="monotone" dataKey="applications" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line type="monotone" dataKey="jobs" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ChartCard>

          <div className="rounded-lg border border-border bg-card">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Company Analytics</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Company</TableHead><TableHead>Industry</TableHead><TableHead>Admins</TableHead><TableHead>Jobs</TableHead><TableHead>Active Jobs</TableHead><TableHead>Applications</TableHead><TableHead>Hired</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {companyAnalytics.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.company_name}</TableCell>
                    <TableCell>{c.industry}</TableCell>
                    <TableCell>{c.admins}</TableCell>
                    <TableCell>{c.jobs}</TableCell>
                    <TableCell>{c.activeJobs}</TableCell>
                    <TableCell>{c.applications}</TableCell>
                    <TableCell>{c.hired}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      );
    }

    if (activeNav === "Activity Log") {
      const activities: { ts: Date; type: string; text: string }[] = [];
      companies.slice(0, 20).forEach((c) =>
        activities.push({ ts: new Date(c.created_at), type: "company", text: `Company created: ${c.company_name}` }),
      );
      jobs.slice(0, 30).forEach((j) => {
        if (j.created_at) activities.push({ ts: new Date(j.created_at), type: "job", text: `Job posted: ${j.title || "Untitled"}` });
      });
      applications.slice(0, 30).forEach((a) => {
        if (a.created_at) activities.push({ ts: new Date(a.created_at), type: "app", text: `New application (stage: ${a.current_stage})` });
      });
      activities.sort((a, b) => b.ts.getTime() - a.ts.getTime());
      return (
        <section className="rounded-lg border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Activity Log</h2>
            <p className="text-sm text-muted-foreground mt-1">Real-time platform events.</p>
          </div>
          <div className="divide-y divide-border">
            {activities.slice(0, 50).map((a, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3">
                <div className={`h-2 w-2 rounded-full ${a.type === "company" ? "bg-green-500" : a.type === "job" ? "bg-amber-500" : "bg-primary"}`} />
                <span className="text-sm text-foreground flex-1">{a.text}</span>
                <span className="text-xs text-muted-foreground">{format(a.ts, "MMM d, HH:mm")}</span>
              </div>
            ))}
            {activities.length === 0 && <div className="px-6 py-12 text-center text-muted-foreground">No activity yet.</div>}
          </div>
        </section>
      );
    }

    if (activeNav === "Billing & Plans") {
      return (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ChartCard title="Plan Breakdown">
              <PieChart>
                <Pie data={planDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {planDistribution.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
              </PieChart>
            </ChartCard>
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Plans</h3>
              <div className="space-y-3">
                {[
                  { name: "Free", price: "$0", desc: "Up to 2 jobs, 50 candidates" },
                  { name: "Pro", price: "$99/mo", desc: "Unlimited jobs, AI scoring" },
                  { name: "Enterprise", price: "Custom", desc: "SSO, dedicated support, SLA" },
                ].map((p) => (
                  <div key={p.name} className="flex items-center justify-between rounded-md bg-secondary/50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">{p.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card">
            <div className="px-6 py-4 border-b border-border"><h2 className="text-lg font-semibold text-foreground">Companies by Plan</h2></div>
            <Table>
              <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Plan</TableHead><TableHead>Jobs</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {companyAnalytics.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.company_name}</TableCell>
                    <TableCell><Badge variant="secondary">{c.plan}</Badge></TableCell>
                    <TableCell>{c.jobs}</TableCell>
                    <TableCell><Badge variant="default">{c.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      );
    }

    if (activeNav === "Security") {
      const securityItems = [
        { icon: LockKeyhole, label: "Owner-only company control", value: "Enabled", status: "ok" },
        { icon: ShieldCheck, label: "Row-Level Security", value: "Active on all tables", status: "ok" },
        { icon: Users, label: "Total Super Admins", value: Object.keys(adminMap).length.toString(), status: "info" },
        { icon: Activity, label: "Deleted companies (recoverable)", value: deletedCompanies.length.toString(), status: "info" },
      ];

      const policies = [
        { title: "Owner Isolation", desc: "Owners can create, delete, and restore only their own companies.", level: "Critical" },
        { title: "Company Scoping", desc: "Company users (HR, Manager, Super Admin) remain scoped to their company_id.", level: "Critical" },
        { title: "Role Escalation Block", desc: "Database triggers prevent users from changing their own role or company.", level: "Critical" },
        { title: "Score Tamper Block", desc: "Candidates cannot modify AI scores, stages, or verdicts.", level: "Critical" },
        { title: "Restore Integrity", desc: "Restore keeps the same company code, admins, jobs, and pipeline history.", level: "Standard" },
        { title: "Storage Ownership", desc: "Resumes, videos, photos enforce per-user ownership checks.", level: "Standard" },
      ];

      return (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {securityItems.map(({ icon: Icon, label, value, status }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon className={`h-5 w-5 ${status === "ok" ? "text-green-500" : "text-primary"}`} />
                  {status === "ok" && <ShieldCheck className="h-4 w-4 text-green-500" />}
                </div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold text-foreground mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Access & Policy Controls</h2>
            </div>
            <div className="divide-y divide-border">
              {policies.map((p) => (
                <div key={p.title} className="flex items-start gap-4 px-6 py-4">
                  <div className={`mt-1 h-8 w-8 rounded-md flex items-center justify-center ${p.level === "Critical" ? "bg-destructive/10" : "bg-primary/10"}`}>
                    {p.level === "Critical" ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{p.title}</p>
                      <Badge variant={p.level === "Critical" ? "destructive" : "secondary"} className="text-xs">{p.level}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.desc}</p>
                  </div>
                  <Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
                    <ShieldCheck className="h-3 w-3" /> Enforced
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Compliance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {["GDPR-ready data deletion", "Encrypted at rest & in transit", "Audit-friendly activity log"].map((t) => (
                <div key={t} className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2 text-sm">
                  <ShieldCheck className="h-4 w-4 text-green-500" /> {t}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    }

    if (activeNav === "Notifications") {
      return (
        <section className="rounded-lg border border-border bg-card">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notifications</h2>
            <p className="text-sm text-muted-foreground mt-1">Recent system notifications across the platform.</p>
          </div>
          <div className="divide-y divide-border">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">No notifications.</div>
            ) : notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-4 px-6 py-4">
                <div className={`mt-1 h-2 w-2 rounded-full ${n.read ? "bg-muted" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    <Badge variant="outline" className="text-xs">{n.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(n.created_at), "MMM d, HH:mm")}</span>
              </div>
            ))}
          </div>
        </section>
      );
    }

    if (activeNav === "Settings") {
      return (
        <section className="max-w-xl rounded-lg border border-border bg-card p-6">
          <Settings className="h-6 w-6 text-primary mb-4" />
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
            {[
              { key: "currentPassword", label: "Old Password" },
              { key: "newPassword", label: "New Password" },
              { key: "confirmPassword", label: "Confirm New Password" },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <span className="text-sm font-medium text-foreground">{label}</span>
                <input
                  type="password"
                  required
                  value={passwordForm[key as keyof typeof passwordForm]}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, [key]: e.target.value }))}
                  className="mt-2 w-full rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
            ))}
            <Button type="submit" disabled={changingPassword} className="w-full">
              {changingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </section>
      );
    }

    // Companies (default)
    return (
      <section id="companies-section" className="rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Companies</h2>
            <p className="text-sm text-muted-foreground mt-1">Create company accounts and manage their super admins.</p>
          </div>
          <Button onClick={() => setPanelOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        </div>
        {renderCompanyTable(activeCompanies, "active")}
      </section>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <motion.aside
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed left-0 top-0 z-30 flex h-screen w-60 flex-col border-r border-border bg-card"
      >
        <div className="flex items-center gap-2.5 px-5 py-6 border-b border-border">
          <BrandLogo markClassName="h-8 w-8" textClassName="text-xl" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                activeNav === label ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{label}</span>
              {label === "Restore Company" && deletedCompanies.length > 0 && (
                <span className="ml-auto rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                  {deletedCompanies.length}
                </span>
              )}
              {label === "Notifications" && notifications.filter((n) => !n.read).length > 0 && (
                <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                  {notifications.filter((n) => !n.read).length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="border-t border-border px-4 py-4">
          <p className="text-sm font-medium text-foreground truncate">{ownerName || "Owner"}</p>
          <p className="text-xs text-muted-foreground mb-3">Owner</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </motion.aside>

      <div className="ml-60 flex-1 flex flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-8 py-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{activeNav}</h1>
            <p className="text-sm text-muted-foreground">Owner control center</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => setActiveNav("Notifications")} className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
              {ownerName?.charAt(0)?.toUpperCase() || "O"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            {stats.map(({ icon: Icon, label, value, color }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border border-border bg-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-3xl font-bold text-foreground">{value}</p>
              </motion.div>
            ))}
          </div>

          {renderContent()}
        </main>
      </div>

      <AddCompanyPanel open={panelOpen} onOpenChange={setPanelOpen} onCompanyCreated={fetchData} />

      <AlertDialog open={!!companyToDelete} onOpenChange={(open) => !open && setCompanyToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move {companyToDelete?.company_name} to Restore Company. Its admins, jobs, and hiring data stay connected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => companyToDelete && updateCompanyStatus(companyToDelete, "deleted")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!companyToPermanentDelete} onOpenChange={(open) => !open && setCompanyToPermanentDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete company from restore?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes {companyToPermanentDelete?.company_name} and deletes its admin/HR/manager logins, so those emails can no longer sign in. Hiring records stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => companyToPermanentDelete && removeCompanyFromRestore(companyToPermanentDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AIAssistantWidget mode="owner" />
    </div>
  );
};

export default OwnerDashboard;
