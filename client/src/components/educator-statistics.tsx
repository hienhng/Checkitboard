import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  
  // Preview state for word selection
  const [previewWord, setPreviewWord] = useState<string | null>(null);
  
  // Handle mouse up event in the passage editor to detect word selections
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setPreviewWord(null);
      return;
    }
    
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      setPreviewWord(null);
      return;
    }
    
    // Set the preview word
    setPreviewWord(selectedText);
  };
  
  // Handle actually adding the word when the preview is clicked
  const handleAddWord = () => {
    if (!previewWord) return;
    
    // Add word to the selected words (check for spaces to handle multi-word selections)
    if (previewWord.includes(' ')) {
      // For multi-word selections, split by space and add each word
      const words = previewWord.split(/\s+/)
        .filter(word => word.length > 0)
        // Clean up punctuation from words
        .map(word => word.replace(/[.,!?;:'"()]/g, ''));
      
      setSelectedWords(prevWords => {
        // Create a new set with all previous words plus new ones (to avoid duplicates)
        const uniqueWords = new Set([...prevWords, ...words]);
        return Array.from(uniqueWords);
      });
    } else {
      // For single words, add it (clean up punctuation)
      const cleanWord = previewWord.replace(/[.,!?;:'"()]/g, '');
      setSelectedWords(prevWords => {
        // Don't add if it's already there
        if (prevWords.includes(cleanWord)) return prevWords;
        return [...prevWords, cleanWord];
      });
    }
    
    // Clear the preview and selection
    setPreviewWord(null);
    if (window.getSelection()?.removeAllRanges) {
      window.getSelection()?.removeAllRanges();
    }
  };
  
  // Remove a word from the selected words
  const handleRemoveWord = (wordToRemove: string) => {
    setSelectedWords(prevWords => 
      prevWords.filter(word => word !== wordToRemove)
    );
  };
  
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
                  <strong>How to add words:</strong> Highlight a word or phrase in the passage.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  • Select text in the passage to see a preview<br />
                  • Click the "Add Word" button to add it to your vocabulary list<br />
                  • For multiple words: Select a phrase to add all words at once<br />
                  • To remove: Click on any badge in the selected words area above
                </p>
              </div>
              
              {/* Word Selection Preview Box */}
              {previewWord && (
                <div className="border-2 border-primary rounded-md p-3 bg-primary/5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Add to vocabulary list:</p>
                    <p className="text-lg font-bold text-primary">{previewWord}</p>
                  </div>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={handleAddWord}
                    className="flex items-center gap-1"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add {previewWord.includes(' ') ? 'Words' : 'Word'}
                  </Button>
                </div>
              )}
              
              <Textarea
                value={editedPassage}
                onChange={(e) => setEditedPassage(e.target.value)}
                rows={10}
                onMouseUp={handleMouseUp}
                className="font-medium"
                placeholder="Enter or paste your passage here. Then select words to add them to your vocabulary list."
              />
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