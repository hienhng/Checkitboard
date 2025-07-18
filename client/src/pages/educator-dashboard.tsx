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
    },
    onError: (error) => {
      console.error("Failed to fetch classes:", error);
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
    <div className="flex flex-col min-h-screen bg-neutral-light">
      <Navbar />
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-5xl text-neutral-dark"> Ready to <span className="text-black font-modak transition duration-100 ease-in-out hover:text-blue-500">checkit</span>
                    <span className="text-black">?</span>
                </h2>
                
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Create and manage vocabulary lists, classes, and grade student submissions.
                </p>
              </div>
              
            </div>
          </div>
          
          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-8">
            {showCreateList ? (
              <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200 mb-6">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-dark">Create New Vocabulary List</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Paste a reading passage and highlight words for your vocabulary list.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setShowCreateList(false)}>Return</Button>
                </div>
                <PassageEditor onSuccess={handleCreateSuccess} />
              </div>
            ) : showGrading && selectedSubmissionId ? (
              <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200 mb-6">
                <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-neutral-dark">Grade Submission</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Review student definitions and provide feedback.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => {
                    setShowGrading(false);
                    setSelectedSubmissionId(null);
                  }}>Return</Button>
                </div>
                <GradingPanel submissionId={selectedSubmissionId} onComplete={handleGradingComplete} />
              </div>
            ) : (
              <>
                <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="mb-6">
                  <TabsList>
                    <TabsTrigger value="dashboard" className="flex items-center">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="classes" className="flex items-center">
                      <School className="mr-2 h-4 w-4" />
                      Classes
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="dashboard">
                    <div className="mb-6 flex">
                      <Button 
                        onClick={() => setShowCreateList(true)}
                        className="flex items-center"
                      >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Draft
                      </Button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Quick Stats */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
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
                              <span className="text-sm text-gray-600">Total Vocabulary Lists</span>
                              <span className="font-semibold">{vocabularyLists.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Published Lists</span>
                              <span className="font-semibold">{vocabularyLists.filter(list => list.published).length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">Pending Submissions</span>
                              <span className="font-semibold">{pendingSubmissions.length}</span>
                            </div>
                            <div className="pt-4 border-t">
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
                      <Card className="bg-blue-500">
                        <CardHeader className="bg-blue-500 p-4 pb-4 text-center text-white rounded-t-lg">
                          <CardTitle className="flex items-center">
                            <Clock className="mr-2 h-5 w-5 text-primary text-white" />
                            Pending Submissions
                          </CardTitle>
                          <CardDescription className="text-blue-100 text-left">
                            Review and grade student submissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="bg-blue-500 rounded-b-lg">
                          {submissionsLoading ? (
                            <div className="py-4 text-center text-sm text-white">Loading submissions...</div>
                          ) : pendingSubmissions && pendingSubmissions.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                              {pendingSubmissions.map((submission) => (
                                <div key={submission.id} className="py-4 flex justify-between items-center bg-blue-600 rounded-lg">
                                  <div className="ml-2 mr-2 flex-1">
                                    <h4 className=" text-sm font-medium text-white">
                                      {submission.list.title}
                                    </h4>
                                    <div className="mt-1 flex items-center text-xs text-blue-100">
                                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                      Student: {submission.student.name}
                                    </div>
                                    <div className="mt-1 flex items-center text-xs text-blue-100">
                                      <Clock className="mr-1 h-3.5 w-3.5" />
                                      Submitted: {formatDate(submission.submittedAt)}
                                    </div>
                                  </div>
                                  <div className="ml-4 mr-2 flex-shrink-0">
                                    <Button 
                                      size="sm"
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
                              ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center text-sm text-blue-100">
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
      </div>
    </div>
  );
}

export default EducatorDashboard;
