import { forwardRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, GraduationCap, BookOpen, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, type InputProps } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, loginUserSchema } from "@shared/schema";
import { cn } from "@/lib/utils";

const PasswordInput = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  return <div className="relative"><Input {...props} ref={ref} type={visible ? "text" : "password"} className="pr-11" /><button type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground">{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>;
});
PasswordInput.displayName = "PasswordInput";
const errorMessage = (error: Error | null) => error?.message.replace(/^\d+:\s*/, "").replace(/^\{"message":"(.*)"\}$/, "$1");

export function LoginForm() {
  const { loginMutation } = useAuth();
  const form = useForm<z.infer<typeof loginUserSchema>>({ resolver: zodResolver(loginUserSchema), defaultValues: { email: "", password: "" } });
  return <Form {...form}><form onSubmit={form.handleSubmit(values => loginMutation.mutate(values))} className="space-y-5">
    {loginMutation.isError && <Alert variant="destructive" role="alert"><AlertDescription>{errorMessage(loginMutation.error)}</AlertDescription></Alert>}
    <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Email address</FormLabel><FormControl><Input {...field} type="email" autoComplete="email" placeholder="you@example.com" disabled={loginMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="password" render={({ field }) => <FormItem><div className="flex items-center justify-between gap-3"><FormLabel>Password</FormLabel><Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link></div><FormControl><PasswordInput {...field} autoComplete="current-password" placeholder="Enter your password" disabled={loginMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
    <Button type="submit" size="lg" className="w-full" disabled={loginMutation.isPending}>{loginMutation.isPending ? <><Loader2 className="animate-spin" />Signing in…</> : <>Sign in to your workspace<ArrowRight className="ml-auto" /></>}</Button>
    <p className="pt-1 text-center text-[11px] leading-5 text-muted-foreground">Your words, your progress, your pace.</p>
  </form></Form>;
}

const registerSchema = insertUserSchema.extend({ confirmPassword: z.string().min(1, "Confirm your password") }).refine(data => data.password === data.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });
export function RegisterForm() {
  const { registerMutation } = useAuth();
  const form = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { email: "", password: "", confirmPassword: "", name: "", role: "learner" } });
  return <Form {...form}><form onSubmit={form.handleSubmit(({ confirmPassword, ...values }) => registerMutation.mutate(values))} className="space-y-4">
    {registerMutation.isError && <Alert variant="destructive" role="alert"><AlertDescription>{errorMessage(registerMutation.error)}</AlertDescription></Alert>}
    <FormField control={form.control} name="role" render={({ field }) => <FormItem><FormLabel>I’m here to</FormLabel><FormControl><RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-3" disabled={registerMutation.isPending}>{[{ value: "learner", title: "Learn", icon: BookOpen }, { value: "educator", title: "Teach", icon: GraduationCap }].map(({ value, title, icon: Icon }) => <label key={value} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition-colors", field.value === value ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:border-input")}><RadioGroupItem value={value} aria-label={title} /><Icon className="h-4 w-4" /><span className="font-medium">{title}</span></label>)}</RadioGroup></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>Full name</FormLabel><FormControl><Input {...field} autoComplete="name" placeholder="Your name" disabled={registerMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Email address</FormLabel><FormControl><Input {...field} type="email" autoComplete="email" placeholder="you@example.com" disabled={registerMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="password" render={({ field }) => <FormItem><FormLabel>Password</FormLabel><FormControl><PasswordInput {...field} autoComplete="new-password" placeholder="At least 6 characters" disabled={registerMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
    <FormField control={form.control} name="confirmPassword" render={({ field }) => <FormItem><FormLabel>Confirm password</FormLabel><FormControl><PasswordInput {...field} autoComplete="new-password" placeholder="Re-enter your password" disabled={registerMutation.isPending} /></FormControl><FormMessage /></FormItem>} />
    <Button type="submit" size="lg" className="w-full" disabled={registerMutation.isPending}>{registerMutation.isPending ? <><Loader2 className="animate-spin" />Creating your account…</> : <>Create your account<ArrowRight className="ml-auto" /></>}</Button>
  </form></Form>;
}
