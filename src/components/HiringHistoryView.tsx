import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Briefcase, Calendar, DollarSign, Mail, Search, RefreshCw, Trash2, Eye, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLiveData } from "@/hooks/useLiveData";

interface Props {
  companyId: string;
  /** Whether the viewer can permanently archive entries from history */
  canDelete?: boolean;
}

type HistoryRow = {
  id: string; // application id
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  current_stage: string;
  hired_at: string;
  designation?: string | null;
  ctc_total?: number | null;
  joining_date?: string | null;
  work_location?: string | null;
  work_type?: string | null;
  status: string;
};

const HIRED_STAGES = ["hired", "selected", "onboarded", "bgv"];

export default function HiringHistoryView({ companyId, canDelete = true }: Props) {
  const { toast } = useToast();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    const { data: jobsData } = await supabase
      .from("jobs").select("id, title").eq("company_id", companyId);
    const jobList = jobsData || [];
    setJobs(jobList);
    const ids = jobList.map((j: any) => j.id);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }

    const { data: apps } = await supabase
      .from("applications")
      .select("id, candidate_id, job_id, current_stage, status, updated_at")
      .in("job_id", ids)
      .in("current_stage", HIRED_STAGES)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });

    const list = apps || [];
    const candIds = [...new Set(list.map((a: any) => a.candidate_id))];
    const appIds = list.map((a: any) => a.id);
    const jobMap = Object.fromEntries(jobList.map((j: any) => [j.id, j.title]));
    let candMap: Record<string, any> = {};
    let offerMap: Record<string, any> = {};
    if (candIds.length) {
      const { data: u } = await supabase.from("users").select("id, full_name, email").in("id", candIds);
      candMap = Object.fromEntries((u || []).map((c: any) => [c.id, c]));
    }
    if (appIds.length) {
      const { data: o } = await supabase
        .from("offer_letters")
        .select("application_id, designation, ctc_total, joining_date, work_location, work_type")
        .in("application_id", appIds);
      offerMap = Object.fromEntries((o || []).map((x: any) => [x.application_id, x]));
    }

    setRows(list.map((a: any) => ({
      id: a.id,
      candidate_id: a.candidate_id,
      candidate_name: candMap[a.candidate_id]?.full_name || "Unknown",
      candidate_email: candMap[a.candidate_id]?.email || "",
      job_id: a.job_id,
      job_title: jobMap[a.job_id] || "—",
      current_stage: a.current_stage,
      status: a.status,
      hired_at: a.updated_at,
      designation: offerMap[a.id]?.designation || null,
      ctc_total: offerMap[a.id]?.ctc_total ?? null,
      joining_date: offerMap[a.id]?.joining_date || null,
      work_location: offerMap[a.id]?.work_location || null,
      work_type: offerMap[a.id]?.work_type || null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [companyId]);

  useLiveData(["applications", "offer_letters"], () => load(), {
    key: `history-${companyId}`,
    enabled: !!companyId,
  });

  const filtered = useMemo(() => rows.filter((r) => {
    if (jobFilter !== "all" && r.job_id !== jobFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.candidate_name?.toLowerCase().includes(q)
      || r.candidate_email?.toLowerCase().includes(q)
      || r.job_title?.toLowerCase().includes(q)
      || (r.designation || "").toLowerCase().includes(q);
  }), [rows, search, jobFilter]);

  const archive = async (id: string) => {
    if (!confirm("Remove this hire from history? The candidate's data is preserved but hidden.")) return;
    const { error } = await supabase.from("applications").update({ status: "archived" }).eq("id", id);
    if (error) { toast({ title: "Failed to archive", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Removed from history" });
    load();
  };

  const formatINR = (n?: number | null) => {
    if (n === null || n === undefined) return "—";
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} LPA`;
    return `₹${n.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-card/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">Hiring History</h2>
            <p className="text-sm text-muted-foreground">All selected candidates with offer details, salary, joining date and role.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search hire, job, role…" className="pl-8 h-9 w-56" />
            </div>
            <select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="h-9 px-3 rounded-md bg-background border border-border text-sm">
              <option value="all">All Jobs</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={load} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-xs text-muted-foreground">Total Hires</p>
            <p className="text-2xl font-bold text-emerald-500">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Offers w/ Salary</p>
            <p className="text-2xl font-bold text-primary">{rows.filter(r => r.ctc_total).length}</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-muted-foreground">Unique Jobs</p>
            <p className="text-2xl font-bold text-amber-500">{new Set(rows.map(r => r.job_id)).size}</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <p className="text-xs text-muted-foreground">Onboarded</p>
            <p className="text-2xl font-bold text-blue-500">{rows.filter(r => r.current_stage === "onboarded").length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading history…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Award className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No hires yet. Selected candidates appear here automatically.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition-colors">
              <div className="flex flex-wrap items-start gap-4">
                <div className="h-11 w-11 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                  {r.candidate_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{r.candidate_name}</p>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                      {r.current_stage}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3 w-3" />{r.candidate_email}
                  </p>
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="flex items-start gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-muted-foreground">Job / Role</p>
                        <p className="font-medium text-foreground truncate">{r.designation || r.job_title}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Offered CTC</p>
                        <p className="font-semibold text-emerald-500">{formatINR(r.ctc_total)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Joining</p>
                        <p className="font-medium text-foreground">{r.joining_date ? new Date(r.joining_date).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium text-foreground truncate">{r.work_location || r.work_type || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">Hired {new Date(r.hired_at).toLocaleDateString()}</span>
                  {canDelete && (
                    <Button variant="ghost" size="sm" onClick={() => archive(r.id)} className="h-7 px-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
