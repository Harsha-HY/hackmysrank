import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Save, Trash2, GripVertical, Star, StarOff, Copy } from "lucide-react";
import {
  BUILTIN_STAGES, PRESET_TEMPLATES, PipelineStage,
  newCustomStage, normalizePipeline,
} from "@/lib/pipeline";
import { Loader2 } from "@/components/BrandLoader";

interface TemplateRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  stages: any;
  is_default: boolean;
  updated_at: string;
}

const InterviewProcess = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selected, setSelected] = useState<TemplateRow | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/login");
      const { data: u } = await supabase.from("users")
        .select("id, company_id, role").eq("user_id", session.user.id).maybeSingle();
      if (!u?.company_id) { toast({ title: "No company found", variant: "destructive" }); navigate("/"); return; }
      // created_by references auth.users(id), so store the auth uid (not the public.users row id)
      setUserId(session.user.id);
      setCompanyId(u.company_id);
      await loadTemplates(u.company_id);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = async (cid: string) => {
    const { data } = await supabase.from("interview_process_templates")
      .select("*").eq("company_id", cid).order("created_at", { ascending: true });
    setTemplates((data as any) || []);
  };

  const openTemplate = (t: TemplateRow) => {
    setSelected(t);
    setName(t.name);
    setDescription(t.description || "");
    setStages(normalizePipeline(t.stages));
  };

  const newTemplateFromPreset = (presetIdx?: number) => {
    setSelected(null);
    if (typeof presetIdx === "number") {
      const p = PRESET_TEMPLATES[presetIdx];
      setName(p.name);
      setDescription(p.description);
      setStages(normalizePipeline(p.stages));
    } else {
      setName("New Process");
      setDescription("");
      setStages(BUILTIN_STAGES.map(s => ({ ...s })));
    }
  };

  const toggle = (key: string) => setStages(prev => prev.map(s => s.key === key ? { ...s, enabled: !s.enabled } : s));
  const move = (key: string, dir: -1 | 1) => setStages(prev => {
    const arr = [...prev].sort((a, b) => a.order - b.order);
    const i = arr.findIndex(s => s.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return prev;
    const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    return arr.map((s, idx) => ({ ...s, order: idx }));
  });
  const updateStage = (key: string, patch: Partial<PipelineStage>) =>
    setStages(prev => prev.map(s => s.key === key ? { ...s, ...patch, config: { ...s.config, ...patch.config } } : s));
  const removeStage = (key: string) => setStages(prev => prev.filter(s => s.key !== key));
  const addCustom = () => setStages(prev => [...prev, { ...newCustomStage(), order: prev.length }]);

  const save = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    const payload: any = {
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      stages: JSON.parse(JSON.stringify(stages.sort((a, b) => a.order - b.order))),
      created_by: userId,
    };
    if (selected) {
      const { error } = await supabase.from("interview_process_templates")
        .update({ name: payload.name, description: payload.description, stages: payload.stages })
        .eq("id", selected.id);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "Process saved" });
    } else {
      const { data, error } = await supabase.from("interview_process_templates").insert(payload as any).select().maybeSingle();
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); setSaving(false); return; }
      if (data) setSelected(data as any);
      toast({ title: "Process created" });
    }
    await loadTemplates(companyId);
    setSaving(false);
  };

  const setDefault = async (t: TemplateRow) => {
    await supabase.from("interview_process_templates").update({ is_default: false }).eq("company_id", companyId);
    await supabase.from("interview_process_templates").update({ is_default: true }).eq("id", t.id);
    toast({ title: `${t.name} set as default` });
    loadTemplates(companyId);
  };

  const remove = async (t: TemplateRow) => {
    if (!confirm(`Delete "${t.name}"? Jobs already using it keep their pipeline.`)) return;
    const { error } = await supabase.from("interview_process_templates").delete().eq("id", t.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    if (selected?.id === t.id) { setSelected(null); setStages([]); setName(""); setDescription(""); }
    toast({ title: "Deleted" });
    loadTemplates(companyId);
  };

  const duplicate = async (t: TemplateRow) => {
    const { error } = await supabase.from("interview_process_templates").insert({
      company_id: companyId, name: `${t.name} (copy)`, description: t.description,
      stages: t.stages, created_by: userId,
    } as any);
    if (!error) { toast({ title: "Duplicated" }); loadTemplates(companyId); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <h1 className="text-xl font-semibold">Interview Process</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => newTemplateFromPreset()}><Plus className="h-4 w-4 mr-1" /> Blank</Button>
            {PRESET_TEMPLATES.map((p, i) => (
              <Button key={p.name} variant="outline" size="sm" onClick={() => newTemplateFromPreset(i)}>
                <Plus className="h-4 w-4 mr-1" /> {p.name}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Left: template list */}
        <aside className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Templates</h2>
          {templates.length === 0 && (
            <p className="text-sm text-muted-foreground">No templates yet. Start from a preset or blank.</p>
          )}
          {templates.map(t => (
            <button key={t.id} onClick={() => openTemplate(t)}
              className={`w-full text-left rounded-lg border px-3 py-2 transition ${selected?.id === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">{t.name}</span>
                {t.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
              </div>
              {t.description && <p className="text-xs text-muted-foreground truncate mt-1">{t.description}</p>}
            </button>
          ))}
        </aside>

        {/* Right: editor */}
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {stages.length === 0 && !selected ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground">Pick a template on the left, or create a new one from the top.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Name</label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Engineering" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short summary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                {sorted.map((s, idx) => (
                  <Card key={s.key} className={s.enabled ? "" : "opacity-60"}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col text-muted-foreground">
                          <button className="p-0.5 hover:text-foreground disabled:opacity-30" disabled={idx === 0} onClick={() => move(s.key, -1)}>▲</button>
                          <button className="p-0.5 hover:text-foreground disabled:opacity-30" disabled={idx === sorted.length - 1} onClick={() => move(s.key, 1)}>▼</button>
                        </div>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_150px] gap-2">
                          <Input value={s.label} onChange={e => updateStage(s.key, { label: e.target.value })} className="font-medium" />
                          <Badge variant="outline" className="justify-center self-center">{s.type}</Badge>
                        </div>
                        <Switch checked={s.enabled} onCheckedChange={() => toggle(s.key)} />
                        {!s.builtin && (
                          <Button variant="ghost" size="icon" onClick={() => removeStage(s.key)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                      {s.enabled && (
                        <div className="mt-3 pl-11 grid grid-cols-1 md:grid-cols-3 gap-2">
                          {(s.type === "test") && (
                            <div>
                              <label className="text-xs text-muted-foreground">Cutoff (%)</label>
                              <Input type="number" min={0} max={100} value={s.config?.cutoff ?? 60}
                                onChange={e => updateStage(s.key, { config: { cutoff: Number(e.target.value) } })} />
                            </div>
                          )}
                          {(s.type === "interview" || s.type === "technical" || s.type === "gd" || s.type === "video") && (
                            <div>
                              <label className="text-xs text-muted-foreground">Duration (min)</label>
                              <Input type="number" min={1} value={s.config?.duration ?? 45}
                                onChange={e => updateStage(s.key, { config: { duration: Number(e.target.value) } })} />
                            </div>
                          )}
                          {!s.builtin && (
                            <div>
                              <label className="text-xs text-muted-foreground">Round type</label>
                              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={s.type} onChange={e => updateStage(s.key, { type: e.target.value as any })}>
                                <option value="info">Info card</option>
                                <option value="assignment">Assignment / Submission</option>
                                <option value="interview">Live Interview</option>
                                <option value="test">Test</option>
                              </select>
                            </div>
                          )}
                          <div className="md:col-span-3">
                            <label className="text-xs text-muted-foreground">Instructions for candidate (optional)</label>
                            <Textarea rows={2} value={s.config?.instructions || ""}
                              onChange={e => updateStage(s.key, { config: { instructions: e.target.value } })} />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addCustom} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add custom round</Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {selected ? "Save changes" : "Create process"}
                </Button>
                {selected && (
                  <>
                    <Button variant="outline" onClick={() => setDefault(selected)} className="gap-2">
                      {selected.is_default ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                      {selected.is_default ? "Default" : "Make default"}
                    </Button>
                    <Button variant="outline" onClick={() => duplicate(selected)} className="gap-2"><Copy className="h-4 w-4" /> Duplicate</Button>
                    <Button variant="ghost" onClick={() => remove(selected)} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Delete</Button>
                  </>
                )}
              </div>
            </>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default InterviewProcess;
