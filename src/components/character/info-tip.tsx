"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InfoTipProps {
  text: string;
}

/** Small info icon with a beginner-friendly tooltip on hover/tap. */
export function InfoTip({ text }: InfoTipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-[10px] font-bold leading-none ml-1 shrink-0"
          aria-label="More info"
          onClick={(e) => e.preventDefault()}
        >
          ?
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
