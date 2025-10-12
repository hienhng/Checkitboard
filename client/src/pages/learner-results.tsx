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
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate("/learner/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground dark:text-foreground mb-2">
                My Test Results
              </h1>
              <p className="text-muted-foreground dark:text-muted-foreground">
                View all your completed tests and track your progress
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {totalTests > 0 && (
          <div className="grid gap-4 md:grid-cols-4 mb-8">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Total Tests</p>
                    <p className="text-2xl font-bold text-foreground dark:text-foreground">{totalTests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Average Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>
                      {avgScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Best Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(bestScore)}`}>
                      {bestScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">Recent Score</p>
                    <p className={`text-2xl font-bold ${getScoreColor(recentScore)}`}>
                      {recentScore}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Results Table */}
        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg">
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Test History
            </CardTitle>
            <CardDescription className="text-primary-foreground/90">
              All your completed tests and their results
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground dark:text-muted-foreground text-lg mb-2">
                  No test results yet
                </p>
                <p className="text-muted-foreground dark:text-muted-foreground text-sm mb-4">
                  Complete a test to see your results here
                </p>
                <Button onClick={() => navigate("/learner/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-border dark:border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 dark:bg-muted/50">
                      <TableHead className="font-semibold">Test Name</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Score</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow 
                        key={submission.id}
                        className="hover:bg-muted/30 dark:hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium text-foreground dark:text-foreground">
                          {submission.list.title}
                          {submission.isRedo && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Retake
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline"
                            className={submission.list.type === "test" 
                              ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700" 
                              : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"}
                          >
                            {submission.list.type === "test" ? "Test" : "Practice"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground dark:text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold ${getScoreColor(submission.score)}`}>
                              {submission.score}%
                            </span>
                            {getScoreBadge(submission.score)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {submission.gradedAt ? (
                            <Badge className="bg-green-500 dark:bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Graded
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500 dark:bg-yellow-600">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/test-results/${submission.id}`)}
                            className="bg-primary hover:bg-primary/90"
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
