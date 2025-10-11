import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Award, ArrowLeft, EyeOff, Clock } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-slate-600 mb-4">Results not found</p>
            <Button onClick={() => navigate("/learner/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submissionData = submission as any;
  const mcAnswers = submissionData.multipleChoiceAnswers || [];
  const inputAnswers = submissionData.inputFormAnswers || [];
  
  const totalQuestions = mcAnswers.length + inputAnswers.length;
  const correctMC = mcAnswers.filter((a: any) => a.isCorrect).length;
  const correctInput = inputAnswers.filter((a: any) => a.isCorrect).length;
  const totalCorrect = correctMC + correctInput;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100 text-green-700 border-green-200";
    if (score >= 80) return "bg-blue-100 text-blue-700 border-blue-200";
    if (score >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const timeTaken = submissionData.submittedAt && submissionData.createdAt 
    ? Math.floor((new Date(submissionData.submittedAt).getTime() - new Date(submissionData.createdAt).getTime()) / 1000)
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {submissionData.list?.title}
            </h1>
            <p className="text-slate-600">
              Test completed on {new Date(submissionData.submittedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Score Card */}
        <Card className="mb-8 shadow-lg">
          <CardContent className="text-center py-8">
            {submissionData.gradesHidden ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <EyeOff className="h-8 w-8 text-slate-500 mr-2" />
                  <span className="text-2xl font-semibold text-slate-700">Grades Not Yet Available</span>
                </div>
                <div className="text-6xl font-bold mb-4 text-slate-400">???</div>
                <Badge className="text-lg px-4 py-2 mb-4 bg-slate-100 text-slate-600">
                  Results Pending
                </Badge>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-blue-800 text-sm">
                    📋 <strong>Your submission has been received!</strong>
                  </p>
                  <p className="text-blue-700 text-sm mt-2">
                    {submissionData.gradeVisibilityReason || "Grades will be available soon."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center mb-4">
                  <Award className="h-8 w-8 text-blue-600 mr-2" />
                  <span className="text-2xl font-semibold text-slate-700">Your Score</span>
                </div>
                <div className={`text-6xl font-bold mb-4 ${getScoreColor(submissionData.score || 0)}`}>
                  {submissionData.score || 0}%
                </div>
                <Badge className={`text-lg px-4 py-2 mb-4 border-2 ${getScoreBgColor(submissionData.score || 0)}`}>
                  {submissionData.score >= 90 ? "Excellent!" : 
                   submissionData.score >= 80 ? "Great Job!" : 
                   submissionData.score >= 70 ? "Good Work!" : 
                   "Keep Practicing!"}
                </Badge>
                <div className="grid grid-cols-3 gap-4 mt-6 max-w-2xl mx-auto">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-600 text-sm">Total Questions</p>
                    <p className="text-2xl font-bold text-slate-900">{totalQuestions}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-green-600 text-sm">Correct</p>
                    <p className="text-2xl font-bold text-green-700">{totalCorrect}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-600 text-sm flex items-center justify-center gap-1">
                      <Clock className="h-4 w-4" /> Time
                    </p>
                    <p className="text-2xl font-bold text-slate-900">{formatTime(timeTaken)}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Results Details */}
        {!submissionData.gradesHidden && (
          <div className="space-y-4">
            {/* Multiple Choice Questions */}
            {mcAnswers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Multiple Choice Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mcAnswers.map((answer: any, idx: number) => (
                    <div 
                      key={answer.id}
                      className={`p-4 rounded-lg border-2 ${
                        answer.isCorrect 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {answer.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-semibold text-slate-700">
                            Question {idx + 1}
                          </span>
                          {answer.question?.word && (
                            <Badge variant="outline" className="text-xs">
                              {answer.question.word.word}
                            </Badge>
                          )}
                        </div>
                        <Badge className={answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      <p className="text-slate-700 mb-3">{answer.question?.question}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-600">
                          <span className="font-medium">Your answer:</span>{' '}
                          <span className={answer.isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {answer.selectedAnswer}
                          </span>
                        </p>
                        {!answer.isCorrect && submissionData.list?.showCorrectAnswers && (
                          <p className="text-slate-600">
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-700">{answer.question?.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Input Questions */}
            {inputAnswers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Fill-in Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {inputAnswers.map((answer: any, idx: number) => (
                    <div 
                      key={answer.id}
                      className={`p-4 rounded-lg border-2 ${
                        answer.isCorrect 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {answer.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="font-semibold text-slate-700">
                            Question {idx + 1}
                          </span>
                          {answer.question?.word && (
                            <Badge variant="outline" className="text-xs">
                              {answer.question.word.word}
                            </Badge>
                          )}
                        </div>
                        <Badge className={answer.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {answer.isCorrect ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>
                      <p className="text-slate-700 mb-3">{answer.question?.question}</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-600">
                          <span className="font-medium">Your answer:</span>{' '}
                          <span className={answer.isCorrect ? 'text-green-700' : 'text-red-700'}>
                            "{answer.studentAnswer}"
                          </span>
                        </p>
                        {!answer.isCorrect && submissionData.list?.showCorrectAnswers && answer.question?.showAnswer && (
                          <p className="text-slate-600">
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-700">"{answer.question?.correctAnswer}"</span>
                          </p>
                        )}
                        {answer.question?.caseSensitive && (
                          <p className="text-xs text-amber-600 mt-1">
                            ⚠️ This answer is case-sensitive
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* No questions message */}
            {mcAnswers.length === 0 && inputAnswers.length === 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-slate-600">No question results available.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
