import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Ikon "?" kecil yang menjelaskan istilah saat disorot atau difokus. */
const HelpTip = ({ children }: { children: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="inline-flex align-middle text-muted-foreground hover:text-foreground"
        aria-label={children}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs">{children}</TooltipContent>
  </Tooltip>
);

export default HelpTip;
