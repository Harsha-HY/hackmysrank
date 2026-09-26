import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";

export const THEMES = [
  { id: "paper",    name: "Paper & Ink",  swatch: ["#f6f3ec", "#0e0e0e", "#1a3c2a"] },
  { id: "noir",     name: "Noir & Gold",  swatch: ["#0d0d0d", "#f0e9d2", "#c9a84c"] },
  { id: "midnight", name: "Midnight",     swatch: ["#0a0a1a", "#e8ecff", "#7c6cff"] },
  { id: "sand",     name: "Warm Sand",    swatch: ["#faf6ef", "#2a1d10", "#b4451f"] },
  { id: "ocean",    name: "Ocean Deep",   swatch: ["#f0f6fa", "#0c2340", "#2d8a9e"] },
  { id: "forest",   name: "Forest",       swatch: ["#f2efe6", "#0f2018", "#1a3c2a"] },
  { id: "mint",     name: "Neon Mint",    swatch: ["#0d1b2a", "#e8fff5", "#2dd4a8"] },
];

const STORAGE_KEY = "hz-theme";

export function applyStoredTheme() {
  const stored = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) || "paper";
  if (typeof document !== "undefined") {
    document.documentElement.dataset.hzTheme = stored;
  }
}

/** Variant: "ink" = landing/paper styling, "surface" = shadcn dashboards */
export default function ThemeToggle({ variant = "surface" }: { variant?: "ink" | "surface" }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) || "paper"
  );

  useEffect(() => {
    document.documentElement.dataset.hzTheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const current = THEMES.find((t) => t.id === theme) || THEMES[0];

  const triggerCls =
    variant === "ink"
      ? "h-9 px-2.5 rounded-full inline-flex items-center gap-1.5 hover:bg-ink/5 text-ink-soft hover:text-ink transition-colors"
      : "h-9 px-2.5 rounded-full inline-flex items-center gap-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors";

  const menuCls =
    variant === "ink"
      ? "absolute right-0 mt-2 rounded-xl border border-ink-soft bg-paper shadow-lg py-1.5 min-w-[200px] z-50"
      : "absolute right-0 mt-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-xl py-1.5 min-w-[200px] z-50";

  const itemCls = (active: boolean) =>
    variant === "ink"
      ? `flex items-center justify-between w-full px-3 py-2 text-[13px] hover:bg-ink/5 ${active ? "text-forest" : "text-ink"}`
      : `flex items-center justify-between w-full px-3 py-2 text-[13px] hover:bg-secondary ${active ? "text-primary" : "text-foreground"}`;

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Theme" className={triggerCls}>
        <Palette className="w-4 h-4" />
        <span className="flex gap-0.5">
          {current.swatch.map((c) => (
            <span
              key={c}
              className="w-2 h-2 rounded-full"
              style={{ background: c, border: "1px solid rgba(0,0,0,0.12)" }}
            />
          ))}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={menuCls}>
            <div className={`px-3 py-1.5 text-[10px] uppercase tracking-wider ${variant === "ink" ? "text-ink-muted" : "text-muted-foreground"}`}>
              Theme · current: {current.name}
            </div>
            {THEMES.map((t) => (
              <button key={t.id} onClick={() => { setTheme(t.id); setOpen(false); }} className={itemCls(theme === t.id)}>
                <span className="flex items-center gap-2">
                  <span className="flex gap-0.5">
                    {t.swatch.map((c) => (
                      <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c, border: "1px solid rgba(0,0,0,0.18)" }} />
                    ))}
                  </span>
                  {t.name}
                </span>
                {theme === t.id && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
