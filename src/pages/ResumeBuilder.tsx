import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLiveData } from "@/hooks/useLiveData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Download, Save, ArrowLeft, GripVertical, X, Camera } from "lucide-react";
import { Loader2 } from "@/components/BrandLoader";

type Experience = {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
};
type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear: string;
  grade: string;
};
type Project = {
  id: string;
  name: string;
  description: string;
  stack: string;
  github: string;
  demo: string;
};
type Certification = {
  id: string;
  name: string;
  issuer: string;
  year: string;
};

const uid = () => Math.random().toString(36).slice(2, 10);
const degreeOptions = ["B.Tech", "BCA", "MBA", "MCA", "BSc", "MSc", "BBA", "B.Com", "Other"];

export type SectionKey = "summary" | "education" | "experience" | "skills" | "projects" | "certs";
export const SECTION_LABEL: Record<SectionKey, string> = {
  summary: "Summary",
  education: "Education",
  experience: "Experience",
  skills: "Skills",
  projects: "Projects",
  certs: "Certifications",
};

type TemplateId = "intern" | "fresher" | "fulltime" | "experienced" | "job_specific";
const TEMPLATES: Record<TemplateId, {
  name: string;
  blurb: string;
  accent: string;
  summaryLabel: string;
  order: SectionKey[];
}> = {
  intern: {
    name: "Intern",
    blurb: "Studying now — education, projects and skills lead the page.",
    accent: "#0a66c2",
    summaryLabel: "Career Objective",
    order: ["summary", "education", "projects", "skills", "certs", "experience"],
  },
  fresher: {
    name: "Fresher",
    blurb: "Just graduated — education first, then projects and skills.",
    accent: "#16a34a",
    summaryLabel: "Career Objective",
    order: ["summary", "education", "skills", "projects", "certs", "experience"],
  },
  fulltime: {
    name: "Full-time",
    blurb: "Balanced layout — work history first, education at the end.",
    accent: "#7c3aed",
    summaryLabel: "Professional Summary",
    order: ["summary", "experience", "skills", "projects", "education", "certs"],
  },
  experienced: {
    name: "Experienced",
    blurb: "Senior profile — deep work history and achievements up front.",
    accent: "#0f172a",
    summaryLabel: "Professional Summary",
    order: ["summary", "experience", "projects", "skills", "certs", "education"],
  },
  job_specific: {
    name: "Job specific",
    blurb: "Tailored to one role — skills matched to the job come first.",
    accent: "#db2777",
    summaryLabel: "Why I fit this role",
    order: ["summary", "skills", "experience", "projects", "education", "certs"],
  },
};
const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const skillInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string>("");
  const [authId, setAuthId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Personal
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoSigned, setPhotoSigned] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [portfolio, setPortfolio] = useState("");

  // Sections
  const [summary, setSummary] = useState("");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [useForApplications, setUseForApplications] = useState(false);

  // Template / layout
  const [templateId, setTemplateId] = useState<TemplateId>("fresher");
  const [sectionOrder, setSectionOrder] = useState<SectionKey[]>(TEMPLATES.fresher.order);
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState("");
  const applyingRef = useRef(false);
  const [dirty, setDirty] = useState(false);

  // AI dialog
  const [aiDialog, setAiDialog] = useState<{
    open: boolean; title: string; text: string; onUse: (text: string) => void;
  }>({ open: false, title: "", text: "", onUse: () => {} });
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // Load profile
  const applyProfile = async (p: any, u?: { full_name?: string; phone?: string } | null) => {
    if (!p) return;
    applyingRef.current = true;
    const built = p.built_resume || {};
    setFullName(built.fullName || p.full_name || u?.full_name || "");
    setHeadline(built.headline || p.headline || "");
    setPhone(built.phone || p.phone || u?.phone || "");
    setLocation(built.location || p.location || "");
    setLinkedin(built.linkedin || p.linkedin_url || "");
    setGithub(built.github || p.github_url || "");
    setPortfolio(built.portfolio || p.portfolio_url || "");
    setPhotoUrl(built.photoUrl || p.photo_url || "");
    setSummary(built.summary || p.about_me || "");
    setExperiences(built.experiences?.length ? built.experiences : ((p.experiences as any[]) || []).map((e: any) => ({
      id: uid(),
      company: e.company || "",
      title: e.title || e.role || "",
      startDate: e.startDate || e.start || "",
      endDate: e.endDate || e.end || "",
      current: !!e.current,
      description: e.description || "",
    })));
    setEducation(built.education?.length ? built.education : ((p.education as any[]) || []).map((e: any) => ({
      id: uid(),
      school: e.school || e.college || "",
      degree: e.degree || "",
      field: e.field || "",
      startYear: e.startYear || e.start || "",
      endYear: e.endYear || e.end || "",
      grade: e.grade || "",
    })));
    setSkills(built.skills?.length ? built.skills : (p.skills as string[]) || []);
    setProjects(built.projects?.length ? built.projects : ((p.projects as any[]) || []).map((pr: any) => ({
      id: uid(),
      name: pr.name || pr.title || "",
      description: pr.description || "",
      stack: pr.stack || pr.tech || "",
      github: pr.github || "",
      demo: pr.demo || pr.url || "",
    })));
    setCerts(built.certs?.length ? built.certs : ((p.certifications as any[]) || []).map((c: any) => ({
      id: uid(),
      name: c.name || "",
      issuer: c.issuer || "",
      year: c.year || "",
    })));
    setUseForApplications(!!p.use_built_resume);

    const tpl: TemplateId = TEMPLATES[built.templateId as TemplateId] ? built.templateId : "fresher";
    setTemplateId(tpl);
    setSectionOrder(Array.isArray(built.sectionOrder) && built.sectionOrder.length ? built.sectionOrder : TEMPLATES[tpl].order);
    setHiddenSections(Array.isArray(built.hiddenSections) ? built.hiddenSections : []);
    setTargetRole(built.targetRole || "");

    const photoPath = built.photoUrl || p.photo_url;
    if (photoPath && !photoPath.startsWith("http")) {
      const { data: signed } = await supabase.storage.from("photos").createSignedUrl(photoPath, 3600);
      if (signed?.signedUrl) setPhotoSigned(signed.signedUrl);
    } else if (photoPath) {
      setPhotoSigned(photoPath);
    }
  };

  const loadProfile = async (initial: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { if (initial) navigate("/login"); return; }
    setAuthId(session.user.id);
    setEmail(session.user.email || "");

    const { data: u } = await supabase
      .from("users")
      .select("id, full_name, phone")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (u) {
      setUserId(u.id);
      if (initial) {
        setFullName(u.full_name || "");
        setPhone(u.phone || "");
      }
    }

    const { data: p } = await supabase
      .from("candidate_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .maybeSingle();

    await applyProfile(p, u);
    if (initial) setLoading(false);
  };

  useEffect(() => {
    loadProfile(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Realtime: pull remote profile changes when the local copy has no unsaved edits
  useLiveData(["candidate_profiles", "users"], () => {
    if (dirty || saving) return;
    loadProfile(false);
  }, { key: "resume-builder", enabled: !loading });

  // Photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authId) return;
    // Storage RLS on photos expects folder prefix = users.id (mapped), NOT auth.uid()
    const { data: me } = await supabase.from("users").select("id").eq("user_id", authId).maybeSingle();
    const folderId = me?.id || authId;
    const path = `${folderId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (error) { toast.error("Photo upload failed: " + error.message); return; }
    setPhotoUrl(path);
    const { data: signed } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
    if (signed?.signedUrl) setPhotoSigned(signed.signedUrl);
    toast.success("Photo uploaded");
  };

  // Skills
  const addSkill = (s: string) => {
    const v = s.trim();
    if (!v) return;
    if (skills.some((x) => x.toLowerCase() === v.toLowerCase())) return;
    setSkills([...skills, v]);
  };
  const handleSkillKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(skillInput);
      setSkillInput("");
    }
  };

  // AI helpers
  const callAi = async (action: string, payload: any, title: string, onUse: (t: string) => void) => {
    setAiLoading(action);
    try {
      const { data, error } = await supabase.functions.invoke("resume-ai", {
        body: { action, ...payload },
      });
      if (error) throw error;
      const result = (data as any)?.result || "";
      if (!result) throw new Error("Empty response");
      if (action === "suggest_skills") {
        const list = result.split(/[,\n]/).map((s: string) => s.trim().replace(/^[-•*\d.\s)]+/, "")).filter(Boolean).slice(0, 12);
        setSkillSuggestions(list);
        toast.success(`${list.length} skill suggestions ready`);
      } else {
        setAiDialog({ open: true, title, text: result, onUse });
      }
    } catch (err: any) {
      toast.error("AI failed: " + (err?.message || "unknown"));
    } finally {
      setAiLoading(null);
    }
  };

  const generateSummary = () => callAi(
    "summary",
    { name: fullName, headline, skills, experiences },
    "AI-Generated Summary",
    (t) => setSummary(t.slice(0, 300)),
  );
  const improveBullets = (exp: Experience) => callAi(
    "improve_bullets",
    { description: exp.description },
    "Improved Bullet Points",
    (t) => setExperiences((prev) => prev.map((x) => x.id === exp.id ? { ...x, description: t } : x)),
  );
  const suggestSkills = () => callAi(
    "suggest_skills",
    { experiences, headline },
    "Skill Suggestions",
    () => {},
  );

  // DnD reordering experiences (lightweight)
  const dragId = useRef<string | null>(null);
  const onDragStart = (id: string) => () => { dragId.current = id; };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (id: string) => () => {
    const from = dragId.current; if (!from || from === id) return;
    setExperiences((prev) => {
      const fromIdx = prev.findIndex((x) => x.id === from);
      const toIdx = prev.findIndex((x) => x.id === id);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragId.current = null;
  };

  // Save to profile
  const buildResumeJson = () => ({
    fullName, headline, phone, location, linkedin, github, portfolio,
    photoUrl, summary, experiences, education, skills, projects, certs,
    templateId, sectionOrder, hiddenSections, targetRole,
  });

  // Track unsaved edits so live updates never overwrite the user mid-typing
  const snapshot = JSON.stringify(buildResumeJson());
  useEffect(() => {
    if (loading) return;
    if (applyingRef.current) { applyingRef.current = false; setDirty(false); return; }
    setDirty(true);
  }, [snapshot, loading]);

  // Template switching
  // Let Enter insert a new line inside text areas (never bubble up to dialogs/forms)
  const stopEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") e.stopPropagation();
  };

  const applyTemplate = (id: TemplateId) => {
    setTemplateId(id);
    setSectionOrder(TEMPLATES[id].order);
    setHiddenSections([]);
  };
  const moveSection = (key: SectionKey, dir: -1 | 1) => {
    setSectionOrder((prev) => {
      const i = prev.indexOf(key);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const toggleSection = (key: SectionKey) =>
    setHiddenSections((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);

  const handleSave = async () => {
    if (!authId) return;
    setSaving(true);
    try {
      const payload = {
        user_id: authId,
        full_name: fullName,
        headline,
        phone,
        location,
        linkedin_url: linkedin,
        github_url: github,
        portfolio_url: portfolio,
        photo_url: photoUrl || null,
        about_me: summary,
        skills,
        built_resume: buildResumeJson(),
        use_built_resume: useForApplications,
      };
      const { error } = await supabase
        .from("candidate_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
      setDirty(false);
      toast.success("✅ Resume saved to your profile!");
    } catch (err: any) {
      toast.error("Save failed: " + (err?.message || "unknown"));
    } finally {
      setSaving(false);
    }
  };

  // Download PDF
  const handleDownload = async () => {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `${(fullName || "Resume").replace(/\s+/g, "_")}_Resume_HireZap.pdf`;
      await html2pdf().set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        
      }).from(previewRef.current).save();
    } catch (err: any) {
      toast.error("PDF export failed: " + (err?.message || "unknown"));
    } finally {
      setDownloading(false);
    }
  };

  const characterCount = useMemo(() => summary.length, [summary]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/candidate-dashboard")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
          <h1 className="text-lg font-bold text-foreground">Resume Builder</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save to Profile
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 max-w-[1600px] mx-auto">
        {/* Editor (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Template chooser */}
          <Section title="Choose a resume template">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {TEMPLATE_IDS.map((id) => {
                const t = TEMPLATES[id];
                const active = templateId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyTemplate(id)}
                    className={`text-left rounded-xl border p-3 transition ${active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card/60 hover:border-primary/50"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ background: t.accent }} />
                      <span className="text-sm font-semibold text-foreground">{t.name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.blurb}</p>
                  </button>
                );
              })}
            </div>

            {templateId === "job_specific" && (
              <div className="mt-3">
                <Field label="Target job title / company">
                  <Input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="e.g. Frontend Developer at Acme" />
                </Field>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-dashed border-border p-3">
              <p className="text-xs text-muted-foreground mb-2">Reorder or hide sections — the preview and PDF follow this exactly.</p>
              <div className="space-y-1">
                {sectionOrder.map((key, idx) => {
                  const hidden = hiddenSections.includes(key);
                  return (
                    <div key={key} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-1.5">
                      <span className={`flex-1 text-xs font-medium ${hidden ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {SECTION_LABEL[key]}
                      </span>
                      <Button variant="ghost" size="sm" className="h-7 px-2" disabled={idx === 0} onClick={() => moveSection(key, -1)}>↑</Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" disabled={idx === sectionOrder.length - 1} onClick={() => moveSection(key, 1)}>↓</Button>
                      <Switch checked={!hidden} onCheckedChange={() => toggleSection(key)} />
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Personal */}
          <Section title="Personal Info">
            <div className="flex items-center gap-4 mb-4">
              <label className="relative h-20 w-20 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition">
                {photoSigned ? (
                  <img src={photoSigned} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <div className="text-xs text-muted-foreground">Upload a clear, professional headshot.</div>
            </div>
            <Grid>
              <Field label="Full Name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" /></Field>
              <Field label="Professional Headline"><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="React Developer | 3 years experience" /></Field>
              <Field label="Email"><Input value={email} disabled /></Field>
              <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ..." /></Field>
              <Field label="Location"><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bengaluru, IN" /></Field>
              <Field label="LinkedIn URL"><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." /></Field>
              <Field label="GitHub URL"><Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/..." /></Field>
              <Field label="Portfolio URL"><Input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://..." /></Field>
            </Grid>
          </Section>

          {/* Summary */}
          <Section title="Professional Summary">
            <Textarea onKeyDown={stopEnter}
              value={summary}
              onChange={(e) => setSummary(e.target.value.slice(0, 300))}
              placeholder="A short professional summary (max 300 chars)..."
              rows={4}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted-foreground">{characterCount}/300</span>
              <Button
                variant="outline" size="sm" onClick={generateSummary} disabled={aiLoading === "summary"}
                className="gap-2"
              >
                {aiLoading === "summary" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Generate with AI
              </Button>
            </div>
          </Section>

          {/* Work Experience */}
          <Section
            title="Work Experience"
            action={
              <Button size="sm" onClick={() => setExperiences([...experiences, { id: uid(), company: "", title: "", startDate: "", endDate: "", current: false, description: "" }])} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
                <Plus className="h-3 w-3" /> Add Experience
              </Button>
            }
          >
            {experiences.length === 0 && <Empty>No work experience added yet.</Empty>}
            <div className="space-y-3">
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  draggable
                  onDragStart={onDragStart(exp.id)}
                  onDragOver={onDragOver}
                  onDrop={onDrop(exp.id)}
                  className="rounded-xl border border-border bg-card/60 p-4 space-y-3"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground mt-2 cursor-grab" />
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input value={exp.company} onChange={(e) => updateItem(experiences, setExperiences, exp.id, { company: e.target.value })} placeholder="Company Name" />
                      <Input value={exp.title} onChange={(e) => updateItem(experiences, setExperiences, exp.id, { title: e.target.value })} placeholder="Job Title" />
                      <Input type="month" value={exp.startDate} onChange={(e) => updateItem(experiences, setExperiences, exp.id, { startDate: e.target.value })} />
                      <Input type="month" value={exp.endDate} disabled={exp.current} onChange={(e) => updateItem(experiences, setExperiences, exp.id, { endDate: e.target.value })} placeholder="End date" />
                      <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
                        <Switch checked={exp.current} onCheckedChange={(v) => updateItem(experiences, setExperiences, exp.id, { current: v, endDate: v ? "" : exp.endDate })} />
                        Currently working here
                      </label>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setExperiences(experiences.filter((x) => x.id !== exp.id))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea onKeyDown={stopEnter}
                    value={exp.description}
                    onChange={(e) => updateItem(experiences, setExperiences, exp.id, { description: e.target.value })}
                    rows={4}
                    placeholder="Describe your responsibilities and achievements..."
                  />
                  <Button variant="outline" size="sm" onClick={() => improveBullets(exp)} disabled={aiLoading === "improve_bullets" || !exp.description.trim()} className="gap-2">
                    {aiLoading === "improve_bullets" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Improve with AI
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          {/* Education */}
          <Section
            title="Education"
            action={
              <Button size="sm" onClick={() => setEducation([...education, { id: uid(), school: "", degree: "B.Tech", field: "", startYear: "", endYear: "", grade: "" }])} className="gap-1">
                <Plus className="h-3 w-3" /> Add Education
              </Button>
            }
          >
            {education.length === 0 && <Empty>No education added yet.</Empty>}
            <div className="space-y-3">
              {education.map((ed) => (
                <div key={ed.id} className="rounded-xl border border-border bg-card/60 p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input value={ed.school} onChange={(e) => updateItem(education, setEducation, ed.id, { school: e.target.value })} placeholder="College / University Name" />
                    <select
                      value={ed.degree}
                      onChange={(e) => updateItem(education, setEducation, ed.id, { degree: e.target.value })}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {degreeOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <Input value={ed.field} onChange={(e) => updateItem(education, setEducation, ed.id, { field: e.target.value })} placeholder="Field of Study" />
                    <Input value={ed.grade} onChange={(e) => updateItem(education, setEducation, ed.id, { grade: e.target.value })} placeholder="Grade / CGPA (optional)" />
                    <Input type="number" value={ed.startYear} onChange={(e) => updateItem(education, setEducation, ed.id, { startYear: e.target.value })} placeholder="Start Year" />
                    <Input type="number" value={ed.endYear} onChange={(e) => updateItem(education, setEducation, ed.id, { endYear: e.target.value })} placeholder="End Year" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEducation(education.filter((x) => x.id !== ed.id))} className="mt-2 gap-1 text-destructive">
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          {/* Skills */}
          <Section title="Skills">
            <div className="flex gap-2 mb-2">
              <Input
                ref={skillInputRef}
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKey}
                placeholder="Type a skill and press Enter"
              />
              <Button variant="outline" size="sm" onClick={suggestSkills} disabled={aiLoading === "suggest_skills"} className="gap-2 shrink-0">
                {aiLoading === "suggest_skills" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI Suggest
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 px-3 py-1 text-xs font-medium">
                    {s}
                    <button onClick={() => setSkills(skills.filter((x) => x !== s))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {skillSuggestions.length > 0 && (
              <div className="rounded-lg border border-dashed border-border p-3">
                <p className="text-xs text-muted-foreground mb-2">Click to add:</p>
                <div className="flex flex-wrap gap-2">
                  {skillSuggestions.filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase())).map((s) => (
                    <button key={s} onClick={() => { addSkill(s); setSkillSuggestions(skillSuggestions.filter((x) => x !== s)); }} className="rounded-full bg-secondary hover:bg-primary/20 px-3 py-1 text-xs">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Projects */}
          <Section
            title="Projects"
            action={
              <Button size="sm" onClick={() => setProjects([...projects, { id: uid(), name: "", description: "", stack: "", github: "", demo: "" }])} className="gap-1">
                <Plus className="h-3 w-3" /> Add Project
              </Button>
            }
          >
            {projects.length === 0 && <Empty>No projects added yet.</Empty>}
            <div className="space-y-3">
              {projects.map((pr) => (
                <div key={pr.id} className="rounded-xl border border-border bg-card/60 p-4 space-y-2">
                  <Input value={pr.name} onChange={(e) => updateItem(projects, setProjects, pr.id, { name: e.target.value })} placeholder="Project Name" />
                  <Textarea onKeyDown={stopEnter} value={pr.description} onChange={(e) => updateItem(projects, setProjects, pr.id, { description: e.target.value })} rows={3} placeholder="What it does, your role, impact..." />
                  <Input value={pr.stack} onChange={(e) => updateItem(projects, setProjects, pr.id, { stack: e.target.value })} placeholder="Tech Stack (React, Node, PostgreSQL...)" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={pr.github} onChange={(e) => updateItem(projects, setProjects, pr.id, { github: e.target.value })} placeholder="GitHub link (optional)" />
                    <Input value={pr.demo} onChange={(e) => updateItem(projects, setProjects, pr.id, { demo: e.target.value })} placeholder="Live demo (optional)" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setProjects(projects.filter((x) => x.id !== pr.id))} className="gap-1 text-destructive">
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          {/* Certifications */}
          <Section
            title="Certifications"
            action={
              <Button size="sm" onClick={() => setCerts([...certs, { id: uid(), name: "", issuer: "", year: "" }])} className="gap-1">
                <Plus className="h-3 w-3" /> Add Certification
              </Button>
            }
          >
            {certs.length === 0 && <Empty>No certifications added yet.</Empty>}
            <div className="space-y-3">
              {certs.map((c) => (
                <div key={c.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_120px_40px] gap-2 items-center">
                  <Input value={c.name} onChange={(e) => updateItem(certs, setCerts, c.id, { name: e.target.value })} placeholder="Certification Name" />
                  <Input value={c.issuer} onChange={(e) => updateItem(certs, setCerts, c.id, { issuer: e.target.value })} placeholder="Issuing Organization" />
                  <Input type="number" value={c.year} onChange={(e) => updateItem(certs, setCerts, c.id, { year: e.target.value })} placeholder="Year" />
                  <Button variant="ghost" size="icon" onClick={() => setCerts(certs.filter((x) => x.id !== c.id))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          {/* Use for applications toggle */}
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Use this resume for job applications</Label>
              <p className="text-xs text-muted-foreground mt-1">
                When ON, this resume is auto-attached when you apply to a job — no file upload required.
              </p>
            </div>
            <Switch checked={useForApplications} onCheckedChange={setUseForApplications} />
          </div>
        </div>

        {/* Preview (40%) */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20">
            <div className="text-xs text-muted-foreground mb-2 text-center">
              LIVE PREVIEW · {TEMPLATES[templateId].name}{dirty ? " · unsaved changes" : ""}
            </div>
            <div className="rounded-xl border border-border bg-white shadow-xl overflow-hidden">
              <div ref={previewRef} className="bg-white text-[#1a1a1a] p-8" style={{ fontFamily: "Inter, Calibri, Arial, sans-serif", minHeight: "11in" }}>
                <ResumePreview
                  fullName={fullName} headline={headline} email={email} phone={phone}
                  location={location} linkedin={linkedin} github={github} portfolio={portfolio}
                  photoUrl={photoSigned} summary={summary} experiences={experiences}
                  education={education} skills={skills} projects={projects} certs={certs}
                  accent={TEMPLATES[templateId].accent}
                  summaryLabel={TEMPLATES[templateId].summaryLabel}
                  targetRole={templateId === "job_specific" ? targetRole : ""}
                  order={sectionOrder} hidden={hiddenSections}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Dialog */}
      <Dialog open={aiDialog.open} onOpenChange={(o) => setAiDialog((p) => ({ ...p, open: o }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> {aiDialog.title}
            </DialogTitle>
            <DialogDescription>Review the AI suggestion. You can edit before using.</DialogDescription>
          </DialogHeader>
          <Textarea onKeyDown={stopEnter}
            value={aiDialog.text}
            onChange={(e) => setAiDialog((p) => ({ ...p, text: e.target.value }))}
            rows={10}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialog((p) => ({ ...p, open: false }))}>Cancel</Button>
            <Button onClick={() => { aiDialog.onUse(aiDialog.text); setAiDialog((p) => ({ ...p, open: false })); toast.success("Applied"); }} className="bg-primary">
              Use This
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function updateItem<T extends { id: string }>(arr: T[], setter: (v: T[]) => void, id: string, patch: Partial<T>) {
  setter(arr.map((x) => x.id === id ? { ...x, ...patch } : x));
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground italic">{children}</p>;
}

function formatMonth(iso: string) {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  if (!y) return iso;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${m ? months[parseInt(m,10) - 1] : ""} ${y}`.trim();
}

function ResumePreview(props: {
  fullName: string; headline: string; email: string; phone: string; location: string;
  linkedin: string; github: string; portfolio: string; photoUrl: string;
  summary: string; experiences: Experience[]; education: Education[];
  skills: string[]; projects: Project[]; certs: Certification[];
  accent: string; summaryLabel: string; targetRole: string;
  order: SectionKey[]; hidden: string[];
}) {
  const accent = props.accent || "#1a1a1a";
  const contact = [props.email, props.phone, props.location].filter(Boolean).join(" • ");
  const links = [
    props.linkedin && { label: "LinkedIn", url: props.linkedin },
    props.github && { label: "GitHub", url: props.github },
    props.portfolio && { label: "Portfolio", url: props.portfolio },
  ].filter(Boolean) as { label: string; url: string }[];

  const blocks: Record<SectionKey, React.ReactNode> = {
    summary: props.summary ? (
      <ResumeSection key="summary" title={props.summaryLabel} accent={accent}>
        <p style={{ fontSize: 11.5, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{props.summary}</p>
      </ResumeSection>
    ) : null,
    experience: props.experiences.length > 0 ? (
      <ResumeSection key="experience" title="Experience" accent={accent}>
        {props.experiences.map((e) => (
          <div key={e.id} style={{ marginBottom: 10, minWidth: 0, overflowWrap: "anywhere" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                <strong style={{ fontSize: 12.5 }}>{e.company || "Company"}</strong>
                <span style={{ fontSize: 11.5, color: "#444" }}> — {e.title || "Title"}</span>
              </div>
              <span style={{ fontSize: 10.5, color: "#666", flexShrink: 0 }}>
                {formatMonth(e.startDate)} – {e.current ? "Present" : formatMonth(e.endDate)}
              </span>
            </div>
            {e.description && (
              <ul style={{ marginTop: 4, paddingLeft: 16, fontSize: 11, lineHeight: 1.45 }}>
                {e.description.split(/\n+/).filter(Boolean).map((line, i) => (
                  <li key={i} style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{line.replace(/^\s*[-•*\d.)]+\s*/, "")}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </ResumeSection>
    ) : null,
    education: props.education.length > 0 ? (
      <ResumeSection key="education" title="Education" accent={accent}>
        {props.education.map((ed) => (
          <div key={ed.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, fontSize: 11.5, minWidth: 0 }}>
            <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
              <strong>{ed.school || "School"}</strong>
              <div style={{ color: "#444" }}>{ed.degree}{ed.field ? `, ${ed.field}` : ""}{ed.grade ? ` — ${ed.grade}` : ""}</div>
            </div>
            <span style={{ fontSize: 10.5, color: "#666", flexShrink: 0 }}>{ed.startYear} – {ed.endYear}</span>
          </div>
        ))}
      </ResumeSection>
    ) : null,
    skills: props.skills.length > 0 ? (
      <ResumeSection key="skills" title="Skills" accent={accent}>
        <p style={{ fontSize: 11.5, lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{props.skills.join(" • ")}</p>
      </ResumeSection>
    ) : null,
    projects: props.projects.length > 0 ? (
      <ResumeSection key="projects" title="Projects" accent={accent}>
        {props.projects.map((pr) => (
          <div key={pr.id} style={{ marginBottom: 8, fontSize: 11.5, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
            <strong>{pr.name || "Project"}</strong>
            {pr.stack && <span style={{ color: "#666" }}> — {pr.stack}</span>}
            {pr.description && (
               <div style={{ marginTop: 2, lineHeight: 1.45, whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "break-word" }}>{pr.description}</div>
            )}
            {(pr.github || pr.demo) && (
              <p style={{ fontSize: 10.5, color: accent, marginTop: 2 }}>
                {pr.github && <span>GitHub: {pr.github}</span>}
                {pr.github && pr.demo && <span style={{ color: "#888" }}> • </span>}
                {pr.demo && <span>Demo: {pr.demo}</span>}
              </p>
            )}
          </div>
        ))}
      </ResumeSection>
    ) : null,
    certs: props.certs.length > 0 ? (
      <ResumeSection key="certs" title="Certifications" accent={accent}>
        {props.certs.map((c) => (
          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, marginBottom: 3, minWidth: 0 }}>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}><strong>{c.name}</strong>{c.issuer ? ` — ${c.issuer}` : ""}</span>
            <span style={{ color: "#666", flexShrink: 0 }}>{c.year}</span>
          </div>
        ))}
      </ResumeSection>
    ) : null,
  };

  return (
    <div style={{ color: "#1a1a1a", width: "100%", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
      <header className="flex items-start gap-4 mb-4">
        {props.photoUrl && (
          <img src={props.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover border" />
        )}
         <div className="flex-1 min-w-0">
          <h1 style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, margin: 0, color: accent }}>
            {props.fullName || "Your Name"}
          </h1>
          {props.headline && (
            <p style={{ fontSize: 13, color: "#444", marginTop: 4, overflowWrap: "anywhere" }}>{props.headline}</p>
          )}
          {props.targetRole && (
            <p style={{ fontSize: 11.5, color: accent, marginTop: 3, fontWeight: 600 }}>
              Applying for: {props.targetRole}
            </p>
          )}
          {contact && <p style={{ fontSize: 11, color: "#555", marginTop: 6, overflowWrap: "anywhere" }}>{contact}</p>}
          {links.length > 0 && (
            <p style={{ fontSize: 11, color: accent, marginTop: 2, overflowWrap: "anywhere", wordBreak: "break-word" }}>
              {links.map((l, i) => (
                <span key={l.url}>
                  {i > 0 && <span style={{ color: "#888" }}> • </span>}
                  {l.label}: {l.url}
                </span>
              ))}
            </p>
          )}
        </div>
      </header>
      <hr style={{ border: 0, borderTop: `2px solid ${accent}`, margin: "8px 0 14px" }} />

      {props.order.filter((k) => !props.hidden.includes(k)).map((k) => blocks[k])}
    </div>
  );
}

function ResumeSection({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <section style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: accent || "#666", textTransform: "uppercase", marginBottom: 6, borderBottom: "1px solid #eee", paddingBottom: 3 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}
