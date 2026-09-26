import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "@/components/BrandLoader";

export interface TemplateConfig {
  logo_url?: string;
  logo_position: "Left" | "Center" | "Right";
  company_address: string;
  company_email: string;
  company_phone: string;
  title: string;
  opening_paragraph: string;
  compensation_enabled: boolean;
  compensation_rows: {
    basic: boolean; hra: boolean; bonus: boolean; allowances: boolean; esops: boolean; pf: boolean; total: boolean;
  };
  probation: string;
  notice_probation: string;
  leave_policy: string;
  standard_terms: string;
  signatory_name: string;
  signatory_designation: string;
  footer_company: string;
  footer_confidential: string;
  show_page_numbers: boolean;
  font_family: "Inter" | "Calibri" | "Times New Roman";
  primary_color: string;
  paper_size: "A4" | "Letter";
  margins: "Normal" | "Narrow" | "Wide";
}

export const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  logo_position: "Left",
  company_address: "",
  company_email: "",
  company_phone: "",
  title: "Offer Letter",
  opening_paragraph:
    "Dear [Candidate Name],\n\nWe are delighted to offer you the position of [Job Title] in our [Department] team. Your expected joining date is [Joining Date]. Please confirm acceptance by [Accept By Date].",
  compensation_enabled: true,
  compensation_rows: { basic: true, hra: true, bonus: true, allowances: true, esops: false, pf: true, total: true },
  probation: "3 months",
  notice_probation: "15 days",
  leave_policy: "12 paid leaves and 8 sick leaves per year.",
  standard_terms:
    "1. Employment is subject to satisfactory background verification.\n2. You agree to maintain confidentiality of company information.\n3. Either party may terminate employment as per company policy.",
  signatory_name: "",
  signatory_designation: "Head of Human Resources",
  footer_company: "",
  footer_confidential: "This document is confidential. Unauthorized distribution is prohibited.",
  show_page_numbers: true,
  font_family: "Inter",
  primary_color: "#16a34a",
  paper_size: "A4",
  margins: "Normal",
};

const VARIABLES = ["[Candidate Name]", "[Job Title]", "[Department]", "[Joining Date]", "[Accept By Date]"];

interface Props {
  companyId: string;
  userId: string;
  template: any | null;
  previewOnly?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const OfferTemplateEditor = ({ companyId, userId, template, previewOnly, onClose, onSaved }: Props) => {
  const { toast } = useToast();
  const [name, setName] = useState<string>(template?.template_name || "");
  const [isDefault, setIsDefault] = useState<boolean>(!!template?.is_default);
  const [logoUrl, setLogoUrl] = useState<string>(template?.logo_url || "");
  const [cfg, setCfg] = useState<TemplateConfig>({ ...DEFAULT_TEMPLATE_CONFIG, ...(template?.template_config || {}) });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (patch: Partial<TemplateConfig>) => setCfg(c => ({ ...c, ...patch }));

  const insertVariable = (v: string) => {
    if (previewOnly) return;
    set({ opening_paragraph: (cfg.opening_paragraph || "") + " " + v });
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const path = `${companyId}/logo-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch (e: any) {
      toast({ title: "Logo upload failed", description: e.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const save = async () => {
    if (!name.trim()) { toast({ title: "Template name is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (isDefault) {
        await supabase.from("offer_templates" as any).update({ is_default: false } as any).eq("company_id", companyId);
      }
      const payload: any = {
        company_id: companyId,
        created_by: userId,
        template_name: name.trim(),
        template_config: cfg,
        is_default: isDefault,
        logo_url: logoUrl || null,
      };
      if (template?.id) {
        const { error } = await supabase.from("offer_templates" as any).update(payload).eq("id", template.id);
        if (error) throw error;
        toast({ title: "Template updated" });
      } else {
        const { error } = await supabase.from("offer_templates" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Template saved" });
      }
      onSaved();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  // Preview rendering with placeholder data
  const previewHtml = useMemo(() => renderPreview(cfg, logoUrl), [cfg, logoUrl]);

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{previewOnly ? "Preview Template" : template ? "Edit Template" : "New Offer Letter Template"}</h2>
          {!previewOnly && (
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Template name *"
              className="h-8 w-64 bg-secondary border-border"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {!previewOnly && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={isDefault} onCheckedChange={setIsDefault} /> Set as Default
              </div>
              <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Template
              </Button>
            </>
          )}
          <Button variant="outline" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        {/* Editor controls */}
        {!previewOnly && (
          <div className="overflow-y-auto p-6 space-y-6 border-r border-border">
            <Section title="Company Branding">
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-3">
                  {logoUrl && <img src={logoUrl} alt="Logo" className="h-12 rounded border border-border" />}
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-border bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading…" : logoUrl ? "Replace" : "Upload"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && uploadLogo(e.target.files[0])} />
                  </label>
                </div>
              </div>
              <Field label="Logo Position">
                <Select value={cfg.logo_position} onValueChange={(v: any) => set({ logo_position: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Left">Left</SelectItem>
                    <SelectItem value="Center">Center</SelectItem>
                    <SelectItem value="Right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Company Address">
                <Textarea rows={2} value={cfg.company_address} onChange={e => set({ company_address: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company Email"><Input value={cfg.company_email} onChange={e => set({ company_email: e.target.value })} /></Field>
                <Field label="Company Phone"><Input value={cfg.company_phone} onChange={e => set({ company_phone: e.target.value })} /></Field>
              </div>
              <Field label="Offer Letter Title"><Input value={cfg.title} onChange={e => set({ title: e.target.value })} /></Field>
            </Section>

            <Section title="Opening Paragraph">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {VARIABLES.map(v => (
                  <button key={v} type="button" onClick={() => insertVariable(v)} className="text-[11px] rounded-full bg-emerald-600/10 text-emerald-600 px-2 py-0.5 hover:bg-emerald-600/20">
                    {v}
                  </button>
                ))}
              </div>
              <Textarea rows={5} value={cfg.opening_paragraph} onChange={e => set({ opening_paragraph: e.target.value })} />
            </Section>

            <Section title="Compensation Table">
              <div className="flex items-center gap-2 text-sm">
                <Switch checked={cfg.compensation_enabled} onCheckedChange={v => set({ compensation_enabled: v })} />
                Include compensation breakdown
              </div>
              {cfg.compensation_enabled && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  {(["basic","hra","bonus","allowances","esops","pf","total"] as const).map(k => (
                    <label key={k} className="flex items-center gap-2 text-sm capitalize">
                      <Checkbox checked={cfg.compensation_rows[k]} onCheckedChange={(v: any) => set({ compensation_rows: { ...cfg.compensation_rows, [k]: !!v } })} />
                      {labelFor(k)}
                    </label>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Terms">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Probation Period">
                  <Select value={cfg.probation} onValueChange={v => set({ probation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["None","1 month","3 months","6 months","9 months","12 months"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notice during Probation">
                  <Select value={cfg.notice_probation} onValueChange={v => set({ notice_probation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["7 days","15 days","30 days","60 days","90 days"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Leave Policy"><Textarea rows={2} value={cfg.leave_policy} onChange={e => set({ leave_policy: e.target.value })} /></Field>
              <Field label="Standard Terms"><Textarea rows={5} value={cfg.standard_terms} onChange={e => set({ standard_terms: e.target.value })} /></Field>
            </Section>

            <Section title="Signature">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Authorized Signatory"><Input value={cfg.signatory_name} onChange={e => set({ signatory_name: e.target.value })} /></Field>
                <Field label="Designation"><Input value={cfg.signatory_designation} onChange={e => set({ signatory_designation: e.target.value })} /></Field>
              </div>
            </Section>

            <Section title="Footer">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Footer Company Name"><Input value={cfg.footer_company} onChange={e => set({ footer_company: e.target.value })} /></Field>
                <Field label="Confidential Notice"><Input value={cfg.footer_confidential} onChange={e => set({ footer_confidential: e.target.value })} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm pt-1">
                <Switch checked={cfg.show_page_numbers} onCheckedChange={v => set({ show_page_numbers: v })} /> Show page numbers
              </label>
            </Section>

            <Section title="PDF Styling">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Font Family">
                  <Select value={cfg.font_family} onValueChange={(v: any) => set({ font_family: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Calibri">Calibri</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Primary Color">
                  <Input type="color" value={cfg.primary_color} onChange={e => set({ primary_color: e.target.value })} className="h-9 w-full p-1" />
                </Field>
                <Field label="Paper Size">
                  <Select value={cfg.paper_size} onValueChange={(v: any) => set({ paper_size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="Letter">Letter</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label="Margins">
                  <Select value={cfg.margins} onValueChange={(v: any) => set({ margins: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Normal","Narrow","Wide"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>
          </div>
        )}

        {/* Live preview */}
        <div className={`overflow-y-auto bg-muted/30 p-6 ${previewOnly ? "col-span-2 md:col-span-2" : ""}`}>
          <div className="mx-auto max-w-[820px] shadow-lg">
            <iframe title="Preview" srcDoc={previewHtml} className="w-full h-[1100px] rounded-md bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-3">
    <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">{title}</h4>
    <div className="space-y-3">{children}</div>
  </div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>
);

function labelFor(k: string) {
  return ({
    basic: "Basic Salary", hra: "HRA", bonus: "Performance Bonus", allowances: "Other Allowances",
    esops: "ESOPs", pf: "PF", total: "Total CTC",
  } as Record<string,string>)[k] || k;
}

function renderPreview(cfg: TemplateConfig, logoUrl: string) {
  const subst = (s: string) => s
    .replace(/\[Candidate Name\]/g, '<span style="color:#9ca3af">Candidate Name</span>')
    .replace(/\[Job Title\]/g, '<span style="color:#9ca3af">Job Title</span>')
    .replace(/\[Department\]/g, '<span style="color:#9ca3af">Department</span>')
    .replace(/\[Joining Date\]/g, '<span style="color:#9ca3af">DD Mon YYYY</span>')
    .replace(/\[Accept By Date\]/g, '<span style="color:#9ca3af">DD Mon YYYY</span>');
  const margin = cfg.margins === "Narrow" ? "20mm" : cfg.margins === "Wide" ? "40mm" : "30mm";
  const rows: Array<[string,string]> = [];
  const r = cfg.compensation_rows;
  if (r.basic) rows.push(["Basic Salary","₹ 5,00,000"]);
  if (r.hra) rows.push(["HRA","₹ 2,00,000"]);
  if (r.bonus) rows.push(["Performance Bonus","₹ 1,00,000"]);
  if (r.allowances) rows.push(["Other Allowances","₹ 50,000"]);
  if (r.esops) rows.push(["ESOPs","₹ 1,00,000"]);
  if (r.pf) rows.push(["PF","₹ 60,000"]);
  if (r.total) rows.push(["Total CTC","₹ 10,10,000"]);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: ${cfg.font_family}, system-ui, sans-serif; color:#111827; margin:0; padding:${margin}; font-size:13px; line-height:1.55; }
    .header { display:flex; justify-content:${cfg.logo_position === "Center" ? "center" : cfg.logo_position === "Right" ? "flex-end" : "flex-start"}; margin-bottom:18px; }
    .header img { max-height:64px; }
    h1 { color:${cfg.primary_color}; font-size:24px; border-bottom:2px solid ${cfg.primary_color}; padding-bottom:6px; }
    h3 { color:${cfg.primary_color}; margin-top:22px; font-size:14px; text-transform:uppercase; letter-spacing:.08em; }
    table { width:100%; border-collapse:collapse; margin-top:8px; }
    th, td { border:1px solid ${cfg.primary_color}33; padding:8px 10px; text-align:left; font-size:12.5px; }
    th { background:${cfg.primary_color}15; color:${cfg.primary_color}; }
    .meta { color:#6b7280; font-size:11.5px; }
    .sig { margin-top:50px; }
    .footer { margin-top:48px; border-top:1px solid #e5e7eb; padding-top:8px; font-size:10.5px; color:#6b7280; text-align:center; }
    pre { white-space:pre-wrap; font-family:inherit; margin:0; }
  </style></head><body>
    <div class="header">${logoUrl ? `<img src="${logoUrl}"/>` : ""}</div>
    <div class="meta">${escapeHtml(cfg.company_address)}<br/>${escapeHtml(cfg.company_email)} · ${escapeHtml(cfg.company_phone)}</div>
    <h1>${escapeHtml(cfg.title)}</h1>
    <pre>${subst(escapeHtml(cfg.opening_paragraph))}</pre>
    ${cfg.compensation_enabled ? `<h3>Compensation</h3><table><tr><th>Component</th><th>Amount</th></tr>${rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>` : ""}
    <h3>Terms &amp; Conditions</h3>
    <p><strong>Probation:</strong> ${escapeHtml(cfg.probation)} &nbsp;·&nbsp; <strong>Notice during probation:</strong> ${escapeHtml(cfg.notice_probation)}</p>
    <p><strong>Leave Policy:</strong> ${escapeHtml(cfg.leave_policy)}</p>
    <pre>${escapeHtml(cfg.standard_terms)}</pre>
    <div class="sig">
      <p>Sincerely,</p>
      <p><strong>${escapeHtml(cfg.signatory_name || "Authorized Signatory")}</strong><br/>${escapeHtml(cfg.signatory_designation)}</p>
    </div>
    <div class="footer">${escapeHtml(cfg.footer_company)} · ${escapeHtml(cfg.footer_confidential)}</div>
  </body></html>`;
}
function escapeHtml(s: string) {
  return (s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c] as string));
}

export default OfferTemplateEditor;
