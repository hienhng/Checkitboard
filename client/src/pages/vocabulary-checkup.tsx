import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
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
  ArrowRight,
  Type,
  Loader2,
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
  const [testStarted, setTestStarted] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"questions" | "passage">("questions");
  const [readingSize, setReadingSize] = useState(1);
  const answersRef = useRef<Record<string, string>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveQueue = useRef<Record<string, Promise<unknown>>>({});
  const submitting = useRef(false);
  const checkupRef = useRef<HTMLDivElement>(null);

  const { data: submission, isError: submissionError } = useQuery({
    queryKey: [`/api/submissions/${submissionId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: submissionId > 0,
  });

  const submissionData = submission as any;
  const listId = submissionData?.listId;

  const { data: listData, isError: listError } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });

  const { data: questionsData, isError: questionsError } = useQuery({
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
  const isContentLoaded = !!submission && !!listData && !!questionsData;

  useEffect(() => {
    if (savedAnswers && Object.keys(savedAnswers).length > 0 && Object.keys(answers).length === 0) {
      setAnswers(savedAnswers);
      answersRef.current = savedAnswers;
    }
  }, [savedAnswers]);

  useEffect(() => {
    if (!isContentLoaded) return;
    if (!isTestMode && !testStarted) {
      setTestStarted(true);
    }
  }, [isContentLoaded, isTestMode, testStarted]);

  useEffect(() => {
    if (listSettings.timeLimit && timeRemaining === null) {
      setTimeRemaining(listSettings.timeLimit * 60);
    }
  }, [listSettings.timeLimit]);

  useEffect(() => {
    if (!testStarted || !isContentLoaded || questions.length === 0 || timeRemaining === null || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) { handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeRemaining, testStarted, isContentLoaded, questions.length]);

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

  if (submissionId <= 0 || submissionError || listError || questionsError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div role="alert" className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Couldn't load your checkup</h2>
          <p className="text-muted-foreground mb-6">Please return to your dashboard and try opening the checkup again.</p>
          <Button onClick={() => navigate("/learner/dashboard")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (!isContentLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-border" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
          </div>
          <div>
            <p className="text-foreground font-semibold text-lg">
              Loading questions
            </p>
            <p className="text-muted-foreground text-sm mt-1">Please wait a moment…</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">No Questions</h2>
          <p className="text-muted-foreground mb-6">This assignment doesn't have any questions yet.</p>
          <Button onClick={() => navigate("/learner/dashboard")} className="bg-primary hover:bg-primary/90 text-primary-foreground">Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isTestMode && !testStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <section aria-labelledby="test-rules-title" className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-6 text-foreground">
          <h1 id="test-rules-title" className="flex items-center gap-3 text-xl font-bold">
            <Shield className="h-6 w-6 text-amber-700 dark:text-amber-400" />
            Monitored Test
          </h1>
          <p className="text-foreground/80 font-medium">Please read before starting:</p>
          <ul className="space-y-3">
            {[
              "Fullscreen mode will be activated and enforced",
              "Tab switching is detected and logged",
              "All violations are reported to your teacher",
              "Stay in fullscreen for the full duration",
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                {rule}
              </li>
            ))}
          </ul>
          <p className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 text-sm text-amber-800 dark:text-amber-300">
            By clicking "I Understand — Start", you agree to follow all test rules. Your timer starts when you begin.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => navigate("/learner/dashboard")} className="flex-1 border-input text-foreground/80 hover:bg-muted">
              Cancel
            </Button>
            <Button onClick={handleStartTest} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              I Understand — Start
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const mcOptions = [
    { value: "A", label: currentQuestion.optionA },
    { value: "B", label: currentQuestion.optionB },
    { value: "C", label: currentQuestion.optionC },
    { value: "D", label: currentQuestion.optionD },
  ];

  const unansweredCount = questions.length - answeredCount;
  const selectedAnswer = answers[answerKey(currentQuestion)] || "";
  const sessionTitle = title || (listData as any)?.title || "Vocabulary checkup";

  return (
    <div ref={checkupRef} className="test-player min-h-screen bg-background text-foreground flex flex-col">
      {isTestMode && fullscreenWarning && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="interrupted-title" aria-describedby="interrupted-description" className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl max-w-sm w-full p-8 text-center shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
            <h2 id="interrupted-title" className="text-xl font-bold mb-2">Return to your test</h2>
            <p id="interrupted-description" className="text-muted-foreground text-sm leading-6 mb-6">You left fullscreen or switched tabs. This has been reported to your teacher. Return to fullscreen to continue; your timer is still running.</p>
            <Button className="w-full" autoFocus onClick={async () => {
              try {
                if (checkupRef.current) await checkupRef.current.requestFullscreen();
                setFullscreenWarning(false);
              } catch {
                toast({ title: "Cannot enter fullscreen", description: "Please allow fullscreen access.", variant: "destructive" });
              }
            }}>Return to fullscreen</Button>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:gap-5 sm:px-8">
          <div className="hidden items-center gap-2.5 border-r pr-5 md:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><BookOpen className="h-[19px] w-[19px]" /></span>
            <span className="text-lg font-bold tracking-tight">checkit<span className="text-primary">.</span></span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              {isTestMode ? <Shield className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
              <span>{isTestMode ? "Monitored test" : "Practice session"}</span>
            </div>
            <h1 className="truncate text-sm font-semibold sm:text-base" title={sessionTitle}>{sessionTitle}</h1>
          </div>
          {timeRemaining !== null && (
            <div role="timer" aria-label={`${formatTime(timeRemaining)} remaining`} className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 sm:px-4 ${timerUrgent ? "border-destructive/25 bg-destructive/5 text-destructive" : "bg-muted/50"}`}>
              <Clock className="h-4 w-4" />
              <div>
                <p className="hidden text-[10px] font-medium text-muted-foreground sm:block">Time remaining</p>
                <p className="text-base font-semibold tabular-nums leading-5">{formatTime(timeRemaining)}</p>
              </div>
            </div>
          )}
          <Button variant="ghost" size="icon" aria-label={isTestMode ? "Exit test" : "Save and exit practice"} title={isTestMode ? "Exit test" : "Save and exit"} disabled={completeMutation.isPending} onClick={() => isTestMode ? setShowExitDialog(true) : setShowSaveProgressDialog(true)}><LogOut /></Button>
          <Button className="hidden sm:inline-flex" disabled={completeMutation.isPending} onClick={() => setShowSubmitDialog(true)}>
            {completeMutation.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle />}<span>{completeMutation.isPending ? "Submitting…" : "Finish session"}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-8 sm:py-7">
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mb-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary"><PenLine className="h-3 w-3" /></span>
            Your progress
          </div>
          <div className="flex min-w-[100px] flex-1 items-center gap-3 sm:max-w-xs">
            <div role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="whitespace-nowrap text-xs text-muted-foreground"><span className="font-semibold text-foreground">{answeredCount}</span> of {questions.length}</span>
          </div>
          <p className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"><Save className="h-3.5 w-3.5" />Answers save automatically</p>
        </div>

        {completeMutation.isPending && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground"><Loader2 className="h-4 w-4 animate-spin" />Saving and assessing your answers. This may take a moment.</div>}

        {passage && (
          <div role="group" aria-label="Player view" className="mb-4 grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 lg:hidden">
            <button type="button" aria-pressed={mobilePanel === "questions"} onClick={() => setMobilePanel("questions")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${mobilePanel === "questions" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}><PenLine className="h-4 w-4" />Questions</button>
            <button type="button" aria-pressed={mobilePanel === "passage"} onClick={() => setMobilePanel("passage")} className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${mobilePanel === "passage" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}><BookOpen className="h-4 w-4" />Reading passage</button>
          </div>
        )}

        <div className={`grid items-start gap-6 ${passage ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]" : "mx-auto max-w-3xl"}`}>
          {passage && (
            <aside aria-labelledby="passage-heading" className={`min-w-0 lg:sticky lg:top-24 ${mobilePanel === "passage" ? "block" : "hidden lg:block"}`}>
              <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-7">
                  <h2 id="passage-heading" className="flex items-center gap-2.5 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" />Reading passage</h2>
                  <div role="group" aria-label="Reading text size" className="flex items-center gap-0.5 rounded-lg border p-0.5">
                    {[0, 1, 2].map(size => <button key={size} type="button" aria-label={`${["Small", "Medium", "Large"][size]} reading text`} aria-pressed={readingSize === size} onClick={() => setReadingSize(size)} className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${readingSize === size ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted"}`}><Type style={{ width: 12 + size * 3, height: 12 + size * 3 }} /></button>)}
                  </div>
                </div>
                <div className="test-player-reading max-h-[65svh] overflow-y-auto px-5 py-6 sm:px-8 sm:py-8 lg:max-h-[calc(100dvh-15rem)]">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Read & understand</p>
                  <h3 className="mb-6 font-serif text-2xl leading-snug tracking-tight sm:text-[1.75rem]">{sessionTitle}</h3>
                  <div className="test-player-passage whitespace-pre-wrap break-words font-serif leading-[1.95] text-foreground/80" style={{ fontSize: [15, 17, 19][readingSize] }} dangerouslySetInnerHTML={{
                    __html: currentQuestion.word
                      ? passage.replace(new RegExp(`(<mark[^>]*>)?\\b(${currentQuestion.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})\\b(</mark>)?`, "gi"), '<mark class="test-player-highlight">$2</mark>')
                      : passage,
                  }} />
                </div>
                <div className="flex items-start gap-2 border-t bg-muted/30 px-5 py-3.5 text-xs leading-5 text-muted-foreground sm:px-7">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-amber-300" />
                  {currentQuestion.word ? <span><span className="font-semibold text-foreground">{currentQuestion.word}</span> is highlighted so you can find it in context.</span> : <span>Refer to this passage as you work through the questions.</span>}
                </div>
              </div>
            </aside>
          )}

          <div className={`min-w-0 space-y-5 ${passage && mobilePanel !== "questions" ? "hidden lg:block" : "block"}`}>
            <section aria-labelledby="question-heading" className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-7">
                <p className="text-sm font-semibold">Question {currentQuestionIndex + 1}<span className="ml-1 font-normal text-muted-foreground">/ {questions.length}</span></p>
                <span className="flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{currentQuestion.type === "multiple_choice" ? <><CheckCircle className="h-3 w-3" />Multiple choice</> : <><PenLine className="h-3 w-3" />Written answer</>}</span>
              </div>
              <div key={answerKey(currentQuestion)} className="px-5 py-7 sm:px-7 sm:py-8">
                {currentQuestion.word && <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">{currentQuestion.word}</p>}
                <h2 id="question-heading" className="break-words text-xl font-semibold leading-[1.5] tracking-tight sm:text-[22px]">{currentQuestion.question}</h2>
                <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">{currentQuestion.type === "multiple_choice" ? "Choose the answer that best fits the passage." : "Explain the meaning in your own words."}</p>

                {currentQuestion.type === "multiple_choice" && (
                  <fieldset aria-labelledby="question-heading" disabled={completeMutation.isPending} className="space-y-3">
                    <legend className="sr-only">Choose one answer</legend>
                    {mcOptions.filter(option => option.label != null).map(option => {
                      const isSelected = selectedAnswer === option.value;
                      return <label key={option.value} className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-3.5 text-left transition-colors focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-card sm:p-4 ${isSelected ? "border-primary bg-accent" : "border-border hover:border-primary/40 hover:bg-muted/50"} ${completeMutation.isPending ? "pointer-events-none opacity-60" : ""}`}>
                        <input type="radio" name={`question-${answerKey(currentQuestion)}`} value={option.value} checked={isSelected} onChange={() => handleAnswerChange(option.value)} className="sr-only" />
                        <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold ${isSelected ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}>{option.value}</span>
                        <span className={`min-w-0 flex-1 break-words text-sm leading-6 ${isSelected ? "font-medium text-accent-foreground" : "text-foreground/80"}`}>{option.label}</span>
                        <span aria-hidden="true" className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{isSelected && <CheckCircle className="h-[18px] w-[18px]" />}</span>
                      </label>;
                    })}
                  </fieldset>
                )}

                {currentQuestion.type === "input" && (
                  <div>
                    <label htmlFor="written-answer" className="mb-2 block text-sm font-medium">Your answer</label>
                    <Textarea id="written-answer" disabled={completeMutation.isPending} placeholder="Write your answer here…" value={selectedAnswer} onChange={e => handleAnswerChange(e.target.value)} rows={5} aria-describedby="written-answer-hint" className="min-h-36 resize-y rounded-xl bg-background/40 p-4 text-base leading-7 placeholder:text-muted-foreground/70 focus-visible:ring-primary/25" />
                    <p id="written-answer-hint" className="mt-3 text-xs leading-5 text-muted-foreground">Your answer is assessed for meaning when you submit. Exact wording is not required.</p>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-4 py-4 sm:px-6">
                <Button variant="outline" className="px-3 sm:px-4" onClick={goToPrevious} disabled={currentQuestionIndex === 0 || completeMutation.isPending}>
                  <ChevronLeft />
                  <span className="sm:hidden">Back</span>
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <span className="hidden text-xs text-muted-foreground sm:block">{currentQuestionIndex + 1} of {questions.length}</span>
                {currentQuestionIndex === questions.length - 1 ? (
                  <Button className="px-3 sm:px-4" disabled={completeMutation.isPending} onClick={() => setShowSubmitDialog(true)}>
                    <span className="sm:hidden">Review</span>
                    <span className="hidden sm:inline">Review & submit</span>
                    <CheckCircle />
                  </Button>
                ) : (
                  <Button className="px-3 sm:px-4" disabled={completeMutation.isPending} onClick={goToNext}>
                    <span className="sm:hidden">Next</span>
                    <span className="hidden sm:inline">Next question</span>
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </section>

            <nav aria-labelledby="navigator-heading" className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 id="navigator-heading" className="text-sm font-semibold">Question overview</h2>
                <span className="text-xs text-muted-foreground">{unansweredCount === 0 ? "All answered" : `${unansweredCount} remaining`}</span>
              </div>
              <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto p-1 -m-1">
                {questions.map((question, index) => {
                  const isAnswered = !!answers[answerKey(question)]?.trim();
                  const isCurrent = currentQuestionIndex === index;
                  return <button key={answerKey(question)} type="button" onClick={() => goToQuestion(index)} aria-label={`Question ${index + 1}, ${isAnswered ? "answered" : "unanswered"}${isCurrent ? ", current" : ""}`} aria-current={isCurrent ? "step" : undefined} className={`relative flex h-10 w-10 items-center justify-center rounded-lg border text-xs font-semibold transition-colors ${isCurrent ? "border-primary bg-primary text-primary-foreground" : isAnswered ? "border-primary/20 bg-accent text-accent-foreground hover:border-primary/50" : "bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
                    {index + 1}{isAnswered && <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${isCurrent ? "bg-primary-foreground" : "bg-primary"}`} />}
                  </button>;
                })}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Current</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border border-primary/20 bg-accent" />Answered</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border bg-card" />Unanswered</span>
              </div>
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs leading-5 text-muted-foreground">
              <p className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" />{isTestMode ? "Stay in fullscreen until you finish." : "Take your time. You can revisit any question."}</p>
              <button disabled={completeMutation.isPending} onClick={() => setShowSubmitDialog(true)} className="font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50">Finish session<ChevronRight className="ml-0.5 inline h-3 w-3" /></button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Submit Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent container={checkupRef.current} className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Send className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </div>
              Ready to submit?
            </DialogTitle>
            <DialogDescription>Review your progress before finishing. You won’t be able to change your answers after submitting.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{answeredCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Answered</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${
              questions.length - answeredCount > 0
                ? "bg-amber-500/10 border-amber-500/20"
                : "bg-muted border-input"
            }`}>
              <p className={`text-2xl font-black ${questions.length - answeredCount > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                {questions.length - answeredCount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Unanswered</p>
            </div>
          </div>
          {questions.length - answeredCount > 0 && (
            <div className="text-sm text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              Unanswered questions will be marked incorrect.
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)} className="border-input text-foreground/80 hover:bg-muted">
              Keep Going
            </Button>
            <Button
              onClick={() => { setShowSubmitDialog(false); handleSubmit(); }}
              disabled={completeMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {completeMutation.isPending ? "Assessing answers…" : "Submit answers"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Exit Test Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent container={checkupRef.current} className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Exit Test
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Provide a reason for exiting. This will be shared with your teacher.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your reason for exiting the test…"
            value={exitReason}
            onChange={(e) => setExitReason(e.target.value)}
            rows={3}
            className="resize-none bg-muted border-input text-foreground placeholder:text-muted-foreground focus:border-red-500/50"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShowExitDialog(false); setExitReason(""); }} className="border-input text-foreground/80 hover:bg-muted">
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
        <DialogContent container={checkupRef.current} className="sm:max-w-sm bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-foreground">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                <Save className="h-4 w-4 text-primary" />
              </div>
              Save Progress?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Your progress is automatically saved. You can return to this practice checkup anytime from your dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveProgressDialog(false)} className="border-input text-foreground/80 hover:bg-muted">
              Continue
            </Button>
            <Button onClick={handleSaveAndGoBack} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save & Exit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
