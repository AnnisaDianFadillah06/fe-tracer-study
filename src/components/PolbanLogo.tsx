import { cn } from "@/lib/utils";

interface PolbanLogoProps {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showText?: boolean;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

const PolbanLogo = ({
  className,
  markClassName,
  textClassName,
  showText = true,
  title = "Tracer Study",
  subtitle = "POLBAN",
  compact = false,
}: PolbanLogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex aspect-square flex-none items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-white/95 shadow-sm ring-1 ring-black/5",
          compact ? "h-9 w-9" : "h-11 w-11",
          markClassName,
        )}
      >
        <img
          src="/icon/android-chrome-192x192.png"
          alt="Logo POLBAN"
          className="h-auto w-auto max-h-[72%] max-w-[72%] object-contain"
        />
      </div>

      {showText && (
        <div className={textClassName}>
          <span className="font-heading font-bold text-lg leading-none">{title}</span>
          <span className="block -mt-0.5 text-xs text-muted-foreground">{subtitle}</span>
        </div>
      )}
    </div>
  );
};

export default PolbanLogo;