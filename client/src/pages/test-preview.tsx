import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  BookOpen,
  Play,
  Users,
  CheckCircle,
  XCircle,
  Award,
  RotateCcw,
  ArrowLeft,
  Shield,
  Zap,
  Target,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

export default function TestPreview() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isStarting, setIsStarting] = useState(false);

  const listId = parseInt(id || "0");

  const { data: vocabularyList, isLoading } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: submissionData } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}/submission`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
    staleTime: 0,
  });

  const { data: existingSubmission } = useQuery({
    queryKey: [`/api/submissions/check/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
    staleTime: 0,
  });

  const { data: attemptInfo } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}/attempts`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
    staleTime: 0,
  });

  const listData = vocabularyList as any;

  const startTestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/vocabulary-lists/${listId}/start-test`);
      return await res.json();
    },
    onSuccess: (data) => {
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
    if (listData?.type === "test") {
      try {
        await document.documentElement.requestFullscreen();
      } catch {}
    }
    await startTestMutation.mutateAsync();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Loading assignment...</p>
        </div>
      </div>
    );
  }

  if (!listData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Assignment Not Found</h2>
          <p className="text-slate-500 mb-6">This assignment doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/learner/dashboard")} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isTestMode = listData.type === "test";
  const wordCount = listData.words?.length || 0;
  const estimatedTime = listData.timeLimit ? `${listData.timeLimit} min` : `~${Math.ceil(wordCount * 2)} min`;
  const hasGradedResult = submissionData && (submissionData as any)?.gradedAt;
  const hasDoneIt = existingSubmission && (existingSubmission as any)?.exists && (!attemptInfo || !(attemptInfo as any)?.canAttempt);
  const attemptData = attemptInfo as any;
  const hasCompletedAttempt = Boolean(
    hasGradedResult || (existingSubmission as any)?.completed || attemptData?.attemptCount > 0
  );

  const passageWords = (listData.passage || "").split(" ");
  const midPoint = Math.floor(passageWords.length / 3);
  const visiblePart = passageWords.slice(0, midPoint).join(" ");
  const blurredPart = passageWords.slice(midPoint).join(" ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate("/learner/dashboard")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>

        {/* Header Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTestMode ? "bg-gradient-to-br from-red-500 to-rose-600" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                  {isTestMode ? <Shield className="h-6 w-6 text-white" /> : <Zap className="h-6 w-6 text-white" />}
                </div>
                <div>
                  <Badge className={isTestMode ? "bg-red-100 text-red-700 border-red-200" : "bg-blue-100 text-blue-700 border-blue-200"}>
                    {isTestMode ? "Graded Test" : "Practice Mode"}
                  </Badge>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">{listData.title}</h1>
              <p className="text-slate-500">{listData.description || "Vocabulary comprehension assignment"}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                <BookOpen className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Words</p>
                <p className="text-base font-bold text-slate-800">{wordCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Time</p>
                <p className="text-base font-bold text-slate-800">{estimatedTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">By</p>
                <p className="text-base font-bold text-slate-800 truncate">{listData.educator?.name || "Educator"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Passage Preview */}
          <div className="lg:col-span-3">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                  <Eye className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800">Passage Preview</h2>
                  <p className="text-xs text-slate-400">
                    {hasCompletedAttempt ? "Review the passage from your completed assignment" : "Start to see the full passage"}
                  </p>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-slate-50 p-4 text-sm text-slate-700 leading-relaxed min-h-[200px]">
                {hasCompletedAttempt ? (
                  <p className="whitespace-pre-wrap">{listData.passage}</p>
                ) : (
                  <>
                    <p>{visiblePart}</p>
                    <div className="relative mt-2">
                      <p className="blur-sm select-none pointer-events-none text-slate-400">{blurredPart}</p>
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/95" />
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                        <div className="bg-white rounded-full px-4 py-2 shadow-md border border-slate-200 text-xs font-semibold text-slate-600">
                          🔒 Start assignment to read full passage
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Attempt Info */}
            {attemptData && (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-5">
                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Attempts
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-slate-800">{attemptData.attemptCount || 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Used</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">
                      {attemptData.allowRedos
                        ? attemptData.maxAttempts
                          ? attemptData.remainingAttempts ?? 0
                          : "∞"
                        : (attemptData.attemptCount || 0) === 0 ? "1" : "0"}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">Remaining</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                  {attemptData.allowRedos
                    ? attemptData.maxAttempts
                      ? `Up to ${attemptData.maxAttempts} attempts allowed`
                      : "Unlimited attempts"
                    : "One attempt only"}
                </p>
                {!attemptData.canAttempt && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    All attempts used
                  </div>
                )}
              </div>
            )}

            {/* Test Rules (test mode) */}
            {isTestMode && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <h3 className="font-semibold text-amber-800 flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4" />
                  Test Rules
                </h3>
                <ul className="space-y-2 text-sm text-amber-700">
                  <li className="flex items-start gap-2"><Shield className="h-4 w-4 flex-shrink-0 mt-0.5" /> Fullscreen mode required</li>
                  <li className="flex items-start gap-2"><Eye className="h-4 w-4 flex-shrink-0 mt-0.5" /> Tab switching is monitored</li>
                  <li className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" /> Violations are reported to your teacher</li>
                </ul>
              </div>
            )}

            {/* Action Card */}
            {hasGradedResult ? (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
                <div className="text-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Award className="h-7 w-7 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-700">{(submissionData as any)?.score ?? 0}%</p>
                  <p className="text-sm text-emerald-600 mt-1">Your score</p>
                </div>
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate(`/test-results/${(submissionData as any)?.id}`)}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    <Award className="h-4 w-4 mr-2" />
                    View Results
                  </Button>
                  {attemptData?.canAttempt && (
                    <Button
                      onClick={handleStartTest}
                      disabled={isStarting || startTestMutation.isPending}
                      variant="outline"
                      className="w-full"
                    >
                      {isStarting || startTestMutation.isPending ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />Starting...</>
                      ) : (
                        <><RotateCcw className="h-4 w-4 mr-2" />Retake ({attemptData.remainingAttempts} left)</>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : hasDoneIt ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <CheckCircle className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <h3 className="font-semibold text-slate-800 mb-1">Already Submitted</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {(existingSubmission as any)?.completed
                    ? "Awaiting grading by your teacher."
                    : "You've started this but haven't finished."}
                </p>
                <Button onClick={() => navigate("/learner/dashboard")} variant="outline" className="w-full">
                  Back to Dashboard
                </Button>
              </div>
            ) : (
              <div className={`rounded-2xl p-5 ${isTestMode ? "bg-gradient-to-br from-red-50 to-rose-50 border border-red-200" : "bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200"}`}>
                <div className="text-center mb-5">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isTestMode ? "bg-red-100" : "bg-blue-100"}`}>
                    <Play className={`h-7 w-7 ${isTestMode ? "text-red-600" : "text-blue-600"}`} />
                  </div>
                  <h3 className={`font-bold text-lg ${isTestMode ? "text-red-900" : "text-blue-900"}`}>
                    {isTestMode ? "Ready to take the test?" : "Start practicing!"}
                  </h3>
                  <p className={`text-sm mt-1 ${isTestMode ? "text-red-700" : "text-blue-600"}`}>
                    {isTestMode ? "This is a graded test. Your results will be reported." : "Practice at your own pace, no pressure."}
                  </p>
                </div>
                <Button
                  onClick={handleStartTest}
                  disabled={isStarting || startTestMutation.isPending || (attemptData && !attemptData.canAttempt)}
                  className={`w-full text-white font-semibold ${isTestMode ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}`}
                >
                  {isStarting || startTestMutation.isPending ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Starting...</>
                  ) : (
                    <><Play className="h-4 w-4 mr-2" />{isTestMode ? "Begin Test" : "Start Practice"}</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
