import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Upload, X, Plus, Save, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { signCompanyAsset, BUCKET, slugify } from "@/lib/companyAssets";
import { toast } from "sonner";

interface Props { companyId: string }

interface Form {
  company_name: string;
  slug: string;
  tagline: string;
  about: string;
  website: string;
  industry: string;
  location: string;
  company_size: string;
  founded_year: string;
  avg_response_days: string;
  logo_url: string | null;
  banner_url: string | null;
  office_photos: string[];
  tech_stack: string[];
  benefits: string[];
}

const EMPTY: Form = {
  company_name: "", slug: "", tagline: "", about: "", website: "", industry: "",
  location: "", company_size: "", founded_year: "", avg_response_days: "",
  logo_url: null, banner_url: null, office_photos: [], tech_stack: [], benefits: [],
};

const safeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

export default function CompanyProfileEditor({ companyId }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<{ logo?: string | null; banner?: string | null; office: (string | null)[] }>({ office: [] });
  const [tag, setTag] = useState("");
  const [benefit, setBenefit] = useState("");

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, company_name, slug, tagline, about, website, industry, location, company_size, founded_year, avg_response_days, logo_url, banner_url, office_photos, tech_stack, benefits")
        .eq("id", companyId)
        .maybeSingle();
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      if (data) {
        const f: Form = {
          company_name: data.company_name || "",
          slug: data.slug || slugify(data.company_name || ""),
          tagline: data.tagline || "",
          about: data.about || "",
          website: data.website || "",
          industry: data.industry || "",
          location: data.location || "",
          company_size: data.company_size || "",
          founded_year: data.founded_year?.toString() || "",
          avg_response_days: data.avg_response_days?.toString() || "",
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
          office_photos: safeStringArray(data.office_photos),
          tech_stack: safeStringArray(data.tech_stack),
          benefits: safeStringArray(data.benefits),
        };
        setForm(f);
        const [logo, banner] = await Promise.all([signCompanyAsset(f.logo_url), signCompanyAsset(f.banner_url)]);
        const office = await Promise.all(f.office_photos.map((p) => signCompanyAsset(p)));
        setPreviews({ logo, banner, office });
      }
      setLoading(false);
    })();
  }, [companyId]);

  const upload = async (file: File, kind: "logo" | "banner" | "office"): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${companyId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); return null; }
    return path;
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const path = await upload(f, "logo"); if (!path) return;
    setForm((p) => ({ ...p, logo_url: path }));
    setPreviews((p) => ({ ...p, logo: URL.createObjectURL(f) }));
  };
  const onBanner = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const path = await upload(f, "banner"); if (!path) return;
    setForm((p) => ({ ...p, banner_url: path }));
    setPreviews((p) => ({ ...p, banner: URL.createObjectURL(f) }));
  };
  const onOffice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - form.office_photos.length);
    for (const f of files) {
      const path = await upload(f, "office"); if (!path) continue;
      setForm((p) => ({ ...p, office_photos: [...p.office_photos, path] }));
      setPreviews((p) => ({ ...p, office: [...p.office, URL.createObjectURL(f)] }));
    }
  };
  const removeOffice = (i: number) => {
    setForm((p) => ({ ...p, office_photos: p.office_photos.filter((_, idx) => idx !== i) }));
    setPreviews((p) => ({ ...p, office: p.office.filter((_, idx) => idx !== i) }));
  };

  const addTag = () => { const v = tag.trim(); if (!v) return; if (!form.tech_stack.includes(v)) setForm((p) => ({ ...p, tech_stack: [...p.tech_stack, v] })); setTag(""); };
  const rmTag = (v: string) => setForm((p) => ({ ...p, tech_stack: p.tech_stack.filter((t) => t !== v) }));
  const addBen = () => { const v = benefit.trim(); if (!v) return; if (!form.benefits.includes(v)) setForm((p) => ({ ...p, benefits: [...p.benefits, v] })); setBenefit(""); };
  const rmBen = (v: string) => setForm((p) => ({ ...p, benefits: p.benefits.filter((b) => b !== v) }));

  const save = async () => {
    setSaving(true);
    const finalSlug = form.slug.trim() || slugify(form.company_name);
    const payload = {
      company_name: form.company_name,
      slug: finalSlug,
      tagline: form.tagline || null,
      about: form.about || null,
      website: form.website || null,
      industry: form.industry || null,
      location: form.location || null,
      company_size: form.company_size || null,
      founded_year: form.founded_year ? parseInt(form.founded_year) : null,
      avg_response_days: form.avg_response_days ? parseInt(form.avg_response_days) : null,
      logo_url: form.logo_url,
      banner_url: form.banner_url,
      office_photos: form.office_photos,
      tech_stack: form.tech_stack,
      benefits: form.benefits,
    };
    const { error } = await supabase.from("companies").update(payload).eq("id", companyId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Company profile saved"); setForm((p) => ({ ...p, slug: finalSlug })); }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Company profile</h2>
          <p className="text-sm text-muted-foreground">This is what candidates see at <code className="text-primary">/company/{form.slug || "your-slug"}</code></p>
        </div>
        <div className="flex gap-2">
          {form.slug && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/company/${form.slug}`, "_blank")}>
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Preview
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className="h-3.5 w-3.5 mr-1.5" /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Banner + Logo */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-primary/20 to-secondary">
          {previews.banner && <img src={previews.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <label className="absolute top-3 right-3 cursor-pointer rounded-full bg-background/80 hover:bg-background px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5">
            <Upload className="h-3 w-3" /> Banner
            <input type="file" accept="image/*" className="hidden" onChange={onBanner} />
          </label>
        </div>
        <div className="px-5 pb-5 -mt-10 flex items-end gap-4">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-secondary border-4 border-card overflow-hidden flex items-center justify-center text-2xl font-bold text-primary">
              {previews.logo ? <img src={previews.logo} className="h-full w-full object-cover" alt="" /> : <Building2 className="h-8 w-8" />}
            </div>
            <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-full bg-primary text-primary-foreground p-1.5 shadow">
              <Upload className="h-3 w-3" />
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 pt-10">
            <div>
              <Label>Company name</Label>
              <Input value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value, slug: p.slug || slugify(e.target.value) }))} />
            </div>
            <div>
              <Label>Public URL slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))} placeholder="acme-corp" />
            </div>
          </div>
        </div>
      </div>

      {/* Basics */}
      <div className="rounded-2xl border border-border bg-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Tagline</Label>
          <Input maxLength={140} value={form.tagline} onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))} placeholder="One-line pitch" />
        </div>
        <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} /></div>
        <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Bengaluru, India" /></div>
        <div><Label>Company size</Label><Input value={form.company_size} onChange={(e) => setForm((p) => ({ ...p, company_size: e.target.value }))} placeholder="51-200" /></div>
        <div><Label>Founded year</Label><Input type="number" value={form.founded_year} onChange={(e) => setForm((p) => ({ ...p, founded_year: e.target.value }))} /></div>
        <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://" /></div>
        <div><Label>Avg response (days)</Label><Input type="number" value={form.avg_response_days} onChange={(e) => setForm((p) => ({ ...p, avg_response_days: e.target.value }))} placeholder="2" /></div>
        <div className="md:col-span-2">
          <Label>About <span className="text-muted-foreground">({form.about.length}/3000)</span></Label>
          <Textarea rows={6} maxLength={3000} value={form.about} onChange={(e) => setForm((p) => ({ ...p, about: e.target.value }))} />
        </div>
      </div>

      {/* Office photos */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <Label>Office photos ({form.office_photos.length}/5)</Label>
          {form.office_photos.length < 5 && (
            <label className="cursor-pointer text-xs inline-flex items-center gap-1.5 text-primary hover:underline">
              <Upload className="h-3 w-3" /> Add photo
              <input type="file" accept="image/*" multiple className="hidden" onChange={onOffice} />
            </label>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {previews.office.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-secondary">
              {url && <img src={url} alt="" className="h-full w-full object-cover" />}
              <button onClick={() => removeOffice(i)} className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <Label>Tech stack</Label>
        <div className="flex gap-2 mt-2">
          <Input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="React, Node, AWS…" />
          <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {form.tech_stack.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {t}<button onClick={() => rmTag(t)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <Label>Benefits & perks</Label>
        <div className="flex gap-2 mt-2">
          <Input value={benefit} onChange={(e) => setBenefit(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addBen())} placeholder="Health Insurance, Remote Work…" />
          <Button type="button" variant="outline" onClick={addBen}><Plus className="h-4 w-4" /></Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {form.benefits.map((b) => (
            <span key={b} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">
              {b}<button onClick={() => rmBen(b)}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

