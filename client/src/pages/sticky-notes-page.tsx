import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  StickyNote, 
  Search, 
  Trash2, 
  Edit3, 
  BookOpen, 
  Filter,
  Plus,
  Brain,
  Target
} from "lucide-react";

interface StickyNote {
  id: number;
  word: string;
  definition: string;
  example?: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  userNotes?: string;
  isLearned: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function StickyNotesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLearnedFilter, setShowLearnedFilter] = useState("all");
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const { toast } = useToast();

  const { data: stickyNotes = [], isLoading } = useQuery<StickyNote[]>({
    queryKey: ["/api/sticky-notes"],
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => apiRequest("DELETE", `/api/sticky-notes/${noteId}`),
    onSuccess: () => {
      toast({
        title: "Note Deleted",
        description: "Sticky note has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete note",
        variant: "destructive",
      });
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, updates }: { noteId: number; updates: Partial<StickyNote> }) =>
      apiRequest("PATCH", `/api/sticky-notes/${noteId}`, updates),
    onSuccess: () => {
      toast({
        title: "Note Updated",
        description: "Your changes have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      setEditingNote(null);
      setUserNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    }
  });

  const markAsLearnedMutation = useMutation({
    mutationFn: ({ noteId, isLearned }: { noteId: number; isLearned: boolean }) =>
      apiRequest("PATCH", `/api/sticky-notes/${noteId}`, { isLearned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update learning status",
        variant: "destructive",
      });
    }
  });

  const filteredNotes = stickyNotes.filter((note) => {
    const matchesSearch = note.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
    const matchesLearned = showLearnedFilter === "all" || 
                          (showLearnedFilter === "learned" && note.isLearned) ||
                          (showLearnedFilter === "learning" && !note.isLearned);
    return matchesSearch && matchesCategory && matchesLearned;
  });

  const categories = ["all", ...Array.from(new Set(stickyNotes.map((n) => n.category)))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleEditNote = (note: StickyNote) => {
    setEditingNote(note);
    setUserNotes(note.userNotes || "");
  };

  const handleSaveNotes = () => {
    if (editingNote) {
      updateNoteMutation.mutate({
        noteId: editingNote.id,
        updates: { userNotes }
      });
    }
  };

  const learnedCount = stickyNotes.filter((n) => n.isLearned).length;
  const totalCount = stickyNotes.length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <StickyNote className="h-8 w-8 text-yellow-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">My Sticky Notes</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
          Review and manage your saved vocabulary words
        </p>
        
        {/* Progress Stats */}
        <div className="flex gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Total: {totalCount} words
              </span>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Learned: {learnedCount} words
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search your sticky notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === "all" ? "All Categories" : category}
            </option>
          ))}
        </select>
        
        <select
          value={showLearnedFilter}
          onChange={(e) => setShowLearnedFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          <option value="all">All Notes</option>
          <option value="learning">Still Learning</option>
          <option value="learned">Learned</option>
        </select>
      </div>

      {/* Sticky Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map((note) => (
          <Card key={note.id} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${
            note.isLearned ? 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10' : 'border-l-yellow-500'
          }`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className={`text-xl font-bold ${
                  note.isLearned ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {note.word}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge className={getDifficultyColor(note.difficulty)}>
                    {note.difficulty}
                  </Badge>
                  {note.isLearned && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Learned
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="w-fit">
                {note.category}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Definition:</h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {note.definition}
                </p>
              </div>
              
              {note.example && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Example:</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm italic leading-relaxed">
                    "{note.example}"
                  </p>
                </div>
              )}
              
              {note.userNotes && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">My Notes:</h4>
                  <p className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                    {note.userNotes}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditNote(note)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Personal Notes</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Word: {editingNote?.word}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {editingNote?.definition}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Your Notes:</label>
                        <Textarea
                          value={userNotes}
                          onChange={(e) => setUserNotes(e.target.value)}
                          placeholder="Add your own thoughts, memory aids, or additional examples..."
                          rows={4}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handleSaveNotes} disabled={updateNoteMutation.isPending}>
                          {updateNoteMutation.isPending ? "Saving..." : "Save Notes"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Button
                  variant={note.isLearned ? "secondary" : "default"}
                  size="sm"
                  onClick={() => markAsLearnedMutation.mutate({
                    noteId: note.id,
                    isLearned: !note.isLearned
                  })}
                  disabled={markAsLearnedMutation.isPending}
                >
                  {note.isLearned ? "Mark as Learning" : "Mark as Learned"}
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteNoteMutation.mutate(note.id)}
                  disabled={deleteNoteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12">
          <StickyNote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {stickyNotes.length === 0 ? "No sticky notes yet" : "No notes match your filters"}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {stickyNotes.length === 0 
              ? "Start exploring vocabulary to add words to your sticky notes"
              : "Try adjusting your search or filter settings"
            }
          </p>
          {stickyNotes.length === 0 && (
            <Button asChild>
              <a href="/explore">
                <Plus className="h-4 w-4 mr-2" />
                Explore Vocabulary
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}