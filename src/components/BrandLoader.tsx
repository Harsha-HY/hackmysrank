import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type Loader2Props = {
  className?: string;
  style?: CSSProperties;
};

/**
 * HireZap-branded loading indicator: the logo mark stays still while a
 * comet-like light sweeps around it. Drop-in replacement for the old
 * Loader2 spinner — same export name, same size/color classes.
 */
export function Loader2({ className, style }: Loader2Props) {
  const cleaned = (className ?? "").replace(/\banimate-spin\b/g, "");
  return (
    <span
      role="status"
      aria-label="Loading"
      style={style}
      className={cn("relative inline-flex h-4 w-4 shrink-0 items-center justify-center align-middle", cleaned)}
    >
      <span className="brand-loader-ring" aria-hidden="true" />
      <span className="brand-loader-glow" aria-hidden="true" />
      <img
        src="/favicon.png"
        alt=""
        aria-hidden="true"
        className="relative h-[64%] w-[64%] object-contain"
      />
    </span>
  );
}

export default Loader2;
