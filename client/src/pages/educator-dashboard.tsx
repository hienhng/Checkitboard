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
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  School
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { VocabularyList } from "@shared/schema";
import { formatDate, formatDueDate } from "@/lib/utils";
import { GradingPanel } from "@/components/grading-panel";
import { CreateClassDialog, ClassManagement } from "@/components/class-management";
import { RequestApprovalButton } from "@/components/request-approval";

import { useToast } from "@/hooks/use-toast";

function EducatorDashboard() {
  const { toast } = useToast();
  const [showCreateList, setShowCreateList] = useState(false);
  const [showGrading, setShowGrading] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);



  // Fetch educator's vocabulary lists
  const { data: vocabularyLists = [], isLoading: listsLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch pending submissions for grading
  const { data: pendingSubmissions = [], isLoading: submissionsLoading } = useQuery<any[]>({
    queryKey: ["/api/educator/submissions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch educator's classes for filter dropdown
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    }
  });





  // Mutation to publish/unpublish a vocabulary list
  const publishMutation = useMutation({
    mutationFn: async ({ id, published, classId }: { id: number; published: boolean; classId?: number }) => {
      // Preserve the existing class assignment when publishing/unpublishing
      const payload: any = { published };
      if (classId !== undefined) {
        payload.classId = classId;
      }
      
      const res = await apiRequest("PATCH", `/api/vocabulary-lists/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
      toast({
        title: "List updated",
        description: "The vocabulary list status has been updated successfully.",
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
    const list = vocabularyLists.find(l => l.id === id);
    const classId = list?.classId || list?.class?.id;
    
    publishMutation.mutate({ 
      id, 
      published: !currentStatus,
      classId: classId 
    });
  };

  const handleCreateSuccess = () => {
    setShowCreateList(false);
    queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
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
      description: "The submission has been graded successfully and parents have been notified.",
    });
  };

  const [activeTab, setActiveTab] = useState("dashboard");



  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-5xl font-bold text-foreground"> 
              Ready to <span className="font-brand font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent transition-all duration-300">lexible</span>
              <span className="text-foreground">?</span>
            </h2>
            <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
              Create and manage vocabulary lists, classes, and grade student submissions.
            </p>
          </div>
        </div>
      </div>
          
          {/* Content */}
      <div className="space-y-6">
            {showCreateList ? (
              <Card className="border-0 bg-gradient-to-br from-card to-card/80 shadow-2xl">
                <CardHeader className="border-b border-border/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl text-foreground">Create New Vocabulary List</CardTitle>
                      <CardDescription className="mt-2 text-muted-foreground">
                        Paste a reading passage and highlight words for your vocabulary list.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setShowCreateList(false)}>Return</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <PassageEditor onSuccess={handleCreateSuccess} />
                </CardContent>
              </Card>
            ) : showGrading && selectedSubmissionId ? (
              <Card className="border-0 bg-gradient-to-br from-card to-card/80 shadow-2xl">
                <CardHeader className="border-b border-border/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-xl text-foreground">Grade Submission</CardTitle>
                      <CardDescription className="mt-2 text-muted-foreground">
                        Review student definitions and provide feedback.
                      </CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => {
                      setShowGrading(false);
                      setSelectedSubmissionId(null);
                    }}>Return</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <GradingPanel submissionId={selectedSubmissionId} onComplete={handleGradingComplete} />
                </CardContent>
              </Card>
            ) : (
              <>
                <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                    <TabsTrigger value="dashboard" className="flex items-center data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="classes" className="flex items-center data-[state=active]:bg-card data-[state=active]:shadow-sm">
                      <School className="mr-2 h-4 w-4" />
                      Classes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="dashboard">
                    <div className="mb-6 flex">
                      <Button 
                        onClick={() => setShowCreateList(true)}
                        className="flex items-center bg-primary hover:bg-primary/90 shadow-lg"
                        size="lg"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Draft
                      </Button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Quick Stats */}
                      <Card className="border-0 bg-gradient-to-br from-card to-card/80 shadow-2xl">
                        <CardHeader>
                          <CardTitle className="flex items-center text-foreground">
                            <BarChart className="mr-2 h-5 w-5 text-primary" />
                            Quick Overview
                          </CardTitle>
                          <CardDescription>
                            Your teaching dashboard at a glance
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Total Vocabulary Lists</span>
                              <span className="font-semibold text-foreground">{vocabularyLists.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Published Lists</span>
                              <span className="font-semibold text-foreground">{vocabularyLists.filter(list => list.published).length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Pending Submissions</span>
                              <span className="font-semibold text-foreground">{pendingSubmissions.length}</span>
                            </div>
                            <div className="pt-4 border-t border-border">
                              <Link href="/educator/assignments">
                                <Button variant="outline" className="w-full">
                                  <ClipboardList className="mr-2 h-4 w-4" />
                                  Manage Assignments
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Pending Submissions */}
                      <Card className="border-0 bg-gradient-to-br from-orange-500/90 to-orange-600 shadow-2xl text-white">
                        <CardHeader className="pb-4">
                          <CardTitle className="flex items-center text-white">
                            <Clock className="mr-2 h-5 w-5" />
                            Pending Submissions
                          </CardTitle>
                          <CardDescription className="text-orange-100">
                            Review and grade student submissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {submissionsLoading ? (
                            <div className="py-4 text-center text-sm text-white/80">Loading submissions...</div>
                          ) : pendingSubmissions && pendingSubmissions.length > 0 ? (
                            <div className="space-y-3">
                              {pendingSubmissions.map((submission) => (
                                <div key={submission.id} className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                                  <div className="flex justify-between items-center">
                                    <div className="flex-1">
                                      <h4 className="text-sm font-medium text-white">
                                        {submission.list.title}
                                      </h4>
                                      <div className="mt-1 flex items-center text-xs text-orange-100">
                                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                        Student: {submission.student.name}
                                      </div>
                                      <div className="mt-1 flex items-center text-xs text-orange-100">
                                        <Clock className="mr-1 h-3.5 w-3.5" />
                                        Submitted: {formatDate(submission.submittedAt)}
                                      </div>
                                    </div>
                                    <div className="ml-4 flex-shrink-0">
                                      <Button 
                                        size="sm"
                                        variant="secondary"
                                        className="bg-white text-orange-600 hover:bg-white/90"
                                        onClick={() => {
                                          setSelectedSubmissionId(submission.id);
                                          setShowGrading(true);
                                        }}
                                      >
                                        Grade
                                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center text-sm text-orange-100">
                              No pending submissions to grade. Reload the page if needed.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="classes">
                    <ClassManagement />
                  </TabsContent>
                </Tabs>
              </>
            )}
      </div>
    </div>
  );
}

export default EducatorDashboard;
