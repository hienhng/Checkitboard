import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatPassageWithHighlights, createMarkup } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  School,
  BookOpen,
  FileText,
  PlusCircle,
  Edit,
  Pencil,
  Save,
  BookOpenCheck,
  BarChart,
  ChevronRight
} from "lucide-react";

export function EducatorStatistics() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedList, setSelectedList] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedPassage, setEditedPassage] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  
  // Query for fetching educator's stats
  const { 
    data: stats = { 
      totalStudents: 0, 
      totalClasses: 0, 
      totalLists: 0,
      lists: []
    }, 
    isLoading: statsLoading 
  } = useQuery({
    queryKey: ["/api/educator/statistics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/statistics");
      return response.json();
    },
  });
  
  // Mutation for updating vocabulary list
  const updateListMutation = useMutation({
    mutationFn: async (data: { 
      id: number; 
      passage: string; 
      words: string[];
    }) => {
      const response = await apiRequest(
        "PATCH", 
        `/api/vocabulary-lists/${data.id}`, 
        { passage: data.passage, words: data.words }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/statistics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Passage updated",
        description: "The vocabulary list has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update the vocabulary list.",
        variant: "destructive",
      });
    },
  });
  
  // Open the edit dialog for a specific list
  const handleEditList = (list: any) => {
    setSelectedList(list);
    setEditedPassage(list.passage);
    setSelectedWords(list.words.map((w: any) => w.word));
    setIsEditDialogOpen(true);
  };
  
  // Reference to the passage preview element
  const passageRef = useRef<HTMLDivElement | null>(null);
  
  // Effect to format the passage when the dialog opens or when editedPassage changes
  useEffect(() => {
    // Only process when dialog is open and we have content
    if (!isEditDialogOpen || !editedPassage || !passageRef.current) return;
    
    try {
      // Format the passage with highlighted words
      const highlightedPassage = formatPassageWithHighlights(editedPassage, selectedWords);
      
      // Set the HTML content
      passageRef.current.innerHTML = highlightedPassage;
    } catch (error) {
      console.error("Error formatting passage:", error);
    }
  }, [isEditDialogOpen, editedPassage, selectedWords]);
  
  // Separate effect to handle click events in the passage
  useEffect(() => {
    if (!isEditDialogOpen || !passageRef.current) return;
    
    // Function to handle clicking on words
    const handleWordClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Skip if clicking on already selected word (mark)
      if (target.tagName === 'MARK') return;
      
      // Handle clicking on word spans
      if (target.classList.contains('word')) {
        const word = target.textContent?.trim().replace(/[.,;:!?"'()[\]{}]/g, '') || '';
        
        if (word && word.length > 0 && !selectedWords.includes(word)) {
          // Add word to selection
          setSelectedWords(prev => [...prev, word]);
          
          // Visual feedback
          target.style.color = 'var(--primary)';
          target.style.fontWeight = 'bold';
          setTimeout(() => {
            target.style.color = '';
            target.style.fontWeight = '';
          }, 300);
        }
      }
    };
    
    // Function to handle text selection
    const handleTextSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      const selectedText = selection.toString().trim();
      if (selectedText && !selectedWords.includes(selectedText)) {
        setSelectedWords(prev => [...prev, selectedText]);
        selection.removeAllRanges();
      }
    };
    
    // Add event listeners
    passageRef.current.addEventListener('click', handleWordClick as EventListener);
    passageRef.current.addEventListener('mouseup', handleTextSelection);
    
    // Clean up
    return () => {
      if (passageRef.current) {
        passageRef.current.removeEventListener('click', handleWordClick as EventListener);
        passageRef.current.removeEventListener('mouseup', handleTextSelection);
      }
    };
  }, [isEditDialogOpen, selectedWords]);

  // Handle removing a word from the selected list
  const handleRemoveWord = (wordToRemove: string) => {
    setSelectedWords(prevWords => 
      prevWords.filter(word => word !== wordToRemove)
    );
  };

  // Handle text selection via mouse/touch in the passage
  useEffect(() => {
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

    // Handle word click for individual words
    const handleWordClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Handle click on highlighted word (mark)
      if (target.tagName === 'MARK') {
        // Marked words are already selected, so we don't need to add them again
        return;
      }
      
      // Handle click on word span (clickable words)
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
  
  // Save updated passage and words
  const handleSavePassage = () => {
    if (!selectedList) return;
    
    updateListMutation.mutate({
      id: selectedList.id,
      passage: editedPassage,
      words: selectedWords
    });
  };
  
  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Educator Dashboard Statistics</h1>
        <p className="text-muted-foreground mt-2">
          View and manage your overall teaching statistics
        </p>
      </div>
      
      {/* Stats Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalStudents}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Students enrolled in your classes
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <School className="h-5 w-5 text-primary" />
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalClasses}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Active classes you're teaching
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Vocabulary Lists
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stats.totalLists}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Created vocabulary lists
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Vocabulary Lists */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Your Vocabulary Lists</h2>
        </div>
        
        {statsLoading ? (
          <div className="text-center py-8">Loading your vocabulary lists...</div>
        ) : stats.lists.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              You haven't created any vocabulary lists yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.lists.map((list: any) => (
              <Card key={list.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span>{list.title}</span>
                    <div>
                      {list.published ? (
                        <Badge className="bg-green-100 text-green-800">Published</Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription>
                    {list.dueDate ? (
                      <span>Due: {new Date(list.dueDate).toLocaleDateString()}</span>
                    ) : (
                      <span>No due date</span>
                    )}
                    {list.class && (
                      <span className="ml-3">Class: {list.class}</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">Words</h3>
                      <span className="text-sm text-muted-foreground">
                        {list.words.length} words
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {list.words.slice(0, 10).map((word: any) => (
                        <Badge key={word.id} variant="secondary">
                          {word.word}
                        </Badge>
                      ))}
                      {list.words.length > 10 && (
                        <Badge variant="outline">+{list.words.length - 10} more</Badge>
                      )}
                    </div>
                    
                    {/* Passage Preview */}
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Passage</h3>
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {list.passage}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/50 flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleEditList(list)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Passage & Words
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Edit Passage Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Vocabulary Passage</DialogTitle>
            <DialogDescription>
              Edit the passage and select vocabulary words for your list.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                Selected Words <Badge variant="outline">{selectedWords.length}</Badge>
              </h3>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[60px]">
                {selectedWords.map((word, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-destructive/10 transition-colors" 
                    onClick={() => handleRemoveWord(word)}
                  >
                    {word} <span className="ml-1">×</span>
                  </Badge>
                ))}
                {selectedWords.length === 0 && (
                  <span className="text-sm text-muted-foreground w-full text-center py-2">
                    No words selected. Select words from the passage below.
                  </span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Passage Editor</h3>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm text-primary mb-2 flex items-center">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  <strong>How to add words:</strong> Click on words or highlight text in the passage.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  • Click on any word in the preview below to add it<br />
                  • Highlight text to select multiple words at once<br />
                  • To remove: Click on any badge in the selected words area above
                </p>
              </div>
              
              <div className="space-y-4">
                <Textarea
                  value={editedPassage}
                  onChange={(e) => setEditedPassage(e.target.value)}
                  rows={8}
                  className="font-medium"
                  placeholder="Enter or paste your passage here. Then select words to add them to your vocabulary list."
                />
                
                <div className="border rounded-md p-4 bg-white">
                  <h4 className="text-sm font-medium mb-2">Passage Preview (Click words to select them)</h4>
                  <div 
                    ref={passageRef}
                    className="prose prose-sm max-w-none passage-container"
                  >
                    {editedPassage}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePassage}
              disabled={updateListMutation.isPending}
            >
              {updateListMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}