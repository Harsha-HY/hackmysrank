import { useState } from "react";
import {
  ShieldCheck, CheckCircle2, HelpCircle, FileText, GitBranch,
  Code2, Bot, ArrowRight, Award, UserCheck, AlertTriangle
} from "lucide-react";
import { DEMO_CANDIDATES } from "@/lib/candidateAnalyzer";

export const HREvidenceView = () => {
  const [selectedKey, setSelectedKey] = useState<"candidateA" | "candidateB">("candidateA");
  const candidate = DEMO_CANDIDATES[selectedKey];

  return (
    <div className="space-y-6">
      {/* Header & Candidate Switcher */}
      <div className="p-6 md:p-8 rounded-3xl bg-paper border border-ink/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest/10 text-forest text-xs font-mono uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Explainable AI Decision Studio
          </div>
          <h2 className="font-serif-display text-2xl md:text-3xl text-ink">
            Recruiter Evidence &amp; Verification Dossier
          </h2>
          <p className="text-sm text-ink-soft mt-1 max-w-xl">
            AI provides structured evidence, candidate assessment logs, and grounded recommendations. HR remains the final hiring authority.
          </p>
        </div>

        <div className="flex bg-paper-2 p-1.5 rounded-2xl border border-ink/10 self-start md:self-center gap-2">
          <button
            onClick={() => setSelectedKey("candidateA")}
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-all ${
              selectedKey === "candidateA" ? "bg-ink text-paper shadow" : "text-ink hover:bg-ink/5"
            }`}
          >
            Aarav (AI / CV)
          </button>
          <button
            onClick={() => setSelectedKey("candidateB")}
            className={`px-4 py-2 text-xs font-medium rounded-xl transition-all ${
              selectedKey === "candidateB" ? "bg-ink text-paper shadow" : "text-ink hover:bg-ink/5"
            }`}
          >
            Priya (Fullstack)
          </button>
        </div>
      </div>

      {/* Candidate Snapshot Card */}
      <div className="p-6 rounded-3xl border border-forest/30 bg-forest/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img src={candidate.avatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-forest" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-display text-2xl text-ink">{candidate.name}</h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-forest text-paper font-semibold">
                {candidate.hrEvidence.overallRecommendation}
              </span>
            </div>
            <p className="text-xs text-ink-soft mt-0.5">{candidate.targetRole} · {candidate.experienceLevel} Experience</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-5 py-2.5 rounded-full bg-forest text-paper text-xs font-medium hover:bg-ink transition-colors shadow">
            Generate Offer Letter
          </button>
          <button className="px-5 py-2.5 rounded-full border border-ink/20 text-ink text-xs font-medium hover:bg-ink/5 transition-colors">
            Share Dossier with Manager
          </button>
        </div>
      </div>

      {/* Synthesis & Evidence Notes */}
      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl border border-ink/10 bg-paper">
            <h4 className="font-serif-display text-lg text-ink mb-2">Executive AI Synthesis</h4>
            <p className="text-xs text-ink-soft leading-relaxed">{candidate.hrEvidence.summary}</p>

            <div className="mt-5 space-y-3">
              <div className="p-4 rounded-xl bg-forest/10 border border-forest/20 text-xs">
                <span className="font-semibold text-forest flex items-center gap-1.5 mb-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Demonstrated Key Strengths
                </span>
                <ul className="space-y-1 text-ink-soft">
                  {candidate.hrEvidence.strengths.map((s, i) => (
                    <li key={i}>• {s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                <span className="font-semibold text-amber-800 flex items-center gap-1.5 mb-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" /> Focus Areas for Onboarding
                </span>
                <ul className="space-y-1 text-ink-soft">
                  {candidate.hrEvidence.areasToVerify.map((a, i) => (
                    <li key={i}>• {a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl border border-ink/10 bg-paper">
            <h4 className="font-serif-display text-lg text-ink mb-3">Stage Signal Breakdown</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-paper-2 border border-ink/5">
                <span className="text-ink-soft">ATS Resume Score</span>
                <span className="font-mono font-bold text-forest">{candidate.atsScore}/100</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-paper-2 border border-ink/5">
                <span className="text-ink-soft">GitHub Repos Checked</span>
                <span className="font-mono font-bold text-ink">{candidate.githubProfile.reposCount} active repos</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-paper-2 border border-ink/5">
                <span className="text-ink-soft">5-MCQ Personalized</span>
                <span className="font-mono font-bold text-forest">100% Correct</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-paper-2 border border-ink/5">
                <span className="text-ink-soft">DSA Round 1 + Round 2</span>
                <span className="font-mono font-bold text-forest">Adaptive Solved</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-paper-2 border border-ink/5">
                <span className="text-ink-soft">AI Project Probing</span>
                <span className="font-mono font-bold text-forest">High Depth (3/3)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HREvidenceView;
