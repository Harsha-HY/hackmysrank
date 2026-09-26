import { useState } from "react";
import { motion } from "framer-motion";
import { Award, CheckCircle2, AlertTriangle, ArrowUpRight, TrendingUp, Sparkles, BookOpen } from "lucide-react";
import { DEMO_CANDIDATES } from "@/lib/candidateAnalyzer";

export const ScorecardPreview = () => {
  const [candidateKey, setCandidateKey] = useState<"candidateA" | "candidateB">("candidateA");
  const candidate = DEMO_CANDIDATES[candidateKey];

  return (
    <div className="w-full p-6 md:p-10 rounded-3xl border border-ink/15 bg-paper shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-ink/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-forest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Transparent AI Scorecard Layer
          </div>
          <h3 className="font-serif-display text-2xl md:text-3xl text-ink">
            No Black-Box Verdicts. Complete Transparency.
          </h3>
          <p className="text-sm text-ink-soft mt-1">
            Every candidate receives an evidence-backed skill breakdown with actionable growth recommendations.
          </p>
        </div>

        {/* Profile Toggle */}
        <div className="flex bg-paper-2 p-1 rounded-xl border border-ink/10 self-start md:self-center">
          <button
            onClick={() => setCandidateKey("candidateA")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              candidateKey === "candidateA" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            Aarav (AI/CV)
          </button>
          <button
            onClick={() => setCandidateKey("candidateB")}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
              candidateKey === "candidateB" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
            }`}
          >
            Priya (Fullstack)
          </button>
        </div>
      </div>

      {/* Candidate Scorecard Highlights Table */}
      <div className="grid md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Stage by Stage Scores */}
        <div className="md:col-span-6 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
            Assessment Stage Scores &amp; Verification Evidence
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3.5 rounded-xl border border-ink/10 bg-paper-2 flex items-center justify-between">
              <span className="font-semibold text-ink">1. ATS Resume Match</span>
              <span className="font-mono font-bold text-forest">{candidate.atsScore}/100</span>
            </div>
            <div className="p-3.5 rounded-xl border border-ink/10 bg-paper-2 flex items-center justify-between">
              <span className="font-semibold text-ink">2. GitHub Code Signals</span>
              <span className="font-mono text-emerald-700 font-semibold">Strong Code Evidence</span>
            </div>
            <div className="p-3.5 rounded-xl border border-ink/10 bg-paper-2 flex items-center justify-between">
              <span className="font-semibold text-ink">3. Project Architecture</span>
              <span className="font-mono font-bold text-forest">91/100 (Verified)</span>
            </div>
            <div className="p-3.5 rounded-xl border border-ink/10 bg-paper-2 flex items-center justify-between">
              <span className="font-semibold text-ink">4. 5-MCQ Personalized Test</span>
              <span className="font-mono font-bold text-forest">5 / 5 Correct</span>
            </div>
            <div className="p-3.5 rounded-xl border border-ink/10 bg-paper-2 flex items-center justify-between">
              <span className="font-semibold text-ink">5. DSA Round 1 (2 Problems)</span>
              <span className="font-mono font-bold text-forest">100% Passed</span>
            </div>
            <div className="p-3.5 rounded-xl border border-ink/10 bg-forest/10 border-forest/20 flex items-center justify-between">
              <span className="font-semibold text-ink">6. Adaptive DSA Round 2</span>
              <span className="font-mono font-bold text-forest">Hard Tier Passed</span>
            </div>
            <div className="p-3.5 rounded-xl border border-ink/10 bg-paper-2 flex items-center justify-between">
              <span className="font-semibold text-ink">7. Dynamic AI Interview</span>
              <span className="font-mono text-forest font-bold">Top 5% Depth</span>
            </div>
          </div>
        </div>

        {/* Right Column: Skill Map & Growth Action Plan */}
        <div className="md:col-span-6 space-y-6">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-2">
              Demonstrated Skill Matrix
            </div>
            <div className="flex flex-wrap gap-2">
              {candidate.skillMap.slice(0, 6).map((s) => {
                let badge = "bg-emerald-500/10 text-emerald-800 border-emerald-500/30";
                if (s.status === "Developing") badge = "bg-blue-500/10 text-blue-800 border-blue-500/30";
                if (s.status === "Needs Improvement") badge = "bg-amber-500/10 text-amber-900 border-amber-500/30";
                return (
                  <div key={s.skill} className={`px-3 py-1.5 rounded-xl border text-xs flex items-center gap-2 ${badge}`}>
                    <span className="font-medium">{s.skill}</span>
                    <span className="font-mono text-[10px] uppercase font-bold opacity-80">({s.status})</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-ink/10 bg-paper-2">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-forest font-bold mb-3">
              <BookOpen className="w-4 h-4" />
              Targeted Next Steps (Personalized Plan)
            </div>
            <div className="space-y-2.5 text-xs">
              {candidate.improvementPlan.map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-paper border border-ink/5">
                  <div className="font-semibold text-ink">{p.area}</div>
                  <div className="text-ink-soft text-[11px] mt-0.5">{p.recommendation}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScorecardPreview;
