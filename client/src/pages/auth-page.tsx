import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm, RegisterForm } from "@/components/authForms";
import { useAuth } from "@/hooks/use-auth";
import { BookOpen, Users, Brain, CheckCircle, Sparkles, GraduationCap } from "lucide-react";

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
    <div className="min-h-screen w-full flex bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-gradient-to-r from-blue-300 to-blue-500 rounded-full opacity-20 animate-pulse"></div>
      <div className="absolute top-40 right-20 w-8 h-8 bg-gradient-to-r from-sky-300 to-blue-400 rounded-full opacity-30 animate-bounce"></div>
      <div className="absolute bottom-32 left-20 w-12 h-12 bg-gradient-to-r from-blue-200 to-blue-400 rounded-full opacity-25 animate-pulse delay-300"></div>

      {/* Left Column - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative z-10">
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/90 shadow-2xl border-0 rounded-3xl overflow-hidden">
          <CardContent className="pt-10 px-8 pb-8">
            {/* Logo Section */}
            <div className="text-center mb-10">
  
              <h1 className="text-5xl font-modak bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                checkit
              </h1>
              <p className="mt-3 text-base text-slate-600 ">Sign in or create a new account</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1.5 rounded-2xl h-12">
                <TabsTrigger 
                  value="login" 
                  className="rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-slate-200/50"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="rounded-xl text-sm font-semibold transition-all duration-300 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-slate-200/50"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="space-y-0">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register" className="space-y-0">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Hero Section */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
        {/* Background Pattern for Right Side */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(-45deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
        
        {/* Floating Shapes */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-40 left-10 w-24 h-24 bg-sky-300/20 rounded-full blur-2xl animate-bounce"></div>
        
        <div className="relative z-10 h-full flex flex-col justify-center max-w-xl mx-auto p-12">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 mr-2" />
              AI-Powered Learning Platform
            </div>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              Master Vocabulary Through 
              <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent"> Smart Learning</span>
            </h2>
            <p className="text-xl text-blue-100 leading-relaxed">
              Join thousands of educators and students using our intelligent platform to enhance vocabulary learning through interactive passages and personalized assessments.
            </p>
          </div>

          <div className="grid gap-6">
            <div className="flex items-start space-x-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-sky-400 to-blue-500 rounded-xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 shadow-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Interactive Reading Passages</h3>
                <p className="text-blue-100 leading-relaxed">Create engaging vocabulary lists by highlighting words directly in context-rich reading materials.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Smart Assessment Tools</h3>
                <p className="text-blue-100 leading-relaxed">Streamlined grading system with AI assistance for quick and accurate vocabulary assessment.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-sky-300 to-blue-500 rounded-xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Adaptive Learning Experience</h3>
                <p className="text-blue-100 leading-relaxed">AI-powered flashcards and personalized study sessions that adapt to each student's learning pace.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4 group">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-300 to-blue-600 rounded-xl flex items-center justify-center transform transition-transform duration-300 group-hover:scale-110 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Collaborative Classrooms</h3>
                <p className="text-blue-100 leading-relaxed">Seamless class management with real-time progress tracking and parent communication tools.</p>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </div>
  );
}
