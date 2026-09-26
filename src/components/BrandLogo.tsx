import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  inverse?: boolean;
  showMark?: boolean;
};

export default function BrandLogo({
  className,
  markClassName,
  textClassName,
  inverse = false,
  showMark = true,
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 leading-none", className)}>
      {showMark && (
        <img
          src="/favicon.png"
          alt=""
          aria-hidden="true"
          className={cn("h-9 w-9 shrink-0 object-contain", markClassName)}
        />
      )}
      <span className={cn("font-extrabold tracking-normal", textClassName)} aria-label="HireZap">
        <span className={inverse ? "text-brand-hire-inverse" : "text-brand-hire"}>Hire</span>
        <span className="text-brand-zap">Zap</span>
      </span>
    </span>
  );
}