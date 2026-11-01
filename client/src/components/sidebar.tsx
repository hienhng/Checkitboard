import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Brain, ChevronDown, ClipboardList, GraduationCap, LayoutDashboard, Lightbulb, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, StickyNote, BarChart3, FileCheck2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function NavigationContent({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { toggleCollapsed } = useSidebar();
  if (!user) return null;
  const educator = user.role === "educator";
  const primary = educator ? [
    { href: "/educator/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/educator/classes", label: "Classes", icon: GraduationCap },
    { href: "/educator/assignments", label: "Assignments", icon: ClipboardList },
    { href: "/educator/statistics", label: "Statistics", icon: BarChart3 },
  ] : [
    { href: "/learner/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/learner/flashcards", label: "Flashcards", icon: Brain },
    { href: "/learner/results", label: "My results", icon: FileCheck2 },
    { href: "/learner/analysis", label: "My progress", icon: BarChart3 },
  ];
  const tools = educator ? [] : [{ href: "/explore", label: "Word glossary", icon: Lightbulb }, { href: "/sticky-notes", label: "My canvas", icon: StickyNote }];
  const navGroup = (items: typeof primary) => items.map(({ href, label, icon: Icon }) => {
    const active = location === href || (href === "/educator/assignments" && /\/educator\/(vocabulary|publish)\//.test(location));
    const link = <Link to={href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={compact ? label : undefined} className={cn("group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors", compact && "justify-center px-0", active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.2 : 1.8} />{!compact && <span>{label}</span>}{active && !compact && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}</Link>;
    return compact ? <Tooltip key={href}><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right">{label}</TooltipContent></Tooltip> : <div key={href}>{link}</div>;
  });
  return <div className="flex h-full min-h-0 flex-col bg-sidebar">
    <div className={cn("flex h-[76px] shrink-0 items-center px-5", compact && "justify-center px-2")}><Link to="/home" aria-label="Checkit home" onClick={onNavigate}><Brand compact={compact} /></Link></div>
    {!compact && <div className="mx-4 mb-5 flex items-center gap-2.5 rounded-xl border bg-background/70 px-3 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground"><GraduationCap className="h-4 w-4" /></span><div><p className="text-xs font-semibold">{educator ? "Teaching workspace" : "Learning workspace"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">A little progress, every day</p></div></div>}
    <nav aria-label="Main navigation" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 py-1">
      <div>{!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>}<div className="space-y-1">{navGroup(primary)}</div></div>
      {tools.length > 0 && <div>{!compact && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Learning tools</p>}<div className="space-y-1">{navGroup(tools)}</div></div>}
    </nav>
    <div className="space-y-1 px-3 pb-3 pt-4">{navGroup([{ href: "/settings", label: "Settings", icon: Settings }])}<Button variant="ghost" size={compact ? "icon" : "default"} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"} onClick={toggleCollapsed} className={cn("hidden w-full justify-start gap-3 px-3 text-[13px] md:flex", compact && "justify-center px-0")}>
      {compact ? <PanelLeftOpen /> : <><PanelLeftClose /><span>Collapse sidebar</span></>}
    </Button></div>
    <div className="border-t p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className={cn("flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-muted", compact && "justify-center px-0")} aria-label="Account menu"><Avatar className="h-9 w-9 shrink-0 rounded-xl"><AvatarImage src={user.profilePicture || undefined} alt="" /><AvatarFallback className="rounded-xl bg-accent text-xs font-semibold text-accent-foreground">{user.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback></Avatar>{!compact && <><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{user.name}</span><span className="mt-0.5 block text-[11px] capitalize text-muted-foreground">{user.role}</span></span><ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /></>}</button></DropdownMenuTrigger><DropdownMenuContent align="start" side="top" sideOffset={12} className="w-60"><DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{user.email}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem asChild><Link to="/settings" onClick={onNavigate}><Settings className="mr-2 h-4 w-4" />Account settings</Link></DropdownMenuItem><DropdownMenuItem disabled={logoutMutation.isPending} onClick={() => logoutMutation.mutate()} className="text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />{logoutMutation.isPending ? "Signing out…" : "Sign out"}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>
  </div>;
}

export function Sidebar() {
  const { collapsed } = useSidebar();
  return <TooltipProvider delayDuration={150}><aside aria-label="Sidebar" className={cn("fixed inset-y-0 left-0 z-30 hidden border-r transition-[width] duration-200 md:block", collapsed ? "w-[76px]" : "w-64")}><NavigationContent compact={collapsed} /></aside></TooltipProvider>;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  useEffect(() => { setOpen(false); }, [location]);
  return <Sheet open={open} onOpenChange={setOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" aria-label="Open navigation" className="shrink-0 md:hidden"><Menu /></Button></SheetTrigger><SheetContent side="left" className="w-[min(300px,85vw)] bg-sidebar p-0"><SheetTitle className="sr-only">Main navigation</SheetTitle><SheetDescription className="sr-only">Your workspace, learning tools, and account.</SheetDescription><NavigationContent onNavigate={() => setOpen(false)} /></SheetContent></Sheet>;
}
