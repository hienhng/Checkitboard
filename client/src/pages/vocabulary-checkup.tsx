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
  PenLine,
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
  correctAnswer?: string;
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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSaveProgressDialog, setShowSaveProgressDialog] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [fullscreenWarning, setFullscreenWarning] = useState(false);
  const [showTestModeDialog, setShowTestModeDialog] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const answersRef = useRef<Record<string, string>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveQueue = useRef<Record<string, Promise<unknown>>>({});
  const submitting = useRef(false);
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

  const questions: Question[] = (questionsData as any)?.questions || [];
  const savedAnswers = (questionsData as any)?.savedAnswers || {};
  const listSettings = (questionsData as any)?.listSettings || {};
  const passage = (questionsData as any)?.passage || "";
  const title = (questionsData as any)?.title || "";
  const currentQuestion = questions[currentQuestionIndex] as Question | undefined;
  const checkupType = (listData as any)?.type || "practice";
  const isTestMode = checkupType === "test";
  const isContentLoaded = !submissionLoading && !questionsLoading && !!listData && questions.length > 0;

  useEffect(() => {
    if (savedAnswers && Object.keys(savedAnswers).length > 0 && Object.keys(answers).length === 0) {
      setAnswers(savedAnswers);
      answersRef.current = savedAnswers;
    }
  }, [savedAnswers]);

  useEffect(() => {
    if (!isContentLoaded) return;
    if (isTestMode && !testStarted) {
      setShowTestModeDialog(true);
    } else if (!isTestMode && !testStarted) {
      setTestStarted(true);
    }
  }, [isContentLoaded, isTestMode, testStarted]);

  useEffect(() => {
    if (listSettings.timeLimit && timeRemaining === null) {
      setTimeRemaining(listSettings.timeLimit * 60);
    }
  }, [listSettings.timeLimit]);

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining]);

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
        apiRequest("POST", `/api/submissions/${submissionId}/fullscreen-exit`, { timestamp: new Date().toISOString() }).catch(() => {});
      } else {
        setFullscreenWarning(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && isTestMode) {
        setFullscreenWarning(true);
        apiRequest("POST", `/api/submissions/${submissionId}/fullscreen-exit`, { timestamp: new Date().toISOString() }).catch(() => {});
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

  useEffect(() => {
    return () => { Object.values(saveTimers.current).forEach(clearTimeout); };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const timerUrgent = timeRemaining !== null && timeRemaining < 300;

  const handleStartTest = () => {
    setShowTestModeDialog(false);
    setTestStarted(true);
  };

  const answerKey = (question: Question) => `${question.type}:${question.id}`;

  const queueAnswerSave = (question: Question, answer: string) => {
    const key = answerKey(question);
    const previous = saveQueue.current[key] || Promise.resolve();
    const save = previous.catch(() => {}).then(() => apiRequest("POST",
      `/api/submissions/${submissionId}/${question.type === "input" ? "input-form-answer" : "multiple-choice-answer"}`,
      question.type === "input" ? { questionId: question.id, studentAnswer: answer } : { questionId: question.id, selectedAnswer: answer },
    ));
    saveQueue.current[key] = save;
    return save;
  };

  const handleAnswerChange = (answer: string) => {
    if (!currentQuestion || submitting.current) return;
    const question = currentQuestion;
    const key = answerKey(question);
    answersRef.current = { ...answersRef.current, [key]: answer };
    setAnswers(answersRef.current);
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      delete saveTimers.current[key];
      queueAnswerSave(question, answer).catch(() => {
        toast({ title: "Answer not saved yet", description: "Your answer is kept here. We'll retry when you submit or save your progress.", variant: "destructive" });
      });
    }, 500);
  };

  const flushAnswers = async () => {
    Object.values(saveTimers.current).forEach(clearTimeout);
    saveTimers.current = {};
    await Promise.all(questions.filter(question => answersRef.current[answerKey(question)] !== undefined)
      .map(question => queueAnswerSave(question, answersRef.current[answerKey(question)])));
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      await flushAnswers();
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Checkup submitted and assessed!" });
      navigate(`/test-results/${submissionId}`);
    },
    onError: (error: Error) => {
      let message = "Your answers are kept here. Please try submitting again.";
      try { message = JSON.parse(error.message.replace(/^\d+:\s*/, "")).message || message; } catch {}
      toast({ title: "Couldn't submit your checkup", description: message, variant: "destructive" });
    },
    onSettled: () => { submitting.current = false; },
  });

  const handleSubmit = () => {
    if (submitting.current) return;
    submitting.current = true;
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
    if (submitting.current) return;
    try {
      await flushAnswers();
      toast({ title: "Progress saved!" });
      navigate("/learner/dashboard");
    } catch {
      toast({ title: "Couldn't save your progress", description: "Your answers are kept here. Please try again before leaving.", variant: "destructive" });
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((p) => p + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((p) => p - 1);
    }
  };

  const goToQuestion = (index: number) => {
    if (index !== currentQuestionIndex) {
      setCurrentQuestionIndex(index);
    }
  };

  const answeredCount = questions.filter(question => answers[answerKey(question)]?.trim()).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!isContentLoaded || !testStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">
              {!isContentLoaded ? "Loading questions" : "Preparing your test"}
            </p>
            <p className="text-slate-500 text-sm mt-1">Please wait a moment…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No Questions</h2>
          <p className="text-slate-400 mb-6">This assignment doesn't have any questions yet.</p>
          <Button onClick={() => navigate("/learner/dashboard")} className="bg-indigo-600 hover:bg-indigo-700">Back to Dashboard</Button>
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

  const optionColors: Record<string, { idle: string; selected: string; letter: string }> = {
    A: { idle: "hover:border-violet-500/50 hover:bg-violet-500/5", selected: "border-violet-500 bg-violet-500/10", letter: "bg-violet-500 text-white" },
    B: { idle: "hover:border-blue-500/50 hover:bg-blue-500/5", selected: "border-blue-500 bg-blue-500/10", letter: "bg-blue-500 text-white" },
    C: { idle: "hover:border-emerald-500/50 hover:bg-emerald-500/5", selected: "border-emerald-500 bg-emerald-500/10", letter: "bg-emerald-500 text-white" },
    D: { idle: "hover:border-amber-500/50 hover:bg-amber-500/5", selected: "border-amber-500 bg-amber-500/10", letter: "bg-amber-500 text-white" },
  };

  return (
    <div ref={checkupRef} className="min-h-screen bg-slate-950 flex flex-col">

      {/* ── Fullscreen Warning ──────────────────────────────────────────────── */}
      {isTestMode && fullscreenWarning && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl shadow-red-500/10">
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Test Interrupted</h3>
            <p className="text-slate-400 text-sm mb-1">You exited fullscreen or switched tabs.</p>
            <p className="text-red-400 text-sm font-medium mb-6">This violation has been logged and reported to your teacher.</p>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-11"
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-4">

          {/* Left */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => isTestMode ? setShowExitDialog(true) : setShowSaveProgressDialog(true)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
            >
              <LogOut className="h-3.5 w-3.5" />
              {isTestMode ? "Exit" : "Save & Exit"}
            </button>

            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${
              isTestMode
                ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/30"
                : "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30"
            }`}>
              {isTestMode ? <Shield className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              {isTestMode ? "TEST" : "PRACTICE"}
            </div>
          </div>

          {/* Center — progress bar */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-300">
                Q {currentQuestionIndex + 1} <span className="text-slate-600">/ {questions.length}</span>
              </span>
              <span>{answeredCount} answered</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #6366f1, #818cf8)",
                }}
              />
            </div>
          </div>

          {/* Right — timer */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {timeRemaining !== null && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold transition-colors ${
                timerUrgent
                  ? "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
                  : "bg-slate-800 text-slate-200"
              }`}>
                <Clock className={`h-3.5 w-3.5 ${timerUrgent ? "animate-pulse" : "text-slate-500"}`} />
                {formatTime(timeRemaining)}
              </div>
            )}
            <div className="text-xs text-slate-500 hidden sm:block">
              <span className="text-emerald-400 font-semibold">{answeredCount}</span>/{questions.length}
            </div>
          </div>
        </div>
      </header>

      {completeMutation.isPending && <div role="status" className="mx-auto mt-4 w-full max-w-7xl px-6 text-sm text-emerald-300">Saving and assessing your answers with AI…</div>}

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-5 py-6">
        <div className={`grid gap-5 h-full ${passage ? "lg:grid-cols-[1fr_1.1fr]" : "max-w-2xl mx-auto"}`}>

          {/* Reading Passage Panel */}
          {passage && (
            <aside className="lg:sticky lg:top-[calc(3.5rem+1.25rem)] self-start">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Reading Passage</p>
                    <p className="text-sm font-semibold text-white truncate">{title}</p>
                  </div>
                  {currentQuestion.word && (
                    <span className="ml-auto flex-shrink-0 bg-yellow-400/10 text-yellow-400 ring-1 ring-yellow-400/30 text-xs px-2.5 py-1 rounded-full font-semibold">
                      {currentQuestion.word}
                    </span>
                  )}
                </div>
                {/* Passage text */}
                <div
                  className="px-5 py-4 text-[0.9rem] text-slate-300 leading-[1.85] max-h-[calc(100vh-12rem)] overflow-y-auto"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                  dangerouslySetInnerHTML={{
                    __html: currentQuestion?.word
                      ? passage.replace(
                          new RegExp(`(<mark[^>]*>)?\\b(${currentQuestion.word})\\b(</mark>)?`, "gi"),
                          `<mark style="background:rgba(250,204,21,0.18);color:#fde68a;padding:1px 3px;border-radius:3px;font-weight:600">$2</mark>`,
                        )
                      : passage,
                  }}
                />
              </div>
            </aside>
          )}

          {/* Question + Navigator */}
          <div className="flex flex-col gap-4">

            {/* Question Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">

              {/* Question Meta Bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 bg-slate-900/50">
                <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md ${
                  currentQuestion.type === "multiple_choice"
                    ? "bg-violet-500/10 text-violet-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {currentQuestion.type === "multiple_choice"
                    ? <><CheckCircle className="h-3 w-3" />Multiple Choice</>
                    : <><PenLine className="h-3 w-3" />Grid-in · AI assessed</>
                  }
                </span>
                <span className="text-slate-700 text-xs">•</span>
                <span className="text-xs text-slate-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
              </div>

              {/* Question Body */}
              <div className="px-6 py-6 flex-1">
                <p className="text-[1.05rem] font-semibold text-white leading-relaxed mb-6">
                  {currentQuestion.question}
                </p>

                {/* Multiple Choice */}
                {currentQuestion.type === "multiple_choice" && (
                  <div className="space-y-2.5">
                    {mcOptions.map((option) => {
                      const isSelected = answers[answerKey(currentQuestion)] === option.value;
                      const colors = optionColors[option.value];
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleAnswerChange(option.value)}
                          className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all duration-150 text-left group ${
                            isSelected
                              ? `${colors.selected} shadow-sm`
                              : `border-slate-800 bg-slate-800/40 ${colors.idle}`
                          }`}
                        >
                          {/* Letter badge */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold transition-all duration-150 ${
                            isSelected ? colors.letter : "bg-slate-700 text-slate-400 group-hover:bg-slate-600"
                          }`}>
                            {option.value}
                          </div>
                          {/* Label */}
                          <span className={`flex-1 text-sm leading-snug transition-colors duration-150 ${
                            isSelected ? "text-white font-medium" : "text-slate-300"
                          }`}>
                            {option.label}
                          </span>
                          {/* Checkmark */}
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 flex-shrink-0 text-current opacity-80" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Input / Written Answer */}
                {currentQuestion.type === "input" && (
                  <div className="space-y-3">
                    <Input
                      type="text"
                      disabled={completeMutation.isPending}
                      aria-label="Your answer"
                      placeholder="Explain the meaning in your own words…"
                      value={answers[answerKey(currentQuestion)] || ""}
                      onChange={(e) => handleAnswerChange(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 h-12 text-base rounded-xl"
                    />
                    <p className="text-xs text-slate-400">AI assesses the meaning of your answer when you submit. You can use your own words.</p>
                  </div>
                )}
              </div>

              {/* Navigation footer */}
              <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/50">
                <Button
                  variant="ghost"
                  onClick={goToPrevious}
                  disabled={currentQuestionIndex === 0}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 h-9 px-3"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>

                <div className="flex gap-1.5">
                  {questions.map((_: any, i: number) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentQuestionIndex
                          ? "w-6 bg-indigo-500"
                          : answers[answerKey(questions[i])]
                          ? "w-1.5 bg-emerald-500/60"
                          : "w-1.5 bg-slate-700"
                      }`}
                    />
                  ))}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={() => setShowSubmitDialog(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4 font-semibold"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Submit
                  </Button>
                ) : (
                  <Button
                    onClick={goToNext}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 px-4"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>

            {/* Question Navigator */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Jump to question</p>
                <p className="text-xs text-slate-600">
                  <span className="text-emerald-400 font-semibold">{answeredCount}</span> / {questions.length}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {questions.map((q: Question, idx: number) => {
                  const isAnswered = !!answers[answerKey(q)];
                  const isCurrent = currentQuestionIndex === idx;
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(idx)}
                      title={`Question ${idx + 1}`}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all duration-150 ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105"
                          : isAnswered
                          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-5 mt-3 pt-3 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500/20 ring-1 ring-emerald-500/40 inline-block" />
                  Answered
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-indigo-600 inline-block" />
                  Current
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="w-3 h-3 rounded-sm bg-slate-800 ring-1 ring-slate-700 inline-block" />
                  Unanswered
                </span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Test Mode Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showTestModeDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-white">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Shield className="h-4.5 w-4.5 text-amber-400" />
              </div>
              Monitored Test
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-3">
              <p className="text-slate-300 font-medium">Please read before starting:</p>
              <ul className="space-y-3">
                {[
                  "Fullscreen mode will be activated and enforced",
                  "Tab switching is detected and logged",
                  "All violations are reported to your teacher",
                  "Stay in fullscreen for the full duration",
                ].map((rule, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {rule}
                  </li>
                ))}
              </ul>
              <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3.5 text-sm text-amber-300/80">
                By clicking "Start Test", you agree to follow all test rules.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => navigate("/learner/dashboard")} className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button onClick={handleStartTest} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
              I Understand — Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Submit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Send className="h-4 w-4 text-emerald-400" />
              </div>
              Submit Test?
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-400">{answeredCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Answered</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${
              questions.length - answeredCount > 0
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-slate-800 border-slate-700"
            }`}>
              <p className={`text-2xl font-black ${questions.length - answeredCount > 0 ? "text-amber-400" : "text-slate-400"}`}>
                {questions.length - answeredCount}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Unanswered</p>
            </div>
          </div>
          {questions.length - answeredCount > 0 && (
            <div className="text-sm text-amber-300/80 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
              Unanswered questions will be marked incorrect.
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Keep Going
            </Button>
            <Button
              onClick={() => { setShowSubmitDialog(false); handleSubmit(); }}
              disabled={completeMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {completeMutation.isPending ? "Assessing answers…" : "Submit Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Exit Test Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Exit Test
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Provide a reason for exiting. This will be shared with your teacher.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your reason for exiting the test…"
            value={exitReason}
            onChange={(e) => setExitReason(e.target.value)}
            rows={3}
            className="resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 focus:border-red-500/50"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowExitDialog(false); setExitReason(""); }} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </Button>
            <Button
              onClick={() => exitTestMutation.mutate(exitReason)}
              disabled={!exitReason.trim() || exitTestMutation.isPending}
              variant="destructive"
            >
              {exitTestMutation.isPending ? "Exiting…" : "Confirm Exit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save & Exit Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showSaveProgressDialog} onOpenChange={setShowSaveProgressDialog}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Save className="h-4 w-4 text-indigo-400" />
              </div>
              Save Progress?
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Your progress is automatically saved. You can return to this practice checkup anytime from your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveProgressDialog(false)} className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Continue
            </Button>
            <Button onClick={handleSaveAndGoBack} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
