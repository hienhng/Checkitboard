import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PassageEditor } from "@/components/passage-editor";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  BookOpen,
  CheckCircle,
  Clock,
  CalendarDays,
  ClipboardList,
  ArrowRight,
  BarChart,
  User,
  Users,
  School,
  FileText,
  Trophy,
} from "lucide-react";

import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { VocabularyList } from "@shared/schema";
import { formatDate, formatDueDate } from "@/lib/utils";
import { GradingPanel } from "@/components/grading-panel";

import { RequestApprovalButton } from "@/components/request-approval";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

function EducatorDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [showCreateList, setShowCreateList] = useState(false);
  const [checkupType, setCheckupType] = useState<"test" | "practice">(
    "practice",
  );
  const [showGrading, setShowGrading] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<
    number | null
  >(null);

  // Fetch educator's vocabulary lists
  const { data: vocabularyLists = [], isLoading: listsLoading } = useQuery<
    any[]
  >({
    queryKey: ["/api/educator/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch pending submissions for grading
  const { data: pendingSubmissions = [], isLoading: submissionsLoading } =
    useQuery<any[]>({
      queryKey: ["/api/educator/submissions"],
      queryFn: getQueryFn({ on401: "throw" }),
    });

  // Fetch educator's classes for filter dropdown
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
  });

  // Mutation to publish/unpublish a vocabulary list
  const publishMutation = useMutation({
    mutationFn: async ({
      id,
      published,
      classId,
    }: {
      id: number;
      published: boolean;
      classId?: number;
    }) => {
      // Preserve the existing class assignment when publishing/unpublishing
      const payload: any = { published };
      if (classId !== undefined) {
        payload.classId = classId;
      }

      const res = await apiRequest(
        "PATCH",
        `/api/vocabulary-lists/${id}`,
        payload,
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/educator/vocabulary-lists"],
      });
      toast({
        title: "List updated",
        description:
          "The vocabulary list status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePublishToggle = (id: number, currentStatus: boolean) => {
    // Find the list to get its current class assignment
    const list = vocabularyLists.find((l) => l.id === id);
    const classId = list?.classId || list?.class?.id;

    publishMutation.mutate({
      id,
      published: !currentStatus,
      classId: classId,
    });
  };

  const handleTypeSelection = (type: "test" | "practice") => {
    setCheckupType(type);
    setShowTypeSelection(false);
    setShowCreateList(true);
  };

  const handleCreateSuccess = () => {
    setShowCreateList(false);
    queryClient.invalidateQueries({
      queryKey: ["/api/educator/vocabulary-lists"],
    });
    toast({
      title: "List created",
      description: "Your vocabulary list has been created successfully.",
    });
  };

  const handleGradingComplete = () => {
    setShowGrading(false);
    setSelectedSubmissionId(null);
    queryClient.invalidateQueries({ queryKey: ["/api/educator/submissions"] });
    toast({
      title: "Grading completed",
      description:
        "The submission has been graded successfully and parents have been notified.",
    });
  };

  // Fetch educator statistics for preview
  const { data: stats } = useQuery({
    queryKey: ["/api/educator/statistics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/statistics");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Educator workspace header */}
      <div className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl dark:bg-emerald-500/10" />
        <div className="absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl dark:bg-blue-500/10" />
        <div className="relative mx-auto max-w-7xl px-6 pb-10 pt-8 lg:px-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Educator workspace
              </div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                Build better learning moments{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-slate-500 dark:text-slate-400">
                Create assignments, stay on top of your classes, and use progress insights to guide your next lesson.
              </p>
            </div>
            <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl shadow-emerald-900/10 dark:border-slate-800">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">Workspace pulse</p>
                  <p className="mt-2 text-sm text-slate-300">Your teaching snapshot</p>
                </div>
                <div className="rounded-xl bg-emerald-500/20 p-2 text-emerald-200">
                  <BarChart className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-2xl font-semibold">{stats?.totalStudents || 0}</p>
                  <p className="mt-1 text-xs text-slate-400">students</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stats?.totalClasses || 0}</p>
                  <p className="mt-1 text-xs text-slate-400">classes</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-emerald-300">{stats?.totalLists || 0}</p>
                  <p className="mt-1 text-xs text-slate-400">lists</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-8 lg:px-8">
        {showCreateList ? (
          <Card className="border-0 bg-gradient-to-br from-card to-card/80 shadow-2xl">
            <CardHeader className="border-b border-border/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    Create New Vocabulary List
                  </CardTitle>
                  <CardDescription className="mt-2 text-muted-foreground">
                    Paste a reading passage and highlight words for your
                    vocabulary list.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateList(false)}
                >
                  Return
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <PassageEditor
                onSuccess={handleCreateSuccess}
                checkupType={checkupType}
              />
            </CardContent>
          </Card>
        ) : showGrading && selectedSubmissionId ? (
          <Card className="border-0 bg-gradient-to-br from-card to-card/80 shadow-2xl">
            <CardHeader className="border-b border-border/20">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl text-foreground">
                    Grade Submission
                  </CardTitle>
                  <CardDescription className="mt-2 text-muted-foreground">
                    Review student definitions and provide feedback.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowGrading(false);
                    setSelectedSubmissionId(null);
                  }}
                >
                  Return
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <GradingPanel
                submissionId={selectedSubmissionId}
                onComplete={handleGradingComplete}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats Overview */}
            <div className="grid gap-6 md:grid-cols-3">
              <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground">
                      {stats?.totalStudents || 0}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Total Students
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                    <School className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground">
                      {stats?.totalClasses || 0}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Classes
                    </p>
                  </div>
                </div>
              </div>

              <div className="group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform duration-300">
                    <BookOpen className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-foreground">
                      {stats?.totalLists || 0}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                      Vocabulary Lists
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="card-glass overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0">
                <div className="relative bg-gradient-to-r from-primary via-primary/95 to-primary/85 p-6">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 right-2 w-24 h-24 rounded-full bg-white/20 blur-xl"></div>
                    <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                  </div>
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <PlusCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Create Content</h3>
                      <p className="text-white/80 text-sm mt-1">Build engaging vocabulary lists</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4 bg-card">
                  <Button
                    onClick={() => setShowTypeSelection(true)}
                    className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-base py-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                    size="lg"
                  >
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New Checkup
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Paste passages, highlight words, and create engaging assessments
                  </p>
                </CardContent>
              </Card>

              <Card className="card-glass overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0">
                <div className="relative bg-gradient-to-r from-emerald-500 via-emerald-500/95 to-green-500/85 p-6">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 right-2 w-24 h-24 rounded-full bg-white/20 blur-xl"></div>
                    <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                  </div>
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <BarChart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Analytics & Insights</h3>
                      <p className="text-white/80 text-sm mt-1">Track student progress</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4 bg-card">
                  <Link to="/educator/statistics">
                    <Button
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-base py-6 rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-300"
                      size="lg"
                    >
                      <BarChart className="mr-2 h-5 w-5" />
                      View Full Statistics
                    </Button>
                  </Link>
                  <p className="text-center text-sm text-muted-foreground">
                    Track completion rates and performance trends
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
              {/* Recent Vocabulary Lists */}
              <Card className="card-glass overflow-hidden border-0">
                <div className="relative bg-gradient-to-r from-blue-500 via-blue-500/95 to-indigo-500/85 p-6">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 right-2 w-24 h-24 rounded-full bg-white/20 blur-xl"></div>
                    <div className="absolute bottom-0 left-1/4 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                  </div>
                  <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Recent Vocabulary Lists</h3>
                      <p className="text-white/80 text-sm mt-1">Your latest vocabulary assignments</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 bg-card">
                  {listsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-sm text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : vocabularyLists.length > 0 ? (
                    <div className="space-y-3">
                      {vocabularyLists.slice(0, 3).map((list: any) => (
                        <div
                          key={list.id}
                          className="group p-4 bg-gradient-to-r from-slate-50/80 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-900/20 rounded-2xl border border-border/30 hover:border-blue-300/50 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground group-hover:text-blue-600 transition-colors">
                                {list.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Due: {formatDueDate(list.dueDate)}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {list.published ? (
                                  <span className="px-2.5 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs rounded-full font-medium">
                                    Published
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-gradient-to-r from-gray-100 to-slate-100 text-gray-600 text-xs rounded-full font-medium">
                                    Draft
                                  </span>
                                )}
                                {list.class && (
                                  <span className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs rounded-full font-medium">
                                    {list.class.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Link to={`/educator/vocabulary/${list.id}`}>
                              <Button variant="ghost" size="sm" className="rounded-xl hover:bg-blue-100/50 group-hover:translate-x-1 transition-transform">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                      {vocabularyLists.length > 3 && (
                        <div className="text-center pt-4">
                          <Link to="/educator/assignments">
                            <Button variant="outline" size="sm" className="rounded-xl hover:bg-blue-50 hover:border-blue-300">
                              View All Lists ({vocabularyLists.length})
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-blue-500" />
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">
                        No vocabulary lists yet
                      </p>
                      <Button
                        onClick={() => setShowTypeSelection(true)}
                        variant="outline"
                        size="sm"
                        className="rounded-xl hover:bg-blue-50 hover:border-blue-300"
                      >
                        Create Your First List
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Temporarily hidden - Pending Submissions section */}
              {/* <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg p-6">
                  <CardTitle className="text-xl font-bold">
                    <ClipboardList className="inline mr-3 h-5 w-5" />
                    Pending Reviews
                  </CardTitle>
                  <CardDescription className="text-orange-100 text-sm mt-2">
                    Student submissions awaiting feedback
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {submissionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-3 text-sm text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : pendingSubmissions.length > 0 ? (
                    <div className="space-y-3">
                      {pendingSubmissions.slice(0, 3).map((submission: any) => (
                        <div
                          key={submission.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">
                                {submission.student?.name}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {submission.list?.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Submitted: {formatDate(submission.submittedAt)}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                setSelectedSubmissionId(submission.id);
                                setShowGrading(true);
                              }}
                              size="sm"
                              className="bg-orange-500 hover:bg-orange-600"
                            >
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                      {pendingSubmissions.length > 3 && (
                        <div className="text-center pt-4">
                          <Button variant="outline" size="sm">
                            View All Submissions ({pendingSubmissions.length})
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm">
                        All caught up!
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        No submissions need review
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card> */}
            </div>
          </div>
        )}
      </div>

      {/* Type Selection Dialog */}
      <Dialog open={showTypeSelection} onOpenChange={setShowTypeSelection}>
        <DialogContent
          className="w-[95%] sm:w-[550px] md:w-[650px] max-w-[90vw] mx-auto overflow-hidden rounded-xl box-border 
                     animate-in fade-in-0 zoom-in-95 
                     data-[state=open]:animate-in data-[state=closed]:animate-out 
                     data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-95 
                     duration-300 ease-out"
        >
          <DialogHeader>
            <DialogTitle>Choose Checkup Type</DialogTitle>
            <DialogDescription>
              Select whether you want to create a <strong>Test</strong> or{" "}
              <strong>Practice</strong> checkup
            </DialogDescription>
          </DialogHeader>

          <div className="px-4">
            <div className="grid gap-4 py-4">
              {/* Test Button */}
              <Button
                onClick={() => handleTypeSelection("test")}
                className="w-full h-auto py-6 flex flex-col items-start gap-2 text-white rounded-lg text-left relative overflow-hidden bg-blue-600 hover:bg-blue-700 transition-all duration-200 ease-out"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <span className="text-lg font-semibold">Test</span>
                </div>
                <span className="text-sm text-white/90">
                  Formal assessment with fullscreen mode, time tracking, and
                  monitoring
                </span>
              </Button>

              {/* Practice Button */}
              <Button
                onClick={() => handleTypeSelection("practice")}
                className="w-full box-border min-w-0 h-auto py-6 flex flex-col items-start gap-2 
                           bg-white hover:bg-blue-50 text-black border border-slate-300 
                           rounded-lg text-left transition-all duration-200 ease-out"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-black" />
                  <span className="text-lg text-black font-semibold">
                    Practice
                  </span>
                </div>
                <span className="text-sm text-black/90">
                  Flexible learning mode with save progress option and no time
                  pressure
                </span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EducatorDashboard;
