import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { FileStack, Pencil, Trash2, Plus } from "lucide-react";
import AddJobPanel, { JobTemplateRow } from "@/components/AddJobPanel";

interface Props {
  companyId: string;
  hrUserId: string;
  managers: { id: string; full_name: string }[];
}

const JobTemplatesManager = ({ companyId, hrUserId, managers }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<JobTemplateRow[]>([]);
  const [editTemplate, setEditTemplate] = useState<JobTemplateRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    if (!companyId) return;
    const { data } = await supabase
      .from("job_templates")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setTemplates((data as JobTemplateRow[]) || []);
  };

  useEffect(() => {
    fetchTemplates();
    if (!companyId) return;
    const ch = supabase
      .channel(`job-templates-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_templates", filter: `company_id=eq.${companyId}` }, fetchTemplates)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("job_templates").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Template deleted" });
    }
    setDeleteId(null);
    fetchTemplates();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileStack className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-foreground">Job Templates</h3>
          <span className="text-xs text-muted-foreground">({templates.length})</span>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template Without Posting
        </Button>
      </div>

      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          No templates saved yet. Save one while posting a job, or create one above.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-secondary/30 p-4">
              <div className="font-semibold text-foreground">{t.template_name}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.job_title || "—"}</div>
              <div className="text-[11px] text-muted-foreground mt-2">
                Last used: {t.last_used_at ? new Date(t.last_used_at).toLocaleDateString() : "Never"}
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => { setEditTemplate(t); setEditOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create-only panel */}
      <AddJobPanel
        open={createOpen}
        onOpenChange={setCreateOpen}
        companyId={companyId}
        hrUserId={hrUserId}
        managers={managers}
        onJobCreated={() => {}}
        templateOnlyMode
        onTemplateSaved={fetchTemplates}
      />

      {/* Edit panel */}
      <AddJobPanel
        open={editOpen}
        onOpenChange={(o) => { setEditOpen(o); if (!o) setEditTemplate(null); }}
        companyId={companyId}
        hrUserId={hrUserId}
        managers={managers}
        onJobCreated={() => {}}
        editTemplate={editTemplate}
        onTemplateSaved={fetchTemplates}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobTemplatesManager;
