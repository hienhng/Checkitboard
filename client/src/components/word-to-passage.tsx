import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Loader2, BookOpen, Settings, Wand, Plus, CheckCheck } from "lucide-react";
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
    onMutate: () => setGeneratedPassage(""),
    onSuccess: (data) => {
      toast({
        title: "Passage generated successfully",
        description: "Your passage is ready to review."
      });
      
      setGeneratedPassage(data.passage);
    },
    onError: (error: Error) => {
      setGeneratedPassage("");
      
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
  const handleGeneratePassage = (e?: React.MouseEvent) => {
    // Prevent default behavior if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (words.length < 3) {
      toast({
        title: "Not enough words",
        description: "Please add at least 3 vocabulary words.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      generatePassageMutation();
    } catch (error) {
      console.error("Error triggering passage generation:", error);
      toast({
        title: "Error",
        description: "Failed to start passage generation. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle using the generated passage
  const handleUsePassage = (e?: React.MouseEvent) => {
    // Prevent default behavior if event is provided
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
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
      
      // Make copies of the data
      const passageCopy = generatedPassage;
      const wordsCopy = [...words];
      
      // Reset state first
      setGeneratedPassage("");
      setWords([]);
      setCurrentWord("");
      
      // Use setTimeout to ensure state updates complete before callback
      setTimeout(() => {
        try {
          // Call the callback function with copied content
          onPassageGenerated(passageCopy, wordsCopy);
          
          // Feedback for the user
          toast({
            title: "Passage added to list",
            description: "You can now edit the list details and save it."
          });
        } catch (innerError) {
          console.error("Error in callback:", innerError);
          toast({
            title: "Error adding passage",
            description: "There was a problem adding the passage to your list. Please try again.",
            variant: "destructive"
          });
        }
      }, 50);
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
              type="button"
              onClick={handleAddWord} 
              disabled={!currentWord.trim() || isPending}
              aria-label = "Add"
            >
              <CheckCheck className="w-4 h-4" />
            </Button>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label className="text-sm font-medium">
                Vocabulary Words ({words.length})
              </Label>
              {words.length > 0 && (
                <Button 
                  type="button"
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
        type="button"
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
              Your words and options are saved here. You can retry generation or continue with just these words.
            </p>
            <div className="mt-2">
              <Button 
                type="button"
                size="sm" 
                onClick={() => {
                  try {
                    onPassageGenerated(`Vocabulary study list containing the words: ${words.join(", ")}.`, words);
                    
                    // Reset state
                    setWords([]);
                    setCurrentWord("");
                    setGeneratedPassage("");
                    
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
            <Button type="button" variant="outline" disabled={isPending} onClick={() => handleGeneratePassage()}>
              Regenerate
            </Button>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUsePassage();
              }} 
              type="button"
            >
              Use this Passage
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
