import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string; title: ReactNode; description: string; actions?: ReactNode;
}) {
  return <header className="page-heading"><div className="min-w-0">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 className="page-title">{title}</h1><p className="page-description">{description}</p></div>{actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div>}</header>;
}
export function StatCard({ label, value, icon: Icon, detail, tone = "blue", loading = false }: {
  label: string; value: ReactNode; icon: LucideIcon; detail?: string; tone?: "blue" | "green" | "amber"; loading?: boolean;
}) {
  const tones = { blue: "bg-accent text-accent-foreground", green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300", amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300" };
  return <div className="stat-card"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-muted-foreground">{label}</p><span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-[18px] w-[18px]" /></span></div>{loading ? <Skeleton className="mt-3 h-9 w-16" /> : <p className="mt-2 text-[30px] font-semibold leading-tight tracking-tight tabular-nums">{value}</p>}{detail && <p className="mt-2 text-xs text-muted-foreground">{detail}</p>}</div>;
}
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon; title: string; description: string; action?: ReactNode;
}) {
  return <div className="flex flex-col items-center px-5 py-12 text-center"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border bg-muted/60 text-muted-foreground"><Icon className="h-5 w-5" /></span><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{description}</p>{action && <div className="mt-5">{action}</div>}</div>;
}
