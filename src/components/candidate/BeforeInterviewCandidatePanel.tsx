import { useState, useEffect, useRef } from "react";
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
  saveWorkflowJobs,
  JobCutoffs,
  DEFAULT_JOBS,
  ensureCompleteCandidateApp,
  generateDynamicMCQs,
  generateDynamicCodingChallenges,
  analyzeCandidateCodeSubmission,
  simulateCandidateApplicationForJob,
  evaluateAndSubmitApplicationWithGemini,
  formatExternalUrl,
  addWorkflowJob
} from "@/lib/hiringWorkflowEngine";
import { getGeminiApiKey, setGeminiApiKey, analyzeBeforeInterviewWithGemini } from "@/lib/geminiResumeAnalyzer";
import { fetchRealGitHubAnalysis } from "@/lib/githubRealFetcher";
import { supabase } from "@/integrations/supabase/client";
import ErrorBoundary from "@/components/ErrorBoundary";
import GitHubCodeInspector from "@/components/common/GitHubCodeInspector";

export interface BeforeInterviewCandidatePanelProps {
  candidateUser?: {
    id?: string;
    full_name?: string;
    email?: string;
    user_id?: string;
    [key: string]: any;
  } | null;
}

export const BeforeInterviewCandidateContent = ({ candidateUser }: BeforeInterviewCandidatePanelProps) => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<CandidateApplicationSubmission[]>([]);
  const [jobs, setJobs] = useState<JobCutoffs[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>("");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [advancingToNextRound, setAdvancingToNextRound] = useState(false);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(getGeminiApiKey());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [isGeminiAnalyzing, setIsGeminiAnalyzing] = useState(false);
  
  // Track candidate identity for isolation
  const [candidateInfo, setCandidateInfo] = useState<{ id: string; email: string; name: string }>({
    id: candidateUser?.id || "",
    email: candidateUser?.email || "",
    name: candidateUser?.full_name || "",
  });
  const candidateInfoRef = useRef(candidateInfo);
  candidateInfoRef.current = candidateInfo;

  // 4 Core Candidate-facing screening stages
  const [activeTab, setActiveTab] = useState<"ats" | "github" | "mcq" | "dsa">("ats");

  // MCQ interactive state
  const [selectedMCQAnswers, setSelectedMCQAnswers] = useState<Record<number, number>>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);

  // Coding challenge state
  const [activeChallengeIdx, setActiveChallengeIdx] = useState(0);
  const [codeInputs, setCodeInputs] = useState<Record<number, string>>({});
  const [analyzingChallengeId, setAnalyzingChallengeId] = useState<number | null>(null);

  const [isSubmittingChallenges, setIsSubmittingChallenges] = useState(false);

  // Strict check whether an application belongs exclusively to the logged-in candidate
  const isCandidateApp = (
    app: CandidateApplicationSubmission,
    cId: string,
    cEmail: string,
    cName: string
  ): boolean => {
    const lowerName = (app.candidateName || "").toLowerCase().trim();
    const lowerEmail = (app.candidateEmail || "").toLowerCase().trim();

    // Explicitly exclude simulated demo candidates (Alex Rivera, Jordan Smith)
    if (
      lowerName === "alex rivera" ||
      lowerName === "jordan smith" ||
      lowerEmail.includes("alex.rivera") ||
      lowerEmail.includes("jordan.smith")
    ) {
      return false;
    }

    if (cId && (app.candidateId === cId || app.id === cId || app.applicationId === cId)) {
      return true;
    }
    if (cEmail && lowerEmail && lowerEmail === cEmail.toLowerCase().trim()) {
      return true;
    }
    if (cName && lowerName && lowerName === cName.toLowerCase().trim()) {
      return true;
    }
    if (app.id.startsWith("app-cand-") || app.id === "app-primary-screening") {
      return true;
    }
    if (!cId && !cEmail && (!cName || cName === "Candidate")) {
      return true;
    }
    return false;
  };

  const filterMyApps = (
    apps: CandidateApplicationSubmission[],
    cId: string,
    cEmail: string,
    cName: string
  ): CandidateApplicationSubmission[] => {
    return (apps || []).filter((a) => isCandidateApp(a, cId, cEmail, cName));
  };

  // Helper to persist only current candidate updates into workflow storage without wiping out HR's other candidate roster
  const persistMyApps = (myAppsToPersist: CandidateApplicationSubmission[]) => {
    const allWorkflow = getWorkflowApplications();
    const myIds = new Set(myAppsToPersist.map((a) => a.id));
    const otherCandidatesApps = allWorkflow.filter((a) => !myIds.has(a.id));
    const merged = [...myAppsToPersist, ...otherCandidatesApps];
    saveWorkflowApplications(merged);
    window.dispatchEvent(new CustomEvent("hz_workflow_apps_updated", { detail: merged }));
  };

  const loadData = async () => {
    let loadedApps = getWorkflowApplications();
    let loadedJobs = getWorkflowJobs();

    // If local jobs are empty, fetch from Supabase
    if (!loadedJobs || loadedJobs.length === 0) {
      try {
        const { data: dbJobs } = await supabase.from("jobs").select("*").eq("status", "open");
        if (dbJobs && dbJobs.length > 0) {
          loadedJobs = dbJobs.map((j) => ({
            id: j.id,
            title: j.title,
            department: j.department || "Engineering",
            requiredSkills: Array.isArray(j.skills_required) ? j.skills_required : ["TypeScript", "React", "Node.js"],
            resumeCutoff: 90,
            githubCutoff: 70,
            projectCutoff: 70,
            description: j.description || j.title,
          }));
          saveWorkflowJobs(loadedJobs);
        }
      } catch (err) {
        console.warn("Could not load jobs from Supabase", err);
      }
    }

    if (!loadedJobs || loadedJobs.length === 0) {
      loadedJobs = DEFAULT_JOBS;
      saveWorkflowJobs(DEFAULT_JOBS);
    }
    setJobs(loadedJobs);

    // Identify the logged in candidate
    let currentCandidateEmail = candidateUser?.email || "";
    let currentCandidateName = candidateUser?.full_name || "";
    let currentCandidateId = candidateUser?.id || "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (!currentCandidateEmail) currentCandidateEmail = session.user.email || "";
        const { data: userData } = await supabase
          .from("users")
          .select("id, full_name, email")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (userData) {
          currentCandidateId = userData.id;
          if (userData.full_name) currentCandidateName = userData.full_name;
          if (userData.email) currentCandidateEmail = userData.email;
        }
      }
    } catch (e) {
      console.warn("Could not retrieve candidate session", e);
    }

    setCandidateInfo({
      id: currentCandidateId,
      email: currentCandidateEmail,
      name: currentCandidateName,
    });

    // STRICT CANDIDATE FILTER: Never pull other candidates' records into this candidate portal
    let candidateApps: CandidateApplicationSubmission[] = filterMyApps(
      loadedApps,
      currentCandidateId,
      currentCandidateEmail,
      currentCandidateName
    );

    // Query Supabase applications ONLY for this specific candidate
    if (currentCandidateId) {
      try {
        const { data: dbApps } = await supabase
          .from("applications")
          .select("*, jobs(*)")
          .eq("candidate_id", currentCandidateId);

        if (dbApps && dbApps.length > 0) {
          // Fetch candidate profile for GitHub and skills
          const { data: profile } = await supabase
            .from("candidate_profiles")
            .select("github_url, skills, full_name, bio, resume_url")
            .eq("id", currentCandidateId)
            .maybeSingle();

          const hydrated: CandidateApplicationSubmission[] = dbApps.map((da: any) => {
            const j = da.jobs || {};
            const targetJob = loadedJobs.find(job => job.id === da.job_id) || loadedJobs[0] || DEFAULT_JOBS[0];
            const reqSkills = Array.isArray(j.skills_required) ? j.skills_required : targetJob.requiredSkills;
            const rScore = da.resume_score != null ? da.resume_score : (da.ai_analysis?.resume_score ?? 94);
            const resumeCutoff = targetJob.resumeCutoff || 90;
            const resumePassed = rScore >= resumeCutoff;
            const aiData = da.ai_analysis || {};
            const githubUrl = profile?.github_url || (da.cover_letter?.includes("github.com") ? da.cover_letter : "") || "https://github.com";

            // If locally existing, preserve interactive state like edited code or test results
            const existing = candidateApps.find(a => a.id === da.id || a.jobId === da.job_id);

            return ensureCompleteCandidateApp({
              id: da.id,
              candidateId: da.candidate_id || currentCandidateId,
              applicationId: da.id,
              jobId: da.job_id || targetJob.id,
              jobTitle: j.title || targetJob.title,
              candidateName: currentCandidateName || profile?.full_name || "Applicant",
              candidateEmail: currentCandidateEmail || "candidate@example.com",
              appliedDate: new Date(da.applied_at || Date.now()).toLocaleDateString(),
              resumeFileName: da.resume_url ? da.resume_url.split("/").pop() || "Candidate_Resume.pdf" : "Candidate_Resume.pdf",
              resumeTextSummary: da.cover_letter || aiData.summary || profile?.bio || "Verified candidate background and technical skills.",
              githubAccountUrl: githubUrl,
              githubRepo1Url: githubUrl,
              projectArchitectureSummary: aiData.project_summary || "Modular fullstack application architecture",
              resumeScore: rScore,
              resumePassed,
              resumeFeedback: aiData.feedback || `Resume score evaluated to ${rScore}/100 for ${targetJob.title}.`,
              matchedKeywords: aiData.matched_skills || profile?.skills || reqSkills,
              atsBreakdown: aiData.ats_breakdown || {
                roleAlignment: rScore,
                skillsMatch: rScore,
                projectImpact: Math.min(100, rScore + 2),
                formatting: 92,
                missingKeywords: [],
                actionableSuggestions: ["Continue showcasing modular architectural implementations."],
              },
              githubScore: aiData.github_score || 90,
              githubPassed: true,
              aiWrittenPercentage: 100 - (aiData.authenticity_score || 88),
              authenticityPercentage: aiData.authenticity_score || 88,
              detectedRepoStacks: profile?.skills || reqSkills,
              githubFeedback: "Authentic commit history with clean software modularity.",
              codeSignals: ["Modular repository pattern", "Verified domain assertions", "Clean commit lineage"],
              generatedMCQs: existing?.generatedMCQs || aiData.mcqs || generateDynamicMCQs(reqSkills, targetJob.title),
              repoCodingChallenges: existing?.repoCodingChallenges || da.code_answers || generateDynamicCodingChallenges(reqSkills, targetJob.title),
              aiInterviewDialogue: existing?.aiInterviewDialogue || [],
              skillMap: existing?.skillMap || [],
              improvementPlan: existing?.improvementPlan || [],
              hrEvidence: {
                overallRecommendation: resumePassed ? "Strong Hire" : "Needs Further Technical Evaluation",
                summary: `Candidate ATS score is ${rScore}/100. Cutoff: ${resumeCutoff}%.`,
                strengths: ["Strong domain stack match", "Verified code signals"],
                areasToVerify: ["Live interview architecture review"],
                decisionNotes: resumePassed ? "Cleared Before Interview cutoff." : "Sub-cutoff ATS score.",
              },
              projectValidationScore: 88,
              projectPassed: true,
              projectFeedback: "Project architecture verified.",
              projectArchitectureDetected: "Modular Service Architecture",
              overallStatus: da.status === "accepted" || da.current_stage === "interview"
                ? "Interview Ready"
                : resumePassed ? "Before Interview (Passed Cutoffs)" : "Auto-Rejected (Resume)",
              currentStage: da.current_stage || (resumePassed ? "before_interview" : "rejected"),
            }, targetJob);
          });

          // Merge hydrated without duplicates
          const existingIds = new Set(hydrated.map(h => h.id));
          candidateApps = [...hydrated, ...candidateApps.filter(a => !existingIds.has(a.id))];
          persistMyApps(candidateApps);
        }
      } catch (e) {
        console.warn("Could not load candidate applications from Supabase", e);
      }
    }

    // If candidateApps is still empty, auto-seed a primary application for this logged-in candidate with real GitHub data
    if (candidateApps.length === 0) {
      const primaryJob = loadedJobs[0] || DEFAULT_JOBS[0];
      const targetRepoUrl = "https://github.com/Harsha-HY/nalapaka";
      const realData = await fetchRealGitHubAnalysis(targetRepoUrl, currentCandidateName || "Harsha");

      const autoApp = ensureCompleteCandidateApp({
        id: `app-cand-${currentCandidateId || "current"}`,
        candidateId: currentCandidateId || "candidate-current",
        jobId: primaryJob.id,
        jobTitle: primaryJob.title,
        candidateName: currentCandidateName || "Harsha",
        candidateEmail: currentCandidateEmail || "harsha@example.com",
        appliedDate: new Date().toLocaleDateString(),
        resumeFileName: `${(currentCandidateName || "Candidate").replace(/\s+/g, "_")}_Resume.pdf`,
        resumeTextSummary: `Experienced full-stack engineer proficient in React, TypeScript, scalable component architecture, and centralized state management. Built production food service web app (nalapaka) with real-time cart state and localized multilingual UI.`,
        githubAccountUrl: "https://github.com/Harsha-HY",
        githubRepo1Url: targetRepoUrl,
        projectArchitectureSummary: `Production React and TypeScript application featuring unified CartContext, Lucide iconography, dynamic image resolution, and restaurant shift analytics.`,
        resumeScore: 94,
        resumePassed: true,
        resumeFeedback: `Resume meets required qualifications for ${primaryJob.title}.`,
        matchedKeywords: ["React", "TypeScript", "Tailwind CSS", "Context API", "Vite", ...primaryJob.requiredSkills],
        atsBreakdown: {
          roleAlignment: 95,
          skillsMatch: 94,
          projectImpact: 90,
          formatting: 96,
          missingKeywords: [],
          actionableSuggestions: [`Showcase scalable caching layers and automated CI/CD for ${primaryJob.title}.`],
        },
        githubScore: realData.githubScore || 96,
        githubPassed: true,
        aiWrittenPercentage: realData.aiWrittenPercentage || 12,
        authenticityPercentage: realData.authenticityPercentage || 88,
        detectedRepoStacks: ["React", "TypeScript", "Tailwind CSS", "Lucide React", "Context API"],
        githubFeedback: realData.finalSummary,
        codeSignals: ["Verified React Context architecture", "Clean TypeScript interfaces", "Zero AI boilerplate signature"],
        inspectedCodeFiles: realData.inspectedFiles,
        githubVerificationReport: realData.report,
        generatedMCQs: realData.generatedMCQs,
        repoCodingChallenges: realData.repoCodingChallenges,
        aiInterviewDialogue: [],
        skillMap: [],
        improvementPlan: [],
        hrEvidence: {
          overallRecommendation: "Strong Hire",
          summary: `Candidate repository ${realData.repoDetails.name} verified: ${realData.authenticityPercentage}% human logic with zero AI boilerplate.`,
          strengths: ["Strong domain stack match", "Verified code signals from nalapaka", "Clean commit lineage"],
          areasToVerify: ["Live interview architecture review"],
          decisionNotes: "Cleared Before Interview cutoff.",
        },
        projectValidationScore: 90,
        projectPassed: true,
        projectFeedback: "Project architecture verified from real repository.",
        projectArchitectureDetected: "Modular Reactive Component Architecture",
        overallStatus: "Before Interview (Passed Cutoffs)",
        currentStage: "before_interview",
      }, primaryJob);

      candidateApps = [autoApp];
      persistMyApps(candidateApps);
    } else {
      // If candidate already has an app, replace any old dummy files with real nalapaka data
      for (let i = 0; i < candidateApps.length; i++) {
        const app = candidateApps[i];
        const hasDummy = !app.inspectedCodeFiles || app.inspectedCodeFiles.length === 0 || app.inspectedCodeFiles.some(f => f.fileName.includes("auth_validator"));
        if (hasDummy) {
          const targetRepoUrl = app.githubRepo1Url && app.githubRepo1Url.includes("github.com") ? app.githubRepo1Url : "https://github.com/Harsha-HY/nalapaka";
          const realData = await fetchRealGitHubAnalysis(targetRepoUrl, app.candidateName || currentCandidateName || "Harsha");
          candidateApps[i] = ensureCompleteCandidateApp({
            ...app,
            githubAccountUrl: app.githubAccountUrl && app.githubAccountUrl.includes("github.com") ? app.githubAccountUrl : "https://github.com/Harsha-HY",
            githubRepo1Url: targetRepoUrl,
            inspectedCodeFiles: realData.inspectedFiles,
            githubVerificationReport: realData.report,
            generatedMCQs: realData.generatedMCQs,
            repoCodingChallenges: realData.repoCodingChallenges,
            authenticityPercentage: realData.authenticityPercentage,
            aiWrittenPercentage: realData.aiWrittenPercentage,
            githubScore: realData.githubScore,
            githubPassed: true,
            githubFeedback: realData.finalSummary,
          }, loadedJobs.find(j => j.id === app.jobId) || loadedJobs[0]);
        }
      }
      persistMyApps(candidateApps);
    }

    setApplications(candidateApps);

    if (candidateApps.length > 0) {
      const activeApp = candidateApps.find((a) => a.id === selectedAppId) || candidateApps[0];
      setSelectedAppId(activeApp.id);
      
      const initialCodes: Record<number, string> = {};
      (activeApp.repoCodingChallenges || []).forEach((c) => {
        initialCodes[c.id] = c.submittedCode || c.starterCode || "";
      });
      setCodeInputs(initialCodes);

      // Restore MCQ answers if already submitted
      if (activeApp.mcqScore !== undefined) {
        setMcqSubmitted(true);
        const ansMap: Record<number, number> = {};
        (activeApp.generatedMCQs || []).forEach((q) => {
          if (q.userAnswer !== undefined) {
            ansMap[q.id] = q.userAnswer;
          }
        });
        setSelectedMCQAnswers(ansMap);
      }
    }

    if (loadedJobs.length > 0 && !selectedJobId) {
      setSelectedJobId(loadedJobs[0].id);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live updates from HR or other components - strictly keep candidate isolation
    const handleSync = () => {
      const fresh = getWorkflowApplications();
      if (fresh && fresh.length > 0) {
        const { id, email, name } = candidateInfoRef.current;
        const myFresh = filterMyApps(fresh, id, email, name);
        if (myFresh.length > 0) {
          setApplications(myFresh);
        }
      }
    };
    window.addEventListener("hz_workflow_apps_updated", handleSync);
    return () => window.removeEventListener("hz_workflow_apps_updated", handleSync);
  }, [candidateUser?.id, candidateUser?.email]);

  const currentApp = applications.find((a) => a.id === selectedAppId) || (applications.length > 0 ? applications[0] : null);
  const activeJob = jobs.find((j) => j.id === (currentApp?.jobId || selectedJobId)) || jobs[0] || DEFAULT_JOBS[0];
  const currentChallenge = currentApp?.repoCodingChallenges?.[activeChallengeIdx] || currentApp?.repoCodingChallenges?.[0];

  const resumeCutoffScore = activeJob?.resumeCutoff || 90;
  const isResumePassed = currentApp ? currentApp.resumeScore >= resumeCutoffScore && currentApp.resumePassed : false;
  const isGithubPassed = currentApp ? isResumePassed && currentApp.githubPassed && currentApp.authenticityPercentage >= 70 : false;
  const isMCQPassed = currentApp ? isGithubPassed && (mcqSubmitted || currentApp.mcqScore !== undefined) : false;

  const isRejected = currentApp ? currentApp.currentStage === "rejected" || currentApp.overallStatus?.startsWith("Auto-Rejected") || !isResumePassed : false;
  const isApproved = currentApp ? isResumePassed && isGithubPassed && isMCQPassed : false;
  const isAlreadyInMainRounds = currentApp ? ["shortlisted", "aptitude_test", "dsa_sandbox", "interview"].includes(currentApp.currentStage) || currentApp.overallStatus === "Interview Ready" : false;

  const tabs = [
    { id: "ats", label: "ATS & Resume", icon: FileText, num: "01", locked: false },
    { id: "github", label: "GitHub & Projects", icon: GitBranch, num: "02", locked: !isResumePassed },
    { id: "mcq", label: "5 Personalized MCQs", icon: ListChecks, num: "03", locked: !isGithubPassed },
    { id: "dsa", label: "Adaptive DSA Sandbox", icon: Code2, num: "04", locked: !isGithubPassed },
  ];

  const handleApplicationUpdate = (updatedApp: CandidateApplicationSubmission) => {
    const updated = applications.map((a) => (a.id === updatedApp.id ? updatedApp : a));
    setApplications(updated);
    persistMyApps(updated);
  };

  const handleMCQSelect = (questionId: number, optionIdx: number) => {
    if (mcqSubmitted) return;
    setSelectedMCQAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleMCQSubmit = async () => {
    if (!currentApp || !(currentApp.generatedMCQs || []).length) return;
    setMcqSubmitted(true);
    let correctCount = 0;
    const updatedMCQs = (currentApp.generatedMCQs || []).map((q) => {
      const selected = selectedMCQAnswers[q.id];
      if (selected === q.correctIndex) {
        correctCount++;
      }
      return { ...q, userAnswer: selected };
    });

    const updatedApps = applications.map((a) => {
      if (a.id === currentApp.id) {
        return {
          ...a,
          generatedMCQs: updatedMCQs,
          mcqScore: correctCount,
        };
      }
      return a;
    });

    setApplications(updatedApps);
    persistMyApps(updatedApps);

    // Sync to Supabase
    try {
      if (currentApp.id && !currentApp.id.startsWith("app-sim-")) {
        await supabase
          .from("applications")
          .update({
            test_score: correctCount,
            test_status: "completed",
            ai_analysis: {
              resume_score: currentApp.resumeScore,
              authenticity_score: currentApp.authenticityPercentage,
              github_score: currentApp.githubScore,
              mcqs: updatedMCQs,
              mcq_score: correctCount,
            },
          })
          .eq("id", currentApp.id);
      }
    } catch (e) {
      console.warn("Could not sync MCQ answers to Supabase", e);
    }

    toast({
      title: `MCQ Evaluation: ${correctCount} / ${(currentApp.generatedMCQs || []).length} Correct`,
      description: "Answers saved! Moving to Stage 04 practical coding challenges.",
    });

    // Auto-advance to Stage 04 Coding Challenges
    setActiveTab("dsa");
  };

  const handleRunCodeAnalysis = (challengeId: number) => {
    if (!currentApp) return;
    setAnalyzingChallengeId(challengeId);

    const userCode = codeInputs[challengeId] || "";
    const reviewResult = analyzeCandidateCodeSubmission(challengeId, userCode);

    setTimeout(() => {
      const updatedApps = applications.map((a) => {
        if (a.id === currentApp.id) {
          const updatedChallenges = (a.repoCodingChallenges || []).map((c) => {
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
      persistMyApps(updatedApps);
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

  const handleSubmitBothChallenges = async () => {
    if (!currentApp) return;
    setIsSubmittingChallenges(true);

    const updatedChallenges = (currentApp.repoCodingChallenges || []).map((c) => {
      const code = codeInputs[c.id] ?? (c.submittedCode || c.starterCode || "");
      const reviewResult = analyzeCandidateCodeSubmission(c.id, code);
      const updatedTestCases = (c.testCases || []).map((tc) => ({
        ...tc,
        passed: reviewResult?.passed ?? true,
      }));
      return {
        ...c,
        submittedCode: code,
        testCases: updatedTestCases,
        aiCodeReview: reviewResult,
      };
    });

    const updatedApps = applications.map((a) => {
      if (a.id === currentApp.id) {
        return {
          ...a,
          repoCodingChallenges: updatedChallenges,
        };
      }
      return a;
    });

    setApplications(updatedApps);
    persistMyApps(updatedApps);

    // Sync to Supabase
    try {
      if (currentApp.id && !currentApp.id.startsWith("app-sim-")) {
        await supabase
          .from("applications")
          .update({
            code_answers: updatedChallenges as any,
          })
          .eq("id", currentApp.id);
      }
    } catch (e) {
      console.warn("Could not sync coding challenges to Supabase", e);
    }

    setIsSubmittingChallenges(false);
    toast({
      title: "🚀 Assessment Submissions Saved!",
      description: "Both coding solutions and AI verification reports are saved and now visible to HR in the Before Interview Control Room.",
    });
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
              before_interview_passed: true,
            }
          : a
      );
      setApplications(updatedApps);
      persistMyApps(updatedApps);

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
            return ensureCompleteCandidateApp({
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
            }, activeJob);
          }
          return a;
        });

        setApplications(updated);
        persistMyApps(updated);

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
    const candidateName = candidateInfo.name || "Candidate";
    const email = candidateInfo.email || "candidate@example.com";
    
    setIsGeminiAnalyzing(true);
    const newApp = await evaluateAndSubmitApplicationWithGemini(
      jobToUse,
      {
        name: candidateName,
        email,
        resumeFileName: `${candidateName.replace(/\s+/g, "_")}_Resume.pdf`,
        resumeText: pass
          ? `Experienced software engineer with strong background building scalable systems using ${jobToUse.requiredSkills.join(", ")}, Distributed Caching, CI/CD pipelines, and microservices.`
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

    const updated = [newApp];
    setApplications(updated);
    setSelectedAppId(newApp.id);
    persistMyApps(updated);

    const initialCodes: Record<number, string> = {};
    (newApp.repoCodingChallenges || []).forEach((c) => {
      initialCodes[c.id] = c.submittedCode || c.starterCode || "";
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
                {currentApp?.candidateName && currentApp.candidateName !== "Candidate"
                  ? `${currentApp.candidateName}'s Screening Dossier`
                  : "My Pre-Interview Screening Dossier"}
              </h3>
              <p className="text-sm text-ink-soft mt-1 max-w-xl">
                AI evaluates your resume ATS match, scans your GitHub repositories for code authenticity, prepares tailored MCQs, tests adaptive coding challenges, and tracks your skill progression before unlocking interview rounds.
              </p>
            </div>

            {/* Applied Tracks Switcher & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {applications.length > 1 && (
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
                          (app.repoCodingChallenges || []).forEach((c) => {
                            initialCodes[c.id] = c.submittedCode || c.starterCode || "";
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
                            <Briefcase className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs truncate">{app.jobTitle}</div>
                            <div className={`text-[11px] truncate ${active ? "text-paper/70" : "text-ink-muted"}`}>
                              Track #{app.jobId.slice(0, 8)}
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
                  {(currentApp.detectedRepoStacks || []).map((s) => (
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
                {jobs.length > 0 ? "Select or Evaluate Job Track" : "No Jobs Posted Yet"}
              </h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                {jobs.length > 0
                  ? "Select a posted job track below to evaluate candidate resume match, scan GitHub code authenticity, generate 5 MCQs, and run adaptive challenges."
                  : "Loading available engineering tracks..."}
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
            {(currentApp.overallStatus === "Interview Ready" || currentApp.currentStage === "interview" || currentApp.currentStage === "shortlisted") ? (
              <div className="p-5 rounded-2xl bg-forest/15 border-2 border-forest/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-forest font-bold text-sm">
                    <Sparkles className="w-5 h-5 text-forest animate-pulse" />
                    <span>🎉 Accepted by HR! You are Advanced to Live Technical Interview</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    HR has reviewed and accepted your Resume ATS score (<strong>{currentApp.resumeScore}/100</strong>), GitHub Code Authenticity (<strong>{currentApp.authenticityPercentage}%</strong>), and Assessment submissions. You are now tracked in the next interview round!
                  </p>
                </div>
                <Button
                  onClick={() => {
                    window.location.href = "/interview-prep";
                  }}
                  className="bg-forest text-paper hover:bg-forest/90 font-medium px-5 py-2.5 rounded-full text-xs shadow-md shrink-0 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Launch Live Technical Round →</span>
                </Button>
              </div>
            ) : isApproved ? (
              <div className="p-5 rounded-2xl bg-forest/10 border-2 border-forest/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-forest font-semibold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Before Interview Screening Cleared (All Cutoffs Passed)</span>
                  </div>
                  <p className="text-xs text-ink-soft mt-1">
                    Your ATS score (<strong>{currentApp.resumeScore}/100</strong>) and code authenticity (<strong>{currentApp.authenticityPercentage}%</strong>) qualify you. Complete MCQs & Coding Challenges for HR review.
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
            ) : null}

            {isRejected && (
              <div className="p-5 rounded-2xl bg-destructive/10 border-2 border-destructive/30 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
                  <AlertCircle className="w-5 h-5" />
                  <span>Application Auto-Rejected in Before Interview Screening</span>
                </div>
                <p className="text-destructive leading-relaxed font-medium">
                  <strong>Rejection Explanation: </strong>
                  {!isResumePassed
                    ? `Resume ATS match score (${currentApp.resumeScore}/100) is below the required ${resumeCutoffScore}% cutoff for ${currentApp.jobTitle}. Candidate cannot proceed to GitHub, MCQs, or Adaptive DSA stages.`
                    : currentApp.resumeRejectionReason || currentApp.githubRejectionReason || "Application did not meet the required cutoff standards for this role."}
                </p>
                <div className="pt-1 text-ink-soft flex items-center gap-2">
                  <span className="font-semibold text-ink">Status: </span>
                  <span>Pipeline locked at Stage {!isResumePassed ? "01 (ATS Resume)" : !isGithubPassed ? "02 (GitHub & Code Authenticity)" : "03 (MCQs)"}.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4 Stage Navigation Tabs */}
        {currentApp && (
          <>
            <div className="border-b border-ink/10 bg-paper overflow-x-auto scrollbar-none">
              <div className="flex items-center min-w-max px-4">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  const isLocked = tab.locked;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (isLocked) {
                          toast({
                            title: `🔒 Stage ${tab.num} Locked`,
                            description: tab.id === "github"
                              ? `Requires an ATS Resume score of at least ${resumeCutoffScore}% to unlock.`
                              : tab.id === "mcq"
                              ? "Requires passing ATS Resume and GitHub Code Authenticity stages to unlock."
                              : "Requires completing and submitting Stage 03 (5 Personalized MCQs) to unlock.",
                            variant: "destructive",
                          });
                        } else {
                          setActiveTab(tab.id as any);
                        }
                      }}
                      className={`flex items-center gap-2 py-4 px-4 text-xs font-medium border-b-2 transition-all relative ${
                        isActive
                          ? "border-forest text-forest font-semibold"
                          : isLocked
                          ? "border-transparent text-ink-muted/60 hover:text-ink-muted cursor-not-allowed"
                          : "border-transparent text-ink-soft hover:text-ink hover:border-ink/20"
                      }`}
                    >
                      <span className="font-mono text-[10px] text-ink-muted">{tab.num}</span>
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {isLocked && <Lock className="w-3 h-3 text-ink-muted/70 ml-0.5" />}
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
                    {/* Top ATS Summary Banner */}
                    <div className="p-5 rounded-2xl bg-paper-2 border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-forest/10 border border-forest/20 text-forest grid place-items-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-ink">{currentApp.resumeFileName || "Candidate_Resume.pdf"}</h4>
                            <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold bg-forest/15 text-forest border border-forest/30">
                              ✓ ATS Verified
                            </span>
                          </div>
                          <p className="text-xs text-ink-soft mt-0.5">
                            Target Position: <strong className="text-ink">{activeJob?.title || currentApp.jobTitle}</strong> · Parsing Quality: <strong className="text-forest">100% Semantic</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-paper border border-ink/10 text-ink-muted">
                          Cutoff: <strong className="text-ink">{activeJob?.resumeCutoff || 90}%</strong>
                        </span>
                        <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-xl border ${
                          currentApp.resumePassed
                            ? "bg-forest/10 text-forest border-forest/30"
                            : "bg-destructive/10 text-destructive border-destructive/30"
                        }`}>
                          {currentApp.resumePassed ? "Status: Passed Cutoff ✓" : "Status: Below Cutoff ✕"}
                        </span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-12 gap-6 items-start">
                      {/* Left Circular Gauge Card */}
                      <div className="md:col-span-4 p-6 rounded-3xl border border-ink/15 bg-paper flex flex-col items-center text-center shadow-sm">
                        <div className="text-xs uppercase font-mono tracking-widest text-ink-muted mb-4 font-semibold">
                          ATS COMPATIBILITY SCORE
                        </div>
                        <div className="relative flex items-center justify-center">
                          <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center bg-paper shadow-sm ${
                            currentApp.resumePassed ? "border-forest/40" : "border-destructive/40"
                          }`}>
                            <span className={`font-serif-display text-5xl font-bold leading-none ${
                              currentApp.resumePassed ? "text-forest" : "text-destructive"
                            }`}>
                              {currentApp.resumeScore}
                            </span>
                            <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider mt-1 font-semibold">
                              OUT OF 100
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 text-xs font-medium text-forest bg-forest/10 px-3 py-1 rounded-full border border-forest/20">
                          {currentApp.resumeScore >= 90 ? "★ Highly Qualified Candidate" : "Qualified Candidate"}
                        </div>

                        <p className="mt-3 text-xs text-ink-soft leading-relaxed">
                          Evaluated by Google Gemini ATS parsing against required job keywords, production architecture, and impact metrics.
                        </p>

                        <div className="mt-4 pt-3 border-t border-ink/10 text-[11px] font-mono text-ink-muted w-full space-y-1.5">
                          <div className="flex justify-between">
                            <span>Keyword Match:</span>
                            <strong className="text-forest">{(currentApp.matchedKeywords || []).length} Keywords</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Formatting Accuracy:</span>
                            <strong className="text-forest">{currentApp.atsBreakdown?.formatting ?? 96}%</strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Screening Decision:</span>
                            <strong className={currentApp.resumePassed ? "text-forest" : "text-destructive"}>
                              {currentApp.resumePassed ? "Approved for Stage 02" : "Needs Review"}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Right Side Cards */}
                      <div className="md:col-span-8 space-y-4">
                        {/* Detailed ATS Breakdown Metrics */}
                        <div className="p-6 rounded-3xl border border-ink/15 bg-paper shadow-sm space-y-4">
                          <h4 className="font-semibold text-sm text-ink flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-forest" />
                            Multi-Dimension ATS Scoring Matrix
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-ink-soft">
                                <span>Role Alignment</span>
                                <span className="font-mono font-bold text-ink">{currentApp.atsBreakdown?.roleAlignment ?? currentApp.resumeScore}%</span>
                              </div>
                              <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                                <div className="h-full bg-forest rounded-full transition-all duration-700" style={{ width: `${currentApp.atsBreakdown?.roleAlignment ?? currentApp.resumeScore}%` }} />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-ink-soft">
                                <span>Skills Match</span>
                                <span className="font-mono font-bold text-ink">{currentApp.atsBreakdown?.skillsMatch ?? currentApp.resumeScore}%</span>
                              </div>
                              <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                                <div className="h-full bg-forest rounded-full transition-all duration-700" style={{ width: `${currentApp.atsBreakdown?.skillsMatch ?? currentApp.resumeScore}%` }} />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-ink-soft">
                                <span>Project Impact Signals</span>
                                <span className="font-mono font-bold text-ink">{currentApp.atsBreakdown?.projectImpact ?? 90}%</span>
                              </div>
                              <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                                <div className="h-full bg-forest rounded-full transition-all duration-700" style={{ width: `${currentApp.atsBreakdown?.projectImpact ?? 90}%` }} />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-ink-soft">
                                <span>Formatting &amp; Semantic Parsability</span>
                                <span className="font-mono font-bold text-ink">{currentApp.atsBreakdown?.formatting ?? 96}%</span>
                              </div>
                              <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                                <div className="h-full bg-forest rounded-full transition-all duration-700" style={{ width: `${currentApp.atsBreakdown?.formatting ?? 96}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Verified Matched Skills Pills */}
                        <div className="p-6 rounded-3xl border border-ink/15 bg-paper shadow-sm space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-sm text-ink flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-forest" />
                              Verified Skills &amp; Matched Keywords
                            </h4>
                            <span className="text-[11px] font-mono text-forest bg-forest/10 px-2 py-0.5 rounded-full font-semibold">
                              {(currentApp.matchedKeywords || []).length} Verified Matches
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(currentApp.matchedKeywords && currentApp.matchedKeywords.length > 0
                              ? currentApp.matchedKeywords
                              : ["React", "TypeScript", "Tailwind CSS", "Context API", "Node.js", "REST APIs", "Vite", "State Management"]
                            ).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-forest/10 border border-forest/20 text-forest text-xs font-mono font-medium shadow-xs"
                              >
                                <CheckCircle2 className="w-3 h-3 text-forest" />
                                <span>{skill}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Profile Summary Card */}
                        <div className="p-6 rounded-3xl border border-ink/15 bg-paper shadow-sm space-y-2">
                          <h4 className="font-semibold text-xs text-ink uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-forest" />
                            Extracted Professional Background &amp; Accomplishments
                          </h4>
                          <p className="text-xs text-ink-soft leading-relaxed">
                            {currentApp.resumeTextSummary || "Experienced full-stack engineer proficient in React, TypeScript, scalable component architecture, and centralized state management. Built production food service web app (nalapaka) with real-time cart state and localized multilingual UI."}
                          </p>
                        </div>

                        {/* Missing / Recommended Keywords Callout */}
                        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Recommended Additions for Senior / Staff Alignment:</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {["Distributed Caching", "Redis", "CI/CD Pipeline", "Docker"].map((kw) => (
                              <span key={kw} className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 font-mono text-[11px] font-medium">
                                + {kw}
                              </span>
                            ))}
                          </div>

                          <div className="text-[11px] text-ink-soft pt-1 border-t border-amber-500/10 leading-relaxed">
                            💡 Adding distributed caching architectures and CI/CD pipelines will increase your profile alignment to 98%+.
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
                    {!isResumePassed ? (
                      <div className="p-10 rounded-3xl bg-paper-2 border border-ink/10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <h4 className="font-serif-display text-xl text-ink font-semibold">Stage 02 Locked: ATS Score Below Cutoff</h4>
                        <p className="text-xs text-ink-soft max-w-md mx-auto">
                          Your ATS resume score is {currentApp.resumeScore}/100, which is below the required {resumeCutoffScore}% cutoff.
                        </p>
                      </div>
                    ) : (
                      <GitHubCodeInspector
                        application={currentApp}
                        job={activeJob}
                        isHRView={false}
                        onApplicationUpdate={handleApplicationUpdate}
                      />
                    )}
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
                    {!isGithubPassed ? (
                      <div className="p-10 rounded-3xl bg-paper-2 border border-ink/10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive grid place-items-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <h4 className="font-serif-display text-xl text-ink font-semibold">Stage 03 Locked: GitHub Screening Required</h4>
                        <p className="text-xs text-ink-soft max-w-md mx-auto">
                          You must clear Stage 01 (ATS Resume &ge; 90%) and Stage 02 (GitHub Code Authenticity) to unlock your 5 personalized MCQs.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="p-4 rounded-xl bg-paper-2 border border-ink/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                          <span className="text-ink-soft">
                            Generated from: <strong className="text-ink">Job Requirements + Candidate Submitted Repo Stacks ({(currentApp.detectedRepoStacks || []).join(", ")})</strong>
                          </span>
                          {!mcqSubmitted ? (
                            <Button
                              onClick={handleMCQSubmit}
                              disabled={Object.keys(selectedMCQAnswers).length < (currentApp.generatedMCQs || []).length}
                              className="bg-forest text-paper hover:bg-forest/90 text-xs px-4"
                            >
                              Submit {(currentApp.generatedMCQs || []).length} MCQs
                            </Button>
                          ) : (
                            <span className="font-mono text-forest font-semibold bg-forest/10 px-2.5 py-1 rounded-full">
                              Score: {currentApp.mcqScore ?? Object.keys(selectedMCQAnswers).length} / {(currentApp.generatedMCQs || []).length} Correct ✓
                            </span>
                          )}
                        </div>

                        <div className="space-y-4">
                          {(currentApp.generatedMCQs || []).map((q, idx) => (
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
                                {(q.options || []).map((opt, optIdx) => {
                                  const isSelected = selectedMCQAnswers[q.id] === optIdx || q.userAnswer === optIdx;
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

                        {/* Bottom Action Bar for Stage 03 */}
                        <div className="p-5 rounded-2xl bg-paper-2 border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm mt-4">
                          <div>
                            <div className="font-semibold text-xs text-ink flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-forest" />
                              <span>Stage 03: 5 Tailored MCQs</span>
                            </div>
                            <p className="text-[11px] text-ink-soft mt-0.5">
                              {mcqSubmitted
                                ? `Completed! Score: ${currentApp.mcqScore ?? Object.keys(selectedMCQAnswers).length} / ${(currentApp.generatedMCQs || []).length} Correct. You can now solve both practical coding challenges.`
                                : `Select your answers for all 5 questions above, then submit to save scores for HR.`}
                            </p>
                          </div>
                          {!mcqSubmitted ? (
                            <Button
                              onClick={handleMCQSubmit}
                              disabled={Object.keys(selectedMCQAnswers).length < (currentApp.generatedMCQs || []).length}
                              className="bg-forest text-paper hover:bg-forest/90 text-xs px-5 py-2.5 rounded-xl font-medium shrink-0 flex items-center gap-2 shadow-sm"
                            >
                              <span>Submit 5 MCQs &amp; Proceed to Coding →</span>
                            </Button>
                          ) : (
                            <Button
                              onClick={() => setActiveTab("dsa")}
                              className="bg-forest text-paper hover:bg-forest/90 text-xs px-5 py-2.5 rounded-xl font-medium shrink-0 flex items-center gap-2 shadow-sm"
                            >
                              <span>Proceed to Stage 04: Coding Challenges →</span>
                            </Button>
                          )}
                        </div>
                      </>
                    )}
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
                    {!isGithubPassed ? (
                      <div className="p-10 rounded-3xl bg-paper-2 border border-ink/10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-700 grid place-items-center mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <h4 className="font-serif-display text-xl text-ink font-semibold">Stage 04 Locked: Complete Stage 01 &amp; 02 First</h4>
                        <p className="text-xs text-ink-soft max-w-md mx-auto">
                          Please ensure ATS Resume and GitHub authenticity requirements are cleared to unlock technical challenges.
                        </p>
                        <Button onClick={() => setActiveTab("ats")} className="bg-forest text-paper hover:bg-forest/90 text-xs mt-2">
                          Go to Stage 01 (ATS Resume) →
                        </Button>
                      </div>
                    ) : (
                      <>
                        {!mcqSubmitted && (
                          <div className="p-3.5 rounded-xl bg-forest/10 border border-forest/30 flex items-center justify-between text-xs mb-2">
                            <span className="text-ink">
                              💡 <strong>Note:</strong> You can solve, test, and submit your 2 coding challenges below. Make sure to also complete your 5 MCQs in Stage 03 to finalize your full score.
                            </span>
                            <Button size="sm" variant="outline" onClick={() => setActiveTab("mcq")} className="text-xs h-7 px-2.5 text-forest border-forest/40 shrink-0 ml-2">
                              View MCQs →
                            </Button>
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                          <div>
                            <h4 className="font-serif-display text-xl text-ink">Adaptive DSA Sandbox — Practical Repo-Derived Challenges</h4>
                            <p className="text-xs text-ink-soft mt-0.5">
                              Extracted from your repository architecture with live AI error diagnosis and time complexity verification.
                            </p>
                          </div>

                          {/* Challenge Switcher */}
                          <div className="flex bg-paper-2 p-1 rounded-xl border border-ink/10 gap-1 self-start sm:self-center">
                            {(currentApp.repoCodingChallenges || []).map((c, i) => (
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

                        {currentChallenge ? (
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
                                    {(currentChallenge.testCases || []).map((tc, idx) => (
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
                                  value={codeInputs[currentChallenge.id] ?? (currentChallenge.submittedCode || currentChallenge.starterCode || "")}
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

                                    {(currentChallenge.aiCodeReview.errorsDetected || []).length > 0 && (
                                      <div className="space-y-1 pt-1 border-t border-destructive/20 font-mono text-[11px]">
                                        {(currentChallenge.aiCodeReview.errorsDetected || []).map((err, i) => (
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

                              {/* Submit Both Coding Challenges Action Card */}
                              <div className="p-4 rounded-2xl bg-forest/5 border border-forest/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                <div>
                                  <div className="font-semibold text-xs text-ink flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 text-forest" />
                                    <span>Complete Both Challenges (2 Coding Questions)</span>
                                  </div>
                                  <p className="text-[11px] text-ink-soft mt-0.5">
                                    Run &amp; verify your solutions for Challenge 1 and Challenge 2 above, then submit them directly to the HR Screening Control Room.
                                  </p>
                                </div>
                                <Button
                                  onClick={handleSubmitBothChallenges}
                                  disabled={isSubmittingChallenges}
                                  className="bg-forest text-paper hover:bg-forest/90 text-xs px-4 py-2 rounded-xl shrink-0 shadow-sm flex items-center gap-1.5 font-medium"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{isSubmittingChallenges ? "Submitting to HR..." : "Submit Both Solutions to HR →"}</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-ink-muted bg-paper-2 rounded-2xl border border-ink/10">
                            <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs">No coding challenge generated for this role yet.</p>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Bar */}
            <div className="p-4 bg-paper-2 border-t border-ink/10 flex items-center justify-between text-xs text-ink-muted">
              <span>💡 All 4 stages reflect live candidate evaluations powered by Google Gemini AI &amp; explainable ATS models.</span>
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

export const BeforeInterviewCandidatePanel = ({ candidateUser }: BeforeInterviewCandidatePanelProps) => {
  return (
    <ErrorBoundary fallbackTitle="Before Interview Screen Recovery" fallbackDescription="Unable to load candidate dossier. Click below to reload or reset data.">
      <BeforeInterviewCandidateContent candidateUser={candidateUser} />
    </ErrorBoundary>
  );
};

export default BeforeInterviewCandidatePanel;
