import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, BookOpen, Eye, Play, Users, Calendar } from "lucide-react";
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

  if (!vocabularyList) {
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
  const passageWords = vocabularyList.passage.split(' ');
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
                  {vocabularyList.title}
                </h1>
                <p className="text-gray-600 mb-4">
                  {vocabularyList.description || "Vocabulary comprehension test"}
                </p>
                
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{vocabularyList.words?.length || 0} vocabulary words</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>Estimated time: {Math.ceil((vocabularyList.words?.length || 0) * 2)} minutes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>Created by {vocabularyList.educator?.name}</span>
                  </div>
                </div>
              </div>
              
              <Badge 
                variant={vocabularyList.published ? "default" : "secondary"}
                className="ml-4"
              >
                {vocabularyList.published ? "Published" : "Draft"}
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
                  <span>Test progress is automatically saved</span>
                </div>
              </CardContent>
            </Card>

            {/* Start Test Button */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Ready to Begin?</h3>
                    <p className="text-sm text-blue-700">
                      Once you start the test, you'll enter fullscreen mode and see the complete passage with highlighted vocabulary words.
                    </p>
                  </div>
                  
                  <Button 
                    onClick={handleStartTest}
                    disabled={isStarting || startTestMutation.isPending}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isStarting || startTestMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting Test...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Vocabulary Test
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}