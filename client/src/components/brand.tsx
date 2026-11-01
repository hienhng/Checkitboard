import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2.5", className)}>
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-[19px] w-[19px]" strokeWidth={2.2} /></span>
    {!compact && <span className="text-[25px] font-bold tracking-[-0.06em] text-foreground">checkit<span className="text-primary">.</span></span>}
  </span>;
}
