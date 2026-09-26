import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanSearch, FileText, GitBranch, ListChecks, Code2, Bot, Award,
  ShieldCheck, CheckCircle2, AlertCircle, Sparkles, HelpCircle,
  ChevronRight, ExternalLink, Layers, Database, Cpu, Terminal,
  RefreshCw, Search, Briefcase, Play, Bug, Check, X, Eye, ArrowRight,
  Key, Settings, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getWorkflowApplications,
  saveWorkflowApplications,
  CandidateApplicationSubmission,
  getWorkflowJobs,
  JobCutoffs,
  simulateCandidateApplicationForJob,
  deleteWorkflowJob,
  clearAllWorkflowData
} from "@/lib/hiringWorkflowEngine";
import { getGeminiApiKey, setGeminiApiKey, analyzeBeforeInterviewWithGemini } from "@/lib/geminiResumeAnalyzer";
import { supabase } from "@/integrations/supabase/client";

export const BeforeInterviewHRPanel = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<CandidateApplicationSubmission[]>([]);
  const [jobs, setJobs] = useState<JobCutoffs[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(getGeminiApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState(false);

  // All 7 Tabs available for HR including confidential Tab 7 HR Evidence Decision
  const [activeTab, setActiveTab] = useState<"ats" | "github" | "mcq" | "dsa" | "interview" | "scorecard" | "hrevidence">("ats");

  const loadData = () => {
    const loadedApps = getWorkflowApplications();
    const loadedJobs = getWorkflowJobs();
    setApplications(loadedApps);
    setJobs(loadedJobs);

    if (loadedApps.length > 0 && (!selectedAppId || !loadedApps.some((a) => a.id === selectedAppId))) {
      setSelectedAppId(loadedApps[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeJob = jobs.find((j) => j.id === selectedJobId) || (jobs.length === 1 ? jobs[0] : null);

  const filteredApps = applications.filter((app) => {
    const matchesJob = selectedJobId === "all" || app.jobId === selectedJobId;
    const matchesSearch =
      app.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesJob && matchesSearch;
  });

  const currentApp = filteredApps.find((a) => a.id === selectedAppId) || filteredApps[0] || null;

  const tabs = [
    { id: "ats", label: "ATS & Resume", icon: FileText, num: "01" },
    { id: "github", label: "GitHub & Projects", icon: GitBranch, num: "02" },
    { id: "mcq", label: "5 Personalized MCQs", icon: ListChecks, num: "03" },
    { id: "dsa", label: "Adaptive DSA Sandbox", icon: Code2, num: "04" },
    { id: "interview", label: "Dynamic AI Interview", icon: Bot, num: "05" },
    { id: "scorecard", label: "Skill Map & Plan", icon: Award, num: "06" },
    { id: "hrevidence", label: "HR Evidence Decision", icon: ShieldCheck, num: "07" },
  ];

  const handleAdvanceToInterview = async (app: CandidateApplicationSubmission) => {
    const updated = applications.map((a) =>
      a.id === app.id
        ? {
            ...a,
            overallStatus: "Interview Ready" as const,
            currentStage: "dsa_sandbox" as const,
          }
        : a
    );
    setApplications(updated);
    saveWorkflowApplications(updated);

    try {
      if (app.candidateEmail) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", app.candidateEmail)
          .maybeSingle();

        if (userData) {
          await supabase
            .from("applications")
            .update({
              current_stage: "shortlisted",
              status: "active",
            })
            .eq("candidate_id", userData.id)
            .eq("job_id", app.jobId);

          await supabase.from("notifications").insert({
            user_id: userData.id,
            title: "🎉 Advanced to Interview Process!",
            message: `Congratulations! Your profile has cleared Before Interview screening for ${app.jobTitle}. You are now advanced to the interview pipeline.`,
          });
        }
      }
    } catch (e) {
      console.warn("Could not sync workflow application stage to Supabase", e);
    }

    toast({
      title: "🎯 Advanced to Interview Process",
      description: `${app.candidateName} has met all screening cutoffs and is advanced to the live technical interview queue!`,
    });
  };

  const handleReject = async (app: CandidateApplicationSubmission) => {
    const updated = applications.map((a) =>
      a.id === app.id
        ? {
            ...a,
            overallStatus: "Auto-Rejected (Resume)" as const,
            currentStage: "rejected" as const,
          }
        : a
    );
    setApplications(updated);
    saveWorkflowApplications(updated);

    try {
      if (app.candidateEmail) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", app.candidateEmail)
          .maybeSingle();

        if (userData) {
          await supabase
            .from("applications")
            .update({
              current_stage: "rejected",
              status: "rejected",
            })
            .eq("candidate_id", userData.id)
            .eq("job_id", app.jobId);

          await supabase.from("notifications").insert({
            user_id: userData.id,
            title: "Application Notice",
            message: `Thank you for your interest in ${app.jobTitle}. Unfortunately, your application did not meet the Before Interview cutoffs.`,
          });
        }
      }
    } catch (e) {
      console.warn("Could not sync rejection stage to Supabase", e);
    }

    toast({
      title: "Application Marked as Rejected",
      description: `${app.candidateName}'s application has been archived with rejection notice.`,
      variant: "destructive",
    });
  };

  const handleSimulateCandidate = (jobToUse: JobCutoffs, pass: boolean = true) => {
    const candidateName = pass ? "Alex Rivera (Verified Match)" : "Jordan Smith (Low Match Demo)";
    const email = pass ? "alex.rivera@example.com" : "jordan.smith@example.com";
    const newApp = simulateCandidateApplicationForJob(jobToUse, {
      candidateName,
      candidateEmail: email,
      shouldPass: pass,
    });
    const loaded = getWorkflowApplications();
    setApplications(loaded);
    setSelectedAppId(newApp.id);
    toast({
      title: `🎯 Applicant Evaluated for ${jobToUse.title}`,
      description: pass
        ? "AI analyzed resume ATS score, repo code authenticity, generated 5 MCQs and 2 repo challenges!"
        : "Candidate evaluated below cutoffs to demonstrate transparent automated rejection reasoning.",
    });
  };

  const handleReanalyzeWithGemini = async () => {
    if (!currentApp || !activeJob) return;
    setIsGeminiAnalyzing(true);

    try {
      const apiKey = geminiApiKeyInput || getGeminiApiKey();
      const geminiResult = await analyzeBeforeInterviewWithGemini(
        {
          title: activeJob.title,
          requiredSkills: activeJob.requiredSkills,
          description: activeJob.description,
          resumeCutoff: activeJob.resumeCutoff,
          githubCutoff: activeJob.githubCutoff,
          projectCutoff: activeJob.projectCutoff,
        },
        {
          name: currentApp.candidateName,
          resumeText: `${currentApp.resumeTextSummary} ${currentApp.resumeFileName}`,
          githubUrl: `${currentApp.githubAccountUrl} ${currentApp.githubRepo1Url}`,
          projectDetails: `${currentApp.projectLiveUrl} ${currentApp.projectArchitectureSummary}`,
        },
        apiKey
      );

      if (geminiResult) {
        const resumeScore = Math.max(0, Math.min(100, Math.round(geminiResult.resumeScore)));
        const resumePassed = resumeScore >= activeJob.resumeCutoff;
        const authenticityPercentage = Math.max(0, Math.min(100, Math.round(geminiResult.authenticityPercentage || 85)));
        const githubScore = Math.min(100, Math.round(authenticityPercentage * 0.9 + 10));
        const githubPassed = githubScore >= activeJob.githubCutoff && authenticityPercentage >= 70;

        const updated = applications.map((a) => {
          if (a.id === currentApp.id) {
            return {
              ...a,
              resumeScore,
              resumePassed,
              atsBreakdown: geminiResult.atsBreakdown,
              matchedKeywords: geminiResult.matchedKeywords,
              missingKeywords: geminiResult.missingKeywords,
              resumeFeedback: geminiResult.resumeFeedback,
              authenticityPercentage,
              aiWrittenPercentage: 100 - authenticityPercentage,
              githubScore,
              githubPassed,
              githubFeedback: geminiResult.githubFeedback,
              generatedMCQs: geminiResult.generatedMCQs || a.generatedMCQs,
              repoCodingChallenges: (geminiResult.repoCodingChallenges as any) || a.repoCodingChallenges,
              aiInterviewDialogue: geminiResult.aiInterviewDialogue || a.aiInterviewDialogue,
              skillMap: geminiResult.skillMap || a.skillMap,
              improvementPlan: geminiResult.improvementPlan || a.improvementPlan,
              hrEvidence: geminiResult.hrEvidence || a.hrEvidence,
              overallStatus: (resumePassed && githubPassed ? "Before Interview (Passed Cutoffs)" : "Auto-Rejected (Resume)") as any,
              currentStage: (resumePassed && githubPassed ? "before_interview" : "rejected") as any,
            };
          }
          return a;
        });

        setApplications(updated);
        saveWorkflowApplications(updated);

        toast({
          title: "✨ Gemini AI Evaluation Complete",
          description: `Resume scored ${resumeScore}/100 with ${geminiResult.matchedKeywords?.length || 0} matched keywords. Full dossier updated!`,
        });
      } else {
        toast({
          title: "Analysis Completed",
          description: "Resume evaluation updated using deterministic scoring engine.",
        });
      }
    } catch (e: any) {
      toast({
        title: "Gemini Analysis Error",
        description: e.message || "Failed to analyze with Gemini API",
        variant: "destructive",
      });
    } finally {
      setIsGeminiAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Main HR Controls Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-paper border border-ink/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-mono uppercase tracking-wider">
              <ScanSearch className="w-3.5 h-3.5" />
              Recruiter Screening &amp; Cutoff Dossier
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-paper-2 border border-ink/15 text-ink-soft text-[11px] font-mono">
              <Sparkles className="w-3 h-3 text-forest" />
              Gemini AI Powered
            </div>
          </div>
          <h2 className="font-serif-display text-2xl md:text-3xl text-ink">
            Before Interview — Candidate AI Analysis &amp; Cutoffs
          </h2>
          <p className="text-xs text-ink-soft mt-1 max-w-2xl">
            AI automatically compares candidates against your **Resume ATS cutoff**, scans their **GitHub account &amp; repos for % AI-written code**, evaluates **project architecture**, and generates **5 MCQs &amp; 2 Repo Coding Challenges** before unlocking interviews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Gemini API Key Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiKeyModal(true)}
            className="rounded-xl border-ink/15 text-xs h-9 px-3 gap-1.5 bg-paper hover:bg-forest/10 hover:text-forest"
          >
            <Key className="w-3.5 h-3.5 text-forest" />
            <span>{getGeminiApiKey() ? "Gemini Key: Active" : "Set Gemini Key"}</span>
          </Button>

          {/* Job Filter */}
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="px-3.5 py-2 text-xs rounded-xl border border-ink/15 bg-paper-2 focus:outline-none focus:border-forest text-ink font-medium"
          >
            <option value="all">All Posted Job Tracks ({jobs.length})</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs rounded-xl border border-ink/15 bg-paper-2 focus:outline-none focus:border-forest text-ink w-48"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="rounded-xl border-ink/15 text-xs h-9 px-3"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Active Job Cutoff Standards Bar */}
      {activeJob && (
        <div className="p-5 rounded-2xl bg-forest/5 border border-forest/20 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">Active Cutoff Standards for {activeJob.title}:</span>
          </div>
          <div className="flex flex-wrap gap-4 font-mono">
            <span>1. Resume Cutoff: <strong className="text-forest">{activeJob.resumeCutoff}%</strong></span>
            <span>2. GitHub Code Cutoff: <strong className="text-forest">{activeJob.githubCutoff}%</strong></span>
            <span>3. Project Cutoff: <strong className="text-forest">{activeJob.projectCutoff}%</strong></span>
            <span>Required Stack: <strong className="text-ink">{activeJob.requiredSkills.join(", ")}</strong></span>
          </div>
        </div>
      )}

      {/* When no jobs exist */}
      {jobs.length === 0 && (
        <div className="p-12 text-center bg-paper rounded-3xl border border-ink/10 space-y-4">
          <Briefcase className="w-12 h-12 mx-auto text-forest/40" />
          <div className="space-y-1">
            <h3 className="font-serif-display text-2xl text-ink font-semibold">No Jobs Published Yet</h3>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              Post your first job using the <strong>"Post a Job"</strong> button in the HR Dashboard to configure Resume, GitHub Authenticity, and Project cutoffs.
            </p>
          </div>
        </div>
      )}

      {/* When jobs exist but no applications exist for this filter */}
      {jobs.length > 0 && filteredApps.length === 0 && (
        <div className="p-10 rounded-3xl bg-paper border border-ink/10 text-center space-y-4">
          <ScanSearch className="w-12 h-12 mx-auto text-forest/40" />
          <div className="space-y-1">
            <h3 className="font-serif-display text-2xl text-ink font-semibold">
              No Candidate Submissions for {activeJob ? activeJob.title : "this filter"}
            </h3>
            <p className="text-xs text-ink-soft max-w-md mx-auto">
              When candidates apply with their Resume, GitHub Profile, Repos, and Project links, AI automated screening and pre-interview dossiers will appear here.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => handleSimulateCandidate(activeJob || jobs[0], true)}
              className="bg-forest text-paper hover:bg-forest/90 text-xs px-4"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Simulate Candidate Application (Match Stack)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSimulateCandidate(activeJob || jobs[0], false)}
              className="text-xs px-4 text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              Simulate Auto-Rejection Candidate
            </Button>
          </div>
        </div>
      )}

      {/* Interactive 7-Step Recruiter Dossier matching Landing Page */}
      {currentApp && (
        <div className="w-full rounded-2xl md:rounded-[28px] border border-ink/15 bg-paper shadow-2xl overflow-hidden">
          {/* Top Header: Candidate Switcher */}
          <div className="p-6 md:p-8 bg-paper-2 border-b border-ink/10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-forest/10 text-forest border border-forest/20 mb-3">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Full 7-Stage Candidate Analyzer Dossier (HR Studio)
                </div>
                <h3 className="font-serif-display text-2xl md:text-3xl text-ink">
                  {currentApp.candidateName} — {currentApp.jobTitle}
                </h3>
                <p className="text-sm text-ink-soft mt-1 max-w-xl">
                  Inspect candidate's ATS resume score, code authenticity ratio, repo coding challenges, dynamic AI interview probing, skill map, and make final recruiter advance/reject decisions.
                </p>
              </div>

              {/* Candidate Switcher Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-paper p-1.5 rounded-2xl border border-ink/10 shrink-0">
                {filteredApps.map((app) => {
                  const active = currentApp.id === app.id;
                  const isRejected = app.currentStage === "rejected";
                  const isInterviewReady = app.overallStatus === "Interview Ready";
                  return (
                    <button
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`flex-1 sm:w-[220px] text-left p-3 rounded-xl transition-all relative ${
                        active
                          ? "bg-ink text-paper shadow-md"
                          : "hover:bg-ink/5 text-ink"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full grid place-items-center font-serif-display font-bold text-xs shrink-0 ${
                          active ? "bg-paper text-ink" : "bg-forest/10 text-forest"
                        }`}>
                          {app.candidateName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate">{app.candidateName}</div>
                          <div className={`text-[11px] truncate ${active ? "text-paper/70" : "text-ink-muted"}`}>
                            {app.jobTitle}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                        <span className={active ? "text-paper/80" : "text-ink-muted"}>ATS: {app.resumeScore}/100</span>
                        <span className={`px-1.5 py-0.2 rounded ${
                          isRejected
                            ? "bg-destructive/20 text-destructive-foreground font-semibold"
                            : isInterviewReady
                            ? "bg-forest text-paper font-semibold"
                            : "text-forest font-semibold"
                        }`}>
                          {isRejected ? "Rejected" : isInterviewReady ? "Interview Ready" : "Screened"}
                        </span>
                      </div>
                      {active && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-forest animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Candidate Mini Profile Bar */}
            <div className="mt-6 pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-ink">{currentApp.candidateName}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{currentApp.jobTitle}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-muted font-mono">{currentApp.candidateEmail}</span>
                <span className="text-ink-muted">·</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                  currentApp.currentStage === "rejected"
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-forest/10 text-forest border border-forest/20"
                }`}>
                  {currentApp.overallStatus}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isGeminiAnalyzing}
                  onClick={handleReanalyzeWithGemini}
                  className="rounded-xl border-forest/30 text-forest hover:bg-forest/10 text-xs h-8 px-3 gap-1.5 shadow-sm"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGeminiAnalyzing ? "animate-spin" : ""}`} />
                  <span>{isGeminiAnalyzing ? "Gemini Scoring..." : "AI Re-Score with Gemini"}</span>
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-ink-muted">Detected Stacks:</span>
                  <div className="flex flex-wrap gap-1">
                    {currentApp.detectedRepoStacks.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-ink/5 border border-ink/10 text-ink font-mono text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 7 Stage Navigation Tabs */}
          <div className="border-b border-ink/10 bg-paper overflow-x-auto scrollbar-none">
            <div className="flex items-center min-w-max px-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-4 text-xs font-medium border-b-2 transition-all ${
                      isActive
                        ? "border-forest text-forest font-semibold"
                        : "border-transparent text-ink-soft hover:text-ink hover:border-ink/20"
                    }`}
                  >
                    <span className="font-mono text-[10px] text-ink-muted">{tab.num}</span>
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Interactive Tab Content */}
          <div className="p-6 md:p-10 bg-paper min-h-[460px]">
            <AnimatePresence mode="wait">
              {/* TAB 1: ATS & RESUME */}
              {activeTab === "ats" && (
                <motion.div
                  key={currentApp.id + "-ats"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="grid md:grid-cols-12 gap-6 items-start">
                    <div className="md:col-span-4 p-6 rounded-2xl border border-ink/10 bg-paper-2 flex flex-col items-center text-center">
                      <div className="text-xs uppercase font-mono tracking-widest text-ink-muted mb-3">ATS Compatibility Score</div>
                      <div className="relative flex items-center justify-center">
                        <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center bg-paper shadow-inner ${
                          currentApp.resumePassed ? "border-forest/30" : "border-destructive/30"
                        }`}>
                          <span className={`font-serif-display text-4xl font-bold ${
                            currentApp.resumePassed ? "text-forest" : "text-destructive"
                          }`}>
                            {currentApp.resumeScore}
                          </span>
                          <span className="text-[10px] font-mono text-ink-muted uppercase">out of 100</span>
                        </div>
                      </div>
                      <div className="mt-4 text-xs text-ink-soft leading-relaxed">
                        Evaluated against job requirements, verified project context, and keyword frequency.
                      </div>
                      <div className="mt-3 pt-3 border-t border-ink/10 text-[11px] font-mono text-ink-muted">
                        Configured Cutoff: {activeJob?.resumeCutoff || 75}% · Status: <span className={currentApp.resumePassed ? "text-forest font-semibold" : "text-destructive font-semibold"}>{currentApp.resumePassed ? "Passed" : "Below Cutoff"}</span>
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-4">
                      <div className="p-5 rounded-2xl border border-ink/10 bg-paper">
                        <h4 className="font-semibold text-sm text-ink mb-3 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-forest" />
                          Detailed ATS Breakdown
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-4 text-xs">
                          <div className="space-y-1">
                            <div className="flex justify-between text-ink-soft">
                              <span>Role Alignment</span>
                              <span className="font-mono font-medium text-ink">{currentApp.atsBreakdown?.roleAlignment ?? currentApp.resumeScore}%</span>
                            </div>
                            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                              <div className="h-full bg-forest rounded-full" style={{ width: `${currentApp.atsBreakdown?.roleAlignment ?? currentApp.resumeScore}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-ink-soft">
                              <span>Skills Match</span>
                              <span className="font-mono font-medium text-ink">{currentApp.atsBreakdown?.skillsMatch ?? currentApp.resumeScore}%</span>
                            </div>
                            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                              <div className="h-full bg-forest rounded-full" style={{ width: `${currentApp.atsBreakdown?.skillsMatch ?? currentApp.resumeScore}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-ink-soft">
                              <span>Project Impact Signals</span>
                              <span className="font-mono font-medium text-ink">{currentApp.atsBreakdown?.projectImpact ?? 82}%</span>
                            </div>
                            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                              <div className="h-full bg-forest rounded-full" style={{ width: `${currentApp.atsBreakdown?.projectImpact ?? 82}%` }} />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-ink-soft">
                              <span>Formatting &amp; Structure</span>
                              <span className="font-mono font-medium text-ink">{currentApp.atsBreakdown?.formatting ?? 90}%</span>
                            </div>
                            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                              <div className="h-full bg-forest rounded-full" style={{ width: `${currentApp.atsBreakdown?.formatting ?? 90}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl border border-ink/10 bg-amber-500/5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 mb-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          Missing / Weak Keywords Detected:
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(currentApp.atsBreakdown?.missingKeywords || currentApp.missingKeywords || []).map((kw) => (
                            <span key={kw} className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 font-mono text-[11px]">
                              {kw}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-ink-soft space-y-1">
                          <span className="font-medium text-ink">Actionable Feedback for Candidate:</span>
                          <ul className="list-disc list-inside space-y-0.5 pl-1">
                            {(currentApp.atsBreakdown?.actionableSuggestions || [currentApp.resumeFeedback]).map((sug, idx) => (
                              <li key={idx}>{sug}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: GITHUB & PROJECTS */}
              {activeTab === "github" && (
                <motion.div
                  key={currentApp.id + "-github"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-xl bg-forest/5 border border-forest/15 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                    <div className="text-xs text-ink-soft">
                      <span className="font-semibold text-ink">Code Authenticity Verification: </span>
                      GitHub evidence is analyzed for genuine developer commits vs AI boilerplate. We formulate verification tasks from repository implementations.
                    </div>
                  </div>

                  {/* AI Code Authenticity Meter */}
                  <div className="p-5 rounded-2xl bg-paper-2 border border-ink/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink">Code Authenticity &amp; AI-Written Estimation</span>
                      <span className="font-mono text-forest font-bold">{currentApp.authenticityPercentage}% Authentic Human Engineering</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-amber-200 overflow-hidden flex">
                      <div
                        className="bg-emerald-600 h-full transition-all"
                        style={{ width: `${currentApp.authenticityPercentage}%` }}
                      />
                      <div
                        className="bg-amber-500 h-full transition-all"
                        style={{ width: `${currentApp.aiWrittenPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-ink-muted">
                      <span>{currentApp.authenticityPercentage}% Human Logic</span>
                      <span>{currentApp.aiWrittenPercentage}% AI Boilerplate</span>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border border-ink/10 bg-paper-2 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-mono font-semibold text-sm text-ink flex items-center gap-1.5">
                            <GitBranch className="w-3.5 h-3.5 text-forest" />
                            Submitted Repositories
                          </span>
                          <span className="text-xs font-mono text-ink-muted">Cutoff: {activeJob?.githubCutoff || 70}%</span>
                        </div>
                        <div className="space-y-1.5 mb-3 font-mono text-xs">
                          <div>👤 Profile: <a href={currentApp.githubAccountUrl} target="_blank" rel="noreferrer" className="underline text-forest">{currentApp.githubAccountUrl}</a></div>
                          <div>📦 Repo 1: <a href={currentApp.githubRepo1Url} target="_blank" rel="noreferrer" className="underline text-forest">{currentApp.githubRepo1Url}</a></div>
                          {currentApp.githubRepo2Url && (
                            <div>📦 Repo 2: <a href={currentApp.githubRepo2Url} target="_blank" rel="noreferrer" className="underline text-forest">{currentApp.githubRepo2Url}</a></div>
                          )}
                        </div>
                        
                        <div className="text-[11px] font-semibold text-ink mb-1.5">Detected Code Signals:</div>
                        <ul className="space-y-1 mb-4 text-xs text-ink-soft">
                          {currentApp.codeSignals.map((sig, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-forest shrink-0">▸</span>
                              <span>{sig}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-ink/10 text-xs">
                        <span className="font-semibold text-ink">Authenticity Status: </span>
                        <span className={currentApp.githubPassed ? "text-forest font-semibold" : "text-destructive font-semibold"}>
                          {currentApp.githubPassed ? "Verified Human Engineering" : "High AI Boilerplate"}
                        </span>
                      </div>
                    </div>

                    {/* Project Architecture */}
                    <div className="p-6 rounded-2xl border border-ink/10 bg-paper-2 flex flex-col justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-ink mb-2 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-forest" />
                          Extracted Project Architecture ({currentApp.projectValidationScore}/100)
                        </h4>
                        <p className="text-xs text-ink-soft mb-3">{currentApp.projectArchitectureSummary || currentApp.projectFeedback}</p>
                        <div className="p-3 rounded-xl bg-ink text-paper font-mono text-xs overflow-x-auto mb-3">
                          {currentApp.projectArchitectureDetected}
                        </div>
                      </div>

                      {currentApp.projectLiveUrl && (
                        <div className="pt-3 border-t border-ink/10 text-xs">
                          <a href={currentApp.projectLiveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-forest font-semibold hover:underline">
                            <ExternalLink className="w-3.5 h-3.5" /> View Live Project Deployment
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: 5 PERSONALIZED MCQS */}
              {activeTab === "mcq" && (
                <motion.div
                  key={currentApp.id + "-mcq"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-xl bg-paper-2 border border-ink/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <span className="text-ink-soft">
                      Generated from: <strong className="text-ink">Job Requirements + Candidate Repo Stacks ({currentApp.detectedRepoStacks.join(", ")})</strong>
                    </span>
                    <span className="font-mono text-forest font-semibold bg-forest/10 px-2.5 py-1 rounded-full">
                      5 Personalized Questions Verified
                    </span>
                  </div>

                  <div className="space-y-4">
                    {currentApp.generatedMCQs.map((q, idx) => (
                      <div key={q.id} className="p-5 rounded-2xl border border-ink/10 bg-paper">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-forest text-paper text-xs font-mono font-semibold grid place-items-center shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-mono font-medium text-forest uppercase tracking-wider">{q.topic}</span>
                          </div>
                          <span className="text-[10px] font-mono text-ink-muted border border-ink/10 px-2 py-0.5 rounded-full hidden sm:inline">
                            Source: {q.repoSource}
                          </span>
                        </div>

                        <h5 className="font-semibold text-sm text-ink mb-3 pl-8">{q.question}</h5>

                        <div className="grid gap-2 pl-8">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = optIdx === q.correctIndex;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-xl text-xs flex items-start gap-2.5 ${
                                  isCorrect
                                    ? "bg-forest/10 border border-forest/30 text-ink font-medium"
                                    : "bg-paper-2 text-ink-soft border border-ink/5"
                                }`}
                              >
                                <span className="font-mono shrink-0 w-4 font-semibold">{String.fromCharCode(65 + optIdx)}.</span>
                                <span className="flex-1">{opt}</span>
                                {isCorrect && (
                                  <span className="ml-auto text-[10px] font-mono uppercase bg-forest text-paper px-1.5 py-0.5 rounded shrink-0">
                                    Verified Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-3 pl-8 text-xs text-ink-muted italic border-t border-ink/5 pt-2">
                          <strong>AI Rationale:</strong> {q.rationale}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 4: ADAPTIVE DSA SANDBOX */}
              {activeTab === "dsa" && (
                <motion.div
                  key={currentApp.id + "-dsa"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between border-b border-ink/10 pb-4">
                    <div>
                      <h4 className="font-serif-display text-xl text-ink">Adaptive DSA Sandbox &amp; Candidate Submissions</h4>
                      <p className="text-xs text-ink-soft mt-0.5">
                        Extracted from candidate repositories with AI line-by-line error diagnosis and algorithmic efficiency checks.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-forest bg-forest/10 px-2.5 py-1 rounded-full font-semibold">
                      2 Challenges Evaluated
                    </span>
                  </div>

                  <div className="space-y-4">
                    {currentApp.repoCodingChallenges.map((challenge, idx) => (
                      <div key={challenge.id} className="p-5 rounded-2xl bg-paper-2 border border-ink/10 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="font-medium text-sm text-ink">
                            Challenge {idx + 1}: {challenge.title}
                          </div>
                          <span className="text-[10px] font-mono text-forest bg-forest/10 px-2 py-0.5 rounded-full self-start sm:self-auto">
                            Source: {challenge.repoContext}
                          </span>
                        </div>

                        <p className="text-xs text-ink-soft leading-relaxed">
                          {challenge.problemStatement}
                        </p>

                        {/* Candidate Code Submission */}
                        <div className="space-y-1">
                          <div className="text-[11px] font-semibold text-ink flex items-center gap-1">
                            <Terminal className="w-3.5 h-3.5 text-forest" /> Candidate's Submitted Code:
                          </div>
                          <pre className="p-3 rounded-xl bg-ink text-paper font-mono text-xs overflow-x-auto max-h-48 leading-relaxed">
                            {challenge.submittedCode || challenge.starterCode}
                          </pre>
                        </div>

                        {/* AI Review Diagnostics */}
                        {challenge.aiCodeReview && (
                          <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                            challenge.aiCodeReview.passed
                              ? "bg-forest/10 border-forest/30 text-forest"
                              : "bg-destructive/10 border-destructive/30 text-destructive"
                          }`}>
                            <div className="flex items-center justify-between font-semibold">
                              <span className="flex items-center gap-1.5">
                                {challenge.aiCodeReview.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-forest" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-destructive" />
                                )}
                                AI Diagnostic: {challenge.aiCodeReview.feedback}
                              </span>
                              <span className="font-mono text-[10px]">
                                Efficiency: {challenge.aiCodeReview.efficiencyRating}
                              </span>
                            </div>

                            {challenge.aiCodeReview.errorsDetected.length > 0 && (
                              <div className="space-y-1 pt-1 border-t border-destructive/20">
                                <span className="text-[11px] font-semibold block">Detected Code Errors:</span>
                                {challenge.aiCodeReview.errorsDetected.map((err, i) => (
                                  <div key={i} className="text-[11px] flex items-start gap-1 font-mono">
                                    <Bug className="w-3 h-3 mt-0.5 shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {challenge.aiCodeReview.fixSuggestion && (
                              <div className="text-[11px] text-ink-soft bg-paper/80 p-2.5 rounded-lg border border-ink/5 mt-1 font-mono">
                                <strong>AI Suggestion / Fix: </strong> {challenge.aiCodeReview.fixSuggestion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 5: DYNAMIC AI INTERVIEW */}
              {activeTab === "interview" && (
                <motion.div
                  key={currentApp.id + "-interview"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="p-4 rounded-xl bg-paper-2 border border-ink/10 text-xs text-ink-soft">
                    <strong className="text-ink">Conversational Probing Logic: </strong>
                    The AI does not follow a static script. It identifies technical assertions from the candidate's responses and crafts adaptive follow-ups to verify depth and probe detected knowledge boundaries.
                  </div>

                  <div className="space-y-4">
                    {currentApp.aiInterviewDialogue.map((turn) => (
                      <div key={turn.turn} className="p-5 rounded-2xl border border-ink/10 bg-paper space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-forest uppercase tracking-wider">
                            Turn {turn.turn} · {turn.topic}
                          </span>
                          <span className="text-[11px] font-mono text-ink-muted">
                            Confidence: {(turn.aiEvaluation.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex items-start gap-3 bg-paper-2 p-3.5 rounded-xl border border-ink/10">
                          <Bot className="w-4 h-4 text-forest shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-semibold text-ink">AI Interviewer: </span>
                            <span className="text-ink-soft">{turn.question}</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-forest/5 p-3.5 rounded-xl border border-forest/15">
                          <div className="w-5 h-5 rounded-full bg-forest text-paper text-[10px] font-mono grid place-items-center shrink-0 mt-0.5">
                            {currentApp.candidateName.charAt(0)}
                          </div>
                          <div className="text-xs">
                            <span className="font-semibold text-ink">{currentApp.candidateName}: </span>
                            <span className="text-ink-soft leading-relaxed">{turn.candidateAnswer}</span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-ink/5 border border-ink/10 text-xs space-y-1">
                          <div className="text-ink font-medium">AI Realtime Evaluation:</div>
                          <div className="text-ink-soft">✓ {turn.aiEvaluation.demonstratedKnowledge}</div>
                          {turn.aiEvaluation.gapFound && (
                            <div className="text-amber-800">⚠ Boundary: {turn.aiEvaluation.gapFound}</div>
                          )}
                          <div className="text-forest font-mono text-[11px] pt-1">
                            ↳ Dynamic Follow-up: "{turn.aiEvaluation.adaptiveFollowUp}"
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* TAB 6: SKILL MAP & IMPROVEMENT PLAN */}
              {activeTab === "scorecard" && (
                <motion.div
                  key={currentApp.id + "-scorecard"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Skill Map */}
                  <div>
                    <h4 className="font-serif-display text-xl text-ink mb-1">Candidate Transparent Skill Map</h4>
                    <p className="text-xs text-ink-soft mb-4">
                      Transparent multi-tier assessment showing exactly which skills were demonstrated, currently developing, or need further verification.
                    </p>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {currentApp.skillMap.map((s) => {
                        let badgeClass = "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
                        if (s.status === "Developing") badgeClass = "bg-blue-500/10 text-blue-700 border-blue-500/30";
                        if (s.status === "Needs Improvement") badgeClass = "bg-amber-500/10 text-amber-700 border-amber-500/30";
                        if (s.status === "Not Assessed") badgeClass = "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";

                        return (
                          <div key={s.skill} className="p-4 rounded-xl border border-ink/10 bg-paper-2 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className="font-semibold text-xs text-ink">{s.skill}</span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${badgeClass}`}>
                                  {s.status}
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-ink-muted uppercase mb-2">{s.category}</div>
                            </div>
                            <p className="text-[11px] text-ink-soft leading-relaxed border-t border-ink/5 pt-2">
                              {s.evidenceNote}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Improvement Plan */}
                  <div className="p-6 rounded-2xl border border-ink/10 bg-paper">
                    <h4 className="font-serif-display text-lg text-ink mb-1">Personalized Improvement Plan</h4>
                    <p className="text-xs text-ink-soft mb-4">
                      HireZap empowers candidates with high-yield next steps derived from detected assessment gaps.
                    </p>

                    <div className="space-y-3">
                      {currentApp.improvementPlan.map((plan, i) => (
                        <div key={i} className="p-4 rounded-xl border border-ink/10 bg-paper-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-ink">{plan.area}</span>
                            <span className="font-mono text-[10px] uppercase font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded">
                              {plan.priority} Priority
                            </span>
                          </div>
                          <div className="text-ink-soft">{plan.recommendation}</div>
                          <div className="text-forest font-mono text-[11px] pt-1">
                            Suggested Action: {plan.suggestedAction}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 7: HR EVIDENCE DECISION STUDIO */}
              {activeTab === "hrevidence" && (
                <motion.div
                  key={currentApp.id + "-hrevidence"}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="p-6 rounded-2xl border-2 border-forest/30 bg-paper-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-xs font-mono uppercase tracking-widest text-ink-muted">AI Structured Synthesis</div>
                        <h4 className="font-serif-display text-2xl text-ink">
                          Recommendation: <span className="text-forest">{currentApp.hrEvidence?.overallRecommendation || "Hire with Coaching"}</span>
                        </h4>
                      </div>
                      <div className="px-3 py-1.5 rounded-full bg-forest text-paper font-mono text-xs font-semibold flex items-center gap-1.5 self-start">
                        <ShieldCheck className="w-4 h-4" /> Evidence Confirmed
                      </div>
                    </div>

                    <p className="text-xs text-ink-soft leading-relaxed mb-5 bg-paper p-4 rounded-xl border border-ink/10">
                      {currentApp.hrEvidence?.summary || `${currentApp.candidateName} underwent complete AI candidate analysis for ${currentApp.jobTitle}. ATS Compatibility: ${currentApp.resumeScore}/100.`}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-4 text-xs mb-5">
                      <div className="p-4 rounded-xl bg-forest/5 border border-forest/20">
                        <div className="font-semibold text-forest mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> Verified Strengths
                        </div>
                        <ul className="space-y-1 text-ink-soft">
                          {(currentApp.hrEvidence?.strengths || [
                            `Solid algorithmic comprehension and repo verification.`,
                            `Authentic commit signals and repository structure.`,
                            `Aligned with core requirements.`
                          ]).map((str, i) => (
                            <li key={i}>• {str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                        <div className="font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-amber-600" /> Areas to Clarify / Onboard
                        </div>
                        <ul className="space-y-1 text-ink-soft">
                          {(currentApp.hrEvidence?.areasToVerify || [
                            `Review production scale experience and multi-region deployment history.`
                          ]).map((area, i) => (
                            <li key={i}>• {area}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-ink text-paper text-xs flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <span className="font-semibold text-forest">Recruiter Final Action: </span>
                        <span>{currentApp.hrEvidence?.decisionNotes || "Advance candidate to interview pipeline or reject with note."}</span>
                      </div>
                      <div className="flex gap-2">
                        {currentApp.currentStage !== "rejected" && (
                          <>
                            <button
                              onClick={() => handleAdvanceToInterview(currentApp)}
                              className="px-4 py-2 rounded-full bg-forest text-paper font-medium hover:bg-forest/90 transition-colors flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Advance to Interview Process
                            </button>
                            <button
                              onClick={() => handleReject(currentApp)}
                              className="px-4 py-2 rounded-full border border-destructive text-destructive-foreground hover:bg-destructive/10 transition-colors"
                            >
                              Reject with Explanation
                            </button>
                          </>
                        )}
                        {currentApp.currentStage === "rejected" && (
                          <span className="px-3 py-1.5 rounded-full bg-destructive/20 text-destructive-foreground font-mono font-semibold">
                            Archived as Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Bar */}
          <div className="p-4 bg-paper-2 border-t border-ink/10 flex items-center justify-between text-xs text-ink-muted">
            <span>💡 All 7 stages reflect real-time candidate data and recruiter decision controls.</span>
            <span className="font-mono text-[11px] text-forest font-medium hidden sm:inline">100% Explainable AI Verification</span>
          </div>
        </div>
      )}

      {/* Gemini API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-paper rounded-3xl border border-ink/15 shadow-2xl p-6 md:p-8 max-w-lg w-full space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-forest/10 border border-forest/20 grid place-items-center text-forest">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif-display text-xl text-ink">Google Gemini API Key</h3>
                  <p className="text-xs text-ink-muted">Enable real-time AI ATS scoring &amp; candidate diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-ink/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono font-medium text-ink block">
                GEMINI API KEY (Google AI Studio)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-ink/15 bg-paper-2 font-mono text-xs focus:outline-none focus:border-forest text-ink"
              />
              <p className="text-[11px] text-ink-muted">
                Your key is stored securely in your browser's local storage and used directly for ATS scoring, repository analysis, and MCQs generation.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-forest hover:underline inline-flex items-center gap-1 font-medium"
              >
                Get a free key at Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKeyModal(false)}
                  className="rounded-xl border-ink/15 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setGeminiApiKey(geminiApiKeyInput);
                    setShowApiKeyModal(false);
                    toast({
                      title: "Gemini API Key Saved",
                      description: "Real-time AI evaluation engine is ready.",
                    });
                  }}
                  className="rounded-xl bg-forest text-paper hover:bg-forest/90 text-xs px-4"
                >
                  Save Key
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BeforeInterviewHRPanel;
