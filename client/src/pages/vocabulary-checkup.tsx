import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  BookOpen,
  AlertTriangle,
  Save,
  LogOut,
  Shield,
  Zap,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Question {
  id: number;
  type: "multiple_choice" | "input";
  wordId: number;
  word: string;
  question: string;
  correctAnswer: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  caseSensitive?: boolean;
}

export default function VocabularyCheckup() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const submissionId = parseInt(id || "0");

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSaveProgressDialog, setShowSaveProgressDialog] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [showTestModeDialog, setShowTestModeDialog] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [pendingMCAnswers, setPendingMCAnswers] = useState<Record<number, string>>({});
  const [inputDebounceTimers, setInputDebounceTimers] = useState<Record<number, NodeJS.Timeout>>({});
  const checkupRef = useRef<HTMLDivElement>(null);

  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: [`/api/submissions/${submissionId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: submissionId > 0,
  });

  const submissionData = submission as any;
  const listId = submissionData?.listId;

  const { data: listData } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });

  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}/questions?submissionId=${submissionId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });

  const questions = (questionsData as any)?.questions || [];
  const savedAnswers = (questionsData as any)?.savedAnswers || {};
  const listSettings = (questionsData as any)?.listSettings || {};
  const passage = (questionsData as any)?.passage || "";
  const title = (questionsData as any)?.title || "";
  const currentQuestion = questions[currentQuestionIndex] as Question | undefined;
  const checkupType = (listData as any)?.type || "practice";
  const isTestMode = checkupType === "test";
  const isContentLoaded = !submissionLoading && !questionsLoading && !!listData && questions.length > 0;

  // Hydrate saved answers
  useEffect(() => {
    if (savedAnswers && Object.keys(savedAnswers).length > 0 && Object.keys(answers).length === 0) {
      setAnswers(savedAnswers);
    }
  }, [savedAnswers]);

  // Auto-start or show dialog
  useEffect(() => {
    if (!isContentLoaded) return;
    if (isTestMode && !testStarted) {
      setShowTestModeDialog(true);
    } else if (!isTestMode && !testStarted) {
      setTestStarted(true);
    }
  }, [isContentLoaded, isTestMode, testStarted]);

  // Initialize timer
  useEffect(() => {
    if (listSettings.timeLimit && timeRemaining === null) {
      setTimeRemaining(listSettings.timeLimit * 60);
    }
  }, [listSettings.timeLimit]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Fullscreen monitoring for test mode
  useEffect(() => {
    if (!isTestMode || !testStarted) return;

    const enterFullscreen = async () => {
      try {
        if (checkupRef.current && document.fullscreenElement !== checkupRef.current) {
          await checkupRef.current.requestFullscreen();
        }
      } catch {
        toast({ title: "Fullscreen required", description: "Please enable fullscreen mode manually.", variant: "destructive" });
      }
    };

    const fullscreenTimer = setTimeout(enterFullscreen, 1500);

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTestMode) {
        setFullscreenWarning(true);
        // Log the violation
        apiRequest("POST", `/api/submissions/${submissionId}/fullscreen-exit`, {
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } else {
        setFullscreenWarning(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isTestMode) {
        setFullscreenWarning(true);
        apiRequest("POST", `/api/submissions/${submissionId}/fullscreen-exit`, {
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTestMode) { e.preventDefault(); e.returnValue = ""; }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearTimeout(fullscreenTimer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isTestMode, testStarted]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { Object.values(inputDebounceTimers).forEach(clearTimeout); };
  }, [inputDebounceTimers]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerPercent = timeRemaining !== null && listSettings.timeLimit
    ? (timeRemaining / (listSettings.timeLimit * 60)) * 100
    : 100;
  const timerUrgent = timeRemaining !== null && timeRemaining < 300;

  const handleStartTest = () => {
    setShowTestModeDialog(false);
    setTestStarted(true);
  };

  const saveMCAnswerMutation = useMutation({
    mutationFn: async ({ questionId, selectedAnswer }: { questionId: number; selectedAnswer: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/multiple-choice-answer`, { questionId, selectedAnswer });
      return response.json();
    },
  });

  const saveInputAnswerMutation = useMutation({
    mutationFn: async ({ questionId, studentAnswer }: { questionId: number; studentAnswer: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/input-form-answer`, { questionId, studentAnswer });
      return response.json();
    },
  });

  const handleAnswerChange = (answer: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));

    if (currentQuestion.type === "multiple_choice") {
      setPendingMCAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
    } else {
      const questionId = currentQuestion.id;
      if (inputDebounceTimers[questionId]) clearTimeout(inputDebounceTimers[questionId]);
      const timer = setTimeout(() => {
        saveInputAnswerMutation.mutate({ questionId, studentAnswer: answer });
      }, 500);
      setInputDebounceTimers((prev) => ({ ...prev, [questionId]: timer }));
    }
  };

  const saveCurrentMCAnswerIfPending = () => {
    if (currentQuestion?.type === "multiple_choice" && pendingMCAnswers[currentQuestion.id] !== undefined) {
      saveMCAnswerMutation.mutate({ questionId: currentQuestion.id, selectedAnswer: pendingMCAnswers[currentQuestion.id] });
      setPendingMCAnswers((prev) => { const u = { ...prev }; delete u[currentQuestion.id]; return u; });
    }
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Test submitted successfully!" });
      navigate(`/test-results/${submissionId}`);
    },
    onError: () => {
      toast({ title: "Error submitting test", variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    const pendingSaves: Promise<void>[] = [];

    Object.entries(pendingMCAnswers).forEach(([qId, selectedAnswer]) => {
      pendingSaves.push(new Promise<void>((resolve) => {
        saveMCAnswerMutation.mutate({ questionId: parseInt(qId), selectedAnswer }, { onSettled: () => resolve() });
      }));
    });
    setPendingMCAnswers({});

    Object.entries(inputDebounceTimers).forEach(([qId, timer]) => {
      clearTimeout(timer);
      const answer = answers[parseInt(qId)];
      if (answer !== undefined) {
        pendingSaves.push(new Promise<void>((resolve) => {
          saveInputAnswerMutation.mutate({ questionId: parseInt(qId), studentAnswer: answer }, { onSettled: () => resolve() });
        }));
      }
    });
    setInputDebounceTimers({});

    await Promise.all(pendingSaves);
    completeMutation.mutate();
  };

  const exitTestMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/exit`, { exitReason: reason });
      return response.json();
    },
    onSuccess: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      navigate("/learner/dashboard");
    },
    onError: () => {
      toast({ title: "Error submitting exit reason", variant: "destructive" });
    },
  });

  const handleSaveAndGoBack = async () => {
    const pendingPromises: Promise<any>[] = [];
    Object.entries(pendingMCAnswers).forEach(([qId, selectedAnswer]) => {
      pendingPromises.push(apiRequest("POST", `/api/submissions/${submissionId}/multiple-choice-answer`, { questionId: parseInt(qId), selectedAnswer }));
    });
    setPendingMCAnswers({});
    Object.entries(inputDebounceTimers).forEach(([qId, timer]) => {
      clearTimeout(timer);
      const answer = answers[parseInt(qId)];
      if (answer) {
        pendingPromises.push(apiRequest("POST", `/api/submissions/${submissionId}/input-form-answer`, { questionId: parseInt(qId), studentAnswer: answer }));
      }
    });
    setInputDebounceTimers({});
    try {
      await Promise.all(pendingPromises);
      toast({ title: "Progress saved!" });
    } catch {
      toast({ title: "Some answers may not have been saved", variant: "destructive" });
    }
    navigate("/learner/dashboard");
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      saveCurrentMCAnswerIfPending();
      setCurrentQuestionIndex((p) => p + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      saveCurrentMCAnswerIfPending();
      setCurrentQuestionIndex((p) => p - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (index !== currentQuestionIndex) {
      saveCurrentMCAnswerIfPending();
      setCurrentQuestionIndex(index);
    }
  };

  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Loading state
  if (!isContentLoaded || !testStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-blue-400/30 border-t-blue-400 animate-spin mx-auto" />
          <p className="text-blue-200 font-medium">
            {!isContentLoaded ? "Loading questions..." : "Preparing your test..."}
          </p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">No Questions</h2>
          <p className="text-slate-500 mb-6">This assignment doesn't have any questions yet.</p>
          <Button onClick={() => navigate("/learner/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const mcOptions = [
    { value: "A", label: currentQuestion.optionA },
    { value: "B", label: currentQuestion.optionB },
    { value: "C", label: currentQuestion.optionC },
    { value: "D", label: currentQuestion.optionD },
  ];

  return (
    <div ref={checkupRef} className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex flex-col overflow-y-auto">
      {/* Fullscreen Warning Overlay */}
      {isTestMode && fullscreenWarning && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Test Interrupted</h3>
            <p className="text-slate-600 mb-2">You exited fullscreen or switched tabs.</p>
            <p className="text-sm text-red-600 font-medium mb-6">This violation has been logged and reported to your teacher.</p>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={async () => {
                try {
                  if (checkupRef.current) await checkupRef.current.requestFullscreen();
                } catch {
                  toast({ title: "Cannot enter fullscreen", description: "Please allow fullscreen access.", variant: "destructive" });
                }
              }}
            >
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Exit + Mode badge */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isTestMode ? setShowExitDialog(true) : setShowSaveProgressDialog(true)}
                className="text-slate-300 hover:text-white hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isTestMode ? "Exit Test" : "Save & Exit"}
              </Button>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isTestMode ? "bg-red-500/20 text-red-300 border border-red-500/30" : "bg-blue-500/20 text-blue-300 border border-blue-500/30"}`}>
                {isTestMode ? <Shield className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                {isTestMode ? "TEST MODE" : "PRACTICE"}
              </div>
            </div>

            {/* Center: Progress */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{answeredCount} answered</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Right: Timer + Count */}
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${timerUrgent ? "bg-red-500/20 border border-red-500/30" : "bg-white/10"}`}>
                  <Clock className={`h-4 w-4 ${timerUrgent ? "text-red-400 animate-pulse" : "text-slate-300"}`} />
                  <span className={`font-mono font-bold text-sm ${timerUrgent ? "text-red-300" : "text-slate-200"}`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 hidden sm:flex">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>{answeredCount}/{questions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <div className={`grid gap-6 ${passage ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-2xl mx-auto w-full"}`}>
          {/* Reading Passage */}
          {passage && (
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-5 h-fit lg:sticky lg:top-20">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-blue-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{title}</h2>
                  <p className="text-xs text-slate-400">Reading Passage</p>
                </div>
              </div>
              <div
                className="text-sm text-slate-300 leading-relaxed passage-container max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar"
                dangerouslySetInnerHTML={{
                  __html: currentQuestion?.word
                    ? passage.replace(
                        new RegExp(`(<mark>)?\\b${currentQuestion.word}\\b(</mark>)?`, "gi"),
                        `<mark class="current-question-word bg-yellow-400/30 text-yellow-200 px-1 rounded font-semibold">${currentQuestion.word}</mark>`,
                      )
                    : passage,
                }}
              />
            </div>
          )}

          {/* Question Panel */}
          <div className="space-y-4">
            {/* Question Card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl overflow-hidden">
              {/* Question Header */}
              <div className="bg-white/5 border-b border-white/10 px-5 py-3 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {currentQuestion.type === "multiple_choice" ? "Multiple Choice" : "Written Answer"}
                </span>
                {currentQuestion.word && (
                  <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                    {currentQuestion.word}
                  </span>
                )}
              </div>

              <div className="p-5">
                {/* Question Text */}
                <p className="text-lg font-semibold text-white mb-5 leading-relaxed">
                  {currentQuestion.question}
                </p>

                {/* Multiple Choice Options */}
                {currentQuestion.type === "multiple_choice" && (
                  <div className="space-y-3">
                    {mcOptions.map((option) => {
                      const isSelected = answers[currentQuestion.id] === option.value;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleAnswerChange(option.value)}
                          className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                            isSelected
                              ? "bg-blue-500/25 border-blue-400/60 shadow-lg shadow-blue-500/10"
                              : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all duration-200 ${
                            isSelected
                              ? "bg-blue-500 text-white shadow-md shadow-blue-500/40"
                              : "bg-white/10 text-slate-300"
                          }`}>
                            {option.value}
                          </div>
                          <span className={`text-sm leading-snug flex-1 ${isSelected ? "text-white font-medium" : "text-slate-300"}`}>
                            {option.label}
                          </span>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-blue-400 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Input Question */}
                {currentQuestion.type === "input" && (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-blue-400 text-base h-12"
                    />
                    {currentQuestion.caseSensitive && (
                      <p className="text-xs text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        This answer is case-sensitive
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Footer */}
              <div className="border-t border-white/10 px-5 py-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={goToPrevious}
                  disabled={currentQuestionIndex === 0}
                  className="text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <span className="text-xs text-slate-500 font-medium">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit
                  </Button>
                ) : (
                  <Button
                    onClick={goToNext}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            {/* Question Navigator */}
            <div className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Question Navigator</p>
                <p className="text-xs text-slate-500">{answeredCount} of {questions.length} answered</p>
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {questions.map((q: Question, idx: number) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
                      title={`Question ${idx + 1}`}
                      className={`aspect-square rounded-lg text-xs font-bold transition-all duration-150 ${
                        isCurrent
                          ? "bg-blue-500 text-white shadow-md shadow-blue-500/40 scale-110"
                          : isAnswered
                          ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/40"
                          : "bg-white/8 text-slate-400 border border-white/10 hover:bg-white/15"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-emerald-500/40 border border-emerald-500/60" />
                  <span className="text-xs text-slate-500">Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-blue-500" />
                  <span className="text-xs text-slate-500">Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-white/10 border border-white/20" />
                  <span className="text-xs text-slate-500">Unanswered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Mode Start Dialog */}
      <Dialog open={showTestModeDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Shield className="h-4 w-4 text-amber-600" />
              </div>
              Monitored Test
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-3">
              <p className="text-slate-700 font-medium">Please read before starting:</p>
              <ul className="space-y-2.5 text-sm text-slate-600">
                {[
                  "Fullscreen mode will be activated and enforced",
                  "Tab switching will be detected and logged",
                  "All violations are reported to your teacher",
                  "Stay in fullscreen for the entire test duration",
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                    {rule}
                  </li>
                ))}
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                By clicking "Start Test", you agree to follow all test rules.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => navigate("/learner/dashboard")} className="flex-1">Cancel</Button>
            <Button onClick={handleStartTest} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              I Understand — Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-emerald-600" />
              Submit Test?
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{answeredCount}</p>
                  <p className="text-xs text-emerald-600">Answered</p>
                </div>
                <div className={`rounded-lg p-3 text-center ${questions.length - answeredCount > 0 ? "bg-amber-50" : "bg-slate-50"}`}>
                  <p className={`text-2xl font-bold ${questions.length - answeredCount > 0 ? "text-amber-700" : "text-slate-700"}`}>{questions.length - answeredCount}</p>
                  <p className={`text-xs ${questions.length - answeredCount > 0 ? "text-amber-600" : "text-slate-500"}`}>Unanswered</p>
                </div>
              </div>
              {questions.length - answeredCount > 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                  You have {questions.length - answeredCount} unanswered question(s). Unanswered questions will be marked incorrect.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Keep Going</Button>
            <Button
              onClick={() => { setShowSubmitDialog(false); handleSubmit(); }}
              disabled={completeMutation.isPending}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              {completeMutation.isPending ? "Submitting..." : "Submit Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Test Dialog (Test Mode) */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Exit Test
            </DialogTitle>
            <DialogDescription>
              Provide a reason for exiting. This will be shared with your teacher.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your reason for exiting the test..."
            value={exitReason}
            onChange={(e) => setExitReason(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowExitDialog(false); setExitReason(""); }}>Cancel</Button>
            <Button
              onClick={() => exitTestMutation.mutate(exitReason)}
              disabled={!exitReason.trim() || exitTestMutation.isPending}
              variant="destructive"
            >
              {exitTestMutation.isPending ? "Exiting..." : "Confirm Exit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save & Exit Dialog (Practice Mode) */}
      <Dialog open={showSaveProgressDialog} onOpenChange={setShowSaveProgressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-blue-600" />
              Save Progress?
            </DialogTitle>
            <DialogDescription>
              Your progress is automatically saved. You can return to this practice checkup anytime from your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveProgressDialog(false)}>Continue Practicing</Button>
            <Button onClick={handleSaveAndGoBack} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Save className="h-4 w-4 mr-2" />
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
