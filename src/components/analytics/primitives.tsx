import { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ---------- KPI ---------- */
export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number | null; // percent vs previous period
  hint?: string;
  icon?: ReactNode;
  accent?: "primary" | "emerald" | "sky" | "amber" | "rose" | "violet";
}

const accentMap: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "from-primary/15 to-primary/0 text-primary",
  emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-500",
  sky: "from-sky-500/15 to-sky-500/0 text-sky-500",
  amber: "from-amber-500/15 to-amber-500/0 text-amber-500",
  rose: "from-rose-500/15 to-rose-500/0 text-rose-500",
  violet: "from-violet-500/15 to-violet-500/0 text-violet-500",
};

export function KpiCard({ label, value, delta, hint, icon, accent = "primary" }: KpiCardProps) {
  const showDelta = typeof delta === "number" && Number.isFinite(delta);
  const trendUp = (delta ?? 0) > 0;
  const trendFlat = (delta ?? 0) === 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Card className="relative overflow-hidden border-border/60 bg-card p-5">
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60", accentMap[accent])} />
        <div className="relative flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold text-foreground tabular-nums">{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {icon && (
            <div className={cn("rounded-lg bg-background/60 p-2 backdrop-blur", accentMap[accent].split(" ").pop())}>
              {icon}
            </div>
          )}
        </div>
        {showDelta && (
          <div className="relative mt-4 flex items-center gap-1 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                trendFlat
                  ? "bg-muted text-muted-foreground"
                  : trendUp
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-rose-500/15 text-rose-500"
              )}
            >
              {trendFlat ? <Minus className="h-3 w-3" /> : trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(delta!).toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs previous</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

/* ---------- ChartCard ---------- */
export interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, action, children, className }: ChartCardProps) {
  return (
    <Card className={cn("border-border/60 bg-card p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="text-foreground">{children}</div>
    </Card>
  );
}

/* ---------- Range filter ---------- */
export type RangeKey = "7" | "30" | "90" | "all";
const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7", label: "7d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
  { key: "all", label: "All" },
];

export function RangeFilter({ value, onChange }: { value: RangeKey; onChange: (v: RangeKey) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => onChange(r.key)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition",
            value === r.key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function rangeToDays(r: RangeKey): number | null {
  if (r === "all") return null;
  return parseInt(r, 10);
}

/* ---------- Empty state ---------- */
export function EmptyState({ title, message, icon }: { title: string; message?: string; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 py-10 text-center">
      {icon && <div className="text-muted-foreground/70">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {message && <p className="max-w-sm text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

/* ---------- PDF export ---------- */
export function ExportPdfButton({ targetRef, fileName }: { targetRef: React.RefObject<HTMLElement>; fileName: string }) {
  const onExport = async () => {
    if (!targetRef.current) return;
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
    const canvas = await html2canvas(targetRef.current, {
      scale: 2,
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      useCORS: true,
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(img, "PNG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(img, "PNG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(`${fileName}.pdf`);
  };
  return (
    <Button variant="outline" size="sm" onClick={onExport}>
      Export PDF
    </Button>
  );
}

/* ---------- Funnel ---------- */
export function FunnelChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((row, idx) => {
        const pct = (row.value / max) * 100;
        const conv = idx > 0 && data[idx - 1].value > 0 ? (row.value / data[idx - 1].value) * 100 : null;
        return (
          <div key={row.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {row.value}
                {conv !== null && <span className="ml-2 text-[10px]">({conv.toFixed(0)}%)</span>}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, delay: idx * 0.04 }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Activity heatmap (12 weeks) ---------- */
export function ActivityHeatmap({ values }: { values: Record<string, number> }) {
  // values: { 'YYYY-MM-DD': count }
  const today = new Date();
  const days: { date: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    days.push({ date: k, count: values[k] ?? 0 });
  }
  const max = Math.max(...days.map((d) => d.count), 1);
  const intensity = (c: number) => {
    if (c === 0) return "bg-muted";
    const t = c / max;
    if (t < 0.25) return "bg-primary/20";
    if (t < 0.5) return "bg-primary/40";
    if (t < 0.75) return "bg-primary/70";
    return "bg-primary";
  };
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {Array.from({ length: 12 }).map((_, w) => (
        <div key={w} className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, dow) => {
            const item = days[w * 7 + dow];
            if (!item) return <div key={dow} className="h-3 w-3" />;
            return (
              <div
                key={dow}
                className={cn("h-3 w-3 rounded-sm", intensity(item.count))}
                title={`${item.date} · ${item.count}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ---------- Section header ---------- */
export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
