import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, RotateCw, ArrowRightLeft, ArrowUp, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";

interface FlashcardProps {
  flashcard: {
    id: number;
    word: {
      word: string;
    };
    definition: {
      studentDefinition: string;
      correctDefinition?: string;
      showCorrectDefinition?: boolean;
      isCorrect?: boolean;
      submission: {
        list: {
          title: string;
        };
      };
    };
    learned: boolean;
  };
  onLearnedChange?: (learned: boolean) => void;
  externalFlipped?: boolean;
  onFlippedChange?: (flipped: boolean) => void;
}

export function Flashcard({ 
  flashcard, 
  onLearnedChange,
  externalFlipped,
  onFlippedChange
}: FlashcardProps) {
  // Guard against undefined flashcard
  if (!flashcard || !flashcard.word) {
    return (
      <div className="flex-shrink-0 w-80 h-56 flex items-center justify-center">
        <p className="text-gray-500">Flashcard not available</p>
      </div>
    );
  }

  const { toast } = useToast();
  // Use external flipped state if provided, otherwise use internal state
  const [internalFlipped, setInternalFlipped] = useState(false);
  
  // Determine which flipped state to use
  const isFlipped = externalFlipped !== undefined ? externalFlipped : internalFlipped;
  
  // Handler for changing the flipped state
  const setIsFlipped = (flipped: boolean) => {
    if (onFlippedChange) {
      // If parent is controlling flipped state, call the handler
      onFlippedChange(flipped);
    } else {
      // Otherwise use internal state
      setInternalFlipped(flipped);
    }
  };

  // Mutation to mark flashcard as learned
  const learnedMutation = useMutation({
    mutationFn: async (learned: boolean) => {
      const res = await apiRequest("PATCH", `/api/flashcards/${flashcard.id}`, { learned });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/flashcards"] });
      toast({
        title: "Flashcard updated",
        description: data.learned ? "This word has been marked as learned." : "This word has been marked as still learning.",
      });
      
      // If parent provided a callback, call it
      if (onLearnedChange) {
        onLearnedChange(data.learned);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating flashcard",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleMarkLearned = (learned: boolean) => {
    learnedMutation.mutate(learned);
  };

  // Motion values for swipe gestures
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]); // Rotation on x-axis swipe
  const opacity = useTransform(
    x, 
    [-200, -100, 0, 100, 200], 
    [0.5, 0.8, 1, 0.8, 0.5]
  );
  
  // Text indicators for swipe actions
  const upSwipeOpacity = useTransform(
    y,
    [0, -50, -100],
    [0, 0.5, 1]
  );
  
  // Completely reversed to match the actual physical motion with the visual feedback
  const leftSwipeOpacity = useTransform(
    x,
    [0, -50, -100],
    [0, 0.5, 1]
  );
  
  const rightSwipeOpacity = useTransform(
    x,
    [0, 50, 100],
    [0, 0.5, 1]
  );
  
  // Handle the drag end event
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (isFlipped) { // Only process swipes when card is flipped (definition is showing)
      const swipeThreshold = 100; // Threshold to consider a swipe complete
      
      if (info.offset.y < -swipeThreshold) {
        // Swiped up - mark as learned and move to next card
        // This will update the database and move the card to the learned list
        handleMarkLearned(true);
        
        // Notify parent to move to next card
        if (onLearnedChange) {
          onLearnedChange(true);
        }
      } else if (Math.abs(info.offset.x) > swipeThreshold) {
        // Swiped horizontally - just move to next card without changing learned status
        // The card stays in the same list (learning or learned)
        
        // Notify parent to move to next card without changing the learned status
        if (onLearnedChange) {
          // Pass same learn status so that card stays in current list but still moves to next
          onLearnedChange(flashcard.learned);
        }
      }
    }
    
    // Reset position
    x.set(0);
    y.set(0);
  };

  return (
    <div className="flex-shrink-0 w-80 h-56 perspective-1000 relative mx-auto flex justify-center overflow-visible">
      <motion.div 
        className={`w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        style={{
          rotateY: isFlipped ? 180 : 0
        }}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of card (Word) */}
        <Card className="absolute w-full h-full backface-hidden shadow-md rounded-xl overflow-hidden">
          <CardHeader className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mb-1 bg-white text-blue-700 border-blue-200">
                  {flashcard.definition?.submission?.list?.title || "Vocabulary List"}
                </Badge>
                <h3 className="text-xl font-bold text-blue-900 text-center">{flashcard.word.word}</h3>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-blue-700 hover:text-blue-900 h-8 w-8 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(!isFlipped);
                }}
              >
                <ArrowRightLeft className="h-5 w-5" />
                <span className="sr-only">Flip card</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center justify-center h-[calc(100%-90px)]">
            <p className="text-center text-gray-700 font-medium px-2">
              Do you remember your definition?
            </p>
            <Button 
              variant="ghost" 
              className="mt-4 text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                setIsFlipped(true);
              }}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Reveal Definition
            </Button>
          </CardContent>
        </Card>
        
        {/* Back of card (Definition) - This is where we add drag functionality */}
        <motion.div 
          className="absolute w-full h-full backface-hidden shadow-md rounded-xl overflow-hidden"
          style={{ 
            rotateY: 180,
            x, 
            y,
            rotate,
            opacity,
          }}
          drag={isFlipped} // Only enable drag when card is flipped
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
        >
          <Card className="w-full h-full shadow-none border-0">
            <CardHeader className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <Badge variant="outline" className="mb-1 bg-white text-blue-700 border-blue-200">
                    Your Definition
                  </Badge>
                  <h3 className="text-xl font-bold text-blue-900 text-center">{flashcard.word.word}</h3>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-blue-700 hover:text-blue-900 h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(!isFlipped);
                  }}
                >
                  <ArrowRightLeft className="h-5 w-5" />
                  <span className="sr-only">Flip card</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 flex flex-col justify-between h-[calc(100%-90px)]">
              <div>
                <p className="text-gray-700 italic text-center px-2">"{flashcard.definition?.studentDefinition || ''}"</p>
                
                {/* Show correct definition if available and showCorrectDefinition is true */}
                {flashcard.definition?.correctDefinition && flashcard.definition?.showCorrectDefinition && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <Badge 
                      variant="outline" 
                      className={`mb-1 ${flashcard.definition?.isCorrect ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                    >
                      {flashcard.definition?.isCorrect ? 'Correct' : 'Correct Definition'}
                    </Badge>
                    <p className="text-gray-700 text-sm px-2">{flashcard.definition?.correctDefinition}</p>
                  </div>
                )}
              </div>
              
              {/* Swipe direction indicators */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Up swipe indicator */}
                <motion.div 
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 flex justify-center items-center text-green-600"
                  style={{ opacity: upSwipeOpacity }}
                >
                  <div className="bg-white bg-opacity-90 p-2 rounded-b-full flex items-center shadow-md">
                    <ArrowUp className="h-6 w-6 mr-2" />
                    <span className="font-medium">Learned</span>
                  </div>
                </motion.div>
                
                {/* Right swipe indicator - shows at the right edge */}
                <motion.div 
                  className="absolute top-1/2 right-0 transform -translate-y-1/2 flex justify-center items-center text-blue-600"
                  style={{ opacity: rightSwipeOpacity }}
                >
                  <div className="bg-white bg-opacity-90 p-2 rounded-l-full flex items-center shadow-md">
                    <ArrowRight className="h-6 w-6 mr-2" />
                    <span className="font-medium">Next Card</span>
                  </div>
                </motion.div>
                
                {/* Left swipe indicator - shows at the left edge */}
                <motion.div 
                  className="absolute top-1/2 left-0 transform -translate-y-1/2 flex justify-center items-center text-blue-600"
                  style={{ opacity: leftSwipeOpacity }}
                >
                  <div className="bg-white bg-opacity-90 p-2 rounded-r-full flex items-center shadow-md">
                    <ArrowRight className="h-6 w-6 mr-2 transform rotate-180" />
                    <span className="font-medium">Next Card</span>
                  </div>
                </motion.div>
              </div>
              
              {/* Button controls for fallback (touch devices may still use them) */}
              <div className="flex justify-center items-center mt-4">
                {flashcard.learned ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkLearned(false);
                    }}
                    disabled={learnedMutation.isPending}
                  >
                    <RotateCw className="mr-1 h-3.5 w-3.5" />
                    Still Learning
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkLearned(true);
                    }}
                    disabled={learnedMutation.isPending}
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" />
                    Mark as Learned
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      
      {/* Instructions for swipe gestures - only shown when card is flipped */}
      {isFlipped && (
        <div className="absolute -bottom-12 left-0 right-0 text-center text-xs text-gray-500">
          <p>Swipe up to mark as learned, swipe left/right to go to next card</p>
        </div>
      )}
    </div>
  );
}
