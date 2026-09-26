import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, EyeOff, Edit3, Sparkles, User, Briefcase, GraduationCap, Code2, Award } from "lucide-react";
import ProfileRing from "@/components/candidate/ProfileRing";
import { motion } from "framer-motion";
import { Loader2 } from "@/components/BrandLoader";

export default function CandidateProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [hrPreview, setHrPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: u } = await supabase.from("users").select("*").eq("user_id", session.user.id).maybeSingle();
      const { data: p } = await supabase.from("candidate_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      setUser(u); setProfile(p);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 text-primary" /></div>;
  }

  const pct = profile?.completion_percentage ?? 0;
  const sections = [
    { id: "basic", icon: User, label: "Basic Info", done: !!user?.full_name && !!user?.phone, tip: "Add a clear photo and headline to stand out." },
    { id: "headline", icon: Sparkles, label: "Headline & About", done: !!profile?.headline && (profile?.about_me?.length || 0) > 50, tip: "Aim for 2–3 sentences capturing your strengths and goals." },
    { id: "experience", icon: Briefcase, label: "Work Experience", done: ((profile?.experiences as any[])?.length || 0) > 0, tip: "Add at least one role with measurable impact." },
    { id: "education", icon: GraduationCap, label: "Education", done: ((profile?.education as any[])?.length || 0) > 0, tip: "Mention your highest qualification." },
    { id: "skills", icon: Code2, label: "Skills", done: ((profile?.skills as any[])?.length || 0) >= 3, tip: "List 6–10 relevant skills for better job matching." },
    { id: "projects", icon: Award, label: "Projects", done: ((profile?.projects as any[])?.length || 0) > 0, tip: "Showcase 2 projects with links/repos to boost match by ~23%." },
  ];

  const editAll = () => navigate("/complete-profile");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/candidate-dashboard")} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-lg font-bold text-foreground">My Profile</h1>
          <Button variant="outline" size="sm" onClick={() => setHrPreview((v) => !v)} className="gap-1">
            {hrPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {hrPreview ? "Exit preview" : "Preview as HR"}
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid md:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="md:col-span-2 space-y-5">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
            <div className="h-20 w-20 rounded-full bg-primary/15 flex items-center justify-center text-2xl font-bold text-primary overflow-hidden">
              {profile?.photo_url ? (
                <img src={profile.photo_url} alt={user?.full_name} className="h-full w-full object-cover" />
              ) : (
                (user?.full_name || "U").charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{user?.full_name}</h2>
              <p className="text-sm text-muted-foreground truncate">{profile?.headline || "Add a headline"}</p>
              {!hrPreview && <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>}
            </div>
            {!hrPreview && (
              <Button size="sm" variant="outline" onClick={editAll} className="gap-1"><Edit3 className="h-3.5 w-3.5" /> Edit</Button>
            )}
          </motion.div>

          {/* About */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">About</h3>
              {!hrPreview && <Button size="sm" variant="ghost" onClick={editAll}>Edit</Button>}
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile?.about_me || "No bio added yet."}</p>
            {!hrPreview && (profile?.about_me?.length || 0) < 50 && (
              <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                💡 Add at least 2–3 sentences to make recruiters stop and read.
              </div>
            )}
          </section>

          {/* Skills */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Skills</h3>
              {!hrPreview && <Button size="sm" variant="ghost" onClick={editAll}>Edit</Button>}
            </div>
            <div className="flex flex-wrap gap-2">
              {((profile?.skills as any[]) || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No skills added.</p>
              ) : (
                (profile.skills as any[]).map((s: any, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {typeof s === "string" ? s : s?.name}
                  </span>
                ))
              )}
            </div>
          </section>

          {/* Experience */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Experience</h3>
              {!hrPreview && <Button size="sm" variant="ghost" onClick={editAll}>Edit</Button>}
            </div>
            {((profile?.experiences as any[]) || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No experience added.</p>
            ) : (
              <div className="space-y-3">
                {(profile.experiences as any[]).map((e: any, i: number) => (
                  <div key={i} className="border-l-2 border-primary/40 pl-3">
                    <p className="text-sm font-semibold text-foreground">{e.role || e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.company} • {e.duration || `${e.start_date || ""} – ${e.end_date || "Present"}`}</p>
                    {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Projects */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Projects</h3>
              {!hrPreview && <Button size="sm" variant="ghost" onClick={editAll}>Edit</Button>}
            </div>
            {((profile?.projects as any[]) || []).length === 0 ? (
              <>
                <p className="text-sm text-muted-foreground">No projects added.</p>
                {!hrPreview && (
                  <div className="mt-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs text-yellow-700 dark:text-yellow-400">
                    💡 Adding 2 projects increases your match score by ~23%.
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                {(profile.projects as any[]).map((p: any, i: number) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-semibold text-foreground">{p.title || p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                    {p.link && <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{p.link}</a>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Strength meter sidebar */}
        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Profile Strength</p>
            <div className="flex justify-center"><ProfileRing percentage={pct} size={140} /></div>
            <p className="mt-3 text-xs text-muted-foreground">
              {pct >= 80 ? "Strong — you're standing out." : pct >= 50 ? "Good — a few sections away from strong." : "Let's get you discovered."}
            </p>
          </div>

          {!hrPreview && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Boost your profile</h4>
              <ul className="space-y-3">
                {sections.map((s) => (
                  <li key={s.id} className="flex items-start gap-2">
                    <s.icon className={`h-4 w-4 mt-0.5 ${s.done ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${s.done ? "text-foreground" : "text-foreground"}`}>{s.label} {s.done && <span className="text-primary">✓</span>}</p>
                      {!s.done && <p className="text-[11px] text-muted-foreground mt-0.5">{s.tip}</p>}
                    </div>
                  </li>
                ))}
              </ul>
              <Button size="sm" onClick={editAll} className="w-full mt-4">Improve Profile</Button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
