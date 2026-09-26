import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, GitBranch, ListChecks, Code2, Bot, Award, CheckCircle2,
  AlertCircle, Sparkles, ArrowRight, ShieldCheck, HelpCircle, ChevronRight,
  ExternalLink, Layers, Database, Cpu, Terminal, Play, Bug, Briefcase,
  User, Check, X, RefreshCw, Lock, Zap, Key, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  getWorkflowApplications,
  saveWorkflowApplications,
  CandidateApplicationSubmission,
  getWorkflowJobs,
  JobCutoffs,
  analyzeCandidateCodeSubmission,
  simulateCandidateApplicationForJob,
  evaluateAndSubmitApplicationWithGemini
} from "@/lib/hiringWorkflowEngine";
import { getGeminiApiKey, setGeminiApiKey, analyzeBeforeInterviewWithGemini } from "@/lib/geminiResumeAnalyzer";
import { supabase } from "@/integrations/supabase/client";

export const BeforeInterviewCandidatePanel = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<CandidateApplicationSubmission[]>([]);
  const [jobs, setJobs] = useState<JobCutoffs[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [advancingToNextRound, setAdvancingToNextRound] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(getGeminiApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState(false);
  
  // 6 Candidate-facing tabs matching the landing page 7-stage engine
  const [activeTab, setActiveTab] = useState<"ats" | "github" | "mcq" | "dsa" | "interview" | "scorecard">("ats");

  // MCQ interactive state
  const [selectedMCQAnswers, setSelectedMCQAnswers] = useState<Record<number, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);

  // Coding challenge state
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [codeInputs, setCodeInputs] = useState<Record<number, string>>({});
  const [analyzingChallengeId, setAnalyzingChallengeId] = useState<number | null>(null);

  const loadData = () => {
    const loadedApps = getWorkflowApplications();
    const loadedJobs = getWorkflowJobs();
    setApplications(loadedApps);
    setJobs(loadedJobs);

    if (loadedApps.length > 0) {
      const activeApp = loadedApps.find((a) => a.id === selectedAppId) || loadedApps[0];
      setSelectedAppId(activeApp.id);
      
      const initialCodes: Record<number, string> = {};
      activeApp.repoCodingChallenges?.forEach((c) => {
        initialCodes[c.id] = c.submittedCode || c.starterCode;
      });
      setCodeInputs(initialCodes);
    }

    if (loadedJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(loadedJobs[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currentApp = applications.find((a) => a.id === selectedAppId) || (applications.length > 0 ? applications[0] : null);
  const activeJob = jobs.find((j) => j.id === (currentApp?.jobId || selectedJobId)) || jobs[0];
  const currentChallenge = currentApp?.repoCodingChallenges?.[activeChallengeIdx] || currentApp?.repoCodingChallenges?.[0];

  const isRejected = currentApp ? currentApp.currentStage === "rejected" || currentApp.overallStatus.startsWith("Auto-Rejected") : false;
  const isApproved = currentApp ? !isRejected && (currentApp.resumePassed && currentApp.githubPassed && currentApp.projectPassed) : false;
  const isAlreadyInMainRounds = currentApp ? ["shortlisted", "aptitude_test", "dsa_sandbox", "interview"].includes(currentApp.currentStage) || currentApp.overallStatus === "Interview Ready" : false;

  const tabs = [
    { id: "ats", label: "ATS & Resume", icon: FileText, num: "01" },
    { id: "github", label: "GitHub & Projects", icon: GitBranch, num: "02" },
    { id: "mcq", label: "5 Personalized MCQs", icon: ListChecks, num: "03" },
    { id: "dsa", label: "Adaptive DSA Sandbox", icon: Code2, num: "04" },
    { id: "interview", label: "Dynamic AI Interview", icon: Bot, num: "05" },
    { id: "scorecard", label: "Skill Map & Plan", icon: Award, num: "06" },
  ];

  const handleMCQSelect = (questionId: number, optionIdx: number) => {
    if (mcqSubmitted) return;
    setSelectedMCQAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleMCQSubmit = () => {
    if (!currentApp || !currentApp.generatedMCQs.length) return;
    setMcqSubmitted(true);
    let correctCount = 0;
    currentApp.generatedMCQs.forEach((q) => {
      if (selectedMCQAnswers[q.id] === q.correctIndex) {
        correctCount++;
      }
    });

    toast({
      title: `MCQ Evaluation: ${correctCount} / ${currentApp.generatedMCQs.length} Correct`,
      description: "Your personalized repository verification answers have been recorded in your dossier.",
    });
  };

  const handleRunCodeAnalysis = (challengeId: number) => {
    if (!currentApp) return;
    setAnalyzingChallengeId(challengeId);

    const userCode = codeInputs[challengeId] || "";
    const reviewResult = analyzeCandidateCodeSubmission(challengeId, userCode);

    setTimeout(() => {
      const updatedApps = applications.map((a) => {
        if (a.id === currentApp.id) {
          const updatedChallenges = a.repoCodingChallenges.map((c) => {
            if (c.id === challengeId) {
              return {
                ...c,
                submittedCode: userCode,
                aiCodeReview: reviewResult,
              };
            }
            return c;
          });
          return { ...a, repoCodingChallenges: updatedChallenges };
        }
        return a;
      });

      setApplications(updatedApps);
      saveWorkflowApplications(updatedApps);
      setAnalyzingChallengeId(null);

      if (reviewResult?.passed) {
        toast({
          title: "✅ AI Code Execution: Passed",
          description: "All test cases passed with verified algorithmic bounds.",
        });
      } else {
        toast({
          title: "⚠️ Code Error Detected",
          description: reviewResult?.feedback || "Issues detected in submitted code.",
          variant: "destructive",
        });
      }
    }, 500);
  };

  const handleProceedToMainRounds = async () => {
    if (!currentApp) return;
    setAdvancingToNextRound(true);

    try {
      // 1. Update workflow engine
      const updatedApps = applications.map((a) =>
        a.id === currentApp.id
          ? {
              ...a,
              overallStatus: "Interview Ready" as const,
              currentStage: "dsa_sandbox" as const,
            }
          : a
      );
      setApplications(updatedApps);
      saveWorkflowApplications(updatedApps);

      // 2. Sync to Supabase
      if (currentApp.candidateEmail) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("email", currentApp.candidateEmail)
          .maybeSingle();

        if (userData) {
          await supabase
            .from("applications")
            .update({
              current_stage: "shortlisted",
              status: "active",
            })
            .eq("candidate_id", userData.id)
            .eq("job_id", currentApp.jobId);
        }
      }

      toast({
        title: "🎉 Before Interview Cleared!",
        description: `Your application for ${currentApp.jobTitle} is now advanced to My Applications with Aptitude & Technical rounds unlocked!`,
      });

      // 3. Navigate to My Applications
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("hz_switch_candidate_tab", { detail: "applications" }));
      }, 600);
    } catch (e) {
      console.error("Error advancing to next round:", e);
    } finally {
      setAdvancingToNextRound(false);
    }
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
          title: "✨ Gemini AI Resume & Stack Analysis Complete",
          description: `Resume ATS score evaluated to ${resumeScore}/100 with ${geminiResult.matchedKeywords?.length || 0} verified stack matches.`,
        });
      } else {
        toast({
          title: "Analysis Completed (Deterministic Engine)",
          description: "Resume evaluation updated. To use real-time Gemini LLM analysis, enter your Gemini API Key.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Evaluation Error", description: "Could not complete Gemini analysis.", variant: "destructive" });
    } finally {
      setIsGeminiAnalyzing(false);
    }
  };

  const handleSaveApiKey = () => {
    setGeminiApiKey(geminiApiKeyInput);
    setShowApiKeyModal(false);
    toast({
      title: "✅ Gemini API Key Saved",
      description: "Gemini AI is now active for resume scoring, 5 MCQs, and coding challenges.",
    });
  };

  const handleCreateTestCandidate = async (jobToUse: JobCutoffs, pass: boolean = true) => {
    const candidateName = pass ? "Alex Rivera" : "Jordan Smith";
    const email = pass ? "alex.rivera@example.com" : "jordan.smith@example.com";
    
    setIsGeminiAnalyzing(true);
    const newApp = await evaluateAndSubmitApplicationWithGemini(
      jobToUse,
      {
        name: candidateName,
        email,
        resumeFileName: `${candidateName.replace(/\s+/g, "_")}_Resume.pdf`,
        resumeText: pass
          ? `Experienced software engineer with 4 years building scalable systems using ${jobToUse.requiredSkills.join(", ")}, Distributed Caching, CI/CD pipelines, and microservices.`
          : "Basic HTML and CSS enthusiast with introductory computing knowledge.",
        githubAcc: `https://github.com/${candidateName.toLowerCase().replace(/\s+/g, "-")}-dev`,
        githubRepo1: `https://github.com/${candidateName.toLowerCase().replace(/\s+/g, "-")}-dev/core-engine`,
        githubRepo2: `https://github.com/${candidateName.toLowerCase().replace(/\s+/g, "-")}-dev/pipeline`,
        projectUrl: "https://demo-app.dev",
        projectSummary: `Production fullstack architecture utilizing ${jobToUse.requiredSkills.slice(0, 3).join(", ")}.`,
      },
      geminiApiKeyInput || getGeminiApiKey()
    );
    setIsGeminiAnalyzing(false);

    setApplications(getWorkflowApplications());
    setSelectedAppId(newApp.id);
    const initialCodes: Record<number, string> = {};
    newApp.repoCodingChallenges?.forEach((c) => {
      initialCodes[c.id] = c.submittedCode || c.starterCode;
    });
    setCodeInputs(initialCodes);
    setMcqSubmitted(false);
    setSelectedMCQAnswers({});
    toast({
      title: `🎯 Profile Evaluated for ${jobToUse.title}`,
      description: pass
        ? `Candidate cleared Before Interview screening (ATS Score: ${newApp.resumeScore}/100)!`
        : `Candidate scored below cutoff (${newApp.resumeScore}/100) to demonstrate transparent rejection.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Main Container */}
      <div className="w-full rounded-2xl md:rounded-[28px] border border-ink/15 bg-paper shadow-2xl overflow-hidden">
        {/* Top Header: Candidate Dossier Summary & Application Switcher */}
        <div className="p-6 md:p-8 bg-paper-2 border-b border-ink/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-forest/10 text-forest border border-forest/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  Step 1: Before Interview Screening Layer
                </div>
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-ink/5 hover:bg-ink/10 text-ink border border-ink/15 transition-colors"
                >
                  <Key className="w-3 h-3 text-forest" />
                  <span>Gemini AI Key: {getGeminiApiKey() ? "Configured ✓" : "Set Key"}</span>
                </button>
              </div>

              <h3 className="font-serif-display text-2xl md:text-3xl text-ink">
                {currentApp ? `${currentApp.candidateName}'s Screening Dossier` : "Candidate Pre-Interview Screening"}
              </h3>
              <p className="text-sm text-ink-soft mt-1 max-w-xl">
                AI evaluates your resume ATS match, scans your GitHub repositories for code authenticity, prepares tailored MCQs, tests adaptive coding challenges, and tracks your skill progression before unlocking interview rounds.
              </p>
            </div>

            {/* Application Switcher & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {applications.length > 0 && (
                <div className="flex flex-wrap sm:flex-nowrap gap-2 bg-paper p-1.5 rounded-2xl border border-ink/10 shrink-0">
                  {applications.map((app) => {
                    const active = selectedAppId === app.id;
                    const appRejected = app.currentStage === "rejected";
                    return (
                      <button
                        key={app.id}
                        onClick={() => {
                          setSelectedAppId(app.id);
                          setMcqSubmitted(false);
                          setSelectedMCQAnswers({});
                          const initialCodes: Record<number, string> = {};
                          app.repoCodingChallenges?.forEach((c) => {
                            initialCodes[c.id] = c.submittedCode || c.starterCode;
                          });
                          setCodeInputs(initialCodes);
                        }}
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
                          <span className={`px-1.5 py-0.2 rounded font-semibold ${
                            appRejected
                              ? "bg-destructive/20 text-destructive-foreground"
                              : "text-forest"
                          }`}>
                            {appRejected ? "Rejected" : "Screened"}
                          </span>
                        </div>
                        {active && (
                          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-forest animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentApp && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReanalyzeWithGemini}
                  disabled={isGeminiAnalyzing}
                  className="rounded-xl border-ink/20 text-xs px-3 py-2 flex items-center gap-1.5 bg-paper hover:bg-forest/10"
                >
                  <Sparkles className="w-3.5 h-3.5 text-forest" />
                  {isGeminiAnalyzing ? "Gemini Analyzing..." : "AI Re-Score with Gemini"}
                </Button>
              )}
            </div>
          </div>

          {/* Candidate Mini Profile Bar */}
          {currentApp && (
            <div className="mt-6 pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-ink">{currentApp.candidateName}</span>
                <span className="text-ink-muted">·</span>
                <span className="text-ink-soft">{currentApp.jobTitle}</span>
                <span className="text-ink-muted">·</span>
                <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold ${
                  isRejected
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-forest/10 text-forest border border-forest/20"
                }`}>
                  {currentApp.overallStatus}
                </span>
              </div>
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
          )}
        </div>

        {/* When no application has been submitted yet */}
        {!currentApp && (
          <div className="p-10 text-center space-y-5 bg-paper min-h-[380px] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-forest/10 text-forest grid place-items-center mx-auto">
              <Briefcase className="w-8 h-8" />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="font-serif-display text-2xl text-ink font-semibold">
                {jobs.length > 0 ? "No Active Application Selected" : "No Jobs Posted Yet"}
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                {jobs.length > 0
                  ? "Select a posted job track below to evaluate candidate resume match, scan GitHub code authenticity, generate 5 MCQs, and run adaptive challenges."
                  : "The hiring team has not published any jobs yet. When jobs are posted, they will automatically appear here with their role-specific cutoffs."}
              </p>
            </div>

            {jobs.length > 0 && (
              <div className="max-w-md w-full p-4 rounded-2xl bg-paper-2 border border-ink/10 space-y-3 text-left">
                <div className="text-xs font-semibold text-ink">Available Posted Job:</div>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-ink/15 bg-paper text-ink font-medium"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} (Resume Cutoff: {j.resumeCutoff}%)
                    </option>
                  ))}
                </select>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={() => handleCreateTestCandidate(activeJob, true)}
                    className="flex-1 bg-forest text-paper hover:bg-forest/90 text-xs py-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Run Gemini AI Analyzer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleCreateTestCandidate(activeJob, false)}
                    className="text-xs py-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                  >
                    Test Auto-Rejection
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action / Next Round Transition Banner */}
        {currentApp && (
          <div className="p-6 bg-paper border-b border-ink/10">
            {isApproved && (
              <div className="p-5 rounded-2xl bg-forest/10 border-2 border-forest/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-forest font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Before Interview Screening Cleared (All Cutoffs Passed)</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    Your ATS score (<strong>{currentApp.resumeScore}/100</strong>) and code authenticity (<strong>{currentApp.authenticityPercentage}%</strong>) qualify you for the next stage.
                  </p>
                </div>
                <Button
                  onClick={handleProceedToMainRounds}
                  disabled={advancingToNextRound}
                  className="bg-forest text-paper hover:bg-forest/90 font-medium px-5 py-2.5 rounded-full text-xs shadow-md shrink-0 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAlreadyInMainRounds ? "Go to My Applications (Active Rounds) →" : "Proceed to Next Round (Aptitude & Technical) →"}
                </Button>
              </div>
            )}

            {isRejected && (
              <div className="p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>Application Not Shortlisted in Before Interview Screening</span>
                </div>
                <p className="text-destructive leading-relaxed">
                  <strong>Rejection Explanation: </strong>
                  {currentApp.resumeRejectionReason || currentApp.githubRejectionReason || "Application did not meet the required cutoff standards for this role."}
                </p>
                <div className="pt-2 text-ink-soft flex items-center gap-2">
                  <span className="font-semibold text-ink">Action Required: </span>
                  <span>Review your <strong>Skill Map &amp; Personalized Improvement Plan</strong> under Tab 06 to enhance your profile for future roles.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6 Stage Navigation Tabs */}
        {currentApp && (
          <>
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
                          Required Cutoff: {activeJob?.resumeCutoff || 75}% · Status: <span className={currentApp.resumePassed ? "text-forest font-semibold" : "text-destructive font-semibold"}>{currentApp.resumePassed ? "Passed" : "Below Cutoff"}</span>
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
                        GitHub evidence is analyzed for genuine developer commits vs AI boilerplate. We inspect languages, commit timeline, and code structure.
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
                              Primary Repository
                            </span>
                            <span className="text-xs font-mono text-ink-muted">Cutoff: {activeJob?.githubCutoff || 70}%</span>
                          </div>
                          <p className="text-xs text-ink-soft mb-3 font-mono">
                            <a href={currentApp.githubRepo1Url} target="_blank" rel="noreferrer" className="underline text-forest">
                              {currentApp.githubRepo1Url}
                            </a>
                          </p>
                          
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

                        <div className="pt-3 border-t border-ink/10">
                          <div className="text-[11px] font-semibold text-amber-800 mb-1">Account Profile:</div>
                          <a href={currentApp.githubAccountUrl} target="_blank" rel="noreferrer" className="text-xs text-forest underline font-mono">
                            {currentApp.githubAccountUrl}
                          </a>
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
                              <ExternalLink className="w-3.5 h-3.5" /> View Live Project
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
                        Generated from: <strong className="text-ink">Job Requirements + Candidate Submitted Repo Stacks ({currentApp.detectedRepoStacks.join(", ")})</strong>
                      </span>
                      {!mcqSubmitted ? (
                        <Button
                          onClick={handleMCQSubmit}
                          disabled={Object.keys(selectedMCQAnswers).length < currentApp.generatedMCQs.length}
                          className="bg-forest text-paper hover:bg-forest/90 text-xs px-4"
                        >
                          Submit {currentApp.generatedMCQs.length} MCQs
                        </Button>
                      ) : (
                        <span className="font-mono text-forest font-semibold bg-forest/10 px-2.5 py-1 rounded-full">
                          Assessment Completed
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {currentApp.generatedMCQs.map((q, idx) => (
                        <div key={q.id} className="p-5 rounded-2xl border border-ink/10 bg-paper hover:border-forest/40 transition-colors">
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
                              const isSelected = selectedMCQAnswers[q.id] === optIdx;
                              const isCorrect = optIdx === q.correctIndex;
                              return (
                                <button
                                  key={optIdx}
                                  disabled={mcqSubmitted}
                                  onClick={() => handleMCQSelect(q.id, optIdx)}
                                  className={`p-2.5 rounded-xl text-xs flex items-start gap-2.5 text-left transition-all ${
                                    mcqSubmitted
                                      ? isCorrect
                                        ? "bg-forest/10 border border-forest/30 text-ink font-medium"
                                        : isSelected
                                        ? "bg-destructive/10 border border-destructive/30 text-destructive"
                                        : "bg-paper-2 text-ink-soft border border-ink/5"
                                      : isSelected
                                      ? "bg-forest text-paper border border-forest font-semibold"
                                      : "bg-paper-2 text-ink-soft hover:bg-ink/5 border border-ink/5"
                                  }`}
                                >
                                  <span className="font-mono shrink-0 w-4 font-semibold">{String.fromCharCode(65 + optIdx)}.</span>
                                  <span className="flex-1">{opt}</span>
                                  {mcqSubmitted && isCorrect && (
                                    <span className="ml-auto text-[10px] font-mono uppercase bg-forest text-paper px-1.5 py-0.5 rounded shrink-0">
                                      Verified Correct
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {mcqSubmitted && (
                            <div className="mt-3 pl-8 text-xs text-ink-muted italic border-t border-ink/5 pt-2">
                              <strong>AI Rationale:</strong> {q.rationale}
                            </div>
                          )}
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                      <div>
                        <h4 className="font-serif-display text-xl text-ink">Adaptive DSA Sandbox — Practical Repo-Derived Challenges</h4>
                        <p className="text-xs text-ink-soft mt-0.5">
                          Extracted from your repository architecture with live AI error diagnosis and time complexity verification.
                        </p>
                      </div>

                      {/* Challenge Switcher */}
                      <div className="flex bg-paper-2 p-1 rounded-xl border border-ink/10 gap-1 self-start sm:self-center">
                        {currentApp.repoCodingChallenges.map((c, i) => (
                          <button
                            key={c.id}
                            onClick={() => setActiveChallengeIdx(i)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                              activeChallengeIdx === i ? "bg-ink text-paper font-semibold" : "text-ink hover:bg-ink/5"
                            }`}
                          >
                            Challenge {i + 1}
                          </button>
                        ))}
                      </div>
                    </div>

                    {currentChallenge && (
                      <div className="grid lg:grid-cols-12 gap-6">
                        {/* Left: Problem Statement & Test Cases */}
                        <div className="lg:col-span-5 space-y-4">
                          <div className="p-5 rounded-2xl bg-paper-2 border border-ink/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-forest uppercase">
                                Challenge {activeChallengeIdx + 1}
                              </span>
                              <span className="text-[10px] font-mono text-ink-muted bg-paper px-2 py-0.5 rounded border border-ink/10">
                                {currentChallenge.repoContext}
                              </span>
                            </div>
                            <h4 className="font-serif-display text-lg text-ink font-semibold">{currentChallenge.title}</h4>
                            <p className="text-xs text-ink-soft leading-relaxed">{currentChallenge.problemStatement}</p>

                            <div className="pt-2 border-t border-ink/10">
                              <span className="text-[11px] font-semibold text-ink block mb-1.5">Verification Test Cases:</span>
                              <div className="space-y-1.5">
                                {currentChallenge.testCases.map((tc, idx) => (
                                  <div key={idx} className="p-2 rounded-lg bg-paper border border-ink/5 text-[11px] font-mono">
                                    <div className="text-ink-soft">Input: <span className="text-ink">{tc.input}</span></div>
                                    <div className="text-forest font-semibold">Expected: {tc.expectedOutput}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Code Editor & AI Review */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="p-5 rounded-2xl bg-paper-2 border border-ink/10 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-semibold text-ink flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-forest" /> Code Editor (Repo-Derived Module)
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleRunCodeAnalysis(currentChallenge.id)}
                                disabled={analyzingChallengeId === currentChallenge.id}
                                className="bg-forest text-paper hover:bg-forest/90 text-xs h-8 px-3 rounded-full flex items-center gap-1.5"
                              >
                                <Play className="w-3 h-3" />
                                {analyzingChallengeId === currentChallenge.id ? "Analyzing with AI..." : "Run Code & AI Review"}
                              </Button>
                            </div>

                            <textarea
                              value={codeInputs[currentChallenge.id] ?? (currentChallenge.submittedCode || currentChallenge.starterCode)}
                              onChange={(e) => setCodeInputs((prev) => ({ ...prev, [currentChallenge.id]: e.target.value }))}
                              rows={9}
                              className="w-full font-mono text-xs p-4 rounded-xl bg-ink text-paper border border-ink-soft focus:outline-none focus:ring-1 focus:ring-forest leading-relaxed resize-none"
                              placeholder="// Write your code here..."
                            />

                            {/* AI Error Feedback */}
                            {currentChallenge.aiCodeReview && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`p-4 rounded-xl border text-xs space-y-2 ${
                                  currentChallenge.aiCodeReview.passed
                                    ? "bg-forest/10 border-forest/30 text-forest"
                                    : "bg-destructive/10 border-destructive/30 text-destructive"
                                }`}
                              >
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="flex items-center gap-1.5">
                                    {currentChallenge.aiCodeReview.passed ? (
                                      <CheckCircle2 className="w-4 h-4 text-forest" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-destructive" />
                                    )}
                                    AI Diagnostic: {currentChallenge.aiCodeReview.feedback}
                                  </span>
                                  <span className="font-mono text-[10px]">
                                    Complexity: {currentChallenge.aiCodeReview.efficiencyRating}
                                  </span>
                                </div>

                                {currentChallenge.aiCodeReview.errorsDetected.length > 0 && (
                                  <div className="space-y-1 pt-1 border-t border-destructive/20 font-mono text-[11px]">
                                    {currentChallenge.aiCodeReview.errorsDetected.map((err, i) => (
                                      <div key={i} className="flex items-start gap-1">
                                        <Bug className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>{err}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {currentChallenge.aiCodeReview.fixSuggestion && (
                                  <div className="text-[11px] text-ink-soft bg-paper/70 p-2.5 rounded-lg border border-ink/5 mt-1 font-mono">
                                    <strong>AI Fix Suggestion: </strong> {currentChallenge.aiCodeReview.fixSuggestion}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
                      The AI does not follow a static script. It identifies technical assertions from your responses and crafts adaptive follow-ups to probe detected knowledge boundaries.
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
              </AnimatePresence>
            </div>

            {/* Footer Bar */}
            <div className="p-4 bg-paper-2 border-t border-ink/10 flex items-center justify-between text-xs text-ink-muted">
              <span>💡 All 6 stages reflect live candidate evaluations powered by Google Gemini AI &amp; explainable ATS models.</span>
              <span className="font-mono text-[11px] text-forest font-medium hidden sm:inline">100% Explainable AI Verification</span>
            </div>
          </>
        )}
      </div>

      {/* Gemini API Key Configuration Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl border border-ink/15 bg-paper p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-ink/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-forest/10 text-forest grid place-items-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif-display font-semibold text-ink">Google Gemini API Key</h4>
                  <p className="text-[11px] text-ink-muted">Powers real-time resume ATS scoring &amp; MCQ generation</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="w-7 h-7 rounded-full border border-ink/15 text-xs grid place-items-center hover:bg-ink/5"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink">Enter your Gemini API Key:</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKeyInput}
                onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-ink/15 bg-paper-2 focus:outline-none focus:border-forest text-ink"
              />
              <p className="text-[11px] text-ink-soft leading-relaxed">
                Your key is stored securely in your browser session for live Gemini AI scoring. If omitted, the deterministic scoring engine runs smoothly.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowApiKeyModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveApiKey} className="bg-forest text-paper hover:bg-forest/90 text-xs px-4">
                Save &amp; Activate Gemini
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BeforeInterviewCandidatePanel;
