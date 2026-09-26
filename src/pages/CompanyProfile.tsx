import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, Globe, Users, CalendarDays, Clock, Briefcase, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signCompanyAsset, signMany } from "@/lib/companyAssets";
import { motion } from "framer-motion";

interface Company {
  id: string;
  company_name: string;
  slug: string | null;
  tagline: string | null;
  logo_url: string | null;
  banner_url: string | null;
  about: string | null;
  website: string | null;
  industry: string | null;
  location: string | null;
  company_size: string | null;
  founded_year: number | null;
  office_photos: string[] | null;
  tech_stack: string[] | null;
  benefits: string[] | null;
  avg_response_days: number | null;
}

interface JobRow {
  id: string;
  title: string;
  location: string | null;
  work_type: string | null;
  experience_min: number | null;
  experience_max: number | null;
  created_at: string;
}

export default function CompanyProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [signed, setSigned] = useState<{ logo?: string | null; banner?: string | null; office: (string | null)[] }>({ office: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug);
      const query = supabase
        .from("company_public_profiles")
        .select("id, company_name, slug, tagline, logo_url, banner_url, about, website, industry, location, company_size, founded_year, office_photos, tech_stack, benefits, avg_response_days");
      const { data: c, error } = await (isUuid ? query.eq("id", slug) : query.eq("slug", slug)).maybeSingle();

      if (cancelled) return;

      if (error || !c) {
        setLoading(false);
        return;
      }
      setCompany(c as Company);

      const [logo, banner] = await signMany([c.logo_url, c.banner_url]);
      const office = await signMany(((c.office_photos as string[]) || []).slice(0, 5));
      if (!cancelled) setSigned({ logo, banner, office });

      const { data: j } = await supabase
        .from("jobs")
        .select("id, title, location, work_type, experience_min, experience_max, created_at")
        .eq("company_id", c.id)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (!cancelled) {
        setJobs((j || []) as JobRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading company…</div>;
  if (!company) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">Company not found.</p>
      <Button variant="outline" onClick={() => navigate("/jobs")}>Browse jobs</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-56 md:h-72 w-full bg-gradient-to-br from-primary/20 via-secondary to-background overflow-hidden">
        {signed.banner && (
          <img src={signed.banner} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 flex items-center gap-1.5 text-sm rounded-full bg-background/70 backdrop-blur px-3 py-1.5 hover:bg-background">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-16 md:-mt-20 pb-16">
        {/* Header card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-5 md:p-7 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="h-24 w-24 md:h-28 md:w-28 rounded-full bg-secondary border-4 border-background overflow-hidden flex items-center justify-center text-3xl font-bold text-primary shrink-0 -mt-12 md:-mt-16">
              {signed.logo ? (
                <img src={signed.logo} alt={company.company_name} className="h-full w-full object-cover" />
              ) : (
                company.company_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{company.company_name}</h1>
              {company.tagline && <p className="text-muted-foreground mt-1">{company.tagline}</p>}
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                {company.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{company.location}</span>}
                {company.company_size && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{company.company_size}</span>}
                {company.industry && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{company.industry}</span>}
                {company.founded_year && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Founded {company.founded_year}</span>}
                {company.website && (
                  <a href={company.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Globe className="h-3.5 w-3.5" />Website
                  </a>
                )}
              </div>
            </div>
            {company.avg_response_days != null && (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 text-xs font-medium border border-emerald-500/20">
                <Clock className="h-3.5 w-3.5" />
                Usually responds in {company.avg_response_days} day{company.avg_response_days === 1 ? "" : "s"}
              </div>
            )}
          </div>
        </motion.div>

        {/* About */}
        {company.about && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">About {company.company_name}</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{company.about}</p>
          </section>
        )}

        {/* Office photos */}
        {signed.office.filter(Boolean).length > 0 && (
          <section className="mt-6">
            <h2 className="text-lg font-bold text-foreground mb-3">Inside our office</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {signed.office.filter(Boolean).map((url, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden border border-border bg-secondary">
                  <img src={url as string} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tech stack */}
        {(company.tech_stack || []).length > 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">Tech stack</h2>
            <div className="flex flex-wrap gap-2">
              {company.tech_stack!.map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
              ))}
            </div>
          </section>
        )}

        {/* Benefits */}
        {(company.benefits || []).length > 0 && (
          <section className="mt-6 rounded-2xl border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-bold text-foreground mb-3">Benefits & perks</h2>
            <div className="flex flex-wrap gap-2">
              {company.benefits!.map((b) => (
                <span key={b} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground border border-border">{b}</span>
              ))}
            </div>
          </section>
        )}

        {/* Open jobs */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Open roles ({jobs.length})</h2>
            <Link to="/jobs" className="text-sm text-primary hover:underline">All jobs →</Link>
          </div>
          {jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No open roles right now. Check back soon!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((j) => (
                <Link to={`/jobs/${j.id}`} key={j.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground truncate">{j.title}</h3>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
                        {j.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{j.location}</span>}
                        {j.work_type && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{j.work_type}</span>}
                        {(j.experience_min != null || j.experience_max != null) && (
                          <span>{j.experience_min ?? 0}–{j.experience_max ?? "+"} yrs</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
