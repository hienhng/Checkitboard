import { Brand } from "@/components/brand";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { ChevronLeft, Lock, CheckCircle } from "lucide-react";

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    // Extract token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      form.setValue('token', tokenParam);
    } else {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [form]);

  const onSubmit = async (data: ResetPasswordForm) => {
    try {
      setIsLoading(true);
      setError(null);

      // Ensure token is included in the request
      const requestData = {
        token: token || data.token,
        password: data.password,
        confirmPassword: data.confirmPassword
      };
      
      console.log('Submitting reset password:', { 
        token: requestData.token?.substring(0, 10) + '...', 
        hasPassword: !!requestData.password,
        hasConfirmPassword: !!requestData.confirmPassword
      });
      
      const response = await apiRequest("POST", "/api/reset-password", requestData);

      if (response.ok) {
        setIsSubmitted(true);
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          navigate("/auth");
        }, 3000);
      } else {
        const errorData = await response.json();
        if (errorData.errors) {
          // Handle Zod validation errors
          const firstError = errorData.errors[0];
          setError(firstError.message);
        } else {
          setError(errorData.message || "An error occurred. Please try again.");
        }
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="auth-recovery flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10"><a href="/auth" aria-label="Back to Checkit"><Brand /></a>
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">Password Reset Successful</CardTitle>
              <CardDescription className="mt-2">
                Your password has been successfully reset. You have been logged out for security reasons.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            <Alert className="mb-4">
              <AlertDescription>
                Redirecting to login page in 3 seconds...
              </AlertDescription>
            </Alert>
            <Button asChild>
              <Link to="/auth">
                Continue to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token && error) {
    return (
      <div className="auth-recovery flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10"><a href="/auth" aria-label="Back to Checkit"><Brand /></a>
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="text-center space-y-2">
              <Button asChild>
                <Link to="/forgot-password">
                  Request New Reset Link
                </Link>
              </Button>
              <div>
                <Button variant="ghost" asChild>
                  <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-recovery flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-10"><a href="/auth" aria-label="Back to Checkit"><Brand /></a>
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below. Make sure it's different from your previous password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter new password"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Confirm new password"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading || !token}>
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center">
            <Button variant="ghost" asChild>
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}