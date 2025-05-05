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
  Star
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDate, createMarkup } from "@/lib/utils";

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
  }>({
    definitions: [],
  });

  // Get submission with definitions
  const { data: submission, isLoading } = useQuery({
    queryKey: [`/api/submissions/${submissionId}`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Set up initial grading data when submission is loaded
  useEffect(() => {
    if (submission?.wordDefinitions) {
      const definitions = submission.wordDefinitions.map((def) => {
        // Get word definition from vocab list if available, or create an empty one
        const wordDef = def.word.definition || '';
        
        return {
          definitionId: def.id,
          isCorrect: false, // Default to incorrect
          addToFlashcards: true, // Default to adding to flashcards if incorrect
          correctDefinition: def.correctDefinition || wordDef, // Use existing or word definition
          showCorrectDefinition: true, // Default to showing correct definition
        };
      });
      setGradingData({ definitions });
    }
  }, [submission]);

  // Update score whenever grading data changes
  useEffect(() => {
    if (gradingData.definitions.length > 0 && submission?.wordDefinitions) {
      const correctCount = gradingData.definitions.filter((def) => def.isCorrect).length;
      const totalCount = gradingData.definitions.length;
      const calculatedScore = Math.round((correctCount / totalCount) * 100);
      setScore(calculatedScore);
    }
  }, [gradingData, submission]);

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
      definitions: prev.definitions.map((def) =>
        def.definitionId === definitionId
          ? { ...def, isCorrect }
          : def
      ),
    }));
  };

  const handleToggleFlashcard = (definitionId: number, addToFlashcards: boolean) => {
    setGradingData((prev) => ({
      definitions: prev.definitions.map((def) =>
        def.definitionId === definitionId
          ? { ...def, addToFlashcards }
          : def
      ),
    }));
  };

  const handleCorrectDefinitionChange = (definitionId: number, correctDefinition: string) => {
    setGradingData((prev) => ({
      definitions: prev.definitions.map((def) =>
        def.definitionId === definitionId
          ? { ...def, correctDefinition }
          : def
      ),
    }));
  };
  
  const handleToggleShowCorrection = (definitionId: number, showCorrectDefinition: boolean) => {
    setGradingData((prev) => ({
      definitions: prev.definitions.map((def) =>
        def.definitionId === definitionId
          ? { ...def, showCorrectDefinition }
          : def
      ),
    }));
  };

  const handleSubmitGrading = () => {
    gradeMutation.mutate({
      definitions: gradingData.definitions,
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
                </div>
                <Progress value={score} className="h-2" />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {gradingData.definitions.filter(d => d.isCorrect).length}/
                    {gradingData.definitions.length} correct
                  </span>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    onClick={() => {
                      const allCorrect = gradingData.definitions.every(d => d.isCorrect);
                      setGradingData(prev => ({
                        definitions: prev.definitions.map(def => ({
                          ...def,
                          isCorrect: !allCorrect,
                          addToFlashcards: allCorrect
                        }))
                      }));
                    }}
                  >
                    {gradingData.definitions.every(d => d.isCorrect) ? "Mark all incorrect" : "Mark all correct"}
                  </Button>
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
                            ${gradingData.definitions.find(d => d.definitionId === definition.id)?.isCorrect 
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
                            ${!gradingData.definitions.find(d => d.definitionId === definition.id)?.isCorrect 
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
                        <p className="text-sm font-medium text-gray-700">Student's definition:</p>
                        <p className="text-sm italic text-gray-600">"{definition.studentDefinition}"</p>
                      </div>
                      
                      <div className="mt-4 space-y-4 pt-2 border-t border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Correct definition:</p>
                          <div className="mt-1">
                            <Input
                              id={`correct-def-${definition.id}`}
                              value={gradingData.definitions.find(d => d.definitionId === definition.id)?.correctDefinition || ''}
                              onChange={(e) => handleCorrectDefinitionChange(definition.id, e.target.value)}
                              className="text-sm"
                              placeholder="Provide the correct definition..."
                            />
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id={`show-def-${definition.id}`}
                                checked={gradingData.definitions.find(d => d.definitionId === definition.id)?.showCorrectDefinition || false}
                                onCheckedChange={(checked) => handleToggleShowCorrection(definition.id, checked)}
                              />
                              <Label htmlFor={`show-def-${definition.id}`} className="text-sm cursor-pointer">
                                Show correction to student
                              </Label>
                            </div>
                          </div>
                        </div>
                      
                      {!gradingData.definitions.find(d => d.definitionId === definition.id)?.isCorrect && (
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              id={`flashcard-${definition.id}`}
                              checked={gradingData.definitions.find(d => d.definitionId === definition.id)?.addToFlashcards || false}
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
        </div>
      </div>
      
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
            disabled={gradeMutation.isPending}
          >
            {gradeMutation.isPending ? "Submitting..." : "Submit Grading"}
          </Button>
        </div>
      </div>
    </div>
  );
}
