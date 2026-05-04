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
          "flex items-center justify-center overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm",
          compact ? "h-8 w-8 rounded-lg" : "h-10 w-10",
          markClassName,
        )}
      >
        <img
          src="/icon/android-chrome-192x192.png"
          alt="Logo POLBAN"
          className="h-full w-full object-contain p-1"
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