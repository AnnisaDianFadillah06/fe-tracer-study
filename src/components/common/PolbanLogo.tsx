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
  textClassName,
  showText = true,
  title = "Tracer Study",
  subtitle = "POLBAN",
}: PolbanLogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
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