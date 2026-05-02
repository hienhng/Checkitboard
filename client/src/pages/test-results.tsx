import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  Award,
  ArrowLeft,
  EyeOff,
  Clock,
  Target,
  TrendingUp,
  BookOpen,
  RotateCcw,
} from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8 max-w-md w-full text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-600 mb-6">Results not found</p>
          <Button onClick={() => navigate("/learner/dashboard")} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const data = submission as any;
  const mcAnswers: any[] = data.multipleChoiceAnswers || [];
  const inputAnswers: any[] = data.inputFormAnswers || [];
  const totalQuestions = mcAnswers.length + inputAnswers.length;
  const totalCorrect = mcAnswers.filter((a) => a.isCorrect).length + inputAnswers.filter((a) => a.isCorrect).length;
  const score = data.score ?? 0;

  const timeTaken =
    data.submittedAt && data.createdAt
      ? Math.floor((new Date(data.submittedAt).getTime() - new Date(data.createdAt).getTime()) / 1000)
      : 0;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m === 0) return `${sec}s`;
    return `${m}m ${sec}s`;
  };

  const getScoreGrade = (s: number) => {
    if (s >= 90) return { label: "Excellent!", color: "text-emerald-600", bg: "from-emerald-500 to-teal-500", light: "bg-emerald-50 border-emerald-200 text-emerald-700" };
    if (s >= 80) return { label: "Great Job!", color: "text-blue-600", bg: "from-blue-500 to-indigo-500", light: "bg-blue-50 border-blue-200 text-blue-700" };
    if (s >= 70) return { label: "Good Work!", color: "text-violet-600", bg: "from-violet-500 to-purple-500", light: "bg-violet-50 border-violet-200 text-violet-700" };
    if (s >= 60) return { label: "Keep Going!", color: "text-amber-600", bg: "from-amber-500 to-orange-500", light: "bg-amber-50 border-amber-200 text-amber-700" };
    return { label: "Keep Practicing!", color: "text-red-600", bg: "from-red-500 to-rose-500", light: "bg-red-50 border-red-200 text-red-700" };
  };

  const grade = getScoreGrade(score);
  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate("/learner/dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>

        {/* Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">{data.list?.title}</h1>
          </div>
          <p className="text-sm text-slate-400">
            Submitted on {new Date(data.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Score Card */}
        {data.gradesHidden ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-8 text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <EyeOff className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Grades Not Yet Available</h2>
            <p className="text-slate-500 text-sm mb-4">{data.gradeVisibilityReason || "Grades will be released by your teacher soon."}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 inline-block">
              <p className="text-blue-800 text-sm font-medium">✅ Your submission was received!</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden mb-6">
            <div className={`bg-gradient-to-r ${grade.bg} p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium mb-1">Final Score</p>
                  <p className="text-5xl font-black">{score}%</p>
                  <p className="text-white/80 mt-1 font-semibold">{grade.label}</p>
                </div>
                {/* Score ring */}
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" stroke="white" strokeOpacity="0.2" strokeWidth="8" fill="none" />
                    <circle
                      cx="60" cy="60" r="52"
                      stroke="white" strokeWidth="8" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 divide-x divide-slate-100">
              <div className="p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Correct
                </div>
                <p className="text-2xl font-bold text-slate-800">{totalCorrect}<span className="text-base text-slate-400">/{totalQuestions}</span></p>
              </div>
              <div className="p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Accuracy
                </div>
                <p className="text-2xl font-bold text-slate-800">{score}%</p>
              </div>
              <div className="p-5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time
                </div>
                <p className="text-2xl font-bold text-slate-800">{formatTime(timeTaken)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {!data.gradesHidden && (
          <div className="space-y-4">
            {/* Multiple Choice */}
            {mcAnswers.length > 0 && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <Target className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h2 className="font-semibold text-slate-800">Multiple Choice</h2>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    {mcAnswers.filter((a) => a.isCorrect).length}/{mcAnswers.length} correct
                  </Badge>
                </div>
                <div className="divide-y divide-slate-50">
                  {mcAnswers.map((answer: any, idx: number) => (
                    <div key={answer.id} className={`p-5 ${answer.isCorrect ? "" : "bg-red-50/40"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${answer.isCorrect ? "bg-emerald-100" : "bg-red-100"}`}>
                          {answer.isCorrect
                            ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-400">Q{idx + 1}</span>
                            {answer.question?.word && (
                              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                {answer.question.word.word}
                              </span>
                            )}
                            <Badge className={`text-xs border-0 ml-auto ${answer.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {answer.isCorrect ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{answer.question?.question}</p>
                          <div className="space-y-1 text-sm">
                            <p className="text-slate-500">
                              Your answer:{" "}
                              <span className={`font-semibold ${answer.isCorrect ? "text-emerald-700" : "text-red-700"}`}>
                                {answer.selectedAnswer}
                              </span>
                            </p>
                            {!answer.isCorrect && data.list?.showCorrectAnswers && (
                              <p className="text-slate-500">
                                Correct answer:{" "}
                                <span className="font-semibold text-emerald-700">{answer.question?.correctAnswer}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input / Written */}
            {inputAnswers.length > 0 && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <BookOpen className="h-3.5 w-3.5 text-white" />
                    </div>
                    <h2 className="font-semibold text-slate-800">Written Answers</h2>
                  </div>
                  <Badge className="bg-violet-100 text-violet-700 border-0">
                    {inputAnswers.filter((a) => a.isCorrect).length}/{inputAnswers.length} correct
                  </Badge>
                </div>
                <div className="divide-y divide-slate-50">
                  {inputAnswers.map((answer: any, idx: number) => (
                    <div key={answer.id} className={`p-5 ${answer.isCorrect ? "" : "bg-red-50/40"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${answer.isCorrect ? "bg-emerald-100" : "bg-red-100"}`}>
                          {answer.isCorrect
                            ? <CheckCircle className="h-4 w-4 text-emerald-600" />
                            : <XCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-slate-400">Q{idx + 1}</span>
                            {answer.question?.word && (
                              <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                                {answer.question.word.word}
                              </span>
                            )}
                            <Badge className={`text-xs border-0 ml-auto ${answer.isCorrect ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {answer.isCorrect ? "Correct" : "Incorrect"}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-2">{answer.question?.question}</p>
                          <div className="space-y-1.5 text-sm">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${answer.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                              <span className="font-medium">Your answer:</span>
                              <span>"{answer.studentAnswer}"</span>
                            </div>
                            {!answer.isCorrect && data.list?.showCorrectAnswers && answer.question?.showAnswer && (
                              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-emerald-50 text-emerald-800">
                                <span className="font-medium">Correct:</span>
                                <span>"{answer.question?.correctAnswer}"</span>
                              </div>
                            )}
                            {answer.question?.caseSensitive && (
                              <p className="text-xs text-amber-600 flex items-center gap-1">⚠️ Case-sensitive answer</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mcAnswers.length === 0 && inputAnswers.length === 0 && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-10 text-center">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400">No question results available yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={() => navigate("/learner/dashboard")}
            variant="outline"
            className="flex-1 bg-white/80"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          {data.list?.id && (
            <Button
              onClick={() => navigate(`/test-preview/${data.list.id}`)}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
