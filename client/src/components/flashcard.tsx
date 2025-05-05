import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/flashcards"] });
      toast({
        title: "Flashcard updated",
        description: "This word has been marked as learned.",
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

  const handleMarkLearned = () => {
    learnedMutation.mutate(true);
  };

  return (
    <div 
      className={`flex-shrink-0 w-64 h-40 relative ${isFlipped ? 'cursor-pointer' : 'cursor-pointer'}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`w-full h-full transition-transform duration-500 transform ${isFlipped ? 'rotate-y-180' : ''} preserve-3d`}>
        {/* Front of card (Word) */}
        <Card className={`absolute w-full h-full backface-hidden ${isFlipped ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
          <CardHeader className="p-3 bg-blue-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-neutral-dark">{flashcard.word.word}</h4>
            <p className="text-xs text-gray-500">{flashcard.definition.submission.list.title}</p>
          </CardHeader>
          <CardContent className="p-4 flex items-center justify-center h-[calc(100%-64px)]">
            <p className="text-center text-gray-700">
              Click to reveal your definition
            </p>
          </CardContent>
        </Card>
        
        {/* Back of card (Definition) */}
        <Card className={`absolute w-full h-full backface-hidden ${isFlipped ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
          <CardHeader className="p-3 bg-blue-50 border-b border-gray-200">
            <h4 className="text-sm font-medium text-neutral-dark">{flashcard.word.word}</h4>
            <p className="text-xs text-gray-500">Your definition</p>
          </CardHeader>
          <CardContent className="p-4 flex flex-col justify-between h-[calc(100%-64px)]">
            <p className="text-sm text-gray-700 italic">"{flashcard.definition.studentDefinition}"</p>
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="outline"
                className="text-green-700 border-green-200 bg-green-100 hover:bg-green-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkLearned();
                }}
                disabled={learnedMutation.isPending}
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Mark as Learned
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
