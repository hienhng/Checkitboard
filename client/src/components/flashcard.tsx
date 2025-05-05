import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle, RotateCw, ArrowRightLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface FlashcardProps {
  flashcard: {
    id: number;
    word: {
      word: string;
    };
    definition: {
      studentDefinition: string;
      submission: {
        list: {
          title: string;
        };
      };
    };
    learned: boolean;
  };
}

export function Flashcard({ flashcard }: FlashcardProps) {
  const { toast } = useToast();
  const [isFlipped, setIsFlipped] = useState(false);

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

  return (
    <div className="flex-shrink-0 w-80 h-56 perspective-1000 relative">
      <div 
        className={`w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer ${
          isFlipped ? "rotate-y-180" : ""
        }`}
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* Front of card (Word) */}
        <Card className="absolute w-full h-full backface-hidden">
          <CardHeader className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mb-1 bg-white text-blue-700 border-blue-200">
                  {flashcard.definition.submission.list.title}
                </Badge>
                <h3 className="text-xl font-bold text-blue-900">{flashcard.word.word}</h3>
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
            <p className="text-center text-gray-700 font-medium">
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
        
        {/* Back of card (Definition) */}
        <Card className="absolute w-full h-full backface-hidden rotate-y-180">
          <CardHeader className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-indigo-100">
            <div className="flex justify-between items-center">
              <div>
                <Badge variant="outline" className="mb-1 bg-white text-indigo-700 border-indigo-200">
                  Your Definition
                </Badge>
                <h3 className="text-xl font-bold text-indigo-900">{flashcard.word.word}</h3>
              </div>
              <Button 
                size="sm" 
                variant="ghost" 
                className="text-indigo-700 hover:text-indigo-900 h-8 w-8 p-0"
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
            <p className="text-gray-700 italic">"{flashcard.definition.studentDefinition}"</p>
            <div className="flex justify-between items-center mt-4">
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
      </div>
    </div>
  );
}
