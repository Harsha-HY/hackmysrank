import { useState } from "react";
import { motion } from "framer-motion";
import {
  Award, CheckCircle2, AlertCircle, Sparkles, BookOpen,
  ArrowRight, ShieldCheck, FileText, GitBranch, Code2, Bot
} from "lucide-react";
import { DEMO_CANDIDATES } from "@/lib/candidateAnalyzer";

export const CandidateScorecardView = ({ candidateKey = "candidateA" }: { candidateKey?: "candidateA" | "candidateB" }) => {
  const [selectedKey, setSelectedKey] = useState<"candidateA" | "candidateB">(candidateKey);
  const candidate = DEMO_CANDIDATES[selectedKey];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-forest text-paper shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper/15 text-paper text-xs font-mono uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Continuous AI Analyzer Scorecard
          </div>
          <h2 className="font-serif-display text-3xl md:text-4xl text-paper">
            {candidate.name}'s Verified Hiring Portfolio
          </h2>
          <p className="text-sm text-paper/80 mt-1 max-w-xl">
            {candidate.targetRole} · Evaluated across ATS, GitHub signals, 5 personalized MCQs, 2-round Adaptive DSA, and dynamic project interview.
          </p>
        </div>

        <div className="flex bg-paper/10 p-1 rounded-2xl border border-white/20 self-start md:self-center">
          <button
            onClick={() => setSelectedKey("candidateA")}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl transition-all ${
              selectedKey === "candidateA" ? "bg-paper text-forest font-semibold shadow" : "text-paper hover:bg-white/10"
            }`}
          >
            Aarav (AI/CV)
          </button>
          <button
            onClick={() => setSelectedKey("candidateB")}
            className={`px-3.5 py-2 text-xs font-medium rounded-xl transition-all ${
              selectedKey === "candidateB" ? "bg-paper text-forest font-semibold shadow" : "text-paper hover:bg-white/10"
            }`}
          >
            Priya (Fullstack)
          </button>
        </div>
      </div>

      {/* Stage Breakdown Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-ink/10 bg-paper">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-mono">STAGE 01</span>
            <FileText className="w-4 h-4 text-forest" />
          </div>
          <div className="text-sm font-semibold text-ink">ATS Alignment</div>
          <div className="font-serif-display text-3xl text-forest mt-2">{candidate.atsScore}/100</div>
          <div className="text-xs text-ink-soft mt-1">Keywords &amp; JD matched</div>
        </div>

        <div className="p-5 rounded-2xl border border-ink/10 bg-paper">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-mono">STAGE 02</span>
            <GitBranch className="w-4 h-4 text-forest" />
          </div>
          <div className="text-sm font-semibold text-ink">GitHub Code Signals</div>
          <div className="font-serif-display text-3xl text-forest mt-2">Verified</div>
          <div className="text-xs text-ink-soft mt-1">{candidate.githubProfile.reposCount} Repositories Analyzed</div>
        </div>

        <div className="p-5 rounded-2xl border border-ink/10 bg-paper">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-mono">STAGE 03 &amp; 04</span>
            <Code2 className="w-4 h-4 text-forest" />
          </div>
          <div className="text-sm font-semibold text-ink">Adaptive DSA Sandbox</div>
          <div className="font-serif-display text-3xl text-forest mt-2">100% Passed</div>
          <div className="text-xs text-ink-soft mt-1">Round 1 + Hard Adaptive R2</div>
        </div>

        <div className="p-5 rounded-2xl border border-ink/10 bg-paper">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-2">
            <span className="font-mono">STAGE 05</span>
            <Bot className="w-4 h-4 text-forest" />
          </div>
          <div className="text-sm font-semibold text-ink">AI Project Interview</div>
          <div className="font-serif-display text-3xl text-forest mt-2">Strong Depth</div>
          <div className="text-xs text-ink-soft mt-1">All architecture points verified</div>
        </div>
      </div>

      {/* Transparent Skill Matrix */}
      <div className="p-6 md:p-8 rounded-3xl border border-ink/10 bg-paper shadow-sm">
        <h3 className="font-serif-display text-2xl text-ink mb-1">Demonstrated vs. Developing Skill Matrix</h3>
        <p className="text-xs text-ink-soft mb-6">
          HireZap classifies candidate performance into clear rubrics with evidence notes tied to actual code and answers.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidate.skillMap.map((s) => {
            let badge = "bg-emerald-500/10 text-emerald-800 border-emerald-500/30";
            if (s.status === "Developing") badge = "bg-blue-500/10 text-blue-800 border-blue-500/30";
            if (s.status === "Needs Improvement") badge = "bg-amber-500/10 text-amber-900 border-amber-500/30";
            if (s.status === "Not Assessed") badge = "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";

            return (
              <div key={s.skill} className="p-4 rounded-2xl border border-ink/10 bg-paper-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-ink">{s.skill}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${badge}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-ink-muted uppercase mb-3">{s.category}</div>
                </div>
                <div className="text-xs text-ink-soft border-t border-ink/5 pt-2 leading-relaxed">
                  {s.evidenceNote}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Personalized Improvement Plan */}
      <div className="p-6 md:p-8 rounded-3xl border border-ink/10 bg-paper shadow-sm">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-forest font-bold mb-2">
          <BookOpen className="w-4 h-4" />
          Personalized Growth &amp; Improvement Plan
        </div>
        <h3 className="font-serif-display text-2xl text-ink mb-1">Actionable Next Steps</h3>
        <p className="text-xs text-ink-soft mb-6">
          Continuous recommendations derived from candidate code analysis and knowledge boundary probing.
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          {candidate.improvementPlan.map((p, idx) => (
            <div key={idx} className="p-5 rounded-2xl border border-ink/10 bg-paper-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-ink">{p.area}</span>
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded">
                    {p.priority}
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed mb-4">{p.recommendation}</p>
              </div>
              <div className="text-xs text-forest font-mono pt-3 border-t border-ink/10">
                Suggested Action: {p.suggestedAction}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CandidateScorecardView;
