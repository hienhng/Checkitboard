import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  XCircle,
  Brain,
  Target,
  Timer,
  Award
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LearnModeProps {
  cards: Array<{
    id: number;
    word: { word: string };
    definition: { 
      studentDefinition: string;
      correctDefinition?: string;
      showCorrectDefinition?: boolean;
      submission: { list: { title: string } }
    };
    learned: boolean;
  }>;
  onSessionComplete?: (stats: any) => void;
}

type QuestionType = "multiple-choice" | "written" | "definition-match";

export function LearnMode({ cards, onSessionComplete }: LearnModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionType, setQuestionType] = useState<QuestionType>("multiple-choice");
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [confidence, setConfidence] = useState(3);
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    timeSpent: 0,
    totalQuestions: 0
  });
  const [startTime] = useState(Date.now());
  const { toast } = useToast();

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  // State for AI-generated multiple choice options
  const [options, setOptions] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  // Generate AI-powered multiple choice options for the current card
  const generateAIOptions = async (card: typeof currentCard) => {
    if (!card?.definition?.correctDefinition) {
      // Fallback to simple options if no correct definition
      setOptions([
        "A general vocabulary term",
        "A word with multiple meanings",
        "An important concept to learn",
        "A term used in academic contexts"
      ]);
      setIsLoadingOptions(false);
      return;
    }

    try {
      setIsLoadingOptions(true);
      const response = await apiRequest("POST", "/api/ai/multiple-choice", {
        word: card.word.word,
        correctDefinition: card.definition.correctDefinition
      });
      const questionData = await response.json();
      setOptions(questionData.options);
    } catch (error) {
      console.error("Error generating multiple choice options:", error);
      // Fallback options
      setOptions([
        card.definition.correctDefinition,
        "A type of tool or equipment used in various activities",
        "A concept related to human behavior and psychology", 
        "A process or method used to achieve specific outcomes"
      ]);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // Generate options when component mounts or current card changes
  useEffect(() => {
    if (currentCard) {
      generateAIOptions(currentCard);
    }
  }, [currentCard]);

  // Mark card as learned mutation
  const markLearnedMutation = useMutation({
    mutationFn: async ({ id, learned }: { id: number; learned: boolean }) => {
      const res = await apiRequest("PATCH", `/api/flashcards/${id}`, { learned });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/flashcards"] });
    }
  });

  const handleSubmitAnswer = () => {
    const correctAnswer = currentCard.definition.correctDefinition;
    const isCorrect = questionType === "multiple-choice" 
      ? selectedAnswer === correctAnswer
      : writtenAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();

    setSessionStats(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'incorrect']: prev[isCorrect ? 'correct' : 'incorrect'] + 1,
      totalQuestions: prev.totalQuestions + 1
    }));

    setShowAnswer(true);

    // If answered correctly with high confidence, mark as learned
    if (isCorrect && confidence >= 4) {
      markLearnedMutation.mutate({ id: currentCard.id, learned: true });
    }
  };

  const nextQuestion = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer("");
      setWrittenAnswer("");
      setShowAnswer(false);
      setConfidence(3);
      setQuestionType(Math.random() > 0.5 ? "multiple-choice" : "written");
      // Options will be regenerated automatically by useEffect
    } else {
      completeSession();
    }
  };

  const completeSession = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const finalStats = {
      ...sessionStats,
      timeSpent,
      accuracy: sessionStats.totalQuestions > 0 ? (sessionStats.correct / sessionStats.totalQuestions) * 100 : 0
    };
    
    onSessionComplete?.(finalStats);
    
    toast({
      title: "Learn Session Complete! 🧠",
      description: `${finalStats.accuracy.toFixed(0)}% accuracy in ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`,
    });
  };

  if (!currentCard) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Brain className="h-16 w-16 mx-auto text-purple-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Learn Session Complete!</h3>
          <p className="text-gray-600">You've practiced all available cards!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="px-3 py-1 bg-purple-50 text-purple-700">
            <Brain className="h-3 w-3 mr-1" />
            Learn Mode
          </Badge>
          <div className="text-sm text-gray-500">
            Question {currentIndex + 1} of {cards.length}
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{sessionStats.correct}</span>
          </div>
          <div className="flex items-center space-x-1">
            <XCircle className="h-4 w-4 text-red-500" />
            <span>{sessionStats.incorrect}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Target className="h-4 w-4 text-blue-500" />
            <span>{sessionStats.totalQuestions > 0 ? Math.round((sessionStats.correct / sessionStats.totalQuestions) * 100) : 0}%</span>
          </div>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Question Card */}
      <Card className="min-h-96">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>What does "{currentCard.word.word}" mean?</span>
            <Badge variant="secondary">{questionType === "multiple-choice" ? "Multiple Choice" : "Written"}</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {questionType === "multiple-choice" ? (
            <div>
              {isLoadingOptions ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-3 rounded-lg border bg-gray-100 animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                  <div className="space-y-3">
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                          {option}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Label htmlFor="written-answer">Type your answer:</Label>
              <Input
                id="written-answer"
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder="Enter the definition..."
                className="text-lg p-4"
              />
            </div>
          )}

          {/* Confidence Slider */}
          {!showAnswer && (
            <div className="space-y-2">
              <Label>How confident are you?</Label>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">Not sure</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={confidence}
                  onChange={(e) => setConfidence(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-gray-500">Very confident</span>
              </div>
              <div className="text-center text-sm text-gray-600">
                {confidence === 1 && "😰 Guessing"}
                {confidence === 2 && "🤔 Unsure"}
                {confidence === 3 && "😐 Neutral"}
                {confidence === 4 && "😊 Confident"}
                {confidence === 5 && "😎 Very confident"}
              </div>
            </div>
          )}

          {/* Answer Feedback */}
          {showAnswer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
            >
              <div className="flex items-start space-x-3">
                {(questionType === "multiple-choice" 
                    ? selectedAnswer === currentCard.definition.correctDefinition
                    : writtenAnswer.toLowerCase().trim() === currentCard.definition.correctDefinition.toLowerCase().trim()
                  ) ? (
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900 mb-2">
                    {(questionType === "multiple-choice" 
                        ? selectedAnswer === currentCard.definition.correctDefinition
                        : writtenAnswer.toLowerCase().trim() === currentCard.definition.correctDefinition.toLowerCase().trim()
                      ) ? "Correct!" : "Not quite right"}
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Correct definition:</strong> {currentCard.definition.correctDefinition || "No definition provided"}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-3">
            {!showAnswer ? (
              <Button 
                onClick={handleSubmitAnswer}
                disabled={isLoadingOptions || (questionType === "multiple-choice" ? !selectedAnswer : !writtenAnswer.trim())}
                className="px-8"
              >
                {isLoadingOptions ? "Loading..." : "Submit Answer"}
              </Button>
            ) : (
              <Button onClick={nextQuestion} className="px-8">
                {currentIndex < cards.length - 1 ? "Next Question" : "Complete Session"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}