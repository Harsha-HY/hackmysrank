import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Star, Edit2, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OfferTemplateEditor, { DEFAULT_TEMPLATE_CONFIG, TemplateConfig } from "./OfferTemplateEditor";
import { Loader2 } from "@/components/BrandLoader";

interface Props {
  companyId: string;
  userId: string;
}

export interface OfferTemplate {
  id: string;
  template_name: string;
  template_config: TemplateConfig;
  is_default: boolean;
  logo_url: string | null;
  last_used_at: string | null;
  created_at: string;
}

const OfferTemplatesManager = ({ companyId, userId }: Props) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<OfferTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<OfferTemplate | null>(null);
  const [previewing, setPreviewing] = useState<OfferTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("offer_templates" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    setTemplates(((data as any) || []) as OfferTemplate[]);
    setLoading(false);
  };

  useEffect(() => { if (companyId) load(); }, [companyId]);

  const setDefault = async (id: string) => {
    await supabase.from("offer_templates" as any).update({ is_default: false } as any).eq("company_id", companyId);
    await supabase.from("offer_templates" as any).update({ is_default: true } as any).eq("id", id);
    toast({ title: "Default template updated" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this offer letter template? This cannot be undone.")) return;
    await supabase.from("offer_templates" as any).delete().eq("id", id);
    toast({ title: "Template deleted" });
    load();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Offer Letter Templates</h3>
            <p className="text-xs text-muted-foreground">Reusable branded offer letter designs for your company.</p>
          </div>
        </div>
        <Button
          onClick={() => { setEditing(null); setEditorOpen(true); }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" /> Create Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No templates yet. Create one to standardize your offer letters across HR.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map(t => (
            <div key={t.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{t.template_name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.last_used_at ? `Last used ${new Date(t.last_used_at).toLocaleDateString()}` : "Not used yet"}
                  </p>
                </div>
                {t.is_default && <Badge className="bg-emerald-600 text-white">Default</Badge>}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setPreviewing(t)}>
                  <Eye className="h-3 w-3" /> Preview
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => { setEditing(t); setEditorOpen(true); }}>
                  <Edit2 className="h-3 w-3" /> Edit
                </Button>
                {!t.is_default && (
                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1" onClick={() => setDefault(t.id)}>
                    <Star className="h-3 w-3" /> Set Default
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 text-red-500" onClick={() => remove(t.id)}>
                  <Trash2 className="h-3 w-3" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <OfferTemplateEditor
          companyId={companyId}
          userId={userId}
          template={editing}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
          onSaved={() => { setEditorOpen(false); setEditing(null); load(); }}
        />
      )}

      {previewing && (
        <OfferTemplateEditor
          companyId={companyId}
          userId={userId}
          template={previewing}
          previewOnly
          onClose={() => setPreviewing(null)}
          onSaved={() => setPreviewing(null)}
        />
      )}
    </div>
  );
};

export default OfferTemplatesManager;
