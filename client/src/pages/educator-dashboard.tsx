import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
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

function EducatorDashboard() {
  const { toast } = useToast();
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4">
              <h1 className="text-6xl font-bold text-foreground">
                Welcome to{" "}
                <span className="font-brand font-light bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent tracking-wide">
                  lexible
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Create engaging vocabulary experiences, manage classes, and
                track student progress with powerful insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 -mt-8 relative z-10">
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
            <div className="grid gap-10 md:grid-cols-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <Users className="mx-auto h-10 w-10 text-blue-600 mb-3" />
                  <div className="text-2xl font-bold text-blue-700">
                    {stats?.totalStudents || 0}
                  </div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Students
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <School className="mx-auto h-10 w-10 text-green-600 mb-3" />
                  <div className="text-2xl font-bold text-green-700">
                    {stats?.totalClasses || 0}
                  </div>
                  <p className="text-sm text-green-600 font-medium">Classes</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-purple-600 mb-3" />
                  <div className="text-2xl font-bold text-purple-700">
                    {stats?.totalLists || 0}
                  </div>
                  <p className="text-sm text-purple-600 font-medium">
                    Vocabulary Lists
                  </p>
                </CardContent>
              </Card>

              {/* Temporarily hidden - Pending Reviews stat card */}
              {/* <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <ClipboardList className="mx-auto h-10 w-10 text-orange-600 mb-3" />
                  <div className="text-2xl font-bold text-orange-700">
                    {pendingSubmissions?.length || 0}
                  </div>
                  <p className="text-sm text-orange-600 font-medium">
                    Pending Reviews
                  </p>
                </CardContent>
              </Card> */}
            </div>

            {/* Action Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-t-lg p-6">
                  <CardTitle className="text-2xl font-bold">
                    <PlusCircle className="inline mr-3 h-6 w-6" />
                    Create Content
                  </CardTitle>
                  <CardDescription className="text-primary-foreground/90 text-base mt-2">
                    Build engaging vocabulary lists and assignments
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Button
                      onClick={() => setShowTypeSelection(true)}
                      className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-lg py-6"
                      size="lg"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Create New Checkup
                    </Button>
                    <div className="text-center text-sm text-muted-foreground">
                      Paste passages, highlight words, and create engaging
                      assessments
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg p-6">
                  <CardTitle className="text-2xl font-bold">
                    <BarChart className="inline mr-3 h-6 w-6" />
                    Analytics & Insights
                  </CardTitle>
                  <CardDescription className="text-green-100 text-base mt-2">
                    View detailed statistics and student progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Link to="/educator/statistics">
                      <Button
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-lg py-6"
                        size="lg"
                      >
                        <BarChart className="mr-2 h-5 w-5" />
                        View Full Statistics
                      </Button>
                    </Link>
                    <div className="text-center text-sm text-muted-foreground">
                      Track student progress, completion rates, and performance
                      trends
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
              {/* Recent Vocabulary Lists */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl w-full">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-6">
                  <CardTitle className="text-xl font-bold">
                    <BookOpen className="inline mr-3 h-5 w-5" />
                    Recent Vocabulary Lists
                  </CardTitle>
                  <CardDescription className="text-blue-100 text-sm mt-2">
                    Your latest vocabulary assignments
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {listsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-3 text-sm text-muted-foreground">
                        Loading...
                      </span>
                    </div>
                  ) : vocabularyLists.length > 0 ? (
                    <div className="space-y-3">
                      {vocabularyLists.slice(0, 3).map((list: any) => (
                        <div
                          key={list.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">
                                {list.title}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                Due: {formatDueDate(list.dueDate)}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                {list.published ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                    Published
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                    Draft
                                  </span>
                                )}
                                {list.class && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                    {list.class.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Link to={`/educator/vocabulary/${list.id}`}>
                              <Button variant="ghost" size="sm">
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                      {vocabularyLists.length > 3 && (
                        <div className="text-center pt-4">
                          <Link to="/educator/assignments">
                            <Button variant="outline" size="sm">
                              View All Lists ({vocabularyLists.length})
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm">
                        No vocabulary lists yet
                      </p>
                      <Button
                        onClick={() => setShowTypeSelection(true)}
                        variant="outline"
                        size="sm"
                        className="mt-3"
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
