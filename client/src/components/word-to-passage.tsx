import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2, BookOpen, Settings, Wand } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { generatePassageFromWords } from "@/lib/aiService";
import { useToast } from "@/hooks/use-toast";
import { extractHighlightedWords, formatPassageWithHighlights } from "@/lib/utils";

interface WordToPassageProps {
  onPassageGenerated: (passage: string, words: string[]) => void;
}

export function WordToPassage({ onPassageGenerated }: WordToPassageProps) {
  const [words, setWords] = useState<string[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [generatedPassage, setGeneratedPassage] = useState("");
  const [isPassageReady, setIsPassageReady] = useState(false);
  
  // Generation options
  const [topic, setTopic] = useState("general knowledge");
  const [gradeLevel, setGradeLevel] = useState("middle school");
  const [paragraphCount, setParagraphCount] = useState(1);
  const [style, setStyle] = useState("educational");

  const { toast } = useToast();

  // Mutation for generating passage
  const { 
    mutate: generatePassageMutation,
    isPending,
    error
  } = useMutation({
    mutationFn: () => generatePassageFromWords(
      words,
      {
        topic,
        gradeLevel,
        paragraphCount,
        style
      }
    ),
    onSuccess: (data) => {
      // Check if the passage contains a fallback message indicating it's using the simple format
      const isFallbackPassage = data.passage.includes("This educational passage about") && 
                               data.passage.includes("is an important vocabulary word to understand");
      
      if (isFallbackPassage) {
        toast({
          title: "Basic passage generated",
          description: "Using a simplified format with your vocabulary words.",
        });
      } else {
        toast({
          title: "Passage generated successfully",
          description: "The passage contains all your vocabulary words."
        });
      }
      
      setGeneratedPassage(data.passage);
      setIsPassageReady(true);
    },
    onError: (error: Error) => {
      // Create a fallback passage if there's an error
      const fallbackPassage = `Vocabulary study list containing the words: ${words.join(", ")}.`;
      setGeneratedPassage(fallbackPassage);
      setIsPassageReady(true);
      
      toast({
        title: "Error generating passage",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle adding a word to the list
  const handleAddWord = () => {
    const trimmedWord = currentWord.trim();
    if (trimmedWord && !words.includes(trimmedWord)) {
      setWords([...words, trimmedWord]);
      setCurrentWord("");
    } else if (words.includes(trimmedWord)) {
      toast({
        title: "Duplicate word",
        description: "This word is already in your list.",
        variant: "destructive"
      });
    }
  };

  // Handle removing a word from the list
  const handleRemoveWord = (wordToRemove: string) => {
    setWords(words.filter(word => word !== wordToRemove));
  };

  // Handle key press in the input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentWord.trim()) {
      e.preventDefault();
      handleAddWord();
    }
  };

  // Handle generating the passage
  const handleGeneratePassage = () => {
    if (words.length < 3) {
      toast({
        title: "Not enough words",
        description: "Please add at least 3 vocabulary words.",
        variant: "destructive"
      });
      return;
    }
    
    generatePassageMutation();
  };

  // Handle using the generated passage
  const handleUsePassage = () => {
    // Check if we have a passage to use
    if (!generatedPassage) {
      toast({
        title: "No passage generated",
        description: "Please generate a passage first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      console.log("Using generated passage", { 
        passageLength: generatedPassage.length, 
        wordCount: words.length 
      });
      
      // Call the callback function with our generated content
      onPassageGenerated(generatedPassage, words);
      
      // Reset state
      setGeneratedPassage("");
      setWords([]);
      setCurrentWord("");
      setIsPassageReady(false);
      
      // Feedback for the user
      toast({
        title: "Passage added to list",
        description: "You can now edit the list details and save it."
      });
    } catch (error) {
      console.error("Error using generated passage:", error);
      toast({
        title: "Error adding passage",
        description: "There was a problem adding the passage to your list. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="words" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="words" className="flex items-center">
            <BookOpen className="mr-2 h-4 w-4" />
            Vocabulary Words
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            Generation Options
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="words" className="space-y-4 mt-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="word-input">Add Vocabulary Words</Label>
              <Input
                id="word-input"
                placeholder="Enter a vocabulary word"
                value={currentWord}
                onChange={(e) => setCurrentWord(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isPending}
              />
            </div>
            <Button 
              onClick={handleAddWord} 
              disabled={!currentWord.trim() || isPending}
            >
              Add
            </Button>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium">
                Vocabulary Words ({words.length})
              </Label>
              {words.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setWords([])}
                  disabled={isPending}
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="border rounded-md p-4 min-h-[100px] bg-white dark:bg-gray-950">
              {words.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {words.map((word) => (
                    <Badge key={word} className="flex items-center">
                      {word}
                      <button
                        type="button"
                        className="ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center hover:bg-background/80"
                        onClick={() => handleRemoveWord(word)}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No words added yet. Add vocabulary words to generate a passage.
                </p>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="options" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="Topic for the passage"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground mt-1">
                What should the passage be about?
              </p>
            </div>
            
            <div>
              <Label htmlFor="grade-level">Grade Level</Label>
              <Select 
                value={gradeLevel} 
                onValueChange={setGradeLevel}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elementary school">Elementary School</SelectItem>
                  <SelectItem value="middle school">Middle School</SelectItem>
                  <SelectItem value="high school">High School</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Paragraph Count: {paragraphCount}</Label>
              <Slider
                value={[paragraphCount]}
                min={1}
                max={5}
                step={1}
                onValueChange={(value) => setParagraphCount(value[0])}
                disabled={isPending}
                className="my-2"
              />
            </div>
            
            <div>
              <Label htmlFor="style">Writing Style</Label>
              <Select 
                value={style} 
                onValueChange={setStyle}
                disabled={isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select writing style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="narrative">Narrative</SelectItem>
                  <SelectItem value="descriptive">Descriptive</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                  <SelectItem value="scientific">Scientific</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <Button
        className="w-full"
        onClick={handleGeneratePassage}
        disabled={words.length < 3 || isPending}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand className="mr-2 h-4 w-4" />
            Generate Passage
          </>
        )}
      </Button>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{error instanceof Error ? error.message : "Failed to generate passage"}</p>
            <p className="text-sm">
              {error instanceof Error && error.message.includes("API quota exceeded") ? (
                "The AI service has reached its quota limit. This is common with free tier accounts. You can still use the vocabulary words you've entered to create a list."
              ) : (
                "Try using fewer words or simpler terms. You can still use the vocabulary words you've entered to create a list."
              )}
            </p>
            <div className="mt-2">
              <Button 
                size="sm" 
                onClick={() => {
                  try {
                    // Use the already created fallback passage from the onError handler
                    if (generatedPassage) {
                      onPassageGenerated(generatedPassage, words);
                    } else {
                      // Create a fallback passage as a backup
                      const fallbackPassage = `Vocabulary study list containing the words: ${words.join(", ")}.`;
                      onPassageGenerated(fallbackPassage, words);
                    }
                    
                    // Reset state
                    setWords([]);
                    setCurrentWord("");
                    setGeneratedPassage("");
                    setIsPassageReady(false);
                    
                    toast({
                      title: "Words added to list",
                      description: "Your vocabulary words have been added to a new list."
                    });
                  } catch (err) {
                    console.error("Error continuing with words:", err);
                    toast({
                      title: "Error adding words",
                      description: "There was a problem adding your words. Please try again.",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Continue with these words
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {generatedPassage && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Passage</CardTitle>
            <CardDescription>
              This passage incorporates all your vocabulary words.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background p-4 rounded-md border whitespace-pre-line">
              {generatedPassage}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <Button variant="outline" onClick={() => setGeneratedPassage("")}>
              Regenerate
            </Button>
            <Button onClick={handleUsePassage} type="button">
              Use this Passage
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}