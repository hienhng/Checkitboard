import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { X, BookOpen, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { extractHighlightedWords, formatPassageWithHighlights } from "@/lib/utils";
import { ClassSelect } from "@/components/ui/class-select";
import { AIPassageAssist } from "@/components/ai-assist";
import { WordToPassage } from "@/components/word-to-passage";
import { z } from "zod";

interface PassageEditorProps {
  onSuccess: () => void;
}

export function PassageEditor({ onSuccess }: PassageEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const passageRef = useRef<HTMLDivElement>(null);
  const [dueDate, setDueDate] = useState("");
  
  // Helper function to parse a date string safely
  const parseDateSafely = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr.trim() === '') return undefined;
    
    try {
      // Parse the date string (format: YYYY-MM-DD) and create a date at noon UTC
      // Using the Date constructor directly with the ISO string format (YYYY-MM-DD)
      // ensures proper handling by the database
      const formattedDateStr = `${dateStr}T12:00:00.000Z`;
      const date = new Date(formattedDateStr);
      
      // Verify it's a valid date by checking if it's not "Invalid Date"
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      console.error("Error parsing date:", e);
    }
    
    return undefined;
  };

  // Schema for form validation
  const formSchema = z.object({
    classId: z.number().nullable(),
  });

  // Form for class selection
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: null,
    }
  });

  // Define the type for vocabulary list data
  type VocabularyListData = {
    title: string;
    passage: string;
    words: string[];
    dueDate?: Date;
    published?: boolean;
    classId?: number | null;
  };

  // Mutation to create a new vocabulary list
  const createListMutation = useMutation({
    mutationFn: async (data: VocabularyListData) => {
      // Convert date object to ISO string if it exists
      const payload = {
        ...data,
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined
      };
      
      const res = await apiRequest("POST", "/api/vocabulary-lists", payload);
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle highlighting words in the passage
  useEffect(() => {
    // Handle text selection via mouse/touch
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const selectedText = selection.toString().trim();
      if (selectedText.length > 0 && !selectedWords.includes(selectedText)) {
        // Add the selected word to the list
        setSelectedWords((prev) => [...prev, selectedText]);
        
        // Clear the selection
        window.getSelection()?.removeAllRanges();
      }
    };

    // Handle word click - improved with direct element targeting for better mobile support
    const handleWordClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Handle click on highlighted word (mark)
      if (target.tagName === 'MARK') {
        // Marked words are already selected, so we don't need to add them again
        return;
      }
      
      // Handle click on word span (our new clickable words)
      if (target.tagName === 'SPAN' && target.classList.contains('word')) {
        const clickedWord = target.textContent?.trim().replace(/[.,;:!?"'()[\]{}]/g, '') || '';
        
        if (clickedWord && !selectedWords.includes(clickedWord)) {
          setSelectedWords((prev) => [...prev, clickedWord]);
          
          // Highlight the word immediately for better feedback
          target.style.borderBottomColor = 'currentColor';
          target.style.color = 'var(--primary)';
          
          // Reset styles after a short delay (the highlight effect will be updated by useEffect)
          setTimeout(() => {
            if (target) {
              target.style.borderBottomColor = '';
              target.style.color = '';
            }
          }, 300);
        }
        return;
      }
      
      // Fallback for any other elements that might contain text
      if (target.nodeType === Node.ELEMENT_NODE) {
        // Try to find the closest .word span
        const closestWord = target.closest('.word');
        if (closestWord && closestWord instanceof HTMLElement) {
          const clickedWord = closestWord.textContent?.trim().replace(/[.,;:!?"'()[\]{}]/g, '') || '';
          
          if (clickedWord && !selectedWords.includes(clickedWord)) {
            setSelectedWords((prev) => [...prev, clickedWord]);
          }
          return;
        }
        
        // If we didn't find a .word span, try to use the text content
        const text = target.textContent || '';
        if (!text) return;
        
        // For a single word, use it directly
        if (!text.includes(' ')) {
          const clickedWord = text.trim().replace(/[.,;:!?"'()[\]{}]/g, '');
          if (clickedWord && !selectedWords.includes(clickedWord)) {
            setSelectedWords((prev) => [...prev, clickedWord]);
          }
          return;
        }
      }
    };

    const passageElement = passageRef.current;
    if (passageElement) {
      passageElement.addEventListener("mouseup", handleSelection);
      passageElement.addEventListener("click", handleWordClick as EventListener);
      return () => {
        passageElement.removeEventListener("mouseup", handleSelection);
        passageElement.removeEventListener("click", handleWordClick as EventListener);
      };
    }
  }, [selectedWords]);

  // Update the passage display whenever selected words change
  useEffect(() => {
    const currentPassageRef = passageRef.current;
    if (!currentPassageRef || !passage) return;
    
    try {
      const highlightedPassage = formatPassageWithHighlights(passage, selectedWords);
      // Use dangerouslySetInnerHTML with a wrapper to safely render the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = highlightedPassage;
      
      // Clear the container first
      while (currentPassageRef.firstChild) {
        currentPassageRef.removeChild(currentPassageRef.firstChild);
      }
      
      // Append the sanitized children
      Array.from(tempDiv.childNodes).forEach(node => {
        currentPassageRef.appendChild(node.cloneNode(true));
      });
    } catch (error) {
      console.error("Error updating passage display:", error);
    }
  }, [passage, selectedWords]);

  const handleRemoveWord = (word: string) => {
    setSelectedWords((prev) => prev.filter((w) => w !== word));
  };

  const handlePassageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newPassage = e.target.value;
    setPassage(newPassage);
    
    // Clear any existing highlights when the passage changes
    setSelectedWords([]);
  };

  const handleSaveDraft = () => {
    if (!title || !passage ||  selectedWords.length === 0) {
      toast({
        title: "Incomplete list",
        description: "Please provide a title, passage, and select at least one vocabulary word.",
        variant: "destructive",
      });
      return;
    }

    // Parse the due date using our helper function
    const dueDateObj = parseDateSafely(dueDate);

    // Get the class ID from the form
    const { classId } = form.getValues();

    createListMutation.mutate({
      title,
      passage,
      words: selectedWords,
      dueDate: dueDateObj,
      classId: classId
    });
  };

  const handlePublish = () => {
    if (!title || !passage ||selectedWords.length === 0) {
      toast({
        title: "Incomplete list",
        description: "Please provide a title, passage, and select at least one vocabulary word.",
        variant: "destructive",
      });
      return;
    }

    // Parse the due date using our helper function
    const dueDateObj = parseDateSafely(dueDate);

    // Get the class ID from the form
    const { classId } = form.getValues();

    createListMutation.mutate({
      title,
      passage,
      words: selectedWords,
      dueDate: dueDateObj,
      classId: classId,
      published: true
    });
  };

  if (!user || user.role !== "educator") {
    return <div>Only educators can create vocabulary lists.</div>;
  }

  return (
    <div className="px-4 py-5 sm:p-6">
      {/* Use FormProvider from react-hook-form */}
      <Form {...form}>
        <form className="space-y-6">
          <div>
            <Label htmlFor="list-name">Passage Name</Label>
            <Input
              id="list-name"
              type="text"
              placeholder="e.g., Science Vocabulary - Rainforest Ecosystems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="due-date">Due Date</Label>
            <Input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <ClassSelect
            formControl={form.control}
            name="classId"
            label="Assign to ..."
            description="Assign this vocabulary list to a specific class."
          />

          <Tabs defaultValue="passage-to-words" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="passage-to-words" className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4" /> 
                Passage → Words
              </TabsTrigger>
              <TabsTrigger value="words-to-passage" className="flex items-center">
                <Wand2 className="mr-2 h-4 w-4" /> 
                Words → Passage (AI)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="passage-to-words" className="space-y-6">
              <div>
                <Label htmlFor="reading-passage">Reading Passage</Label>
                <Textarea
                  id="reading-passage"
                  placeholder="Paste (Ctrl + V) or type your reading passage here..."
                  value={passage}
                  onChange={handlePassageChange}
                  rows={8}
                  className="mt-1"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Simply click on words or highlight text to add vocabulary words.
                </p>
              </div>

              <div>
                <Label className="block text-sm font-small text-gray-700">
                  Passage Preview (Click on words or select text to add them)
                </Label>
                <div
                  ref={passageRef}
                  className="mt-1 p-4 border border-gray-300 rounded-md bg-white passage-container min-h-[100px]"
                >
                  {passage}
                </div>
              </div>

              <div>
                <Label className="block text-sm font-medium text-gray-700">
                  Selected Vocabulary Words ({selectedWords.length})
                </Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedWords.map((word) => (
                    <Badge key={word} className="highlighted-word">
                      {word}
                      <button
                        type="button"
                        className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-white-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                        onClick={() => handleRemoveWord(word)}
                        aria-label={`Remove ${word}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {selectedWords.length === 0 && (
                    <p className="text-sm text-gray-500">
                      No words selected yet. Click on words or highlight text in the passage above.
                    </p>
                  )}
                </div>
              </div>
              
              {/* AI Passage Analysis */}
              {passage.length >= 50 && (
                <div className="mt-4">
                  <AIPassageAssist 
                    passage={passage} 
                    onSelectWords={(words) => {
                      // Add new words while avoiding duplicates
                      const uniqueWords = words.filter(word => !selectedWords.includes(word));
                      setSelectedWords(prev => [...prev, ...uniqueWords]);
                    }} 
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="words-to-passage" className="space-y-6">
              <WordToPassage 
                onPassageGenerated={(generatedPassage, wordList) => {
                  console.log("Passage received from generation tool");
                  
                  // Set the state
                  setPassage(generatedPassage || "");
                  setSelectedWords(wordList || []);
                  
                  // Show success message
                  toast({
                    title: "Passage generated",
                    description: `Created a passage with ${wordList.length} vocabulary words.`
                  });
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-3">
            
            <Button
              type="button"
              onClick={handlePublish}
              disabled={createListMutation.isPending}
            >
              {createListMutation.isPending ? "Saving as a draft... (Remember to publish so student can see them!)" : "Save draft"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
