import { PageHeader } from "@/components/workspace-ui";
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
      <div className="workspace-page">
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
    <div className="workspace-page">
      <Navbar />
      
      <div className="workspace-page flex-1">
        {/* Header */}
        <PageHeader eyebrow="Every attempt matters" title="Your learning, chapter by chapter." description="Look back at your completed checkups, celebrate your progress, and see what to practice next." />

        {/* Statistics Cards */}
        {totalTests > 0 && (
          <div className="grid gap-6 md:grid-cols-4 mb-10">
            <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-muted/50" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">Total Tests</p>
                    <p className="text-3xl font-bold text-foreground dark:text-foreground">{totalTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-muted/50" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
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

            <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-muted/50" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
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

            <Card className="group relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-lg shadow-sm rounded-2xl transition-all duration-300">
              <div className="absolute inset-0 bg-muted/50" />
              <CardContent className="relative p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center   transition-transform duration-300 bg-primary">
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
        <Card className="relative overflow-hidden bg-card dark:bg-slate-900/90 backdrop-blur-md border border-white/20 dark:border-slate-700/50 shadow-sm rounded-2xl">
          <CardHeader className="relative text-white rounded-t-2xl px-8 py-6 bg-primary">
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
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-muted/50">
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
                  className="rounded-xl px-6 py-3 h-auto shadow-lg shadow-primary/25 shadow-sm hover:shadow-primary/30 transition-all duration-300 bg-muted/50"
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-700/50 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border dark:border-slate-700 bg-muted/50">
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
                            <Badge variant="outline" className="ml-2 text-xs rounded-full px-2 py-0.5 bg-muted/60 dark:bg-slate-800 border-slate-300 dark:border-slate-600">
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
                            <div className="w-8 h-8 rounded-lg bg-muted/60 dark:bg-slate-800 flex items-center justify-center">
                              <Calendar className="h-4 w-4 text-muted-foreground dark:text-slate-400" />
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
                            <Badge className="rounded-full px-3 py-1 shadow-sm bg-muted/50">
                              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                              Graded
                            </Badge>
                          ) : (
                            <Badge className="rounded-full px-3 py-1 shadow-sm bg-muted/50">
                              <Clock className="h-3.5 w-3.5 mr-1.5" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/test-results/${submission.id}`)}
                            className="rounded-xl px-4 py-2 h-auto shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-300 bg-muted/50"
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
