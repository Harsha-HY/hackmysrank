import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, GitBranch, ListChecks, Code2, Bot, Award, CheckCircle2,
  AlertCircle, Sparkles, ArrowRight, ShieldCheck, HelpCircle, ChevronRight,
  ExternalLink, Layers, Database, Cpu, Terminal
} from "lucide-react";
import { DEMO_CANDIDATES, CandidateProfile } from "@/lib/candidateAnalyzer";

export const CandidateAnalyzerDemo = () => {
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<"candidateA" | "candidateB">("candidateA");
  const [activeTab, setActiveTab] = useState<"ats" | "github" | "mcq" | "dsa" | "interview" | "scorecard" | "hrevidence">("ats");

  const candidate: CandidateProfile = DEMO_CANDIDATES[selectedCandidateKey];

  const candidateOptions = [
    {
      key: "candidateA" as const,
      name: "Aarav Sharma",
      role: "AI & Computer Vision Engineer",
      stack: "Python · OpenCV · PyTorch · FastAPI",
      badgeColor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    },
    {
      key: "candidateB" as const,
      name: "Priya Patel",
      role: "Senior Fullstack Engineer",
      stack: "React · TypeScript · Node.js · PostgreSQL",
      badgeColor: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    },
  ];

  const tabs = [
    { id: "ats", label: "ATS & Resume", icon: FileText, num: "01" },
    { id: "github", label: "GitHub & Projects", icon: GitBranch, num: "02" },
    { id: "mcq", label: "5 Personalized MCQs", icon: ListChecks, num: "03" },
    { id: "dsa", label: "Adaptive DSA Sandbox", icon: Code2, num: "04" },
    { id: "interview", label: "Dynamic AI Interview", icon: Bot, num: "05" },
    { id: "scorecard", label: "Skill Map & Plan", icon: Award, num: "06" },
    { id: "hrevidence", label: "HR Evidence Decision", icon: ShieldCheck, num: "07" },
  ];

  return (
    <div className="w-full rounded-2xl md:rounded-[28px] border border-ink/15 bg-paper shadow-2xl overflow-hidden">
      {/* Top Header: Interactive Candidate Profile Selector */}
      <div className="p-6 md:p-8 bg-paper-2 border-b border-ink/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider bg-forest/10 text-forest border border-forest/20 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Live Interactive Analyzer Sandbox
            </div>
            <h3 className="font-serif-display text-2xl md:text-3xl text-ink">
              Experience dynamic personalization in action
            </h3>
            <p className="text-sm text-ink-soft mt-1 max-w-xl">
              Switch between two distinct candidate profiles to see how HireZap dynamically personalizes every stage—from ATS scoring to custom MCQs, adaptive DSA, and interview probing.
            </p>
          </div>

          {/* Candidate Switcher Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 bg-paper p-1.5 rounded-2xl border border-ink/10 shrink-0">
            {candidateOptions.map((opt) => {
              const active = selectedCandidateKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setSelectedCandidateKey(opt.key)}
                  className={`flex-1 sm:w-[260px] text-left p-3 rounded-xl transition-all relative ${
                    active
                      ? "bg-ink text-paper shadow-md"
                      : "hover:bg-ink/5 text-ink"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={opt.key === "candidateA" ? DEMO_CANDIDATES.candidateA.avatar : DEMO_CANDIDATES.candidateB.avatar}
                      alt={opt.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/20 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{opt.name}</div>
                      <div className={`text-xs truncate ${active ? "text-paper/70" : "text-ink-muted"}`}>{opt.role}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] font-mono truncate opacity-80">{opt.stack}</div>
                  {active && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-forest animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Candidate Mini Profile Bar */}
        <div className="mt-6 pt-6 border-t border-ink/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-ink">{candidate.name}</span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-soft">{candidate.targetRole}</span>
            <span className="text-ink-muted">·</span>
            <span className="font-mono text-ink-muted">{candidate.experienceLevel} exp</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-muted">Claimed skills:</span>
            <div className="flex flex-wrap gap-1">
              {candidate.claimedSkills.slice(0, 5).map((s) => (
                <span key={s} className="px-2 py-0.5 rounded-md bg-ink/5 border border-ink/10 text-ink font-mono text-[11px]">
                  {s}
                </span>
              ))}
              {candidate.claimedSkills.length > 5 && (
                <span className="px-1.5 py-0.5 text-ink-muted font-mono text-[11px]">
                  +{candidate.claimedSkills.length - 5}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Navigation Tabs */}
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
              key={candidate.id + "-ats"}
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
                    <div className="w-28 h-28 rounded-full border-4 border-forest/20 flex flex-col items-center justify-center bg-paper shadow-inner">
                      <span className="font-serif-display text-4xl text-forest font-bold">{candidate.atsScore}</span>
                      <span className="text-[10px] font-mono text-ink-muted uppercase">out of 100</span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-ink-soft leading-relaxed">
                    Evaluated against job description requirements, verified project context, and keyword frequency.
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
                          <span className="font-mono font-medium text-ink">{candidate.atsBreakdown.roleAlignment}%</span>
                        </div>
                        <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                          <div className="h-full bg-forest rounded-full" style={{ width: `${candidate.atsBreakdown.roleAlignment}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-ink-soft">
                          <span>Skills Match</span>
                          <span className="font-mono font-medium text-ink">{candidate.atsBreakdown.skillsMatch}%</span>
                        </div>
                        <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                          <div className="h-full bg-forest rounded-full" style={{ width: `${candidate.atsBreakdown.skillsMatch}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-ink-soft">
                          <span>Project Impact Signals</span>
                          <span className="font-mono font-medium text-ink">{candidate.atsBreakdown.projectImpact}%</span>
                        </div>
                        <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                          <div className="h-full bg-forest rounded-full" style={{ width: `${candidate.atsBreakdown.projectImpact}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-ink-soft">
                          <span>Formatting &amp; Structure</span>
                          <span className="font-mono font-medium text-ink">{candidate.atsBreakdown.formatting}%</span>
                        </div>
                        <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                          <div className="h-full bg-forest rounded-full" style={{ width: `${candidate.atsBreakdown.formatting}%` }} />
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
                      {candidate.atsBreakdown.missingKeywords.map((kw) => (
                        <span key={kw} className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 font-mono text-[11px]">
                          {kw}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-ink-soft space-y-1">
                      <span className="font-medium text-ink">Actionable Feedback for Candidate:</span>
                      <ul className="list-disc list-inside space-y-0.5 pl-1">
                        {candidate.atsBreakdown.actionableSuggestions.map((sug, idx) => (
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
              key={candidate.id + "-github"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="p-4 rounded-xl bg-forest/5 border border-forest/15 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-forest shrink-0 mt-0.5" />
                <div className="text-xs text-ink-soft">
                  <span className="font-semibold text-ink">HireZap Integrity Principle: </span>
                  GitHub evidence is treated as a <em>signal</em>, not definitive proof of solo authorship. We inspect languages, README, commit history, and code structure to formulate precision verification questions during subsequent rounds.
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {candidate.githubProfile.inspectedRepos.map((repo) => (
                  <div key={repo.name} className="p-6 rounded-2xl border border-ink/10 bg-paper-2 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono font-semibold text-sm text-ink flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-forest" />
                          {repo.name}
                        </span>
                        <span className="text-xs font-mono text-ink-muted">★ {repo.stars}</span>
                      </div>
                      <p className="text-xs text-ink-soft mb-4">{repo.description}</p>
                      
                      <div className="text-[11px] font-semibold text-ink mb-1.5">Detected Code Signals:</div>
                      <ul className="space-y-1 mb-4 text-xs text-ink-soft">
                        {repo.codeSignals.map((sig, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-forest shrink-0">▸</span>
                            <span>{sig}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-3 border-t border-ink/10">
                      <div className="text-[11px] font-semibold text-amber-800 mb-1">Areas Formulated for AI Verification:</div>
                      <ul className="text-xs text-ink-muted space-y-0.5">
                        {repo.verificationAreas.map((area, i) => (
                          <li key={i}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Architecture */}
              <div className="p-5 rounded-2xl border border-ink/10 bg-paper">
                <h4 className="font-semibold text-sm text-ink mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-forest" />
                  Extracted Project Architecture: {candidate.projects[0].title}
                </h4>
                <p className="text-xs text-ink-soft mb-3">{candidate.projects[0].claimedFunctionality}</p>
                <div className="p-3 rounded-xl bg-ink text-paper font-mono text-xs overflow-x-auto">
                  {candidate.projects[0].architectureDetected[0]}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: 5 PERSONALIZED MCQS */}
          {activeTab === "mcq" && (
            <motion.div
              key={candidate.id + "-mcq"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="p-4 rounded-xl bg-paper-2 border border-ink/10 flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="text-ink-soft">
                  Generated from: <strong className="text-ink">Job Requirements + Candidate Skills + Project/GitHub Evidence</strong>
                </span>
                <span className="font-mono text-forest font-semibold bg-forest/10 px-2.5 py-1 rounded-full">
                  5 Personalized Questions
                </span>
              </div>

              <div className="space-y-4">
                {candidate.personalizedMCQs.map((q, idx) => (
                  <div key={q.id} className="p-5 rounded-2xl border border-ink/10 bg-paper hover:border-forest/40 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-forest text-paper text-xs font-mono font-semibold grid place-items-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-mono font-medium text-forest uppercase tracking-wider">{q.topic}</span>
                      </div>
                      <span className="text-[10px] font-mono text-ink-muted border border-ink/10 px-2 py-0.5 rounded-full hidden sm:inline">
                        {q.intersectionSource}
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
                            <span>{opt}</span>
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
              key={candidate.id + "-dsa"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Round 1 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif-display text-lg text-ink">DSA Round 1 — Baseline Competency (2 Problems)</h4>
                  <span className="text-xs font-mono text-forest bg-forest/10 px-2.5 py-1 rounded-full font-semibold">
                    100% Tests Passed
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {candidate.dsaRound1.map((p) => (
                    <div key={p.id} className="p-5 rounded-2xl border border-ink/10 bg-paper-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-semibold text-xs text-ink">{p.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 font-semibold">{p.difficulty}</span>
                      </div>
                      <p className="text-xs text-ink-soft mb-3">{p.description}</p>
                      <div className="text-[11px] font-mono text-ink-muted bg-paper p-2.5 rounded-lg border border-ink/10 mb-2">
                        <div>Approach: <span className="text-ink font-medium">{p.approachSignal}</span></div>
                        <div>Complexity: <span className="text-forest font-semibold">{p.timeComplexity}</span></div>
                      </div>
                      <div className="text-[11px] text-forest font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> All {p.testCases.length} Test Cases Passed
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Round 2: Adaptive */}
              <div className="p-6 rounded-2xl border-2 border-forest/30 bg-forest/5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-forest font-bold mb-2">
                  <Sparkles className="w-4 h-4" />
                  Round 2: Adaptive Difficulty &amp; Weak-Area Targeting
                </div>
                <div className="text-xs text-ink-soft mb-4 bg-paper p-3 rounded-xl border border-forest/20">
                  <span className="font-semibold text-ink">Adaptive Engine Trigger: </span>
                  {candidate.dsaRound2Adaptive.adaptedFromReason}
                </div>

                <div className="p-5 rounded-xl bg-paper border border-ink/10">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-semibold text-sm text-ink">{candidate.dsaRound2Adaptive.title}</h5>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-700 font-semibold">
                      {candidate.dsaRound2Adaptive.difficulty}
                    </span>
                  </div>
                  <p className="text-xs text-ink-soft mb-3">{candidate.dsaRound2Adaptive.description}</p>
                  <pre className="p-3 rounded-lg bg-ink text-paper font-mono text-xs overflow-x-auto mb-3">
                    {candidate.dsaRound2Adaptive.starterCode}
                  </pre>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-ink-muted border-t border-ink/10 pt-2">
                    <span>Signal: {candidate.dsaRound2Adaptive.approachSignal}</span>
                    <span className="text-forest font-bold">Complexity: {candidate.dsaRound2Adaptive.timeComplexity}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 5: DYNAMIC AI INTERVIEW */}
          {activeTab === "interview" && (
            <motion.div
              key={candidate.id + "-interview"}
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
                {candidate.aiInterviewDialogue.map((turn) => (
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
                      <img src={candidate.avatar} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-semibold text-ink">{candidate.name}: </span>
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
              key={candidate.id + "-scorecard"}
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
                  {candidate.skillMap.map((s) => {
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
                  Even if not selected, HireZap empowers candidates with high-yield next steps derived from detected assessment gaps.
                </p>

                <div className="space-y-3">
                  {candidate.improvementPlan.map((plan, i) => (
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
              key={candidate.id + "-hrevidence"}
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
                      Recommendation: <span className="text-forest">{candidate.hrEvidence.overallRecommendation}</span>
                    </h4>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-forest text-paper font-mono text-xs font-semibold flex items-center gap-1.5 self-start">
                    <ShieldCheck className="w-4 h-4" /> Evidence Confirmed
                  </div>
                </div>

                <p className="text-xs text-ink-soft leading-relaxed mb-5 bg-paper p-4 rounded-xl border border-ink/10">
                  {candidate.hrEvidence.summary}
                </p>

                <div className="grid sm:grid-cols-2 gap-4 text-xs mb-5">
                  <div className="p-4 rounded-xl bg-forest/5 border border-forest/20">
                    <div className="font-semibold text-forest mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Verified Strengths
                    </div>
                    <ul className="space-y-1 text-ink-soft">
                      {candidate.hrEvidence.strengths.map((str, i) => (
                        <li key={i}>• {str}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-600" /> Areas to Clarify / Onboard
                    </div>
                    <ul className="space-y-1 text-ink-soft">
                      {candidate.hrEvidence.areasToVerify.map((area, i) => (
                        <li key={i}>• {area}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-ink text-paper text-xs flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <span className="font-semibold text-forest">Recruiter Final Action: </span>
                    <span>{candidate.hrEvidence.decisionNotes}</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-full bg-forest text-paper font-medium hover:bg-forest/90 transition-colors">
                      Advance to Offer
                    </button>
                    <button className="px-4 py-2 rounded-full border border-white/20 text-paper hover:bg-white/10 transition-colors">
                      Schedule Final Chat
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer bar with quick hint */}
      <div className="p-4 bg-paper-2 border-t border-ink/10 flex items-center justify-between text-xs text-ink-muted">
        <span>💡 Click through the numbered tabs above or change candidate profiles to inspect live variations.</span>
        <span className="font-mono text-[11px] text-forest font-medium hidden sm:inline">100% Explainable AI Verification</span>
      </div>
    </div>
  );
};

export default CandidateAnalyzerDemo;
