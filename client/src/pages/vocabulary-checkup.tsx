import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Send, BookOpen, AlertTriangle, Save, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Question {
  id: number;
  type: 'multiple_choice' | 'input';
  wordId: number;
  word: string;
  question: string;
  correctAnswer: string;
  // MC specific
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  // Input specific
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
  const [inputDebounceTimers, setInputDebounceTimers] = useState<Record<number, NodeJS.Timeout>>({});
  const checkupRef = useRef<HTMLDivElement>(null);

  // Get submission details
  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: [`/api/submissions/${submissionId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: submissionId > 0,
  });

  const submissionData = submission as any;
  const listId = submissionData?.listId;

  // Get vocabulary list details to check type
  const { data: listData } = useQuery({
    queryKey: [`/api/vocabulary-lists/${listId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!listId,
  });

  const checkupType = (listData as any)?.type || "practice";
  const isTestMode = checkupType === "test";

  // Get all questions for the vocabulary list
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

  // Hydrate answers from saved answers
  useEffect(() => {
    if (savedAnswers && Object.keys(savedAnswers).length > 0 && Object.keys(answers).length === 0) {
      setAnswers(savedAnswers);
    }
  }, [savedAnswers]);

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
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  // Fullscreen and tab detection for Test mode
  useEffect(() => {
    if (!isTestMode || !checkupRef.current) return;

    // Enter fullscreen on mount
    const enterFullscreen = async () => {
      try {
        if (checkupRef.current && document.fullscreenElement !== checkupRef.current) {
          await checkupRef.current.requestFullscreen();
        }
      } catch (error) {
        console.error("Failed to enter fullscreen:", error);
      }
    };

    enterFullscreen();

    // Monitor fullscreen changes
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTestMode) {
        setFullscreenWarning(true);
      } else {
        setFullscreenWarning(false);
      }
    };

    // Monitor tab visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && isTestMode) {
        setFullscreenWarning(true);
      }
    };

    // Prevent navigation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTestMode) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTestMode]);

  // Format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Save MC answer
  const saveMCAnswerMutation = useMutation({
    mutationFn: async ({ questionId, selectedAnswer }: { questionId: number; selectedAnswer: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/multiple-choice-answer`, {
        questionId,
        selectedAnswer,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Answer saved" });
    },
    onError: () => {
      toast({ title: "Error saving answer", variant: "destructive" });
    },
  });

  // Save input answer
  const saveInputAnswerMutation = useMutation({
    mutationFn: async ({ questionId, studentAnswer }: { questionId: number; studentAnswer: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/input-form-answer`, {
        questionId,
        studentAnswer,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Answer saved" });
    },
    onError: () => {
      toast({ title: "Error saving answer", variant: "destructive" });
    },
  });

  // Handle answer change
  const handleAnswerChange = (answer: string) => {
    if (!currentQuestion) return;
    
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: answer }));

    // Auto-save the answer
    if (currentQuestion.type === 'multiple_choice') {
      // Save MC answers immediately
      saveMCAnswerMutation.mutate({ questionId: currentQuestion.id, selectedAnswer: answer });
    } else {
      // Debounce input answers to avoid excessive API calls
      const questionId = currentQuestion.id;
      
      // Clear existing timer for this question
      if (inputDebounceTimers[questionId]) {
        clearTimeout(inputDebounceTimers[questionId]);
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        saveInputAnswerMutation.mutate({ questionId, studentAnswer: answer });
      }, 500); // 500ms debounce
      
      setInputDebounceTimers(prev => ({ ...prev, [questionId]: timer }));
    }
  };

  // Complete submission
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
    // Flush all pending debounced input saves before submitting
    const pendingSaves: Promise<void>[] = [];
    
    Object.entries(inputDebounceTimers).forEach(([questionId, timer]) => {
      clearTimeout(timer);
      
      // Trigger the save immediately for this question
      const answer = answers[parseInt(questionId)];
      if (answer !== undefined) {
        const savePromise = new Promise<void>((resolve) => {
          saveInputAnswerMutation.mutate(
            { questionId: parseInt(questionId), studentAnswer: answer },
            { 
              onSettled: () => resolve()
            }
          );
        });
        pendingSaves.push(savePromise);
      }
    });
    
    setInputDebounceTimers({});
    
    // Wait for all pending saves to complete
    await Promise.all(pendingSaves);
    
    // Now submit
    completeMutation.mutate();
  };

  // Exit test with reason mutation
  const exitTestMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/exit`, {
        exitReason: reason,
      });
      return response.json();
    },
    onSuccess: () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      toast({ title: "Exit reason submitted" });
      navigate("/dashboard");
    },
    onError: () => {
      toast({ title: "Error submitting exit reason", variant: "destructive" });
    },
  });

  // Handle exit request (for test mode)
  const handleExitRequest = () => {
    if (isTestMode) {
      setShowExitDialog(true);
    } else {
      setShowSaveProgressDialog(true);
    }
  };

  // Handle confirm exit
  const handleConfirmExit = () => {
    if (isTestMode && exitReason.trim()) {
      exitTestMutation.mutate(exitReason);
    }
  };

  // Handle save and go back (practice mode)
  const handleSaveAndGoBack = () => {
    toast({ title: "Progress saved" });
    navigate("/dashboard");
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(inputDebounceTimers).forEach(timer => clearTimeout(timer));
    };
  }, [inputDebounceTimers]);

  // Navigation
  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (submissionLoading || questionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">No Questions Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-4">This test doesn't have any questions yet.</p>
            <Button onClick={() => navigate("/learner/dashboard")}>Return to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={checkupRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Fullscreen Warning for Test Mode */}
      {isTestMode && fullscreenWarning && (
        <Alert variant="destructive" className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have exited fullscreen or left the test tab. This has been logged. Please return to fullscreen to continue.
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitRequest}
                className="text-slate-600"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isTestMode ? "Exit Test" : "Save & Exit"}
              </Button>
              <Badge variant="outline" className="text-sm">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              {currentQuestion.word && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                  {currentQuestion.word}
                </Badge>
              )}
              {isTestMode && (
                <Badge variant="destructive" className="text-xs">
                  TEST MODE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span className={timeRemaining < 300 ? "text-red-600 font-semibold" : ""}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle className="h-4 w-4" />
                <span>{answeredCount} answered</span>
              </div>
            </div>
          </div>
          <Progress value={progress} className="mt-3 h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Reading Passage */}
        {passage && (
          <Card className="shadow-md border-2 border-blue-100">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-blue-700 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Reading Passage: {title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="passage-container prose prose-sm max-w-none text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: currentQuestion?.word 
                    ? passage.replace(
                        new RegExp(`(<mark>)?\\b${currentQuestion.word}\\b(</mark>)?`, 'gi'),
                        `<mark class="current-question-word">${currentQuestion.word}</mark>`
                      )
                    : passage 
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Question Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Multiple Choice Question */}
            {currentQuestion.type === 'multiple_choice' && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={handleAnswerChange}
                className="space-y-3"
              >
                {[
                  { value: 'A', label: currentQuestion.optionA },
                  { value: 'B', label: currentQuestion.optionB },
                  { value: 'C', label: currentQuestion.optionC },
                  { value: 'D', label: currentQuestion.optionD },
                ].map(option => (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <RadioGroupItem value={option.value} id={`option-${option.value}`} />
                    <Label
                      htmlFor={`option-${option.value}`}
                      className="flex-1 cursor-pointer text-base"
                    >
                      <span className="font-semibold mr-2">{option.value}.</span>
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {/* Input Question */}
            {currentQuestion.type === 'input' && (
              <div className="space-y-3">
                <Input
                  type="text"
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="text-lg p-4"
                />
                {currentQuestion.caseSensitive && (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    This answer is case-sensitive
                  </p>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Test
                </Button>
              ) : (
                <Button onClick={goToNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <div className="mt-6">
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3 text-slate-600">Question Navigator</h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q: Question, idx: number) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`
                    aspect-square rounded-lg border-2 text-sm font-medium transition-all
                    ${currentQuestionIndex === idx ? 'border-blue-600 bg-blue-50 text-blue-700' : ''}
                    ${answers[q.id] ? 'bg-green-50 border-green-500 text-green-700' : 'border-slate-200 hover:border-slate-300'}
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
            <DialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-amber-600">
                  You have {questions.length - answeredCount} unanswered question(s).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSubmitDialog(false);
                handleSubmit();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Submit Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
