import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { checkAIStatus, analyzePassage } from "@/lib/aiService";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AIPassageAssistProps {
  passage: string;
  onSelectWords: (words: string[]) => void;
}

export function AIPassageAssist({ passage, onSelectWords }: AIPassageAssistProps) {
  const [wordCount, setWordCount] = useState<number>(10);
  const { toast } = useToast();

  // Check if AI is configured
  const { 
    data: aiStatus,
    isLoading: isLoadingStatus
  } = useQuery({
    queryKey: ['/api/ai/status'],
    queryFn: () => checkAIStatus(),
    staleTime: 60000, // Cache for 1 minute
  });

  // Mutation for analyzing passage
  const { 
    mutate: analyzePassageMutation,
    isPending: isAnalyzing,
    data: analysisResult,
    error: analysisError
  } = useMutation({
    mutationFn: () => analyzePassage(passage, wordCount),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/status'] });
      toast({
        title: "Passage analyzed",
        description: `Found ${data.words.length} potential vocabulary words`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error analyzing passage",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAnalyzePassage = () => {
    if (!passage || passage.length < 50) {
      toast({
        title: "Passage too short",
        description: "Please enter a passage with at least 50 characters",
        variant: "destructive",
      });
      return;
    }
    analyzePassageMutation();
  };

  const handleSelectWords = () => {
    if (analysisResult?.words) {
      onSelectWords(analysisResult.words);
      toast({
        title: "Words selected",
        description: `Added ${analysisResult.words.length} words to your vocabulary list`,
      });
    }
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!aiStatus?.configured) {
    return (
      <Alert variant="destructive">
        <AlertTitle>AI features unavailable</AlertTitle>
        <AlertDescription>
          Ollama service is not running. Contact your administrator to enable AI features.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-background">
      <div className="flex flex-col space-y-2">
        <h3 className="text-lg font-semibold">AI Vocabulary Assistant</h3>
        <p className="text-muted-foreground text-sm">
          Use AI to analyze your passage and suggest vocabulary words for your list.
        </p>
      </div>

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <Button 
          variant="secondary" 
          onClick={handleAnalyzePassage}
          disabled={isAnalyzing || passage.length < 50}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            "Analyze Passage"
          )}
        </Button>
        
        {analysisResult && (
          <Button
            onClick={handleSelectWords}
            disabled={!analysisResult.words || analysisResult.words.length === 0}
          >
            Use Suggested Words
          </Button>
        )}
      </div>

      {analysisError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {analysisError instanceof Error ? analysisError.message : "Failed to analyze passage"}
          </AlertDescription>
        </Alert>
      )}

      {analysisResult && analysisResult.words && analysisResult.words.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Suggested vocabulary words:</h4>
          <div className="flex flex-wrap gap-2">
            {analysisResult.words.map((word) => (
              <Badge key={word} variant="secondary">
                {word}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}