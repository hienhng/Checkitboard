import { cn } from "@/lib/utils";

export function BrandLogo({ className, alt = "Checkit" }: { className?: string; alt?: string }) {
  return <img src="/favicon%20final.png" alt={alt} width={36} height={36} className={cn("h-9 w-9 shrink-0 object-contain", className)} />;
}

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return <span className={cn("inline-flex items-center gap-2.5", className)}>
    <BrandLogo alt={compact ? "Checkit" : ""} />
    {!compact && <span className="text-[25px] font-bold tracking-[-0.06em] text-foreground">checkit<span className="text-primary">.</span></span>}
  </span>;
}
