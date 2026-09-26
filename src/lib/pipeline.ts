// Shared interview-pipeline model.
// A stage is either a built-in (well-known key handled by the app)
// or a custom round created by HR.

export type StageType =
  | "screening"   // Resume review
  | "test"        // Aptitude or custom test
  | "video"       // Video intro
  | "gd"          // Group discussion
  | "technical"   // Technical coding/system-design round
  | "interview"   // Any live interview (HR, Managerial, custom)
  | "assignment"  // Take-home / submission
  | "info"        // Read-only informational step
  | "offer";      // Offer stage (terminal-ish)

export interface StageConfig {
  cutoff?: number;         // for tests
  duration?: number;       // minutes, for interviews
  instructions?: string;   // free text shown to candidate
  mode?: string;           // video_call | in_person | phone_call
  link?: string;           // optional external practice / brief link
}

export interface PipelineStage {
  key: string;             // built-in key or "custom_<uuid>"
  label: string;
  type: StageType;
  enabled: boolean;
  order: number;
  builtin?: boolean;       // true for the 8 built-in keys
  config?: StageConfig;
}

// Built-in stage catalog — the fixed keys the rest of the codebase understands.
export const BUILTIN_STAGES: PipelineStage[] = [
  { key: "resume",       label: "Resume Review",    type: "screening", enabled: true, order: 0, builtin: true },
  { key: "aptitude",     label: "Aptitude Test",    type: "test",      enabled: true, order: 1, builtin: true, config: { cutoff: 60 } },
  { key: "video_intro",  label: "Video Intro",      type: "video",     enabled: true, order: 2, builtin: true, config: { duration: 3 } },
  { key: "technical",    label: "Technical Round",  type: "technical", enabled: true, order: 3, builtin: true, config: { duration: 90 } },
  { key: "gd",           label: "Group Discussion", type: "gd",        enabled: false, order: 4, builtin: true, config: { duration: 30 } },
  { key: "hr_interview", label: "HR Interview",     type: "interview", enabled: true, order: 5, builtin: true, config: { duration: 45, mode: "video_call" } },
  { key: "managerial",   label: "Managerial Round", type: "interview", enabled: false, order: 6, builtin: true, config: { duration: 45, mode: "video_call" } },
  { key: "offer",        label: "Offer",            type: "offer",     enabled: true, order: 7, builtin: true },
];

// Preset templates seeded on first template-page load.
export const PRESET_TEMPLATES: { name: string; description: string; stages: PipelineStage[] }[] = [
  {
    name: "Engineering",
    description: "Aptitude → Technical → HR → Managerial → Offer",
    stages: BUILTIN_STAGES.map(s => ({
      ...s,
      enabled: ["resume", "aptitude", "technical", "hr_interview", "managerial", "offer"].includes(s.key),
    })),
  },
  {
    name: "Product / Design",
    description: "Video Intro → Assignment → HR → Managerial → Offer",
    stages: [
      ...BUILTIN_STAGES.map(s => ({
        ...s,
        enabled: ["resume", "video_intro", "hr_interview", "managerial", "offer"].includes(s.key),
      })),
      {
        key: `custom_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
        label: "Portfolio Assignment",
        type: "assignment" as StageType,
        enabled: true,
        order: 3.5,
        config: { instructions: "Submit your portfolio or a case-study PDF." },
      },
    ].sort((a, b) => a.order - b.order),
  },
  {
    name: "Sales / Ops",
    description: "Aptitude → GD → HR → Offer",
    stages: BUILTIN_STAGES.map(s => ({
      ...s,
      enabled: ["resume", "aptitude", "gd", "hr_interview", "offer"].includes(s.key),
    })),
  },
];

export function defaultPipeline(): PipelineStage[] {
  return BUILTIN_STAGES.map(s => ({ ...s }));
}

export function normalizePipeline(raw: any): PipelineStage[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultPipeline();
  return (raw as any[])
    .map((s, i) => ({
      key: String(s.key || `custom_${i}`),
      label: String(s.label || s.key || "Stage"),
      type: (s.type as StageType) || "info",
      enabled: s.enabled !== false,
      order: typeof s.order === "number" ? s.order : i,
      builtin: !!s.builtin,
      config: s.config || {},
    }))
    .sort((a, b) => a.order - b.order);
}

export function enabledStages(stages: PipelineStage[]): PipelineStage[] {
  return stages.filter(s => s.enabled).sort((a, b) => a.order - b.order);
}

export function newCustomStage(partial: Partial<PipelineStage> = {}): PipelineStage {
  const id = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2);
  return {
    key: `custom_${id}`,
    label: partial.label || "Custom Round",
    type: (partial.type as StageType) || "info",
    enabled: partial.enabled !== false,
    order: partial.order ?? 999,
    builtin: false,
    config: partial.config || {},
  };
}
