import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { insertUserSchema, loginUserSchema, verifyEmailSchema } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const { loginMutation } = useAuth();
  
  const form = useForm<z.infer<typeof loginUserSchema>>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof loginUserSchema>) {
    await loginMutation.mutateAsync(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button
          type="submit"
          className="w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </Form>
  );
}

export function RegisterForm() {
  const { registerMutation } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'email' | 'verify' | 'register'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  
  // Email form
  const emailForm = useForm<{ email: string }>({
    resolver: zodResolver(z.object({
      email: z.string().email("Please enter a valid email address"),
    })),
    defaultValues: {
      email: "",
    },
  });
  
  // Verification form
  const verifyForm = useForm<z.infer<typeof verifyEmailSchema>>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  });
  
  // Registration form
  const registerSchema = insertUserSchema.extend({
    confirmPassword: z.string().min(1, "Confirm your password"),
    verificationCode: z.string().min(6, "Verification code is required"),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
      role: "learner",
      verificationCode: "",
    },
  });
  
  // Handle email form submission - sends verification code
  async function onEmailSubmit(values: { email: string }) {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/send-verification-code', { email: values.email });
      if (res.ok) {
        toast({
          title: "Verification code sent",
          description: "Please check your email for the verification code",
        });
        setEmail(values.email);
        verifyForm.setValue('email', values.email);
        registerForm.setValue('email', values.email);
        setStep('verify');
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.message || "Failed to send verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Handle verification form submission - verifies code
  async function onVerifySubmit(values: z.infer<typeof verifyEmailSchema>) {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/verify-email', values);
      if (res.ok) {
        toast({
          title: "Email verified",
          description: "Your email has been verified. Please complete registration.",
        });
        setIsEmailVerified(true);
        registerForm.setValue('verificationCode', values.code);
        setStep('register');
      } else {
        const data = await res.json();
        toast({
          title: "Verification failed",
          description: data.message || "Failed to verify email",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Handle registration form submission - creates user
  async function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    const { confirmPassword, ...userData } = values;
    await registerMutation.mutateAsync(userData);
  }
  
  // Resend verification code
  async function resendVerificationCode() {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/send-verification-code', { email });
      if (res.ok) {
        toast({
          title: "Verification code resent",
          description: "Please check your email for the new verification code",
        });
      } else {
        const data = await res.json();
        toast({
          title: "Error",
          description: data.message || "Failed to resend verification code",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  // Go back to previous step
  function goBack() {
    switch (step) {
      case 'verify':
        setStep('email');
        break;
      case 'register':
        setStep('verify');
        break;
    }
  }

  // Render email form
  if (step === 'email') {
    return (
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <div className="text-center mb-6">
            <Mail className="mx-auto h-10 w-10 text-primary mb-2" />
            <h3 className="text-lg font-medium">Verify your email</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We'll send a verification code to your email address
            </p>
          </div>
          
          <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email address</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="name@example.com" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    );
  }
  
  // Render verification form
  if (step === 'verify') {
    return (
      <Form {...verifyForm}>
        <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
          <div className="text-center mb-6">
            <Mail className="mx-auto h-10 w-10 text-primary mb-2" />
            <h3 className="text-lg font-medium">Enter verification code</h3>
            <p className="text-sm text-muted-foreground mt-1">
              We've sent a code to {email}
            </p>
          </div>
          
          <FormField
            control={verifyForm.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="123456" 
                    type="text"
                    maxLength={6}
                    inputMode="text"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-between text-sm pt-2">
            <Button 
              variant="link" 
              type="button" 
              onClick={goBack} 
              className="px-0"
              disabled={isLoading}
            >
              Change email
            </Button>
            <Button 
              variant="link" 
              type="button" 
              onClick={resendVerificationCode}
              className="px-0"
              disabled={isLoading}
            >
              Resend code
            </Button>
          </div>
          
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                Verify & continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </Form>
    );
  }
  
  // Render registration form
  return (
    <Form {...registerForm}>
      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
        <div className="pb-4 text-center">
          <div className="inline-flex items-center justify-center p-1 bg-green-100 rounded-full mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium">Email verified</h3>
          <p className="text-sm text-muted-foreground">
            {email} has been verified. Complete your registration.
          </p>
        </div>
        
        <FormField
          control={registerForm.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={registerForm.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="educator">Educator</SelectItem>
                  <SelectItem value="learner">Learner</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={registerForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={registerForm.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="text-sm">
          <Button 
            variant="link" 
            type="button" 
            onClick={goBack} 
            className="px-0"
            disabled={registerMutation.isPending}
          >
            Back to verification
          </Button>
        </div>
        
        <Button
          type="submit"
          className="w-full"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </Form>
  );
}
