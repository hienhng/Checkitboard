import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { 
  BookOpen, 
  Users, 
  Brain, 
  CheckCircle, 
  GraduationCap, 
  Sparkles, 
  ArrowRight,
  Star,
  Play,
  Target,
  TrendingUp,
  Globe,
  Zap,
  Shield,
  Award,
  ChevronRight,
  BarChart3,
  MessageSquare,
  Clock,
  Lightbulb
} from "lucide-react";

export default function HeroPage() {
  const { user } = useAuth();

  // Redirect authenticated users to their dashboard
  if (user) {
    if (user.role === "educator") {
      return <Redirect to="/educator/dashboard" />;
    } else if (user.role === "learner") {
      return <Redirect to="/learner/dashboard" />;
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="relative z-50 bg-white/80 backdrop-blur-md border-b border-blue-100/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-brand font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                  lexible
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Button variant="ghost" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-medium" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 font-medium">
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20">
        {/* Modern Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/30"></div>
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-r from-blue-400/10 to-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-gradient-to-r from-indigo-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        
        {/* Floating UI Elements */}
        <div className="absolute top-32 left-8 hidden lg:block">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-blue-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">94% Success Rate</p>
                <p className="text-xs text-slate-600">Student improvement</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute top-48 right-12 hidden lg:block">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-blue-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">AI-Powered</p>
                <p className="text-xs text-slate-600">Smart grading</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="text-center">
            {/* Hero Badge */}
            <div className="inline-flex items-center px-6 py-3 bg-blue-50 border border-blue-200 rounded-full text-sm font-semibold text-blue-700 mb-8 shadow-sm">
              <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
              Trusted by 10,000+ educators worldwide
            </div>
            
            {/* Main Headline */}
            <h1 className="text-6xl md:text-8xl font-bold text-slate-900 mb-8 leading-tight">
              Vocabulary Learning
              <span className="block bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                Made Simple
              </span>
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              Empower your students with AI-driven vocabulary mastery. Create interactive lessons, 
              track progress in real-time, and watch comprehension soar.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
              <Button size="lg" asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 group">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 text-lg px-10 py-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <Play className="mr-3 h-5 w-5" />
                Watch 2-min Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-slate-500 text-sm font-medium">
              <div className="flex items-center">
                <Shield className="h-4 w-4 mr-2 text-green-500" />
                100% Secure & Private
              </div>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-blue-500" />
                Setup in 5 Minutes
              </div>
              <div className="flex items-center">
                <Award className="h-4 w-4 mr-2 text-yellow-500" />
                Award-Winning Platform
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-24">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm font-semibold text-blue-700 mb-6">
              <Lightbulb className="h-4 w-4 mr-2" />
              Platform Features
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8 leading-tight">
              Built for Modern
              <span className="block text-blue-600">Education</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-4xl mx-auto leading-relaxed">
              Comprehensive tools designed to make vocabulary learning engaging, measurable, and effective for both educators and students.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {/* Feature 1 */}
            <div className="group">
              <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Interactive Passages</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    Transform static text into dynamic learning experiences with contextual word highlighting and instant definitions.
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature 2 */}
            <div className="group">
              <Card className="border-0 bg-gradient-to-br from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">AI-Powered Grading</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    Save hours with intelligent assessment tools that provide instant, accurate feedback to students.
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature 3 */}
            <div className="group">
              <Card className="border-0 bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Brain className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Adaptive Learning</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    Personalized study paths that adjust to each student's learning style and progress pace.
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature 4 */}
            <div className="group">
              <Card className="border-0 bg-gradient-to-br from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Class Management</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    Effortless classroom organization with real-time progress tracking and parent notifications.
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature 5 */}
            <div className="group">
              <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Analytics Dashboard</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    Comprehensive insights into student performance with detailed progress reports and trends.
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Feature 6 */}
            <div className="group">
              <Card className="border-0 bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                <CardContent className="p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Smart Feedback</h3>
                  <p className="text-slate-600 leading-relaxed text-lg mb-4">
                    Instant, contextual feedback that helps students understand mistakes and improve faster.
                  </p>
                  <div className="flex items-center text-blue-600 font-semibold">
                    Learn more <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Results That Speak for Themselves
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Join thousands of educators who have transformed their vocabulary teaching with measurable results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                10K+
              </div>
              <div className="text-xl font-semibold text-blue-100 mb-2">Active Educators</div>
              <div className="text-blue-200 text-sm">Worldwide community</div>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                94%
              </div>
              <div className="text-xl font-semibold text-blue-100 mb-2">Success Rate</div>
              <div className="text-blue-200 text-sm">Student improvement</div>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                2.5M
              </div>
              <div className="text-xl font-semibold text-blue-100 mb-2">Words Learned</div>
              <div className="text-blue-200 text-sm">Monthly milestone</div>
            </div>
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-200 to-white bg-clip-text text-transparent">
                50%
              </div>
              <div className="text-xl font-semibold text-blue-100 mb-2">Time Saved</div>
              <div className="text-blue-200 text-sm">On grading tasks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm font-semibold text-blue-700 mb-6">
              <Star className="h-4 w-4 mr-2 text-yellow-500" />
              Educator Reviews
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-8 leading-tight">
              Loved by Teachers
              <span className="block text-blue-600">Across the Globe</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white">
              <CardContent className="p-10">
                <div className="flex items-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-8 text-lg leading-relaxed italic">
                  "This platform has revolutionized how I teach vocabulary. My students are more engaged and their retention has improved dramatically."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    S
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-slate-900 text-lg">Sarah Johnson</div>
                    <div className="text-slate-600">Middle School Teacher, Boston</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 2 */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white">
              <CardContent className="p-10">
                <div className="flex items-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-8 text-lg leading-relaxed italic">
                  "The AI-powered features save me hours of grading time while providing more detailed feedback to my students."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    M
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-slate-900 text-lg">Michael Chen</div>
                    <div className="text-slate-600">High School English, Seattle</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Testimonial 3 */}
            <Card className="border-0 shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white">
              <CardContent className="p-10">
                <div className="flex items-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-700 mb-8 text-lg leading-relaxed italic">
                  "The progress tracking helps me identify exactly where each student needs support. It's incredibly valuable."
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    L
                  </div>
                  <div className="ml-4">
                    <div className="font-bold text-slate-900 text-lg">Lisa Rodriguez</div>
                    <div className="text-slate-600">Elementary Teacher, Miami</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_35%,rgba(68,196,255,0.1)_45%,rgba(68,196,255,0.1)_55%,transparent_65%)]"></div>
        <div className="absolute top-20 left-10 w-40 h-40 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-gradient-to-r from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-12">
            <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm font-semibold text-white mb-8">
              <Sparkles className="h-4 w-4 mr-2 text-blue-300" />
              Start Your Free Trial Today
            </div>
            
            <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              Ready to Revolutionize
              <span className="block bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                Vocabulary Learning?
              </span>
            </h2>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-16 max-w-4xl mx-auto leading-relaxed">
              Join 10,000+ educators who have already transformed their classrooms. 
              Setup takes just 5 minutes and comes with full support.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-16">
            <Button size="lg" asChild className="bg-white text-blue-900 hover:bg-blue-50 text-xl px-12 py-8 shadow-2xl hover:shadow-3xl transition-all duration-300 group font-semibold">
              <Link to="/auth">
                Start Free Trial
                <ArrowRight className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-xl px-12 py-8 font-semibold">
              Schedule Demo Call
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center space-x-4">
                <Shield className="h-8 w-8 text-green-300" />
                <div className="text-left">
                  <div className="font-semibold text-white">100% Secure</div>
                  <div className="text-blue-200 text-sm">SOC 2 Compliant</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center space-x-4">
                <Clock className="h-8 w-8 text-blue-300" />
                <div className="text-left">
                  <div className="font-semibold text-white">Quick Setup</div>
                  <div className="text-blue-200 text-sm">Ready in 5 minutes</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center space-x-4">
                <Award className="h-8 w-8 text-yellow-300" />
                <div className="text-left">
                  <div className="font-semibold text-white">Award Winner</div>
                  <div className="text-blue-200 text-sm">EdTech Innovation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-8">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <span className="text-3xl font-brand font-bold">lexible</span>
              </div>
              <p className="text-slate-400 mb-8 max-w-md text-lg leading-relaxed">
                Empowering educators and students with intelligent vocabulary learning tools that make a real difference in academic success.
              </p>
              <div className="flex items-center text-slate-400 bg-slate-800 rounded-lg px-4 py-3 inline-flex">
                <Globe className="h-5 w-5 mr-3 text-blue-400" />
                <span className="font-medium">Serving 10,000+ educators worldwide</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-xl text-white">Platform</h3>
              <ul className="space-y-4 text-slate-400">
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">For Educators</Link></li>
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">For Students</Link></li>
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">Pricing</Link></li>
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">Features</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold mb-6 text-xl text-white">Support</h3>
              <ul className="space-y-4 text-slate-400">
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">Help Center</Link></li>
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">Contact Us</Link></li>
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">Community</Link></li>
                <li><Link to="/auth" className="hover:text-blue-400 transition-colors duration-200 text-lg">Training</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-12 mt-16">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-slate-400 text-lg">
                © 2024 Lexible. All rights reserved.
              </div>
              <div className="flex space-x-8 mt-6 md:mt-0">
                <Link to="/auth" className="text-slate-400 hover:text-blue-400 text-lg transition-colors duration-200">Privacy Policy</Link>
                <Link to="/auth" className="text-slate-400 hover:text-blue-400 text-lg transition-colors duration-200">Terms of Service</Link>
                <Link to="/auth" className="text-slate-400 hover:text-blue-400 text-lg transition-colors duration-200">Cookie Policy</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}