import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationGuardProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  showBanner?: boolean;
}

export function EmailVerificationGuard({ 
  children, 
  requireVerification = false,
  showBanner = true 
}: EmailVerificationGuardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isResending, setIsResending] = useState(false);

  // Resend verification email mutation
  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/resend-verification", { 
        email: user?.email 
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
      });
      setIsResending(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending email",
        description: error.message,
        variant: "destructive",
      });
      setIsResending(false);
    },
  });

  const handleResendVerification = () => {
    setIsResending(true);
    resendVerificationMutation.mutate();
  };

  // If user is not logged in, show children normally
  if (!user) {
    return <>{children}</>;
  }

  // If email is verified, show children normally
  if (user.emailVerified) {
    return <>{children}</>;
  }

  // If verification is required but email is not verified, show blocking screen
  if (requireVerification && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <Mail className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle className="text-xl">Email Verification Required</CardTitle>
            <CardDescription>
              Please verify your email address to access this feature
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                We sent a verification email to <strong>{user.email}</strong>. 
                Click the link in the email to verify your account.
              </AlertDescription>
            </Alert>
            
            <div className="text-center space-y-3">
              <p className="text-sm text-gray-600">
                Didn't receive the email? Check your spam folder or request a new one.
              </p>
              
              <Button 
                onClick={handleResendVerification}
                disabled={isResending || resendVerificationMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {(isResending || resendVerificationMutation.isPending) ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If verification is not required but email is not verified, show banner + children
  return (
    <div>
      {showBanner && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800 mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              Please verify your email address to access all features. 
              Check your inbox at <strong>{user.email}</strong>
            </span>
            <Button 
              onClick={handleResendVerification}
              disabled={isResending || resendVerificationMutation.isPending}
              variant="ghost"
              size="sm"
              className="text-yellow-800 hover:text-yellow-900 hover:bg-yellow-100"
            >
              {(isResending || resendVerificationMutation.isPending) ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                "Resend Email"
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {children}
    </div>
  );
}

// Higher-order component for protected features
export function withEmailVerification<T extends object>(
  Component: React.ComponentType<T>,
  requireVerification: boolean = true
) {
  return function VerifiedComponent(props: T) {
    return (
      <EmailVerificationGuard requireVerification={requireVerification}>
        <Component {...props} />
      </EmailVerificationGuard>
    );
  };
}