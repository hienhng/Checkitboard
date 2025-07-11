import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, BookOpen, Eye, Play, Users, Calendar, CheckCircle, XCircle, Award } from "lucide-react";
import { useState } from "react";

export default function TestPreview() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);

  const listId = parseInt(id || "0");

  // Get vocabulary list details
  const { data: vocabularyList, isLoading } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Check for existing submission and results
  const { data: submissionData, error: submissionError } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}/submission`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });



  console.log("TestPreview loaded", { listId, isLoading, hasData: !!vocabularyList });

  // Type guard for vocabulary list data
  const listData = vocabularyList as any;

  // Mutation to start the test
  const startTestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/vocabulary-lists/${listId}/start-test`);
      return await res.json();
    },
    onSuccess: (data) => {
      // Navigate to the actual test
      navigate(`/vocabulary-checkup/${data.submissionId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error starting test",
        description: error.message || "Failed to start the test. Please try again.",
        variant: "destructive",
      });
      setIsStarting(false);
    },
  });

  const handleStartTest = async () => {
    setIsStarting(true);
    
    // First enter fullscreen with user gesture context
    try {
      await document.documentElement.requestFullscreen();
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
      // Continue with test even if fullscreen fails
    }
    
    // Then start the test
    await startTestMutation.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test preview...</p>
        </div>
      </div>
    );
  }

  if (!listData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Test Not Found</h2>
            <p className="text-gray-600 mb-4">The vocabulary test you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => navigate("/learner/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Create blurred preview of passage (show first half, blur second half)
  const passageWords = listData.passage.split(' ');
  const midPoint = Math.floor(passageWords.length / 2);
  const visiblePart = passageWords.slice(0, midPoint).join(' ');
  const blurredPart = passageWords.slice(midPoint).join(' ');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/learner/dashboard")}
            className="mb-4"
          >
            ← Back to Dashboard
          </Button>
          
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {listData.title}
                </h1>
                <p className="text-gray-600 mb-4">
                  {listData.description || "Vocabulary comprehension test"}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{listData.words?.length || 0} vocabulary words</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Estimated time: {Math.ceil((listData.words?.length || 0) * 2)} minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Created by {listData.educator?.name}</span>
                  </div>
                </div>
              </div>
              
              <Badge 
                variant={listData.published ? "default" : "secondary"}
                className="ml-4"
              >
                {listData.published ? "Published" : "Draft"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Passage Preview */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Reading Passage Preview
              </CardTitle>
              <CardDescription>
                Start the test to see the full passage with highlighted vocabulary words
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="relative">
                  {/* Visible part */}
                  <div className="mb-4">
                    {visiblePart}
                  </div>
                  
                  {/* Blurred part */}
                  <div className="relative">
                    <div 
                      className="blur-sm select-none pointer-events-none text-gray-400"
                      style={{ filter: 'blur(4px)' }}
                    >
                      {blurredPart}
                    </div>
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/80 pointer-events-none"></div>
                    
                    {/* "Start test to continue" message */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-sm border">
                        <p className="text-sm font-medium text-gray-700">
                          Start test to read the full passage
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Information & Start */}
          <div className="space-y-6">
            {/* Test Instructions */}
            <Card>
              <CardHeader>
                <CardTitle>Test Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <p className="text-sm text-gray-700">
                      Read the complete passage carefully
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <p className="text-sm text-gray-700">
                      Define each highlighted vocabulary word based on its context
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      3
                    </div>
                    <p className="text-sm text-gray-700">
                      Write your definitions in your own words
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      4
                    </div>
                    <p className="text-sm text-gray-700">
                      Submit your test when complete for grading
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Test Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Fullscreen mode required</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>No external resources allowed</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Complete all vocabulary definitions</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>Each test can only be done once</span>
                </div>
              </CardContent>
            </Card>

            {/* Conditional Section: Start Test, Pending Grade, or View Results */}
            {submissionData && submissionData.gradedAt ? (
              // Show Results Section - Test has been graded
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <Award className="h-5 w-5" />
                    Test Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-800 mb-2">
                      {submissionData.score}%
                    </div>
                    <p className="text-sm text-green-700 mb-4">
                      Completed on {new Date(submissionData.gradedAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Show word results */}
                  {submissionData.definitions && submissionData.definitions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-800">Word Results:</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {submissionData.definitions.map((def: any) => (
                          <div key={def.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                            <div className="flex-1">
                              <span className="font-medium">{def.word?.word}</span>
                              {def.showCorrectDefinition && def.correctDefinition && (
                                <p className="text-xs text-gray-600 mt-1">
                                  Correct: {def.correctDefinition}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center">
                              {def.isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <Button 
                      onClick={() => navigate(`/test-results/${submissionData.id}`)}
                      className="w-full"
                    >
                      <Award className="h-4 w-4 mr-2" />
                      View Detailed Results
                    </Button>
                    <Button 
                      onClick={() => navigate("/learner/dashboard")}
                      className="w-full"
                      variant="outline"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : submissionData && submissionData.submittedAt && !submissionData.gradedAt ? (
              // Show Pending Grade Section - Test submitted but not graded yet
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-5 w-5" />
                    Test Pending Grade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-orange-600 mb-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-orange-900 mb-2">Test Under Review</h3>
                      <p className="text-sm text-orange-700 mb-4">
                        You have already completed this vocabulary test. Your teacher is currently reviewing and grading your submission.
                      </p>
                      <p className="text-xs text-orange-600">
                        Submitted on {new Date(submissionData.submittedAt).toLocaleDateString()} at {new Date(submissionData.submittedAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center">
                          <span className="text-orange-600 text-xs font-bold">!</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-800 mb-1">Please Wait</h4>
                        <p className="text-sm text-orange-700">
                          You cannot retake this test until your teacher has finished grading. 
                          You will receive your results and any feedback once grading is complete.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={() => navigate("/learner/dashboard")}
                      className="w-full"
                      variant="outline"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Show Pending Grade Section - Simulating submitted test awaiting grading
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-orange-800">
                    <Clock className="h-5 w-5" />
                    Test Pending Grade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-orange-600 mb-4">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-orange-600" />
                      </div>
                      <h3 className="font-semibold text-orange-900 mb-2">Test Under Review</h3>
                      <p className="text-sm text-orange-700 mb-4">
                        You have already completed this vocabulary test. Your teacher is currently reviewing and grading your submission.
                      </p>
                      <p className="text-xs text-orange-600">
                        Submitted recently - awaiting grading
                      </p>
                    </div>
                  </div>

                  <div className="bg-orange-100 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center">
                          <span className="text-orange-600 text-xs font-bold">!</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-800 mb-1">Please Wait</h4>
                        <p className="text-sm text-orange-700">
                          You cannot retake this test until your teacher has finished grading. 
                          You will receive your results and any feedback once grading is complete.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button 
                      onClick={() => navigate("/learner/dashboard")}
                      className="w-full"
                      variant="outline"
                    >
                      Return to Dashboard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}