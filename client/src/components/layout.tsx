import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { Sidebar, MobileNavigation } from "./sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useSidebarOptional } from "@/hooks/use-sidebar";
import { GlobalSearch } from "@/components/global-search";
import { NotificationCenter } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const routeNames: Record<string, string> = {
  dashboard: "Overview", classes: "Classes", assignments: "Assignments", statistics: "Statistics",
  flashcards: "Study center", analysis: "My progress", results: "My results", explore: "Word glossary",
  "sticky-notes": "My canvas", settings: "Settings", vocabulary: "Vocabulary list", publish: "Publish assignment",
};

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const sidebar = useSidebarOptional();
  const [location] = useLocation();
  if (!user) return <>{children}</>;
  const parts = location.split("/").filter(Boolean);
  const title = routeNames[parts[1]] || routeNames[parts[0]] || "Workspace";
  return <div className="min-h-svh bg-background">
    <a href="#main-content" className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground focus:translate-y-0">Skip to content</a>
    <Sidebar />
    <div className={cn("min-w-0 transition-[margin] duration-200", sidebar?.collapsed ? "md:ml-[76px]" : "md:ml-64")}>
      <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between gap-2 border-b bg-card/95 px-4 backdrop-blur-md sm:px-7 lg:px-9">
        <div className="flex min-w-0 items-center gap-2"><MobileNavigation /><div className="flex min-w-0 items-center gap-2 text-xs"><span className="hidden text-muted-foreground sm:inline">My workspace</span><ChevronRight className="hidden h-3.5 w-3.5 text-muted-foreground/60 sm:block" /><span className="truncate font-medium">{title}</span></div></div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><div className="w-10 sm:w-52 lg:w-64"><GlobalSearch /></div><span className="mx-1 hidden h-5 w-px bg-border sm:block" /><ThemeToggle /><NotificationCenter /></div>
      </header>
      <main id="main-content" tabIndex={-1} className="workspace-content mx-auto w-full min-w-0 max-w-[1440px] px-4 py-6 outline-none sm:px-7 sm:py-8 lg:px-9 lg:py-9">{children}</main>
      <footer className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 pb-6 pt-3 text-[11px] text-muted-foreground sm:px-7 lg:px-9"><span>Checkit · A little progress, every day.</span><span>Made for curious minds.</span></footer>
    </div>
  </div>;
}
