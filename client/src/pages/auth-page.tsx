import { useState } from "react";
import { Link, Redirect } from "wouter";
import { ArrowUpRight, BookOpen, Check, Layers, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm, RegisterForm } from "@/components/authForms";
import { Brand } from "@/components/brand";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState(() => new URLSearchParams(window.location.search).get("mode") === "register" ? "register" : "login");
  if (user) return <Redirect to={user.role === "educator" ? "/educator/dashboard" : "/learner/dashboard"} />;
  return <main className="grid min-h-svh bg-card lg:grid-cols-[1fr_1fr]">
    <section className="flex min-w-0 flex-col px-6 py-7 sm:px-12 lg:px-14 xl:px-20">
      <Link to="/" aria-label="Checkit home" className="w-fit"><Brand /></Link>
      <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center py-12 lg:py-16">
        <p className="eyebrow text-primary">Your next chapter starts here</p>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-[-0.04em]">{mode === "login" ? "Welcome back." : "Room to grow."}</h1>
        <p className="mb-7 mt-3 text-sm leading-6 text-muted-foreground">{mode === "login" ? "A few new words. A little more confidence. Pick up where you left off." : "Create your account and make every new word part of your story."}</p>
        <Tabs value={mode} onValueChange={setMode} className="w-full"><TabsList aria-label="Account access" className="mb-7 grid w-full grid-cols-2"><TabsTrigger value="login">Sign in</TabsTrigger><TabsTrigger value="register">Create account</TabsTrigger></TabsList><TabsContent value="login"><LoginForm /></TabsContent><TabsContent value="register"><RegisterForm /></TabsContent></Tabs>
      </div>
      <p className="text-center text-[11px] text-muted-foreground sm:text-left">A place for educators. A space for learners.</p>
    </section>
    <aside className="auth-showcase relative hidden min-w-0 flex-col overflow-hidden p-10 lg:flex xl:p-14" aria-label="Learn with Checkit">
      <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/70 px-3 py-1.5 text-[11px] font-medium text-primary"><Sparkles className="h-3.5 w-3.5" />A brighter way to learn</span><ArrowUpRight className="h-5 w-5 text-primary/60" /></div>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-12">
        <h2 className="max-w-md text-[clamp(2.5rem,3.8vw,4rem)] font-semibold leading-[1.12] tracking-[-0.055em]">Small words.<br />Big <span className="font-serif italic font-normal text-primary">possibilities.</span></h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-muted-foreground">Turn what you read into what you know. Build vocabulary that stays with you, one discovery at a time.</p>
        <div className="relative my-10 px-2 xl:px-5">
          <div className="absolute inset-x-5 bottom-[-9px] top-5 rotate-[-4deg] rounded-2xl border border-primary/15 bg-[#dbe6fa] dark:bg-slate-800" />
          <div className="auth-word-card relative rounded-2xl border border-border/70 bg-card p-7 xl:p-8"><div className="flex items-center justify-between"><span className="eyebrow mb-0 text-primary">A word to remember</span><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary"><BookOpen className="h-4 w-4" /></span></div><h3 className="mt-5 font-serif text-4xl font-normal tracking-tight">serendipity</h3><p className="mt-2 text-xs text-muted-foreground">/ˌser.ənˈdɪp.ə.ti/ <span className="ml-2 italic">noun</span></p><p className="mt-5 text-sm leading-6">The lovely art of finding something wonderful when you weren’t looking for it.</p><div className="mt-6 flex items-center gap-2 border-t pt-4 text-[11px] text-muted-foreground"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Check className="h-3 w-3" /></span>One word closer to a world of possibilities.</div></div>
        </div>
        <div className="flex flex-wrap gap-2">{["Read in context", "Practice your way", "See your progress"].map((label, index) => <span key={label} className="inline-flex items-center gap-2 rounded-full border border-primary/10 bg-card/60 px-3 py-2 text-[11px] font-medium text-muted-foreground"><span className="text-primary">0{index + 1}</span>{label}</span>)}</div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Layers className="h-4 w-4 text-primary" />More than memorizing. Making connections.</div>
    </aside>
  </main>;
}
