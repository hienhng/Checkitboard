import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, MinusCircle, Clock, Award, ArrowLeft, EyeOff } from "lucide-react";

export default function TestResults() {
  const { submissionId } = useParams();
  const [, navigate] = useLocation();

  const { data: submission, isLoading } = useQuery({
    queryKey: [`/api/submissions/${submissionId}/results`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!submissionId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Results not found</p>
          <Button onClick={() => navigate("/learner/dashboard")} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const correctAnswers = submission.wordDefinitions?.filter(def => def.isCorrect) || [];
  const incorrectAnswers = submission.wordDefinitions?.filter(def => !def.isCorrect && def.studentDefinition?.trim()) || [];
  const unansweredWords = submission.wordDefinitions?.filter(def => !def.studentDefinition?.trim()) || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-800";
    if (score >= 80) return "bg-blue-100 text-blue-800";
    if (score >= 70) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const timeTaken = submission.submittedAt && submission.createdAt 
    ? Math.floor((new Date(submission.submittedAt).getTime() - new Date(submission.createdAt).getTime()) / 1000)
    : 0;

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
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {submission.list?.title}
            </h1>
            <p className="text-gray-600">
              Test completed on {new Date(submission.submittedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Score Card */}
        <Card className="mb-8 border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="text-center py-8">
            {submission.gradesHidden ? (
              // Hidden grades UI
              <>
                <div className="flex items-center justify-center mb-4">
                  <EyeOff className="h-8 w-8 text-gray-500 mr-2" />
                  <span className="text-2xl font-semibold text-gray-700">Grades Not Yet Available</span>
                </div>
                
                <div className="text-6xl font-bold mb-4 text-gray-400">
                  ???
                </div>
                
                <Badge className="text-lg px-4 py-2 mb-4 bg-gray-100 text-gray-600">
                  Results Pending
                </Badge>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-blue-800 text-sm">
                    📋 <strong>Your submission has been received!</strong>
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    {submission.gradeVisibilityReason || "Grades will be available soon."}
                  </p>
                </div>
              </>
            ) : (
              // Normal grade display
              <>
                <div className="flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-yellow-500 mr-2" />
                  <span className="text-2xl font-semibold text-gray-700">Your Score</span>
                </div>
                
                <div className={`text-8xl font-bold mb-4 ${getScoreColor(submission.score || 0)}`}>
                  {submission.score || 0}%
                </div>
                
                <Badge className={`text-lg px-4 py-2 mb-4 ${getScoreBgColor(submission.score || 0)}`}>
                  {correctAnswers.length} / {submission.wordDefinitions?.length || 0} Correct
                </Badge>
                
                {timeTaken > 0 && (
                  <div className="flex items-center justify-center text-gray-600 mt-4">
                    <Clock className="h-5 w-5 mr-2" />
                    <span className="text-lg">Time taken: {formatDuration(timeTaken)}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Tabs - Only show when grades are visible */}
        {!submission.gradesHidden && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Detailed Results</CardTitle>
            </CardHeader>
            <CardContent>
            <Tabs defaultValue="correct" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="correct" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Correct ({correctAnswers.length})
                </TabsTrigger>
                <TabsTrigger value="incorrect" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Incorrect ({incorrectAnswers.length})
                </TabsTrigger>
                <TabsTrigger value="unanswered" className="flex items-center gap-2">
                  <MinusCircle className="h-4 w-4" />
                  Unanswered ({unansweredWords.length})
                </TabsTrigger>
              </TabsList>

              {/* Correct Answers Tab */}
              <TabsContent value="correct" className="space-y-4">
                {correctAnswers.length > 0 ? (
                  correctAnswers.map((def) => (
                    <div key={def.id} className="p-4 border rounded-lg bg-green-50 border-green-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg text-green-800">
                          {def.word?.word}
                        </h3>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Correct
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Your answer:</p>
                          <p className="text-sm bg-white p-2 rounded border">
                            {def.studentDefinition}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No correct answers
                  </div>
                )}
              </TabsContent>

              {/* Incorrect Answers Tab */}
              <TabsContent value="incorrect" className="space-y-4">
                {incorrectAnswers.length > 0 ? (
                  incorrectAnswers.map((def) => (
                    <div key={def.id} className="p-4 border rounded-lg bg-red-50 border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg text-red-800">
                          {def.word?.word}
                        </h3>
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Incorrect
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Your answer:</p>
                          <p className="text-sm bg-white p-2 rounded border">
                            {def.studentDefinition}
                          </p>
                        </div>
                        {def.showCorrectDefinition && def.correctDefinition && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Correct answer:</p>
                            <p className="text-sm bg-green-50 p-2 rounded border border-green-200 text-green-800">
                              {def.correctDefinition}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No incorrect answers
                  </div>
                )}
              </TabsContent>

              {/* Unanswered Words Tab */}
              <TabsContent value="unanswered" className="space-y-4">
                {unansweredWords.length > 0 ? (
                  unansweredWords.map((def) => (
                    <div key={def.id} className="p-4 border rounded-lg bg-gray-50 border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">
                          {def.word?.word}
                        </h3>
                        <Badge className="bg-gray-100 text-gray-800">
                          <MinusCircle className="h-3 w-3 mr-1" />
                          Unanswered
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">No answer provided</p>
                        {def.showCorrectDefinition && def.correctDefinition && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Correct answer:</p>
                            <p className="text-sm bg-blue-50 p-2 rounded border border-blue-200 text-blue-800">
                              {def.correctDefinition}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No unanswered words
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}

        {/* Passage Section */}
        {submission.list?.passage && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl">Original Passage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {submission.list.passage}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}