import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, CheckCircle2, AlertTriangle, ChevronDown, Target, Lightbulb, RefreshCw } from "lucide-react";
import { Loader2 } from "@/components/BrandLoader";

const STAGE_LABELS: Record<string, string> = {
  aptitude_test: "Aptitude Test",
  video_intro: "Video Introduction",
  technical_round: "Technical Round",
  group_discussion: "Group Discussion",
  hr_interview: "HR Interview",
};

const VALID = new Set(Object.keys(STAGE_LABELS));

const TECH_TOPICS = [
  "DSA (Data Structures & Algorithms)",
  "System Design",
  "Coding (Language-specific)",
  "AWS / Cloud",
  "Cloudflare / Edge",
  "DevOps & CI/CD",
  "Frontend (React)",
  "Backend / APIs",
  "Databases & SQL",
  "Security",
];
const APT_TOPICS = [
  "Mixed (Logical + Quant + Verbal)",
  "Logical Reasoning",
  "Quantitative Aptitude",
  "Verbal / English",
  "Data Interpretation",
  "Puzzles",
];
const LANGUAGES = ["JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "Kotlin", "Swift", "PHP", "Ruby"];
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed (Medium → Hard)"];

function renderRich(text: string) {
  if (!text) return null;
  const parts = String(text).split(/```(\w*)\n?([\s\S]*?)```/g);
  const out: any[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 3 === 0) {
      const t = parts[i];
      if (t?.trim()) {
        out.push(
          <p key={`t${i}`} className="whitespace-pre-wrap font-medium text-foreground">{t}</p>
        );
      }
    } else if (i % 3 === 2) {
      const lang = parts[i - 1] || "";
      out.push(
        <pre key={`c${i}`} className="overflow-x-auto rounded-lg border border-border bg-secondary/60 p-3 text-xs">
          {lang && <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">{lang}</div>}
          <code className="font-mono text-foreground">{parts[i]}</code>
        </pre>
      );
    }
  }
  return out.length ? out : <p className="whitespace-pre-wrap font-medium">{text}</p>;
}

type Question = { number: number; question: string; category: string; difficulty: string; tip: string };
type Rating = { score: number; strengths: string[]; improvements: string[]; better_version: string; verdict: string };

export default function InterviewPrep() {
  const { stage = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const applicationId = params.get("application") || "";

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [job, setJob] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [ratings, setRatings] = useState<Record<number, Rating>>({});
  const [rating, setRating] = useState<Record<number, boolean>>({});
  const [activePractice, setActivePractice] = useState<Record<number, boolean>>({});
  const [candidateSummary, setCandidateSummary] = useState("");

  const needsPicker = stage === "technical_round" || stage === "aptitude_test";
  const [topic, setTopic] = useState<string>(stage === "technical_round" ? TECH_TOPICS[0] : APT_TOPICS[0]);
  const [language, setLanguage] = useState<string>("JavaScript");
  const [difficulty, setDifficulty] = useState<string>("Mixed (Medium → Hard)");
  const [pickerDone, setPickerDone] = useState<boolean>(!needsPicker);

  const stageLabel = STAGE_LABELS[stage] || stage;

  useEffect(() => {
    if (!VALID.has(stage) || !applicationId) {
      toast.error("Invalid prep link");
      navigate("/candidate-dashboard");
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const { data: app } = await supabase
          .from("applications")
          .select("id, candidate_id, jobs(id, title, required_skills, companies(company_name))")
          .eq("id", applicationId)
          .maybeSingle();
        if (!app) throw new Error("Application not found");
        setJob(app.jobs);

        const { data: prof } = await supabase
          .from("candidate_profiles")
          .select("skills, about_me, headline")
          .eq("user_id", app.candidate_id)
          .maybeSingle();
        const skillsArr = Array.isArray(prof?.skills) ? (prof?.skills as any[]).join(", ") : (prof?.skills as any) || "";
        const summary = [prof?.headline, prof?.about_me, skillsArr]
          .filter(Boolean).join(" • ");
        setCandidateSummary(summary);

        if (!needsPicker) await generate(app.jobs, summary);

        // Restore prior session
        const { data: session } = await supabase
          .from("prep_sessions")
          .select("*")
          .eq("application_id", applicationId)
          .eq("stage", stage)
          .maybeSingle();
        if (session) {
          // no-op; counts already aggregate per session
        }
      } catch (e: any) {
        toast.error(e?.message || "Failed to load prep");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, applicationId]);

  const generate = async (j: any, summary: string) => {
    setGenerating(true);
    setQuestions([]);
    setRatings({});
    setAnswers({});
    try {
      const isCoding = topic.toLowerCase().includes("coding") || topic.toLowerCase().includes("dsa");
      const { data, error } = await supabase.functions.invoke("interview-prep", {
        body: {
          action: "generate",
          stage,
          jobTitle: j?.title,
          skills: j?.required_skills,
          candidateSummary: summary,
          topic: needsPicker ? topic : undefined,
          language: needsPicker && stage === "technical_round" && isCoding ? language : undefined,
          difficulty: needsPicker ? difficulty : undefined,
        },
      });
      if (error) throw error;
      setQuestions((data as any)?.questions || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate questions");
    } finally {
      setGenerating(false);
    }
  };

  const startPractice = async () => {
    setPickerDone(true);
    await generate(job, candidateSummary);
  };

  const rateAnswer = async (q: Question) => {
    const ans = answers[q.number]?.trim();
    if (!ans) { toast.error("Type your answer first"); return; }
    setRating((r) => ({ ...r, [q.number]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("interview-prep", {
        body: { action: "rate", stage, question: q.question, answer: ans, jobTitle: job?.title },
      });
      if (error) throw error;
      const r = data as Rating;
      setRatings((prev) => ({ ...prev, [q.number]: r }));
      await persistProgress({ ...ratings, [q.number]: r });
    } catch (e: any) {
      toast.error(e?.message || "Rating failed");
    } finally {
      setRating((r) => ({ ...r, [q.number]: false }));
    }
  };

  const persistProgress = async (allRatings: Record<number, Rating>) => {
    const scores = Object.values(allRatings).map((r) => r.score || 0);
    const answered = scores.length;
    const avg = answered ? scores.reduce((a, b) => a + b, 0) / answered : 0;
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    await supabase.from("prep_sessions").upsert({
      candidate_id: u.user.id,
      application_id: applicationId,
      stage,
      questions_answered: answered,
      total_questions: questions.length || 10,
      average_score: Number(avg.toFixed(2)),
      last_practiced: new Date().toISOString(),
    }, { onConflict: "application_id,stage" });
  };

  const prepPct = useMemo(() => {
    const total = questions.length || 10;
    const answered = Object.keys(ratings).length;
    const scoreAvg = answered ? Object.values(ratings).reduce((a, b) => a + (b.score || 0), 0) / answered : 0;
    // Blend: 60% coverage + 40% quality
    const coverage = (answered / total) * 100;
    const quality = (scoreAvg / 10) * 100;
    return Math.round(coverage * 0.6 + quality * 0.4);
  }, [questions.length, ratings]);

  const catColor = (c: string) => {
    const k = c.toLowerCase();
    if (k.includes("tech") || k.includes("coding") || k.includes("concept")) return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    if (k.includes("behav")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    if (k.includes("situ")) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    if (k.includes("motiv")) return "bg-pink-500/15 text-pink-400 border-pink-500/30";
    if (k.includes("intro")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    return "bg-secondary text-foreground border-border";
  };
  const diffColor = (d: string) => {
    const k = d.toLowerCase();
    if (k === "easy") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (k === "medium") return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-red-500/15 text-red-400 border-red-500/30";
  };
  const scoreColor = (s: number) => s >= 8 ? "text-emerald-400 border-emerald-500/40" : s >= 5 ? "text-amber-400 border-amber-500/40" : "text-red-400 border-red-500/40";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {/* Header */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/15">
                <Target className="mr-1 h-3 w-3" /> Preparing for: {stageLabel}
              </Badge>
              <h1 className="mt-3 text-2xl font-bold">{job?.title || "Job"}</h1>
              <p className="text-sm text-muted-foreground">{job?.companies?.company_name}</p>
            </div>
            <div className="min-w-[200px] text-right">
              <p className="text-xs text-muted-foreground">Prep Score</p>
              <p className="text-3xl font-bold text-yellow-400">{prepPct}%</p>
              <p className="text-xs text-muted-foreground">You are {prepPct}% prepared for this round</p>
            </div>
          </div>
          <Progress value={prepPct} className="mt-4 h-2" />
        </div>

        {/* Topic / Language picker */}
        {needsPicker && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">What do you want to practice?</h2>
              <p className="text-sm text-muted-foreground">
                Pick a topic so AI generates real interview-grade questions — not generic easy ones.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm"
                >
                  {(stage === "technical_round" ? TECH_TOPICS : APT_TOPICS).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              {stage === "technical_round" && (topic.toLowerCase().includes("coding") || topic.toLowerCase().includes("dsa")) && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Coding Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm"
                  >
                    {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm"
                >
                  {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={startPractice} disabled={generating} className="bg-yellow-500 hover:bg-yellow-600 text-black">
                {generating ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>)
                  : pickerDone ? (<><RefreshCw className="mr-2 h-4 w-4" /> Regenerate Questions</>)
                  : (<><Sparkles className="mr-2 h-4 w-4" /> Generate Questions</>)}
              </Button>
              {pickerDone && (
                <Button variant="outline" onClick={() => { setPickerDone(false); setQuestions([]); }}>
                  Change Topic
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="mt-6 space-y-4">
          {needsPicker && !pickerDone && questions.length === 0 && !generating && (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              Choose a topic above and press <span className="text-foreground font-medium">Generate Questions</span> to start.
            </Card>
          )}
          {(loading || generating) && (
            <Card className="p-6 flex items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Generating tailored questions…
            </Card>
          )}
          {!loading && !generating && pickerDone && questions.length === 0 && (
            <Card className="p-6 text-center text-muted-foreground">
              No questions generated. <Button variant="link" onClick={() => generate(job, candidateSummary)}>Retry</Button>
            </Card>
          )}
          {questions.map((q) => {
            const r = ratings[q.number];
            return (
              <Card key={q.number} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`border ${catColor(q.category)}`} variant="outline">{q.category}</Badge>
                  <Badge className={`border ${diffColor(q.difficulty)}`} variant="outline">{q.difficulty}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">Q{q.number}</span>
                </div>
                <div className="mt-3 space-y-2 text-sm leading-relaxed">{renderRich(q.question)}</div>

                <Collapsible className="mt-3">
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-yellow-400 hover:underline">
                    <Lightbulb className="h-3.5 w-3.5" /> Show tip <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-muted-foreground space-y-2">
                    {renderRich(q.tip)}
                  </CollapsibleContent>
                </Collapsible>

                <div className="mt-4">
                  <Button
                    size="sm"
                    variant={activePractice[q.number] ? "secondary" : "outline"}
                    onClick={() => setActivePractice((p) => ({ ...p, [q.number]: !p[q.number] }))}
                  >
                    {activePractice[q.number] ? "Hide Practice" : "Practice"}
                  </Button>
                </div>

                {activePractice[q.number] && (
                  <div className="mt-3 space-y-3">
                    <Textarea
                      placeholder="Type your answer here..."
                      rows={5}
                      value={answers[q.number] || ""}
                      onChange={(e) => setAnswers((a) => ({ ...a, [q.number]: e.target.value }))}
                    />
                    <Button
                      onClick={() => rateAnswer(q)}
                      disabled={rating[q.number]}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {rating[q.number] ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rating…</>)
                        : (<><Sparkles className="mr-2 h-4 w-4" /> Rate My Answer</>)}
                    </Button>

                    {r && (
                      <div className="rounded-xl border border-border bg-secondary/40 p-4">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-bold ${scoreColor(r.score)}`}>
                            {r.score}/10
                          </div>
                          <div>
                            <Badge className={`border ${scoreColor(r.score)}`} variant="outline">{r.verdict}</Badge>
                          </div>
                        </div>
                        {r.strengths?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-emerald-400 mb-1">Strengths</p>
                            <ul className="space-y-1">
                              {r.strengths.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" /> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {r.improvements?.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-amber-400 mb-1">Improvements</p>
                            <ul className="space-y-1">
                              {r.improvements.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm">
                                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {r.better_version && (
                          <Collapsible className="mt-3">
                            <CollapsibleTrigger className="text-xs text-primary hover:underline flex items-center gap-1">
                              Show better version <ChevronDown className="h-3 w-3" />
                            </CollapsibleTrigger>
                            <CollapsibleContent className="mt-2 rounded-md border border-border bg-background p-3 text-sm whitespace-pre-wrap">
                              {r.better_version}
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
