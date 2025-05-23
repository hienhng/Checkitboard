import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm, RegisterForm } from "@/components/authForms";
import { useAuth } from "@/hooks/use-auth";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background">
      {/* Left Column - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md card-shadow rounded-xl border-0">
          <CardContent className="pt-8 px-6">
            <div className="text-center mb-8">
              <h1 className="text-5xl font-modak text-primary">checkit</h1>
              <p className="mt-2 text-sm text-gray-600">Sign in or create a new account</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-primary/5 p-1 rounded-lg">
                <TabsTrigger value="login" className="rounded-md transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Login</TabsTrigger>
                <TabsTrigger value="register" className="rounded-md transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Hero Section */}
      <div className="hidden lg:block w-1/2 bg-primary text-white p-8 shadow-xl">
        <div className="h-full flex flex-col justify-center max-w-xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Vocabulary Learning Made Simple
          </h2>
          <p className="text-lg mb-8">
            <span className = "font-modak text-white">checkit</span> is a powerful platform that helps educators create, assess, and reinforce vocabulary learning through reading passages.
          </p>
          <div className="space-y-8">
            <div className="flex items-start space-x-5">
              <div className="bg-white/20 p-3 rounded-xl shadow-md transform transition-transform duration-300 hover:scale-110 hover:bg-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Highlight Words from Passages</h3>
                <p className="text-white/90">Easily create vocabulary lists by highlighting words directly in reading passages.</p>
              </div>
            </div>
            <div className="flex items-start space-x-5">
              <div className="bg-white/20 p-3 rounded-xl shadow-md transform transition-transform duration-300 hover:scale-110 hover:bg-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Streamlined Assessment</h3>
                <p className="text-white/90">Students complete definitions while seeing the passage context, educators grade with ease.</p>
              </div>
            </div>
            <div className="flex items-start space-x-5">
              <div className="bg-white/20 p-3 rounded-xl shadow-md transform transition-transform duration-300 hover:scale-110 hover:bg-white/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Intelligent Flashcards</h3>
                <p className="text-white/90">Automatically generate flashcards for words students need to review.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
