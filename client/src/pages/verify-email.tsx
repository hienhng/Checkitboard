import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmail() {
  const [location, setLocation] = useLocation();
  const [token, setToken] = useState<string | null>(null);

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    setToken(tokenParam);
  }, []);

  // Verify email with token
  const { data: result, isLoading, error } = useQuery({
    queryKey: ['/api/verify-email', token],
    queryFn: async () => {
      if (!token) throw new Error('No verification token provided');
      
      const response = await apiRequest('POST', '/api/verify-email', { token });
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const handleContinue = () => {
    setLocation('/login');
  };

  const handleResendEmail = async () => {
    // This could be implemented to resend verification email
    // For now, redirect to login where they can try registering again
    setLocation('/login');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Invalid Verification Link
            </CardTitle>
            <CardDescription>
              This verification link appears to be invalid or incomplete.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Please check your email for the correct verification link, or try registering again.
            </p>
            <Button 
              onClick={handleResendEmail}
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Verifying Your Email
            </CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !result?.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Verification Failed
            </CardTitle>
            <CardDescription>
              {result?.message || error?.message || 'Unable to verify your email address.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The verification link has expired</li>
                <li>The link has already been used</li>
                <li>The link is invalid or corrupted</li>
              </ul>
            </div>
            <Button 
              onClick={handleResendEmail}
              className="w-full"
              variant="outline"
            >
              <Mail className="mr-2 h-4 w-4" />
              Try Registering Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success case
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Email Verified Successfully!
          </CardTitle>
          <CardDescription>
            Welcome to Checkit! Your account has been activated.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Your email address has been successfully verified. You can now log in to your Checkit account and start using all features.
            </p>
            {result?.user && (
              <p className="text-sm font-medium text-gray-900">
                Welcome, {result.user.name}!
              </p>
            )}
          </div>
          <Button 
            onClick={handleContinue}
            className="w-full"
          >
            Continue to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}