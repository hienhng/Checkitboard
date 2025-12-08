import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  Trophy,
  Calendar,
  CheckCircle,
  Clock,
  Award,
  FileText,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";

interface Submission {
  id: number;
  score: number;
  submittedAt: string;
  gradedAt: string | null;
  completed: boolean;
  isRedo: boolean;
  isDiscarded: boolean;
  list: {
    id: number;
    title: string;
    type: string;
  };
}

export default function LearnerResults() {
  const [, navigate] = useLocation();

  const { data: submissions = [], isLoading } = useQuery<Submission[]>({
    queryKey: ["/api/learner/results"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 0,
    gcTime: 0,
  });

  const getScoreBadge = (score: number) => {
    if (score >= 90) {
      return <Badge className="bg-green-500 hover:bg-green-600">Excellent</Badge>;
    } else if (score >= 80) {
      return <Badge className="bg-blue-500 hover:bg-blue-600">Great</Badge>;
    } else if (score >= 70) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Good</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">Fair</Badge>;
    } else {
      return <Badge className="bg-red-500 hover:bg-red-600">Needs Improvement</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 80) return "text-blue-600 dark:text-blue-400";
    if (score >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  // Calculate statistics
  const totalTests = submissions.length;
  const avgScore = totalTests > 0
    ? Math.round(submissions.reduce((sum, s) => sum + s.score, 0) / totalTests)
    : 0;
  const bestScore = totalTests > 0 ? Math.max(...submissions.map(s => s.score)) : 0;
  const recentScore = totalTests > 0 ? submissions[submissions.length - 1].score : 0;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your results...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      <Navbar />
      
      <div className="flex-1 container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <Button
            variant="outline"
            onClick={() => navigate("/learner/dashboard")}
            className="mb-6 rounded-xl px-5 py-2.5 h-auto border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-sm hover:shadow-md transition-all duration-300 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-3">
                My Test Results
              </h1>
              <p className="text-lg text-muted-foreground dark:text-muted-foreground">
                View all your completed tests and track your progress
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {totalTests > 0 && (
          <div className="grid gap-6 md:grid-cols-4 mb-10">
            <Card className="group relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">Total Tests</p>
                    <p className="text-3xl font-bold text-foreground dark:text-foreground">{totalTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent dark:from-emerald-500/10" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">Average Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>
                      {avgScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent dark:from-amber-500/10" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform duration-300">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">Best Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(bestScore)}`}>
                      {bestScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl rounded-2xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent dark:from-violet-500/10" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform duration-300">
                    <Award className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">Recent Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(recentScore)}`}>
                      {recentScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Table */}
        <Card className="relative overflow-hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-xl rounded-2xl">
          <CardHeader className="relative bg-gradient-to-r from-primary via-primary to-indigo-600 dark:from-primary dark:via-primary dark:to-indigo-700 text-white rounded-t-2xl px-8 py-6">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Test History</CardTitle>
                <CardDescription className="text-white/80 mt-1">
                  All your completed tests and their results
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            {submissions.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center">
                  <FileText className="h-10 w-10 text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground dark:text-foreground mb-2">
                  No test results yet
                </h3>
                <p className="text-muted-foreground dark:text-muted-foreground mb-6 max-w-sm mx-auto">
                  Complete a test to see your results here and track your learning progress
                </p>
                <Button 
                  onClick={() => navigate("/learner/dashboard")}
                  className="rounded-xl px-6 py-3 h-auto bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-slate-50 to-slate-100/80 dark:from-slate-800/80 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <TableHead className="font-semibold text-foreground py-4">Test Name</TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Type</TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Date</TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Score</TableHead>
                      <TableHead className="font-semibold text-foreground py-4">Status</TableHead>
                      <TableHead className="font-semibold text-foreground py-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission, index) => (
                      <TableRow 
                        key={submission.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200 ${
                          index !== submissions.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
                        }`}
                      >
                        <TableCell className="font-medium text-foreground dark:text-foreground py-4">
                          {submission.list.title}
                          {submission.isRedo && (
                            <Badge variant="outline" className="ml-2 text-xs rounded-full px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
                              Retake
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant="outline"
                            className={`rounded-full px-3 py-1 font-medium ${submission.list.type === "test" 
                              ? "bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700" 
                              : "bg-sky-50 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700"}`}
                          >
                            {submission.list.type === "test" ? "Test" : "Practice"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-muted-foreground py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                            </div>
                            <span className="font-medium">{format(new Date(submission.submittedAt), 'MMM dd, yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <span className={`text-xl font-bold ${getScoreColor(submission.score)}`}>
                              {submission.score}%
                            </span>
                            {getScoreBadge(submission.score)}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          {submission.gradedAt ? (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 rounded-full px-3 py-1 shadow-sm">
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              Graded
                            </Badge>
                          ) : (
                            <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 rounded-full px-3 py-1 shadow-sm">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/test-results/${submission.id}`)}
                            className="rounded-xl px-4 py-2 h-auto bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
