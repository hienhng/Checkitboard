import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff,
  Trophy,
  Target
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FlashcardStudyModeProps {
  cards: Array<{
    id: number;
    word: { word: string };
    definition: { 
      studentDefinition: string;
      correctDefinition?: string;
      showCorrectDefinition?: boolean;
      submission?: { list: { title: string } } | null
    };
    learned: boolean;
  }>;
  onSessionComplete?: (stats: any) => void;
}

export function FlashcardStudyMode({ cards, onSessionComplete }: FlashcardStudyModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studiedCards, setStudiedCards] = useState<Set<number>>(new Set());
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    timeSpent: 0
  });
  const [startTime] = useState(Date.now());
  const { toast } = useToast();

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

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

  const handleCardResponse = (isCorrect: boolean) => {
    setStudiedCards(prev => new Set([...prev, currentCard.id]));
    setSessionStats(prev => ({
      ...prev,
      [isCorrect ? 'correct' : 'incorrect']: prev[isCorrect ? 'correct' : 'incorrect'] + 1
    }));

    if (isCorrect) {
      markLearnedMutation.mutate({ id: currentCard.id, learned: true });
      toast({
        title: "Great job! 🎉",
        description: "Card marked as learned!",
      });
    }

    // Auto advance to next card after a short delay
    setTimeout(() => {
      if (currentIndex < cards.length - 1) {
        nextCard();
      } else {
        completeSession();
      }
    }, 1000);
  };

  const nextCard = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const completeSession = () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const finalStats = {
      ...sessionStats,
      timeSpent,
      totalCards: cards.length,
      studiedCount: studiedCards.size
    };
    
    onSessionComplete?.(finalStats);
    
    toast({
      title: "Session Complete! 🏆",
      description: `You studied ${studiedCards.size} cards in ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s`,
    });
  };

  if (!currentCard) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Session Complete!</h3>
          <p className="text-gray-600">Great job studying your flashcards!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="px-3 py-1">
            Card {currentIndex + 1} of {cards.length}
          </Badge>
          <div className="text-sm text-gray-500">
            From: {currentCard.definition.submission?.list?.title || 'Unknown List'}
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span>{sessionStats.correct}</span>
          <XCircle className="h-4 w-4 text-red-500" />
          <span>{sessionStats.incorrect}</span>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      {/* Flashcard */}
      <div className="flex justify-center">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="w-full max-w-md"
        >
          <Card 
            className="h-80 cursor-pointer transition-all duration-300 hover:shadow-lg"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <CardHeader className="text-center">
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {isFlipped ? "Definition" : "Word"}
                </Badge>
                <Button variant="ghost" size="sm">
                  {isFlipped ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex items-center justify-center p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isFlipped ? "definition" : "word"}
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  {!isFlipped ? (
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        {currentCard.word.word}
                      </h2>
                      <p className="text-gray-500">Click to see definition</p>
                    </div>
                  ) : (
                    <div>
                      {currentCard.definition.correctDefinition ? (
                        <div className="text-lg text-gray-700">
                          {currentCard.definition.correctDefinition}
                        </div>
                      ) : (
                        <div className="text-lg text-gray-500 italic">
                          No definition provided by teacher
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <Button 
          variant="outline" 
          onClick={prevCard}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {isFlipped && (
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={() => handleCardResponse(false)}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Still Learning
            </Button>
            <Button 
              onClick={() => handleCardResponse(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              I Know This
            </Button>
          </div>
        )}

        <Button 
          variant="outline" 
          onClick={nextCard}
          disabled={currentIndex === cards.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-center text-sm text-gray-500">
        Click the card to flip it, then choose whether you know the word or need more practice
      </div>
    </div>
  );
}