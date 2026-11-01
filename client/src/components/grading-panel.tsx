import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  BookOpen,
  Check,
  X,
  Star,
  Maximize,
  AlertTriangle,
  Wand2,
  Zap,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDate, createMarkup } from "@/lib/utils";
import type { DatabaseStorage } from "../../../server/storage";
import type { FullscreenExit } from "@shared/schema";

type GradingSubmission = NonNullable<Awaited<ReturnType<DatabaseStorage["getSubmissionWithDefinitions"]>>>;

interface GradingPanelProps {
  submissionId: number;
  onComplete: () => void;
}

export function GradingPanel({ submissionId, onComplete }: GradingPanelProps) {
  const { toast } = useToast();
  const [score, setScore] = useState(0);
  const [gradingData, setGradingData] = useState<{
    definitions: {
      definitionId: number;
      isCorrect: boolean;
      addToFlashcards: boolean;
      correctDefinition: string;
      showCorrectDefinition: boolean;
    }[];
    multipleChoiceAnswers: {
      answerId: number;
      isCorrect: boolean;
      addToFlashcards: boolean;
    }[];
  }>({
    definitions: [],
    multipleChoiceAnswers: [],
  });
  const [loadingAI, setLoadingAI] = useState<{ [key: number]: boolean }>({});
  const [aiGradingLoading, setAiGradingLoading] = useState(false);

  // Get submission with definitions
  const { data: submission, isLoading } = useQuery<GradingSubmission>({
    queryKey: [`/api/submissions/${submissionId}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });
  
  // Fetch fullscreen exit events for this submission
  const { data: fullscreenExits = [], isLoading: isLoadingExits } = useQuery<FullscreenExit[]>({
    queryKey: [`/api/submissions/${submissionId}/fullscreen-exits`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!submissionId,
  });

  // AI definition generation mutation
  const generateDefinitionMutation = useMutation({
    mutationFn: async (word: string) => {
      const response = await apiRequest("POST", `/api/ai/definitions`, {
        words: [word]
      });
      const result = await response.json();
      return result.definitions[word];
    },
    onSuccess: (definition, word) => {
      toast({
        title: "Definition Generated",
        description: `AI generated definition for "${word}"`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate definition",
        variant: "destructive",
      });
    },
  });

  // AI grading mutation
  const aiGradingMutation = useMutation({
    mutationFn: async () => {
      if (!submission?.wordDefinitions) throw new Error("No definitions to grade");
      
      const gradingPromises = submission.wordDefinitions
        .filter(def => def.studentDefinition && def.studentDefinition.trim() !== '')
        .map(async (def) => {
          const correctDef = gradingData.definitions.find(d => d.definitionId === def.id)?.correctDefinition;
          if (!correctDef) throw new Error(`Correct definition required for "${def.word.word}"`);
          
          const response = await apiRequest("POST", `/api/ai/grade-definition`, {
            word: def.word.word,
            studentDefinition: def.studentDefinition,
            correctDefinition: correctDef,
          });
          const result = await response.json();
          return { definitionId: def.id, grading: result };
        });
      
      return Promise.all(gradingPromises);
    },
    onSuccess: (results) => {
      // Apply AI grading results
      setGradingData(prev => ({
        ...prev,
        definitions: prev.definitions.map(def => {
          const result = results.find(r => r.definitionId === def.definitionId);
          if (result) {
            return {
              ...def,
              isCorrect: result.grading.isCorrect,
              addToFlashcards: !result.grading.isCorrect,
            };
          }
          return def;
        })
      }));
      
      const gradedCount = results.length;
      const totalCount = submission?.wordDefinitions?.length || 0;
      toast({
        title: "AI Grading Complete",
        description: `Graded ${gradedCount} of ${totalCount} definitions automatically. Empty definitions were skipped.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Grading Failed",
        description: error.message || "Failed to grade definitions with AI",
        variant: "destructive",
      });
    },
  });

  // Set up initial grading data when submission is loaded
  useEffect(() => {
    if (submission?.wordDefinitions || submission?.multipleChoiceAnswers) {
      const definitions = submission.wordDefinitions?.map((def) => {
        // Get word definition from vocab list if available, or create an empty one
        const wordDef = def.word.definition || '';
        
        return {
          definitionId: def.id,
          isCorrect: def.isCorrect ?? false,
          addToFlashcards: def.addedToFlashcards ?? true,
          correctDefinition: def.correctDefinition || wordDef,
          showCorrectDefinition: def.showCorrectDefinition ?? true,
        };
      }) || [];

      const multipleChoiceAnswers = submission.multipleChoiceAnswers?.map((answer) => ({
        answerId: answer.id,
        isCorrect: answer.isCorrect ?? false,
        addToFlashcards: false,
      })) || [];
      
      setGradingData({ definitions, multipleChoiceAnswers });
    }
  }, [submission]);

  // Update score whenever grading data changes
  useEffect(() => {
    const definitionsLength = gradingData.definitions?.length || 0;
    const mcAnswersLength = gradingData.multipleChoiceAnswers?.length || 0;
    const totalQuestions = definitionsLength + mcAnswersLength;
    
    if (totalQuestions > 0) {
      const correctDefinitions = gradingData.definitions?.filter((def) => def.isCorrect).length || 0;
      const correctMCAnswers = gradingData.multipleChoiceAnswers?.filter((mc) => mc.isCorrect).length || 0;
      const totalCorrect = correctDefinitions + correctMCAnswers;
      const calculatedScore = Math.round((totalCorrect / totalQuestions) * 100);
      setScore(calculatedScore);
    }
  }, [gradingData]);

  // Mutation to submit grading
  const gradeMutation = useMutation({
    mutationFn: async (data: {
      definitions: {
        definitionId: number;
        isCorrect: boolean;
        addToFlashcards: boolean;
        correctDefinition: string;
        showCorrectDefinition: boolean;
      }[];
      multipleChoiceAnswers?: {
        answerId: number;
        isCorrect: boolean;
        addToFlashcards: boolean;
      }[];
      score: number;
    }) => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/grade`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/submissions"] });
      toast({
        title: "Submission graded",
        description: "The submission has been graded successfully.",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Error grading submission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to reassign submission
  const reassignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/submissions/${submissionId}/reassign`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/submissions"] });
      toast({
        title: "Submission reassigned",
        description: "A new submission has been created for the student to redo.",
      });
      onComplete();
    },
    onError: (error: Error) => {
      toast({
        title: "Error reassigning submission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleCorrect = (definitionId: number, isCorrect: boolean) => {
    setGradingData((prev) => ({
      ...prev,
      definitions: (prev.definitions || []).map((def) =>
        def.definitionId === definitionId
          ? { ...def, isCorrect }
          : def
      ),
    }));
  };

  const handleToggleMultipleChoiceCorrect = (answerId: number, isCorrect: boolean) => {
    setGradingData((prev) => ({
      ...prev,
      multipleChoiceAnswers: (prev.multipleChoiceAnswers || []).map((answer) =>
        answer.answerId === answerId
          ? { ...answer, isCorrect }
          : answer
      ),
    }));
  };

  const handleToggleFlashcard = (definitionId: number, addToFlashcards: boolean) => {
    setGradingData((prev) => ({
      ...prev,
      definitions: (prev.definitions || []).map((def) =>
        def.definitionId === definitionId
          ? { ...def, addToFlashcards }
          : def
      ),
    }));
  };

  const handleToggleMultipleChoiceFlashcard = (answerId: number, addToFlashcards: boolean) => {
    setGradingData((prev) => ({
      ...prev,
      multipleChoiceAnswers: (prev.multipleChoiceAnswers || []).map((answer) =>
        answer.answerId === answerId
          ? { ...answer, addToFlashcards }
          : answer
      ),
    }));
  };

  const handleCorrectDefinitionChange = (definitionId: number, correctDefinition: string) => {
    setGradingData((prev) => ({
      ...prev,
      definitions: (prev.definitions || []).map((def) =>
        def.definitionId === definitionId
          ? { ...def, correctDefinition }
          : def
      ),
    }));
  };
  
  const handleToggleShowCorrection = (definitionId: number, showCorrectDefinition: boolean) => {
    setGradingData((prev) => ({
      ...prev,
      definitions: (prev.definitions || []).map((def) =>
        def.definitionId === definitionId
          ? { ...def, showCorrectDefinition }
          : def
      ),
    }));
  };

  // Helper function to generate AI definition for a specific word
  const handleGenerateDefinition = async (definitionId: number, word: string) => {
    setLoadingAI(prev => ({ ...prev, [definitionId]: true }));
    try {
      const definition = await generateDefinitionMutation.mutateAsync(word);
      handleCorrectDefinitionChange(definitionId, definition);
    } finally {
      setLoadingAI(prev => ({ ...prev, [definitionId]: false }));
    }
  };

  // Helper function to run AI grading for all definitions
  const handleAIGrading = async () => {
    // Check if all correct definitions are provided
    const missingDefinitions = gradingData.definitions.filter(def => !def.correctDefinition.trim());
    if (missingDefinitions.length > 0) {
      toast({
        title: "Missing Correct Definitions",
        description: "Please provide correct definitions for all words before using AI grading.",
        variant: "destructive",
      });
      return;
    }

    setAiGradingLoading(true);
    try {
      await aiGradingMutation.mutateAsync();
    } finally {
      setAiGradingLoading(false);
    }
  };

  const handleSubmitGrading = () => {
    // Validate that all correct definitions are provided
    const missingDefinitions = gradingData.definitions.filter(def => !def.correctDefinition.trim());
    if (missingDefinitions.length > 0) {
      toast({
        title: "Correct Definitions Required",
        description: "Please provide correct definitions for all words before submitting.",
        variant: "destructive",
      });
      return;
    }

    gradeMutation.mutate({
      definitions: gradingData.definitions,
      multipleChoiceAnswers: (gradingData.multipleChoiceAnswers?.length || 0) > 0 ? gradingData.multipleChoiceAnswers : undefined,
      score,
    });
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading submission data...</div>;
  }

  if (!submission) {
    return <div className="p-6 text-center">Submission not found.</div>;
  }



  return (
    <div className="px-4 py-5 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex items-start space-x-2">
            <BookOpen className="h-5 w-5 text-primary mt-1" />
            <div>
              <h3 className="text-lg font-medium text-neutral-dark">{submission.list.title}</h3>
              <div className="flex items-center text-sm text-gray-500">
                <User className="h-4 w-4 mr-1" />
                <span>Student: {submission.student.name}</span>
              </div>
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="h-4 w-4 mr-1" />
                <span>Submitted: {formatDate(submission.submittedAt)}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Score:</span>
                  <Badge className={`text-sm font-bold ${
                    score >= 90 ? 'bg-green-100 text-green-800' :
                    score >= 70 ? 'bg-green-100 text-green-800' :
                    score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {score}%
                  </Badge>
                  
                  {fullscreenExits?.length > 0 && (
                    <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {fullscreenExits.length} Exit{fullscreenExits.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                <Progress value={score} className="h-2" />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {gradingData.definitions?.filter(d => d.isCorrect).length || 0}/
                    {gradingData.definitions?.length || 0} correct
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs"
                      onClick={() => {
                        const allCorrect = gradingData.definitions?.every(d => d.isCorrect) || false;
                        setGradingData(prev => ({
                          ...prev,
                          definitions: prev.definitions?.map(def => ({
                            ...def,
                            isCorrect: !allCorrect,
                            addToFlashcards: allCorrect
                          })) || []
                        }));
                      }}
                    >
                      {gradingData.definitions?.every(d => d.isCorrect) ? "Mark all incorrect" : "Mark all correct"}
                    </Button>
                    <div className="text-gray-300">|</div>
                    <Button
                      variant="link"
                      className="p-0 h-auto text-xs text-blue-600 hover:text-blue-800"
                      onClick={handleAIGrading}
                      disabled={aiGradingLoading || aiGradingMutation.isPending}
                    >
                      {aiGradingLoading ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Zap className="h-3 w-3 mr-1" />
                      )}
                      AI Auto-Grade
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-neutral-dark mb-2">Reading Passage:</h4>
            <div className="prose max-w-none passage-container text-sm">
              <div dangerouslySetInnerHTML={createMarkup(submission.list.passage)} />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-neutral-dark mb-4">Student Definitions:</h4>
            <div className="space-y-4">
              {submission.wordDefinitions?.map((definition) => (
                <Card key={definition.id} className="shadow-sm">
                  <CardHeader className="py-3 px-4">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-md">{definition.word.word}</CardTitle>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className={`
                            ${gradingData.definitions?.find(d => d.definitionId === definition.id)?.isCorrect 
                              ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                              : 'bg-white hover:bg-green-50 text-gray-700'}
                          `}
                          onClick={() => handleToggleCorrect(definition.id, true)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Correct
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`
                            ${!gradingData.definitions?.find(d => d.definitionId === definition.id)?.isCorrect 
                              ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' 
                              : 'bg-white hover:bg-red-50 text-gray-700'}
                          `}
                          onClick={() => handleToggleCorrect(definition.id, false)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Incorrect
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="py-3 px-4 border-t border-gray-200">
                    <div className="flex flex-col space-y-2">
                      <div>
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">Student's definition:</p>
                          {(!definition.studentDefinition || definition.studentDefinition.trim() === '') && (
                            <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                              <span className="font-medium">Auto-graded: Wrong</span>
                              <span title="Skipped words are automatically marked as incorrect">ⓘ</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm italic text-gray-600">
                          {definition.studentDefinition ? 
                            `"${definition.studentDefinition}"` : 
                            <span className="text-gray-400">No definition provided (skipped)</span>
                          }
                        </p>
                      </div>
                      
                      <div className="mt-4 space-y-4 pt-2 border-t border-gray-100">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-700">
                              Correct definition: <span className="text-red-500">*</span>
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateDefinition(definition.id, definition.word.word)}
                              disabled={loadingAI[definition.id] || generateDefinitionMutation.isPending}
                              className="text-xs h-7 px-2"
                            >
                              {loadingAI[definition.id] ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3 mr-1" />
                              )}
                              AI Generate
                            </Button>
                          </div>
                          <div className="mt-1">
                            <Input
                              id={`correct-def-${definition.id}`}
                              value={gradingData.definitions?.find(d => d.definitionId === definition.id)?.correctDefinition || ''}
                              onChange={(e) => handleCorrectDefinitionChange(definition.id, e.target.value)}
                              className={`text-sm ${
                                !gradingData.definitions?.find(d => d.definitionId === definition.id)?.correctDefinition?.trim()
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                  : ''
                              }`}
                              placeholder="Provide the correct definition... (required)"
                              required
                            />
                            {!gradingData.definitions?.find(d => d.definitionId === definition.id)?.correctDefinition?.trim() && (
                              <p className="text-xs text-red-500 mt-1">Correct definition is required</p>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`show-def-${definition.id}`}
                                checked={gradingData.definitions?.find(d => d.definitionId === definition.id)?.showCorrectDefinition || false}
                                onCheckedChange={(checked) => handleToggleShowCorrection(definition.id, checked)}
                              />
                              <Label htmlFor={`show-def-${definition.id}`} className="text-sm cursor-pointer">
                                Show correction to student
                              </Label>
                            </div>
                          </div>
                        </div>
                      
                      {!gradingData.definitions?.find(d => d.definitionId === definition.id)?.isCorrect && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`flashcard-${definition.id}`}
                              checked={gradingData.definitions?.find(d => d.definitionId === definition.id)?.addToFlashcards || false}
                              onCheckedChange={(checked) => handleToggleFlashcard(definition.id, checked)}
                            />
                            <Label htmlFor={`flashcard-${definition.id}`} className="text-sm cursor-pointer">
                              Add to student's flashcards
                            </Label>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Multiple Choice Questions Section */}
          {submission.multipleChoiceAnswers && submission.multipleChoiceAnswers.length > 0 && (
            <div className="mt-8">
              <h4 className="text-sm font-medium text-neutral-dark mb-4">Multiple Choice Questions:</h4>
              <div className="space-y-4">
                {submission.multipleChoiceAnswers.map((answer) => {
                  const question = answer.question;
                  const isCorrect = gradingData.multipleChoiceAnswers?.find(mc => mc.answerId === answer.id)?.isCorrect ?? false;
                  const addToFlashcards = gradingData.multipleChoiceAnswers?.find(mc => mc.answerId === answer.id)?.addToFlashcards ?? false;
                  
                  return (
                    <Card key={answer.id} className="shadow-sm">
                      <CardHeader className="py-3 px-4">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-md">{question.word.word}</CardTitle>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className={`
                                ${isCorrect 
                                  ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200' 
                                  : 'bg-white hover:bg-green-50 text-gray-700'}
                              `}
                              onClick={() => handleToggleMultipleChoiceCorrect(answer.id, true)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Correct
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className={`
                                ${!isCorrect 
                                  ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' 
                                  : 'bg-white hover:bg-red-50 text-gray-700'}
                              `}
                              onClick={() => handleToggleMultipleChoiceCorrect(answer.id, false)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Incorrect
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="py-3 px-4 border-t border-gray-200">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                            <p className="text-sm text-gray-800">{question.question}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Answer Options:</p>
                            <div className="space-y-2 ml-4">
                              {[
                                { label: 'A', text: question.optionA },
                                { label: 'B', text: question.optionB },
                                { label: 'C', text: question.optionC },
                                { label: 'D', text: question.optionD }
                              ].map((option) => (
                                <div key={option.label} className={`flex items-center space-x-3 p-2 rounded-md border ${
                                  answer.selectedAnswer === option.label 
                                    ? 'border-blue-300 bg-blue-50 font-medium text-blue-800' 
                                    : question.correctAnswer === option.label
                                    ? 'border-green-300 bg-green-50 text-green-800'
                                    : 'border-gray-200 bg-gray-50 text-gray-700'
                                }`}>
                                  <span className="text-sm font-mono font-bold">{option.label})</span>
                                  <span className="text-sm flex-1">{option.text}</span>
                                  <div className="flex space-x-1">
                                    {answer.selectedAnswer === option.label && (
                                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                                        Student Selected
                                      </Badge>
                                    )}
                                    {question.correctAnswer === option.label && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                        Correct Answer
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="bg-gray-50 px-3 py-2 rounded-md">
                                <div className="flex items-center space-x-4 text-sm">
                                  <div className="flex items-center space-x-1">
                                    <span className="font-medium text-gray-700">Student selected:</span> 
                                    <span className={`font-mono font-bold px-2 py-1 rounded ${
                                      answer.selectedAnswer === question.correctAnswer 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {answer.selectedAnswer}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="font-medium text-gray-700">Correct answer:</span> 
                                    <span className="font-mono font-bold px-2 py-1 rounded bg-green-100 text-green-800">
                                      {question.correctAnswer}
                                    </span>
                                  </div>
                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                    answer.selectedAnswer === question.correctAnswer
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {answer.selectedAnswer === question.correctAnswer ? '✓ Correct' : '✗ Incorrect'}
                                  </div>
                                </div>
                              </div>
                              
                              {!isCorrect && (
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`flashcard-mc-${answer.id}`}
                                    checked={addToFlashcards}
                                    onCheckedChange={(checked) => handleToggleMultipleChoiceFlashcard(answer.id, checked)}
                                  />
                                  <Label htmlFor={`flashcard-mc-${answer.id}`} className="text-sm cursor-pointer">
                                    Add to flashcards
                                  </Label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Fullscreen exits section */}
      {fullscreenExits && fullscreenExits.length > 0 && (
        <div className="mb-6">
          <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Fullscreen Exit Events ({fullscreenExits.length})
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  <p>
                    The student exited fullscreen mode {fullscreenExits.length} time{fullscreenExits.length !== 1 ? 's' : ''} during this check-up, 
                    which might indicate they referenced external sources.
                  </p>
                  <ul className="list-disc space-y-1 pl-5 mt-2">
                    {fullscreenExits.map((exit: any, index: number) => (
                      <li key={index}>
                        Exit {index + 1}: {new Date(exit.timestamp).toLocaleString()}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between space-x-3">
        <Button
          variant="outline"
          className="border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
          onClick={() => reassignMutation.mutate()}
          disabled={reassignMutation.isPending}
        >
          {reassignMutation.isPending ? "Reassigning..." : "Reassign to Student"}
        </Button>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onComplete}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmitGrading}
            disabled={
              gradeMutation.isPending || 
              gradingData.definitions.some(def => !def.correctDefinition.trim())
            }
            className={
              gradingData.definitions.some(def => !def.correctDefinition.trim())
                ? "opacity-50 cursor-not-allowed"
                : ""
            }
          >
            {gradeMutation.isPending ? "Submitting..." : "Submit Grading"}
          </Button>
        </div>
      </div>
    </div>
  );
}
