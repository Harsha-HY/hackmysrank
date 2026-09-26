import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, UserCheck, ScanSearch, Fingerprint, ListChecks,
  Code2, GitBranch, GitPullRequest, Bot, Video, FileSpreadsheet, Award,
  ArrowRight, CheckCircle2, ChevronRight
} from "lucide-react";
import { HIREZAP_12_STEPS } from "@/lib/candidateAnalyzer";

const iconMap: Record<string, any> = {
  Briefcase,
  UserCheck,
  ScanSearch,
  Fingerprint,
  ListChecks,
  Code2,
  GitBranch,
  GitPullRequest,
  Bot,
  Video,
  FileSpreadsheet,
  Award,
};

export const WorkflowVisualizer = () => {
  const [activeStep, setActiveStep] = useState(1);
  const currentStepData = HIREZAP_12_STEPS.find((s) => s.step === activeStep) || HIREZAP_12_STEPS[0];
  const CurrentIcon = iconMap[currentStepData.icon] || Award;

  return (
    <div className="w-full">
      {/* 12 Step Grid Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {HIREZAP_12_STEPS.map((item) => {
          const Icon = iconMap[item.icon] || Briefcase;
          const isActive = item.step === activeStep;
          const isPassed = item.step < activeStep;

          return (
            <button
              key={item.step}
              onClick={() => setActiveStep(item.step)}
              className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between min-h-[110px] ${
                isActive
                  ? "bg-ink text-paper border-ink shadow-lg scale-[1.02]"
                  : isPassed
                  ? "bg-forest/5 text-ink border-forest/30 hover:bg-forest/10"
                  : "bg-paper text-ink-soft border-ink/10 hover:bg-paper-2 hover:text-ink"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`font-mono text-xs font-semibold ${isActive ? "text-forest" : isPassed ? "text-forest" : "text-ink-muted"}`}>
                  Step {String(item.step).padStart(2, "0")}
                </span>
                <Icon className={`w-4 h-4 ${isActive ? "text-forest" : isPassed ? "text-forest" : "text-ink-muted"}`} />
              </div>

              <div className="mt-2">
                <div className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? "text-paper/70" : "text-ink-muted"}`}>
                  {item.actor}
                </div>
                <div className={`text-xs font-semibold line-clamp-2 mt-0.5 ${isActive ? "text-paper" : "text-ink"}`}>
                  {item.title}
                </div>
              </div>

              {isActive && (
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-ink rotate-45" />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded Active Step Detail Box */}
      <motion.div
        key={currentStepData.step}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 p-6 md:p-8 rounded-3xl border border-ink/15 bg-paper-2 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-forest text-paper grid place-items-center shrink-0 shadow-md">
              <CurrentIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-forest uppercase tracking-widest">
                  Step {String(currentStepData.step).padStart(2, "0")} of 12
                </span>
                <span className="text-ink-muted">·</span>
                <span className="text-xs font-mono bg-ink/5 px-2 py-0.5 rounded text-ink font-medium">
                  {currentStepData.actor}
                </span>
              </div>
              <h3 className="font-serif-display text-2xl md:text-3xl text-ink mt-1">
                {currentStepData.title}
              </h3>
              <p className="text-sm text-ink-soft mt-2 max-w-2xl leading-relaxed">
                {currentStepData.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
            <button
              onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
              disabled={activeStep === 1}
              className="px-4 py-2 rounded-full border border-ink/15 text-xs font-medium text-ink hover:bg-ink hover:text-paper disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setActiveStep((s) => Math.min(12, s + 1))}
              disabled={activeStep === 12}
              className="px-5 py-2 rounded-full bg-forest text-paper text-xs font-medium hover:bg-ink disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
            >
              Next Step
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default WorkflowVisualizer;
