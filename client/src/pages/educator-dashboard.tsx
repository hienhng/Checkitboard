import { useState } from "react";
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
  User,
  Users,
  School
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { VocabularyList } from "@shared/schema";
import { formatDate, formatDueDate } from "@/lib/utils";
import { GradingPanel } from "@/components/grading-panel";
import { ClassManagement } from "@/components/class-management";
import { useToast } from "@/hooks/use-toast";

export default function EducatorDashboard() {
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

  // Mutation to publish/unpublish a vocabulary list
  const publishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      const res = await apiRequest("PATCH", `/api/vocabulary-lists/${id}`, { published });
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
    publishMutation.mutate({ id, published: !currentStatus });
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
            <h2 className="text-2xl font-bold text-neutral-dark">Educator Dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Create and manage vocabulary lists, classes, and grade student submissions.
            </p>
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
                  <Button variant="ghost" onClick={() => setShowCreateList(false)}>Cancel</Button>
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
                  }}>Cancel</Button>
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
                        Create New Vocabulary List
                      </Button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {/* Vocabulary Lists */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <BookOpen className="mr-2 h-5 w-5 text-primary" />
                            My Vocabulary Lists
                          </CardTitle>
                          <CardDescription>
                            Manage your created vocabulary lists
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {listsLoading ? (
                            <div className="py-4 text-center text-sm text-gray-500">Loading vocabulary lists...</div>
                          ) : vocabularyLists && vocabularyLists.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                              {vocabularyLists.map((list) => (
                                <div key={list.id} className="py-4 flex justify-between items-center">
                                  <div className="flex-1">
                                    <h4 className="text-sm font-medium text-neutral-dark">{list.title}</h4>
                                    <div className="mt-1 flex items-center text-xs text-gray-500">
                                      <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                      Created: {formatDate(list.createdAt)}
                                    </div>
                                    <div className="mt-1 flex items-center text-xs text-gray-500">
                                      <ClipboardList className="mr-1 h-3.5 w-3.5" />
                                      {list.words?.length || 0} vocabulary words
                                    </div>
                                    {list.class && (
                                      <div className="mt-1 flex items-center text-xs text-gray-500">
                                        <School className="mr-1 h-3.5 w-3.5" />
                                        Class: {list.class.name}
                                      </div>
                                    )}
                                  </div>
                                  <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                                    <Button 
                                      variant={list.published ? "outline" : "default"} 
                                      size="sm"
                                      onClick={() => handlePublishToggle(list.id, list.published)}
                                    >
                                      {list.published ? "Unpublish" : "Publish"}
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="py-4 text-center text-sm text-gray-500">
                              You haven't created any vocabulary lists yet.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Pending Submissions */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Clock className="mr-2 h-5 w-5 text-primary" />
                            Pending Submissions
                          </CardTitle>
                          <CardDescription>
                            Review and grade student submissions
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {submissionsLoading ? (
                            <div className="py-4 text-center text-sm text-gray-500">Loading submissions...</div>
                          ) : pendingSubmissions && pendingSubmissions.length > 0 ? (
                            <div className="divide-y divide-gray-200">
                              {pendingSubmissions.map((submission) => (
                                <div key={submission.id} className="py-4 flex justify-between items-center">
                                  <div className="flex-1">
                                    <h4 className="text-sm font-medium text-neutral-dark">
                                      {submission.list.title}
                                    </h4>
                                    <div className="mt-1 flex items-center text-xs text-gray-500">
                                      <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                      Student: {submission.student.name}
                                    </div>
                                    <div className="mt-1 flex items-center text-xs text-gray-500">
                                      <Clock className="mr-1 h-3.5 w-3.5" />
                                      Submitted: {formatDate(submission.submittedAt)}
                                    </div>
                                  </div>
                                  <div className="ml-4 flex-shrink-0">
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
                            <div className="py-4 text-center text-sm text-gray-500">
                              No pending submissions to grade.
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
