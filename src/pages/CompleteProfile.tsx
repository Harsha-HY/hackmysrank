import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Sparkles, Upload, Check, GraduationCap, Briefcase, Rocket, Linkedin, Search, Info } from "lucide-react";
import { Loader2 } from "@/components/BrandLoader";

type Exp = { company: string; title: string; start: string; end: string; current: boolean; description: string };
type Edu = { college: string; degree: string; field: string; start_year: string; end_year: string; cgpa: string };
type Proj = { name: string; description: string; tech: string; github: string; live: string };
type Cert = { name: string; issuer: string; year: string; path?: string; url?: string };
type Lang = { name: string; level: string };
type CareerStage = "student" | "fresher" | "professional";

const WORK_TYPES = ["Onsite", "Remote", "Hybrid"];

const inputCls = "w-full h-11 rounded-lg px-3 text-white placeholder:text-[#8892a4] focus:outline-none focus:border-[#00e5a0] transition-colors bg-[#121424] border border-[#1a2035]";
const textareaCls = "w-full rounded-lg px-3 py-2 text-white placeholder:text-[#8892a4] focus:outline-none focus:border-[#00e5a0] transition-colors bg-[#121424] border border-[#1a2035]";
const labelCls = "block text-sm font-medium text-[#cbd5e1] mb-1.5";
const sectionCard = "rounded-xl p-5 bg-[#0d0f1a] border border-[#1a2035]";

export const computeCompletion = (
  p: any,
  stage?: "student" | "fresher" | "professional" | null,
): number => {
  const isPro = stage === "professional";
  let score = 0;
  if (p.photo_url) score += 8;
  if (p.full_name) score += 6;
  if (p.headline) score += 6;
  if (p.location) score += 4;
  if (p.phone) score += 4;
  if (p.about_me && p.about_me.length > 50) score += 12;
  // Work experience is only required for working professionals
  if ((p.experiences || []).length > 0 || (stage && !isPro)) score += 14;
  if ((p.education || []).length > 0) score += 10;
  if ((p.skills || []).length >= 3) score += 10;
  // Salary + notice period optional for students/freshers
  if (p.expected_ctc || (stage && !isPro)) score += 6;
  if (p.notice_period_days != null || (stage && !isPro)) score += 4;
  if ((p.work_types || []).length > 0) score += 4;
  if (p.linkedin_url) score += 3;
  if (p.github_url || p.portfolio_url) score += 3;
  if (p.naukri_url || p.indeed_url) score += 2;
  if ((p.projects || []).length > 0) score += 6;
  return Math.min(score, 100);
};

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  // Step 1
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Step 2
  const [experiences, setExperiences] = useState<Exp[]>([]);
  const [education, setEducation] = useState<Edu[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState<string[]>([]);

  // Step 3
  const [currentCtc, setCurrentCtc] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [openToRelocation, setOpenToRelocation] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [naukriUrl, setNaukriUrl] = useState("");
  const [indeedUrl, setIndeedUrl] = useState("");
  const [projects, setProjects] = useState<Proj[]>([]);
  const [certifications, setCertifications] = useState<Cert[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [achievementInput, setAchievementInput] = useState("");
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploadingCertIdx, setUploadingCertIdx] = useState<number | null>(null);

  // Career stage drives which fields are required / shown
  const [careerStage, setCareerStage] = useState<CareerStage | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      setEmail(user.email || "");
      const { data: u } = await supabase.from("users").select("full_name, phone").eq("user_id", user.id).maybeSingle();
      if (u?.full_name) setFullName(u.full_name);
      if (u?.phone) setPhone(u.phone);
      const meta = user.user_metadata || {};
      if (!u?.full_name && meta.full_name) setFullName(meta.full_name);
      if (meta.avatar_url) setPhotoUrl(meta.avatar_url);

      const { data: prof } = await supabase.from("candidate_profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (prof) {
        setPhotoUrl(prof.photo_url || "");
        setFullName(prof.full_name || fullName);
        setHeadline(prof.headline || "");
        setLocation(prof.location || "");
        setPhone(prof.phone || phone);
        setAboutMe(prof.about_me || "");
        setExperiences((prof.experiences as Exp[]) || []);
        setEducation((prof.education as Edu[]) || []);
        setSkills((prof.skills as string[]) || []);
        setCurrentCtc(prof.current_ctc?.toString() || "");
        setExpectedCtc(prof.expected_ctc?.toString() || "");
        setNoticePeriod(prof.notice_period_days?.toString() || "");
        setWorkTypes((prof.work_types as string[]) || []);
        setOpenToRelocation(prof.open_to_relocation || false);
        setGithubUrl(prof.github_url || "");
        setPortfolioUrl(prof.portfolio_url || "");
        setLinkedinUrl(prof.linkedin_url || "");
        setNaukriUrl((prof as any).naukri_url || "");
        setIndeedUrl((prof as any).indeed_url || "");
        setProjects((prof.projects as Proj[]) || []);
        setCertifications(((prof as any).certifications as Cert[]) || []);
        setAchievements(((prof as any).achievements as string[]) || []);
        setLanguages(((prof as any).languages as Lang[]) || []);
      }
      // Restore career stage preference (per-user, no schema change needed)
      const saved = localStorage.getItem(`hz_career_stage_${user.id}`) as CareerStage | null;
      if (saved) setCareerStage(saved);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve photo preview whenever photoUrl changes
  useEffect(() => {
    (async () => {
      if (!photoUrl) { setPhotoPreview(""); return; }
      if (photoUrl.startsWith("http")) { setPhotoPreview(photoUrl); return; }
      const { data } = await supabase.storage.from("photos").createSignedUrl(photoUrl, 3600);
      setPhotoPreview(data?.signedUrl || "");
    })();
  }, [photoUrl]);

  // Persist career stage
  useEffect(() => {
    if (userId && careerStage) localStorage.setItem(`hz_career_stage_${userId}`, careerStage);
  }, [userId, careerStage]);

  // Helper: open a search site prefilled with the candidate's name (useful for
  // freshers and pros alike — they can look themselves up and paste the URL).
  const openProfileSearch = (site: "linkedin" | "naukri" | "indeed" | "google") => {
    const q = encodeURIComponent(fullName || email.split("@")[0] || "");
    const urls: Record<string, string> = {
      linkedin: `https://www.linkedin.com/search/results/people/?keywords=${q}`,
      naukri: `https://www.naukri.com/mnjuser/homepage`,
      indeed: `https://profile.indeed.com/?hl=en`,
      google: `https://www.google.com/search?q=${q}+resume+OR+linkedin+OR+portfolio`,
    };
    window.open(urls[site], "_blank", "noopener,noreferrer");
  };


  const uploadPhoto = async (file: File) => {
    if (!userId) return;
    const ext = file.name.split(".").pop();
    // Storage RLS on photos expects folder prefix = users.id (mapped), NOT auth.uid()
    const { data: me } = await supabase.from("users").select("id").eq("user_id", userId).maybeSingle();
    const folderId = me?.id || userId;
    const path = `${folderId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    const { data: signed } = await supabase.storage.from("photos").createSignedUrl(path, 3600);
    // Store the storage path in DB; display via signed URL.
    setPhotoUrl(path);
    if (signed?.signedUrl) {
      // Optionally show preview using signed URL (state above stores path for persistence)
    }
    toast({ title: "Photo uploaded" });
  };

  const aiAssist = async (type: "about" | "experience" | "skills", payload: any, onResult: (r: any) => void) => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-profile-assist", { body: { type, payload } });
      if (error) throw error;
      onResult(data.result);
    } catch (e: any) {
      toast({ title: "AI failed", description: e?.message || "Try again", variant: "destructive" });
    } finally { setAiLoading(false); }
  };

  const profileData = () => ({
    photo_url: photoUrl, full_name: fullName, headline, location, phone, about_me: aboutMe,
    experiences, education, skills,
    current_ctc: currentCtc ? Number(currentCtc) : null,
    expected_ctc: expectedCtc ? Number(expectedCtc) : null,
    notice_period_days: noticePeriod ? Number(noticePeriod) : null,
    work_types: workTypes, open_to_relocation: openToRelocation,
    github_url: githubUrl, portfolio_url: portfolioUrl, linkedin_url: linkedinUrl,
    naukri_url: naukriUrl, indeed_url: indeedUrl, projects,
    certifications, achievements, languages,
  });

  const uploadCertificate = async (idx: number, file: File) => {
    if (!userId) return;
    setUploadingCertIdx(idx);
    // Storage RLS on bgv-documents expects folder prefix = users.id (mapped), NOT auth.uid()
    const { data: me } = await supabase.from("users").select("id").eq("user_id", userId).maybeSingle();
    const folderId = me?.id || userId;
    const safe = file.name.replace(/[^a-z0-9._-]/gi, "_");
    const path = `${folderId}/certificates/${Date.now()}-${safe}`;
    const { error } = await supabase.storage.from("bgv-documents").upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
    setUploadingCertIdx(null);
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); return; }
    const a = [...certifications];
    a[idx] = { ...a[idx], path, name: a[idx].name || file.name.replace(/\.[^.]+$/, "") };
    setCertifications(a);
    toast({ title: "Certificate uploaded" });
  };

  const save = async (finalize: boolean) => {
    if (!userId) return;
    setLoading(true);
    const data = profileData();
    const completion = computeCompletion(data, careerStage);
    const payload = { user_id: userId, ...data, completion_percentage: completion, profile_completed: finalize };
    const { error } = await supabase.from("candidate_profiles").upsert(payload, { onConflict: "user_id" });
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      setLoading(false); return;
    }
    if (fullName || phone) {
      await supabase.from("users").update({ full_name: fullName, phone }).eq("user_id", userId);
    }
    // Refresh semantic embedding (fire-and-forget)
    import("@/lib/embeddings").then((m) => m.refreshEmbedding("candidate", userId));
    setLoading(false);
    if (finalize) {
      toast({ title: "Profile saved", description: `${completion}% complete` });
      navigate("/candidate-dashboard");
    }
  };

  const next = async () => { await save(false); setStep(step + 1); };

  const completion = computeCompletion(profileData(), careerStage);

  return (
    <div className="min-h-screen bg-[#07080f] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Complete your profile</h1>
          <p className="mt-1 text-sm text-[#8892a4]">Step {step} of 3 — {completion}% complete</p>
          <div className="mt-4 flex gap-2 justify-center">
            {[1,2,3].map(n => (
              <div key={n} className={`h-1.5 w-24 rounded-full ${n <= step ? "bg-[#00e5a0]" : "bg-[#1a2035]"}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className={sectionCard + " space-y-5"}>
            <h2 className="text-xl font-semibold text-white">Basic info</h2>

            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-[#121424] border border-[#1a2035] flex items-center justify-center">
                {photoPreview ? <img src={photoPreview} alt="" className="w-full h-full object-cover" /> : <span className="text-[#8892a4] text-xs">No photo</span>}
              </div>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 h-11 rounded-lg bg-[#121424] border border-[#1a2035] text-white hover:border-[#00e5a0]">
                <Upload className="w-4 h-4" />
                Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) { setPhotoFile(f); uploadPhoto(f); }
                }} />
              </label>
            </div>

            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
            </div>
            <div>
              <label className={labelCls}>Professional Headline</label>
              <p className="mb-2 text-xs text-[#8892a4]">Fill these 3 boxes — we'll combine them into a single line recruiters see.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#8892a4] mb-1">Your Role / Title</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. CS Student / Frontend Dev"
                    value={(headline.split("•")[0] || "").trim()}
                    onChange={e => {
                      const parts = headline.split("•").map(s => s.trim());
                      parts[0] = e.target.value;
                      setHeadline(parts.filter(Boolean).join(" • "));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8892a4] mb-1">College / Company</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. IIT Bombay / Infosys"
                    value={(headline.split("•")[1] || "").trim()}
                    onChange={e => {
                      const parts = headline.split("•").map(s => s.trim());
                      while (parts.length < 2) parts.push("");
                      parts[1] = e.target.value;
                      setHeadline(parts.filter(Boolean).join(" • "));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#8892a4] mb-1">Specialization / Keywords</label>
                  <input
                    className={inputCls}
                    placeholder="e.g. React, Node, seeking SDE roles"
                    value={(headline.split("•")[2] || "").trim()}
                    onChange={e => {
                      const parts = headline.split("•").map(s => s.trim());
                      while (parts.length < 3) parts.push("");
                      parts[2] = e.target.value;
                      setHeadline(parts.filter(Boolean).join(" • "));
                    }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-[#8892a4]">Preview: <span className="text-[#cbd5e1]">{headline || "—"}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Location (city)</label>
                <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="Bengaluru" />
              </div>
              <div>
                <label className={labelCls}>Phone Number</label>
                <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" />
              </div>
            </div>
            <div>
              <label className={labelCls}>LinkedIn / Public Profile</label>
              <input className={inputCls} value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="Paste your LinkedIn / Naukri / Indeed profile URL" />
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => openProfileSearch("linkedin")}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#0a66c2]/15 border border-[#0a66c2]/40 text-[#7fb9ff] hover:bg-[#0a66c2]/25 text-xs">
                  <Linkedin className="w-3.5 h-3.5" /> Find on LinkedIn
                </button>
                <button type="button" onClick={() => openProfileSearch("naukri")}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#ff7555]/15 border border-[#ff7555]/40 text-[#ffb199] hover:bg-[#ff7555]/25 text-xs">
                  <Search className="w-3.5 h-3.5" /> Naukri
                </button>
                <button type="button" onClick={() => openProfileSearch("indeed")}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#2557a7]/15 border border-[#2557a7]/40 text-[#8fb4ff] hover:bg-[#2557a7]/25 text-xs">
                  <Search className="w-3.5 h-3.5" /> Indeed
                </button>
                <button type="button" onClick={() => openProfileSearch("google")}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] hover:bg-[#00e5a0]/20 text-xs">
                  <Search className="w-3.5 h-3.5" /> Google me
                </button>
              </div>
              <p className="mt-2 text-xs text-[#8892a4] inline-flex items-center gap-1">
                <Info className="w-3 h-3" /> Fresher? Search yourself on these sites, create a free profile, then paste the URL. Optional but boosts your ranking.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className={labelCls + " mb-0"}>About Me</label>
                <button
                  type="button" disabled={aiLoading}
                  onClick={() => aiAssist("about", { fullName, headline, location, experiences, skills }, (r) => setAiSuggestion(r))}
                  className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] hover:bg-[#00e5a0]/20">
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI Suggest
                </button>
              </div>
              <textarea rows={5} maxLength={2000} value={aboutMe} onChange={e => setAboutMe(e.target.value)} className={textareaCls} placeholder="Tell us about yourself…" />
              <div className="text-xs text-[#8892a4] mt-1 text-right">{aboutMe.length}/2000</div>
            </div>

            {aiSuggestion && (
              <div className="rounded-lg p-4 bg-[#00e5a0]/5 border border-[#00e5a0]/30">
                <div className="text-xs font-semibold text-[#00e5a0] mb-2">AI Suggestion</div>
                <div className="text-sm text-white whitespace-pre-wrap">{aiSuggestion}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => { setAboutMe(aiSuggestion!); setAiSuggestion(null); }}
                    className="px-3 py-1.5 rounded-md bg-[#00e5a0] text-[#07080f] text-sm font-semibold">Use This</button>
                  <button onClick={() => { setAboutMe(aiSuggestion!); setAiSuggestion(null); }}
                    className="px-3 py-1.5 rounded-md bg-[#121424] border border-[#1a2035] text-white text-sm">Edit</button>
                  <button onClick={() => setAiSuggestion(null)}
                    className="px-3 py-1.5 rounded-md text-[#8892a4] text-sm">Dismiss</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            {/* Career Stage selector — drives what's required below */}
            <div className={sectionCard}>
              <h2 className="text-xl font-semibold text-white">Where are you in your career?</h2>
              <p className="text-sm text-[#8892a4] mt-1">We'll tailor the next steps so you only fill what matters.</p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { id: "student", icon: GraduationCap, label: "Student", hint: "Still studying — focus on projects & internships" },
                  { id: "fresher", icon: Rocket, label: "Recent Graduate", hint: "Graduated, looking for first full-time role" },
                  { id: "professional", icon: Briefcase, label: "Working Professional", hint: "Currently employed or with full-time experience" },
                ] as const).map(opt => {
                  const active = careerStage === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button key={opt.id} type="button" onClick={() => setCareerStage(opt.id)}
                      className={`text-left rounded-lg p-4 border transition-all ${active ? "bg-[#00e5a0]/10 border-[#00e5a0]" : "bg-[#121424] border-[#1a2035] hover:border-[#00e5a0]/50"}`}>
                      <Icon className={`w-5 h-5 mb-2 ${active ? "text-[#00e5a0]" : "text-[#8892a4]"}`} />
                      <div className="text-white font-medium text-sm">{opt.label}</div>
                      <div className="text-xs text-[#8892a4] mt-1">{opt.hint}</div>
                    </button>
                  );
                })}
              </div>
              {careerStage && (
                <div className="mt-4 flex gap-2 items-start rounded-lg p-3 bg-[#0a66c2]/10 border border-[#0a66c2]/30">
                  <Info className="w-4 h-4 text-[#7fb9ff] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#cbd5e1]">
                    {careerStage === "student" && <>You're a <b>Student</b> — work experience is optional. Add any <b>internships, freelance, or part-time</b> roles you've done. If none, leave it empty and focus on <b>Education</b> and <b>Projects</b>.</>}
                    {careerStage === "fresher" && <>You're a <b>Recent Graduate</b> — list your <b>internships, training, or capstone projects</b> in place of full-time work. Highlight technologies you used.</>}
                    {careerStage === "professional" && <>You're a <b>Working Professional</b> — add each role with dates and impact. Use <b>AI Improve</b> to turn duties into result-driven bullet points.</>}
                  </div>
                </div>
              )}
            </div>

            {/* Experience — adapts to career stage */}
            {careerStage && (
              <div className={sectionCard}>
                <div className="flex justify-between items-center mb-1">
                  <h2 className="text-xl font-semibold text-white">
                    {careerStage === "professional" ? "Work Experience" : careerStage === "fresher" ? "Internships & Training" : "Internships / Part-time (optional)"}
                  </h2>
                  <button onClick={() => setExperiences([...experiences, { company:"", title:"", start:"", end:"", current:false, description:"" }])}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#00e5a0] text-[#07080f] text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
                <p className="text-xs text-[#8892a4] mb-3">
                  {careerStage === "student" && "No work experience? That's fine — skip this and add projects instead."}
                  {careerStage === "fresher" && "Add internships, summer training, or contract work. Even a 1-month internship counts."}
                  {careerStage === "professional" && "Add roles latest-first. Include impact: numbers, scale, technologies."}
                </p>
                <div className="space-y-4">
                  {experiences.map((exp, i) => (
                    <div key={i} className="rounded-lg p-4 bg-[#121424] border border-[#1a2035] space-y-3">
                      <div className="flex justify-end">
                        <button onClick={() => setExperiences(experiences.filter((_, j) => j !== i))} className="text-[#8892a4] hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#8892a4] mb-1">
                            {careerStage === "professional" ? "Company Name" : "Company / Organisation"}
                          </label>
                          <input className={inputCls} placeholder={careerStage === "professional" ? "e.g. Infosys" : "e.g. Razorpay (or your college club)"} value={exp.company} onChange={e => { const a=[...experiences]; a[i].company=e.target.value; setExperiences(a); }} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#8892a4] mb-1">
                            {careerStage === "professional" ? "Job Title" : "Your Role"}
                          </label>
                          <input className={inputCls} placeholder={careerStage === "professional" ? "e.g. Software Engineer" : "e.g. Frontend Intern"} value={exp.title} onChange={e => { const a=[...experiences]; a[i].title=e.target.value; setExperiences(a); }} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#8892a4] mb-1">Start Date</label>
                          <input type="month" className={inputCls} value={exp.start} onChange={e => { const a=[...experiences]; a[i].start=e.target.value; setExperiences(a); }} />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-[#8892a4] mb-1">End Date {exp.current && <span className="text-[#00e5a0]">(ongoing)</span>}</label>
                          <input type="month" className={inputCls} disabled={exp.current} value={exp.end} onChange={e => { const a=[...experiences]; a[i].end=e.target.value; setExperiences(a); }} />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 text-sm text-[#cbd5e1]">
                        <input type="checkbox" checked={exp.current} onChange={e => { const a=[...experiences]; a[i].current=e.target.checked; setExperiences(a); }} /> {careerStage === "professional" ? "Currently working here" : "Currently ongoing"}
                      </label>
                      <div>
                        <textarea rows={3} className={textareaCls} placeholder={careerStage === "professional" ? "What did you build or own? Add scale, tech, impact." : "What did you build / learn? Tech used, outcome."} value={exp.description} onChange={e => { const a=[...experiences]; a[i].description=e.target.value; setExperiences(a); }} />
                        <button type="button" disabled={aiLoading || !exp.description}
                          onClick={() => aiAssist("experience", { company: exp.company, title: exp.title, description: exp.description }, (r) => { const a=[...experiences]; a[i].description=r; setExperiences(a); })}
                          className="mt-2 text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] hover:bg-[#00e5a0]/20 disabled:opacity-50">
                          {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI Improve
                        </button>
                      </div>
                    </div>
                  ))}
                  {experiences.length === 0 && (
                    <p className="text-sm text-[#8892a4]">
                      {careerStage === "student" ? "Skip if you don't have any — projects matter more for you." : careerStage === "fresher" ? "No internships yet — add your final-year capstone or open-source work in Projects below." : "No work experience added yet."}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            <div className={sectionCard}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-white">Education</h2>
                <button onClick={() => setEducation([...education, { college:"", degree:"", field:"", start_year:"", end_year:"", cgpa:"" }])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#00e5a0] text-[#07080f] text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="space-y-4">
                {education.map((edu, i) => (
                  <div key={i} className="rounded-lg p-4 bg-[#121424] border border-[#1a2035] space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setEducation(education.filter((_, j) => j !== i))} className="text-[#8892a4] hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input className={inputCls} placeholder="College Name" value={edu.college} onChange={e => { const a=[...education]; a[i].college=e.target.value; setEducation(a); }} />
                      <input className={inputCls} placeholder="Degree (e.g. B.Tech)" value={edu.degree} onChange={e => { const a=[...education]; a[i].degree=e.target.value; setEducation(a); }} />
                      <input className={inputCls} placeholder="Field of Study" value={edu.field} onChange={e => { const a=[...education]; a[i].field=e.target.value; setEducation(a); }} />
                      <input className={inputCls} placeholder="CGPA or %" value={edu.cgpa} onChange={e => { const a=[...education]; a[i].cgpa=e.target.value; setEducation(a); }} />
                      <input className={inputCls} placeholder="Start Year" value={edu.start_year} onChange={e => { const a=[...education]; a[i].start_year=e.target.value; setEducation(a); }} />
                      <input className={inputCls} placeholder="End Year" value={edu.end_year} onChange={e => { const a=[...education]; a[i].end_year=e.target.value; setEducation(a); }} />
                    </div>
                  </div>
                ))}
                {education.length === 0 && <p className="text-sm text-[#8892a4]">No education added yet.</p>}
              </div>
            </div>

            {/* Skills */}
            <div className={sectionCard}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-white">Skills</h2>
                <button type="button" disabled={aiLoading}
                  onClick={() => aiAssist("skills", { headline, experiences, education }, (r: string[]) => setSkillSuggestions(r))}
                  className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] hover:bg-[#00e5a0]/20 disabled:opacity-50">
                  {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI Suggest 5 Skills
                </button>
              </div>
              <input className={inputCls} placeholder="Type a skill and press Enter" value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && skillInput.trim()) {
                    e.preventDefault();
                    if (!skills.includes(skillInput.trim())) setSkills([...skills, skillInput.trim()]);
                    setSkillInput("");
                  }
                }} />
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/30 text-[#00e5a0] text-sm">
                    {s}
                    <button onClick={() => setSkills(skills.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5" /></button>
                  </span>
                ))}
              </div>
              {skillSuggestions.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-[#8892a4] mb-2">Click to add:</div>
                  <div className="flex flex-wrap gap-2">
                    {skillSuggestions.filter(s => !skills.includes(s)).map((s, i) => (
                      <button key={i} onClick={() => { setSkills([...skills, s]); setSkillSuggestions(skillSuggestions.filter(x => x !== s)); }}
                        className="px-3 py-1 rounded-full bg-[#121424] border border-dashed border-[#00e5a0]/40 text-white text-sm hover:bg-[#00e5a0]/10">
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Certifications (LinkedIn-style) */}
            <div className={sectionCard}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-white">Certifications</h2>
                <button onClick={() => setCertifications([...certifications, { name:"", issuer:"", year:"" }])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#00e5a0] text-[#07080f] text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <p className="text-xs text-[#8892a4] mb-3">Upload your certificate as a PDF — HR can view it from your profile.</p>
              <div className="space-y-3">
                {certifications.map((c, i) => (
                  <div key={i} className="rounded-lg p-4 bg-[#121424] border border-[#1a2035] space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setCertifications(certifications.filter((_, j) => j !== i))} className="text-[#8892a4] hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input className={inputCls} placeholder="Certificate name (e.g. AWS SAA)" value={c.name} onChange={e => { const a=[...certifications]; a[i].name=e.target.value; setCertifications(a); }} />
                      <input className={inputCls} placeholder="Issuer (e.g. Amazon)" value={c.issuer} onChange={e => { const a=[...certifications]; a[i].issuer=e.target.value; setCertifications(a); }} />
                      <input className={inputCls} placeholder="Year (e.g. 2024)" value={c.year} onChange={e => { const a=[...certifications]; a[i].year=e.target.value; setCertifications(a); }} />
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-[#0d0f1a] border border-[#1a2035] text-white hover:border-[#00e5a0] text-sm">
                        <Upload className="w-4 h-4" />
                        {uploadingCertIdx === i ? <Loader2 className="w-4 h-4 animate-spin" /> : (c.path ? "Replace PDF" : "Upload PDF")}
                        <input type="file" accept="application/pdf" className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCertificate(i, f); }} />
                      </label>
                      {c.path && <span className="text-xs text-[#00e5a0]">✓ PDF attached</span>}
                    </div>
                  </div>
                ))}
                {certifications.length === 0 && <p className="text-sm text-[#8892a4]">No certifications yet — add one to stand out.</p>}
              </div>
            </div>

            {/* Achievements */}
            <div className={sectionCard}>
              <h2 className="text-xl font-semibold text-white mb-3">Achievements & Honors</h2>
              <p className="text-xs text-[#8892a4] mb-3">Awards, hackathon wins, scholarships, publications — anything you're proud of.</p>
              <input className={inputCls} placeholder="Type an achievement and press Enter" value={achievementInput}
                onChange={e => setAchievementInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && achievementInput.trim()) {
                    e.preventDefault();
                    setAchievements([...achievements, achievementInput.trim()]);
                    setAchievementInput("");
                  }
                }} />
              <div className="mt-3 space-y-2">
                {achievements.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg p-3 bg-[#121424] border border-[#1a2035]">
                    <span className="text-[#00e5a0] mt-0.5">🏆</span>
                    <p className="flex-1 text-sm text-white">{a}</p>
                    <button onClick={() => setAchievements(achievements.filter((_, j) => j !== i))} className="text-[#8892a4] hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div className={sectionCard}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-white">Languages</h2>
                <button onClick={() => setLanguages([...languages, { name:"", level:"Conversational" }])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#00e5a0] text-[#07080f] text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="space-y-2">
                {languages.map((l, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input className={inputCls} placeholder="Language (e.g. English)" value={l.name} onChange={e => { const a=[...languages]; a[i].name=e.target.value; setLanguages(a); }} />
                    <select className={inputCls + " max-w-[200px]"} value={l.level} onChange={e => { const a=[...languages]; a[i].level=e.target.value; setLanguages(a); }}>
                      <option>Basic</option>
                      <option>Conversational</option>
                      <option>Professional</option>
                      <option>Native</option>
                    </select>
                    <button onClick={() => setLanguages(languages.filter((_, j) => j !== i))} className="text-[#8892a4] hover:text-red-400 shrink-0"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {languages.length === 0 && <p className="text-sm text-[#8892a4]">No languages added yet.</p>}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className={sectionCard + " space-y-4"}>
              <h2 className="text-xl font-semibold text-white">Job Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                {careerStage === "professional" && (
                  <div>
                    <label className={labelCls}>Current CTC (LPA)</label>
                    <input className={inputCls} type="number" value={currentCtc} onChange={e => setCurrentCtc(e.target.value)} placeholder="e.g. 6" />
                  </div>
                )}
                <div>
                  <label className={labelCls}>
                    {careerStage === "student" ? "Expected Stipend (₹ / month)" : careerStage === "fresher" ? "Expected CTC (LPA)" : "Expected CTC (LPA)"}
                  </label>
                  <input className={inputCls} type="number" value={expectedCtc} onChange={e => setExpectedCtc(e.target.value)} placeholder={careerStage === "student" ? "e.g. 20000" : "e.g. 12"} />
                </div>
                {careerStage === "professional" && (
                  <div>
                    <label className={labelCls}>Notice Period (days)</label>
                    <input className={inputCls} type="number" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} placeholder="e.g. 30" />
                  </div>
                )}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-white">
                    <input type="checkbox" checked={openToRelocation} onChange={e => setOpenToRelocation(e.target.checked)} />
                    Open to relocation
                  </label>
                </div>
              </div>
              {careerStage !== "professional" && (
                <p className="text-xs text-[#8892a4] -mt-1">As a {careerStage === "student" ? "student" : "recent graduate"}, salary and notice period are optional — recruiters expect you to be flexible.</p>
              )}
              <div>
                <label className={labelCls}>Preferred Work Type</label>
                <div className="flex gap-2">
                  {WORK_TYPES.map(w => {
                    const active = workTypes.includes(w);
                    return (
                      <button key={w} type="button"
                        onClick={() => setWorkTypes(active ? workTypes.filter(x => x !== w) : [...workTypes, w])}
                        className={`px-4 py-2 rounded-lg border text-sm ${active ? "bg-[#00e5a0] text-[#07080f] border-[#00e5a0]" : "bg-[#121424] text-white border-[#1a2035]"}`}>
                        {active && <Check className="w-3.5 h-3.5 inline mr-1" />}{w}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input className={inputCls} placeholder="GitHub URL (great for students & devs)" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} />
                <input className={inputCls} placeholder="Portfolio / Personal site URL" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} />
                <input className={inputCls} placeholder="LinkedIn URL" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} />
                <input className={inputCls} placeholder="Naukri profile URL" value={naukriUrl} onChange={e => setNaukriUrl(e.target.value)} />
                <input className={inputCls} placeholder="Indeed profile URL" value={indeedUrl} onChange={e => setIndeedUrl(e.target.value)} />
              </div>
            </div>

            <div className={sectionCard}>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-semibold text-white">Projects</h2>
                <button onClick={() => setProjects([...projects, { name:"", description:"", tech:"", github:"", live:"" }])}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#00e5a0] text-[#07080f] text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="space-y-4">
                {projects.map((p, i) => (
                  <div key={i} className="rounded-lg p-4 bg-[#121424] border border-[#1a2035] space-y-3">
                    <div className="flex justify-end">
                      <button onClick={() => setProjects(projects.filter((_, j) => j !== i))} className="text-[#8892a4] hover:text-red-400"><X className="w-4 h-4" /></button>
                    </div>
                    <input className={inputCls} placeholder="Project Name" value={p.name} onChange={e => { const a=[...projects]; a[i].name=e.target.value; setProjects(a); }} />
                    <textarea rows={2} className={textareaCls} placeholder="Description" value={p.description} onChange={e => { const a=[...projects]; a[i].description=e.target.value; setProjects(a); }} />
                    <input className={inputCls} placeholder="Tech Stack (comma separated)" value={p.tech} onChange={e => { const a=[...projects]; a[i].tech=e.target.value; setProjects(a); }} />
                    <div className="grid grid-cols-2 gap-3">
                      <input className={inputCls} placeholder="GitHub Link" value={p.github} onChange={e => { const a=[...projects]; a[i].github=e.target.value; setProjects(a); }} />
                      <input className={inputCls} placeholder="Live Link" value={p.live} onChange={e => { const a=[...projects]; a[i].live=e.target.value; setProjects(a); }} />
                    </div>
                  </div>
                ))}
                {projects.length === 0 && <p className="text-sm text-[#8892a4]">No projects added yet.</p>}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <button disabled={step === 1 || loading} onClick={() => setStep(step - 1)}
            className="px-5 h-11 rounded-lg bg-[#121424] border border-[#1a2035] text-white disabled:opacity-40">Back</button>
          <div className="flex gap-2">
            <button
              onClick={async () => { await save(false); navigate("/candidate-dashboard"); }}
              disabled={loading}
              title="Skip for now — you can complete your profile anytime from your dashboard"
              className="px-5 h-11 rounded-lg bg-transparent border border-[#1a2035] text-[#8892a4] hover:text-white hover:border-[#00e5a0]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Do it later"}
            </button>
            <button onClick={() => save(false)} disabled={loading} className="px-5 h-11 rounded-lg bg-[#121424] border border-[#1a2035] text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & Exit"}
            </button>
            {step < 3 ? (
              <button onClick={next} disabled={loading} className="px-6 h-11 rounded-lg bg-[#00e5a0] text-[#07080f] font-semibold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
              </button>
            ) : (
              <button onClick={() => save(true)} disabled={loading} className="px-6 h-11 rounded-lg bg-[#00e5a0] text-[#07080f] font-semibold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finish"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
