import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, ChevronDown, ChevronRight, ArrowRight, XCircle, CheckCircle2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLiveData } from "@/hooks/useLiveData";

interface Props {
  companyId: string;
}

const STAGE_LABEL: Record<string, string> = {
  applied: "Applied",
  ai_scored: "Resume Scored",
  shortlisted: "Shortlisted",
  aptitude_test: "Aptitude Test",
  test_completed: "Aptitude Done",
  video_intro: "Video Intro",
  video_submitted: "Video Done",
  technical_round: "Technical",
  technical_completed: "Technical Done",
  group_discussion: "Group Discussion",
  gd_completed: "GD Done",
  hr_interview: "HR Interview",
  interview: "HR Interview",
  offer_sent: "Offer Sent",
  hired: "Hired",
  selected: "Selected",
  rejected: "Rejected",
};

export default function AdminPerJobActivity({ companyId }: Props) {
  const [groups, setGroups] = useState<Array<{ job: any; apps: any[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    const { data: jobs } = await supabase
      .from("jobs").select("id, title, department").eq("company_id", companyId);
    const jobList = jobs || [];
    const ids = jobList.map((j: any) => j.id);
    if (!ids.length) { setGroups([]); setLoading(false); return; }

    const { data: apps } = await supabase
      .from("applications")
      .select("id, candidate_id, job_id, current_stage, status, updated_at, rejection_stage, rejection_reason")
      .in("job_id", ids)
      .not("status", "in", "(deleted,suspended)")
      .order("updated_at", { ascending: false });

    const list = apps || [];
    const candIds = [...new Set(list.map((a: any) => a.candidate_id))];
    let candMap: Record<string, string> = {};
    if (candIds.length) {
      const { data: u } = await supabase.from("users").select("id, full_name").in("id", candIds);
      candMap = Object.fromEntries((u || []).map((c: any) => [c.id, c.full_name]));
    }

    const grouped = jobList.map((j: any) => ({
      job: j,
      apps: list
        .filter((a: any) => a.job_id === j.id)
        .map((a: any) => ({ ...a, candidate_name: candMap[a.candidate_id] || "Unknown" })),
    })).filter((g: any) => g.apps.length > 0)
       .sort((a: any, b: any) => {
         const at = a.apps[0]?.updated_at || 0;
         const bt = b.apps[0]?.updated_at || 0;
         return new Date(bt).getTime() - new Date(at).getTime();
       });

    setGroups(grouped);
    setLoading(false);
  };

  useEffect(() => { if (companyId) load(); }, [companyId]);

  useLiveData(["applications", "jobs"], () => load(), {
    key: `admin-perjob-${companyId}`,
    enabled: !!companyId,
  });

  const toggle = (id: string) => {
    setOpen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading) return <p className="text-sm text-muted-foreground text-center py-6">Loading per-job activity…</p>;
  if (groups.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No job activity yet.</p>;

  return (
    <div className="space-y-3">
      {groups.map(({ job, apps }) => {
        const isOpen = open.has(job.id);
        const rejected = apps.filter((a) => a.status === "rejected" || a.current_stage === "rejected").length;
        const hired = apps.filter((a) => ["hired", "selected", "onboarded"].includes(a.current_stage)).length;
        return (
          <div key={job.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => toggle(job.id)}
              className="w-full px-4 py-3 hover:bg-secondary/30 transition-colors flex items-center gap-3 text-left"
            >
              {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Briefcase className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{job.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{job.department || "—"}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-bold">{apps.length} active</span>
                {hired > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">{hired} hired</span>}
                {rejected > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-bold">{rejected} rejected</span>}
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="divide-y divide-border max-h-80 overflow-y-auto">
                    {apps.slice(0, 50).map((a) => {
                      const isRej = a.status === "rejected" || a.current_stage === "rejected";
                      const isHired = ["hired", "selected", "onboarded"].includes(a.current_stage);
                      const Icon = isRej ? XCircle : isHired ? CheckCircle2 : Clock;
                      const color = isRej ? "text-destructive" : isHired ? "text-emerald-500" : "text-primary";
                      return (
                        <div key={a.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-secondary/20">
                          <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                          <p className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">{a.candidate_name}</p>
                          <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                            <span className="text-muted-foreground">moved to</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className={`font-semibold ${color}`}>
                              {isRej ? `Rejected${a.rejection_stage ? ` @ ${STAGE_LABEL[a.rejection_stage] || a.rejection_stage}` : ""}` : (STAGE_LABEL[a.current_stage] || a.current_stage)}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:block">{new Date(a.updated_at).toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
