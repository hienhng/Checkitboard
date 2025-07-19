import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createMarkup } from "@/lib/utils";
import { ChevronLeft, ChevronRight, AlertTriangle, X, Maximize, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter, 
  DialogTrigger
} from "@/components/ui/dialog";
import { FullscreenMonitor } from "@/components/fullscreen-monitor";
import { FullscreenWarning } from "@/components/fullscreen-warning";
import { useFullscreen } from "@/hooks/use-fullscreen";
import type { MultipleChoiceQuestion } from "@shared/schema";

export default function VocabularyCheckup() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const submissionId = parseInt(id || "0");
  
  console.log("VocabularyCheckup component mounted", { id, submissionId });
  
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [definition, setDefinition] = useState("");
  const [savedDefinitions, setSavedDefinitions] = useState<Record<number, string>>({});
  const [selectedMultipleChoiceAnswers, setSelectedMultipleChoiceAnswers] = useState<Record<number, string>>({});
  const [discardReason, setDiscardReason] = useState("");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [navigationWarningOpen, setNavigationWarningOpen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);

  // Fullscreen management
  const { isFullscreen, exitCount, enterFullscreen } = useFullscreen({
    onExitFullscreen: () => {
      setShowFullscreenWarning(true);
    },
    onEnterFullscreen: () => {
      setShowFullscreenWarning(false);
    },
    trackExits: true,
    submissionId: submissionId
  });

  // Get submission details with vocabulary list and words
  const { data: submission, isLoading, error } = useQuery({
    queryKey: [`/api/submissions/${submissionId}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: submissionId > 0, // Only run query if we have a valid submission ID
  });

  // Get current word
  const currentWord = submissionData?.list?.words?.[currentWordIndex];

  // Get multiple choice questions for current word
  const { data: multipleChoiceQuestions } = useQuery({
    queryKey: [`/api/vocabulary-words/${currentWord?.id}/multiple-choice`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!currentWord?.id,
  });

  console.log("Frontend debug:", { submissionId, submission, isLoading, error });
  
  // Additional debugging
  useEffect(() => {
    console.log("VocabularyCheckup effect running", { 
      submissionId, 
      isLoading, 
      hasSubmission: !!submission,
      error: error?.message 
    });
  }, [submissionId, isLoading, submission, error]);

  // Multiple choice answer submission mutation
  const multipleChoiceAnswerMutation = useMutation({
    mutationFn: async ({ questionId, selectedAnswer }: { questionId: number, selectedAnswer: string }) => {
      const response = await apiRequest("POST", `/api/submissions/${submissionId}/multiple-choice-answer`, {
        questionId,
        selectedAnswer,
      });
      return response.json();
    },
    onSuccess: (data, { questionId, selectedAnswer }) => {
      setSelectedMultipleChoiceAnswers(prev => ({
        ...prev,
        [questionId]: selectedAnswer
      }));
      toast({ title: "Answer saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving answer",
        description: error.message || "Failed to save multiple choice answer",
        variant: "destructive",
      });
    },
  });



  // Type guard for submission data to fix TypeScript issues
  const submissionData = submission as any;

  // Mutation to submit a definition
  const definitionMutation = useMutation({
    mutationFn: async ({ wordId, studentDefinition }: { wordId: number; studentDefinition: string }) => {
      const res = await apiRequest(
        "POST", 
        `/api/submissions/${submissionId}/definitions`, 
        { wordId, studentDefinition }
      );
      return res.json();
    },
    onSuccess: (data) => {
      // Update saved definitions
      setSavedDefinitions(prev => ({
        ...prev,
        [data.wordId]: data.studentDefinition
      }));
      
      toast({
        title: "Definition saved",
        description: "Your definition has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving definition",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to complete the submission
  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-up completed",
        description: "Your vocabulary check-up has been submitted for grading.",
      });
      navigate("/learner/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error completing check-up",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to discard the submission
  const discardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST", 
        `/api/submissions/${submissionId}/discard`, 
        { discardReason }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check-up discarded",
        description: "Your vocabulary check-up has been discarded with a 0% score.",
        variant: "destructive"
      });
      navigate("/learner/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error discarding check-up",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to end test with zero score when navigating away
  const endTestWithZeroMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST", 
        `/api/submissions/${submissionId}/discard`, 
        { discardReason: "Student navigated away from test" }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Test ended with 0% score",
        description: "You left the test and received a score of 0%.",
        variant: "destructive"
      });
      navigate("/learner/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error ending test",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load any existing definitions when the submission data is loaded
  useEffect(() => {
    if (submissionData?.wordDefinitions?.length) {
      const defMap: Record<number, string> = {};
      submissionData.wordDefinitions.forEach((def: any) => {
        defMap[def.wordId] = def.studentDefinition;
      });
      setSavedDefinitions(defMap);
    }
  }, [submissionData]);

  // Set the current definition when changing words
  useEffect(() => {
    if (submissionData?.list?.words && submissionData.list.words[currentWordIndex]) {
      const currentWordId = submissionData.list.words[currentWordIndex].id;
      setDefinition(savedDefinitions[currentWordId] || "");
    }
  }, [currentWordIndex, savedDefinitions, submissionData?.list?.words]);

  const hasMultipleChoiceQuestions = multipleChoiceQuestions && multipleChoiceQuestions.length > 0;

  const handleNext = async () => {
    if (!submissionData?.list?.words) return;
    
    const currentWord = submissionData.list.words[currentWordIndex];
    
    // Handle multiple choice questions
    if (hasMultipleChoiceQuestions) {
      // Save all multiple choice answers for this word
      for (const question of multipleChoiceQuestions) {
        const selectedAnswer = selectedMultipleChoiceAnswers[question.id];
        if (selectedAnswer) {
          await multipleChoiceAnswerMutation.mutateAsync({
            questionId: question.id,
            selectedAnswer
          });
        }
      }
    } else {
      // Save the current definition if it's changed (including empty string to represent skipped words)
      if (definition !== savedDefinitions[currentWord.id]) {
        await definitionMutation.mutateAsync({ 
          wordId: currentWord.id, 
          studentDefinition: definition || null
        });
      }
    }
    
    // Move to the next word if not at the end
    if (currentWordIndex < submissionData.list.words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentWordIndex > 0) {
      setCurrentWordIndex(currentWordIndex - 1);
    }
  };

  const handleDiscardSubmission = async () => {
    if (!discardReason.trim()) {
      toast({
        title: "Discard reason required",
        description: "Please provide a reason for discarding the test.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await discardMutation.mutateAsync();
      setDiscardDialogOpen(false);
    } catch (error) {
      // Error is handled in the mutation
    }
  };

  const handleComplete = async () => {
    if (!submissionData?.list?.words) return;
    
    const currentWord = submissionData.list.words[currentWordIndex];
    
    // Save the final answer(s)
    if (hasMultipleChoiceQuestions) {
      // Save all multiple choice answers for this word
      for (const question of multipleChoiceQuestions) {
        const selectedAnswer = selectedMultipleChoiceAnswers[question.id];
        if (selectedAnswer) {
          await multipleChoiceAnswerMutation.mutateAsync({
            questionId: question.id,
            selectedAnswer
          });
        }
      }
    } else {
      // Save the current definition if it's changed (including empty definitions)
      if (definition !== savedDefinitions[currentWord.id]) {
        await definitionMutation.mutateAsync({ 
          wordId: currentWord.id, 
          studentDefinition: definition || null
        });
      }
    }
    
    // Students can now complete the test even if they haven't addressed all words
    // This allows for partial submissions
    
    // Complete the submission
    await completeMutation.mutateAsync();
  };


  
  // Start fullscreen mode when check-up begins
  useEffect(() => {
    // Only activate fullscreen when we have a valid submission
    if (submissionData && !submissionData.completed) {
      setIsFullscreenActive(true);
      // Check if already in fullscreen (triggered from test preview)
      if (!document.fullscreenElement) {
        // If not in fullscreen, show warning for user to manually enter
        setShowFullscreenWarning(true);
      }
    }
  }, [submissionData]);

  // Browser navigation warning system
  useEffect(() => {
    if (!submissionData || submissionData.completed) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Modern browsers require this
      return '';
    };

    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      setNavigationWarningOpen(true);
      // Push the current state back to prevent navigation
      window.history.pushState(null, '', window.location.pathname);
    };

    // Add beforeunload listener for browser refresh/close
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Add popstate listener for back button
    window.addEventListener('popstate', handlePopState);
    
    // Push current state to enable back button detection
    window.history.pushState(null, '', window.location.pathname);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [submissionData]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-lg text-gray-500">Loading vocabulary check-up...</p>
        </div>
      </div>
    );
  }

  if (!submissionData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4">
              {error ? "Error loading vocabulary check-up." : "Vocabulary check-up not found."}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {error ? `Error: ${error.message}` : "Please try again or contact support."}
            </p>
            <Button onClick={() => navigate("/learner/dashboard")}>Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (submissionData.completed) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4">This check-up has already been completed and is awaiting grading.</p>
            <Button onClick={() => navigate("/learner/dashboard")}>Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Safety checks for word data
  if (!submissionData.list?.words || submissionData.list.words.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-500 mb-4">No vocabulary words found for this check-up.</p>
            <Button onClick={() => navigate("/learner/dashboard")}>Return to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalWords = submissionData.list.words.length;

  const handleReturnToFullscreen = async () => {
    await enterFullscreen();
  };

  return (
    <div className="min-h-screen bg-neutral-light">
      <FullscreenMonitor 
        submissionId={submissionId} 
        isActive={isFullscreenActive}
        onFullscreenExit={() => setShowFullscreenWarning(true)}
      >
        {/* Fullscreen warning overlay */}
        <FullscreenWarning 
          isVisible={showFullscreenWarning}
          onReturnToFullscreen={handleReturnToFullscreen}
        />
        
        {/* Overlay to block interactions when not in fullscreen */}
        {showFullscreenWarning && (
          <div 
            className="fixed inset-0 z-[9998] bg-transparent cursor-not-allowed"
            style={{ pointerEvents: 'all' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        )}
        <div className="h-screen flex flex-col md:flex-row">
          {/* Left Panel - Reading Passage */}
          <div className="h-1/2 md:h-full md:w-1/2 overflow-auto p-6 bg-white border-b md:border-b-0 md:border-r border-gray-200">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-xl font-semibold text-neutral-dark mb-4">
                  {submissionData.list.title}
                </h2>
                <div className="prose max-w-none passage-container">
                  <div dangerouslySetInnerHTML={createMarkup(
                    submissionData.list.passage.replace(
                      new RegExp(`\\b${currentWord.word}\\b`, 'gi'), 
                      `<mark>${currentWord.word}</mark>`
                    )
                  )} />
                </div>
              </div>
            </div>
            
            {/* Right Panel - Vocabulary Check-Up */}
            <div className="h-1/2 md:h-full md:w-1/2 overflow-auto p-6 bg-gray-50">
              <div className="max-w-xl mx-auto">
                <Card>
                  <CardHeader className="px-6 py-4 border-b border-gray-200 bg-blue-50">
                    <div className="flex justify-between items-center">
                      <CardTitle>Vocabulary Check-Up</CardTitle>
                      <Badge className="bg-blue-100 text-blue-800">
                        Word {currentWordIndex + 1} of {totalWords}
                      </Badge>
                    </div>
                    <CardDescription>
                      {hasMultipleChoiceQuestions 
                        ? "Answer the multiple choice questions for each word." 
                        : "Define each highlighted word from the passage."
                      }
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div>
                        <label className="block text-lg font-medium text-neutral-dark">
                          {currentWord.word}
                        </label>
                        
                        {hasMultipleChoiceQuestions ? (
                          <>
                            <p className="text-sm text-gray-500 mb-4">
                              Choose the best answer for each question about this word.
                            </p>
                            <div className="space-y-6">
                              {multipleChoiceQuestions.map((question: MultipleChoiceQuestion) => (
                                <div key={question.id} className="border rounded-lg p-4 bg-white">
                                  <div className="flex items-start gap-2 mb-3">
                                    <HelpCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <h4 className="text-sm font-medium text-gray-900">
                                      {question.question}
                                    </h4>
                                  </div>
                                  
                                  <RadioGroup
                                    value={selectedMultipleChoiceAnswers[question.id] || ""}
                                    onValueChange={(value) => {
                                      setSelectedMultipleChoiceAnswers(prev => ({
                                        ...prev,
                                        [question.id]: value
                                      }));
                                    }}
                                    disabled={showFullscreenWarning}
                                    className="space-y-2"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="A" id={`q${question.id}-a`} />
                                      <Label htmlFor={`q${question.id}-a`} className="flex-1 cursor-pointer">
                                        A. {question.optionA}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="B" id={`q${question.id}-b`} />
                                      <Label htmlFor={`q${question.id}-b`} className="flex-1 cursor-pointer">
                                        B. {question.optionB}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="C" id={`q${question.id}-c`} />
                                      <Label htmlFor={`q${question.id}-c`} className="flex-1 cursor-pointer">
                                        C. {question.optionC}
                                      </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="D" id={`q${question.id}-d`} />
                                      <Label htmlFor={`q${question.id}-d`} className="flex-1 cursor-pointer">
                                        D. {question.optionD}
                                      </Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-500 mb-2">
                              Write what you think this word means, or skip if you don't know.
                            </p>
                            <Textarea
                              id="word-definition"
                              rows={4}
                              placeholder="Type your definition here or leave blank to skip..."
                              value={definition}
                              onChange={(e) => setDefinition(e.target.value)}
                              disabled={showFullscreenWarning}
                              className={showFullscreenWarning ? "opacity-50 cursor-not-allowed" : ""}
                            />
                            <div className="mt-2 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDefinition("")}
                                disabled={showFullscreenWarning}
                                className="text-gray-600"
                              >
                                Clear
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  setDefinition("");
                                  await handleNext();
                                }}
                                disabled={showFullscreenWarning}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                Skip Word
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <div className="flex justify-between">
                        <Button
                          variant="outline"
                          className="flex items-center"
                          onClick={handlePrevious}
                          disabled={currentWordIndex === 0 || showFullscreenWarning}
                        >
                          <ChevronLeft className="mr-1 h-4 w-4" />
                          Previous
                        </Button>
                        
                        {currentWordIndex < totalWords - 1 ? (
                          <Button
                            className="flex items-center"
                            onClick={handleNext}
                            disabled={showFullscreenWarning}
                          >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            className="flex items-center"
                            onClick={handleComplete}
                            disabled={showFullscreenWarning}
                          >
                            Submit Check-Up
                          </Button>
                        )}
                      </div>
                      
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex -space-x-1 overflow-hidden">
                              {submissionData.list.words.map((_: any, index: any) => {
                                const wordId = submissionData.list.words[index].id;
                                const hasDefinition = savedDefinitions[wordId];
                                const isSkipped = savedDefinitions.hasOwnProperty(wordId) && !savedDefinitions[wordId];
                                
                                // Check for multiple choice answers for this word
                                const hasMultipleChoiceAnswers = multipleChoiceQuestions && multipleChoiceQuestions.some((q: MultipleChoiceQuestion) => 
                                  selectedMultipleChoiceAnswers[q.id]
                                );
                                
                                const hasAnyAnswer = hasDefinition || hasMultipleChoiceAnswers;
                                
                                return (
                                  <div 
                                    key={index} 
                                    className={`inline-block h-6 w-6 rounded-full ring-2 ring-white ${
                                      index === currentWordIndex 
                                        ? 'bg-blue-500 text-white' 
                                        : hasAnyAnswer
                                          ? 'bg-green-100 text-green-700' 
                                          : isSkipped
                                            ? 'bg-orange-100 text-orange-700'
                                            : 'bg-gray-200 text-gray-500'
                                    } flex items-center justify-center text-xs cursor-pointer`}
                                    onClick={() => setCurrentWordIndex(index)}
                                  >
                                    {index + 1}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <Dialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-sm text-red-500 hover:text-red-700"
                              >
                                <X className="mr-1 h-4 w-4" />
                                Discard Test
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                  <AlertTriangle size={18} />
                                  Discard Test?
                                </DialogTitle>
                                <DialogDescription>
                                  This will discard your current test and you will receive a 0% score.
                                  This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="mt-4">
                                <label htmlFor="discard-reason" className="block text-sm font-medium text-neutral-dark mb-1">
                                  Please explain why you are discarding this test:
                                </label>
                                <Textarea
                                  id="discard-reason"
                                  rows={3}
                                  placeholder="I'm discarding this test because..."
                                  value={discardReason}
                                  onChange={(e) => setDiscardReason(e.target.value)}
                                  className="w-full"
                                />
                              </div>
                              <DialogFooter className="mt-4">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setDiscardDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={handleDiscardSubmission}
                                  disabled={discardMutation.isPending}
                                >
                                  {discardMutation.isPending ? "Discarding..." : "Discard Test"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Navigation Warning Dialog */}
                          <Dialog open={navigationWarningOpen} onOpenChange={setNavigationWarningOpen}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                  <AlertTriangle size={18} />
                                  Warning: Leaving Test
                                </DialogTitle>
                                <DialogDescription>
                                  You are trying to leave the vocabulary check-up. If you continue, your test will be ended and you will receive a score of 0%. This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter className="mt-4">
                                <Button 
                                  variant="outline" 
                                  onClick={() => setNavigationWarningOpen(false)}
                                >
                                  Stay in Test
                                </Button>
                                <Button 
                                  variant="destructive"
                                  onClick={() => {
                                    setNavigationWarningOpen(false);
                                    endTestWithZeroMutation.mutate();
                                  }}
                                  disabled={endTestWithZeroMutation.isPending}
                                >
                                  {endTestWithZeroMutation.isPending ? "Ending Test..." : "End Test (0% Score)"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
        </div>
      </FullscreenMonitor>
    </div>
  );
}