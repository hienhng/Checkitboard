import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, Trash2, CheckCircle, Circle, StickyNote as StickyNoteIcon, BookOpen, Filter, Move, GripVertical } from "lucide-react";
import { StickyNote } from "@shared/schema";
import { cn } from "@/lib/utils";



interface StickyNoteWithPosition extends StickyNote {
  x?: number;
  y?: number;
}

interface DragState {
  isDragging: boolean;
  noteId: number | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const STICKY_NOTE_COLORS = {
  yellow: 'bg-yellow-200 border-yellow-300 text-yellow-900',
  pink: 'bg-pink-200 border-pink-300 text-pink-900', 
  blue: 'bg-blue-200 border-blue-300 text-blue-900',
  green: 'bg-green-200 border-green-300 text-green-900',
  purple: 'bg-purple-200 border-purple-300 text-purple-900',
  orange: 'bg-orange-200 border-orange-300 text-orange-900',
  red: 'bg-red-200 border-red-300 text-red-900',
  indigo: 'bg-indigo-200 border-indigo-300 text-indigo-900'
};

const EMOJI_OPTIONS = [
  '📝', '📚', '💡', '⭐', '🎯', '📖', '✨', '🧠', 
  '🔥', '💪', '🚀', '👍', '📌', '🔖', '💫', '🌟',
  '📋', '📓', '🖊️', '✏️', '🖇️', '📎', '🗂️', '🎓'
];

// Generate organized grid position for first-time layout
const getOrganizedPosition = (boardWidth: number, boardHeight: number, index: number) => {
  const padding = 20;
  const noteWidth = 192; // w-48 = 12rem = 192px
  const noteHeight = 160; // including spacing
  const spacing = 20;
  
  // Calculate how many notes can fit per row
  const notesPerRow = Math.floor((boardWidth - padding * 2) / (noteWidth + spacing));
  const row = Math.floor(index / notesPerRow);
  const col = index % notesPerRow;
  
  // Calculate position with some slight randomization for natural look
  const baseX = padding + col * (noteWidth + spacing);
  const baseY = padding + row * (noteHeight + spacing);
  
  // Add small random offset for organic feeling (±10px)
  const randomOffsetX = (Math.random() - 0.5) * 20;
  const randomOffsetY = (Math.random() - 0.5) * 20;
  
  return {
    x: Math.max(padding, Math.min(boardWidth - noteWidth - padding, baseX + randomOffsetX)),
    y: Math.max(padding, Math.min(boardHeight - noteHeight - padding, baseY + randomOffsetY))
  };
};

export default function StickyNotesBoard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLearnedFilter, setShowLearnedFilter] = useState<"all" | "learned" | "learning">("all");
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📝");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    noteId: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  // Load positions from sessionStorage on component mount
  const [notePositions, setNotePositions] = useState<Record<number, { x: number; y: number }>>(() => {
    const saved = sessionStorage.getItem('stickyNotePositions');
    return saved ? JSON.parse(saved) : {};
  });
  const boardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Notes maintain positions during session but reset on page refresh

  const { data: stickyNotes = [], isLoading } = useQuery<StickyNote[]>({
    queryKey: ["/api/sticky-notes"],
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: number) => apiRequest("DELETE", `/api/sticky-notes/${noteId}`),
    onSuccess: () => {
      toast({
        title: "Note Deleted",
        description: "Your sticky note has been removed.",
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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update note",
        variant: "destructive",
      });
    }
  });

  // Removed position update mutation - notes are not persisted

  const markAsLearnedMutation = useMutation({
    mutationFn: ({ noteId, isLearned }: { noteId: number; isLearned: boolean }) =>
      apiRequest("PATCH", `/api/sticky-notes/${noteId}`, { isLearned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
    }
  });

  // Initialize positions using organized grid layout - session persistence only
  useEffect(() => {
    if (stickyNotes.length > 0 && boardRef.current) {
      const boardRect = boardRef.current.getBoundingClientRect();
      const newPositions: Record<number, { x: number; y: number }> = {};
      
      stickyNotes.forEach((note: any, index) => {
        if (!notePositions[note.id]) {
          // Use organized grid layout for notes that don't have session positions yet
          const position = getOrganizedPosition(boardRect.width, boardRect.height, index);
          newPositions[note.id] = position;
        }
      });
      
      if (Object.keys(newPositions).length > 0) {
        const updatedPositions = { ...notePositions, ...newPositions };
        setNotePositions(updatedPositions);
        
        // Save initial positions to sessionStorage
        sessionStorage.setItem('stickyNotePositions', JSON.stringify(updatedPositions));
      }
    }
  }, [stickyNotes]);

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

  const handleMouseDown = (e: React.MouseEvent, noteId: number) => {
    // Don't start drag if clicking on interactive elements
    if (e.target instanceof HTMLElement && (
      e.target.closest('button') || 
      e.target.closest('[role="dialog"]') ||
      e.target.closest('[data-radix-popper-content-wrapper]') ||
      e.target.closest('select') ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('[data-radix-dialog-content]')
    )) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentPosition = notePositions[noteId] || { x: 0, y: 0 };

    setDragState({
      isDragging: true,
      noteId,
      startX: e.clientX - rect.left - currentPosition.x,
      startY: e.clientY - rect.top - currentPosition.y,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !boardRef.current || !dragState.noteId) return;

      e.preventDefault();
      
      const rect = boardRef.current.getBoundingClientRect();
      
      // Calculate new position based on mouse position minus offset
      const newX = Math.max(10, Math.min(rect.width - 210, e.clientX - rect.left - dragState.startX));
      const newY = Math.max(10, Math.min(rect.height - 170, e.clientY - rect.top - dragState.startY));

      const newPositions = {
        ...notePositions,
        [dragState.noteId!]: { x: newX, y: newY }
      };
      setNotePositions(newPositions);
      
      // Save to sessionStorage for persistence across page navigations
      sessionStorage.setItem('stickyNotePositions', JSON.stringify(newPositions));

      // Positions maintained in session state only - no database persistence

      setDragState(prev => ({
        ...prev,
        currentX: e.clientX - rect.left,
        currentY: e.clientY - rect.top
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      
      // Clean up drag state - positions remain in session memory
      setDragState({
        isDragging: false,
        noteId: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState]);

  const handleUpdateNote = (updates: Partial<StickyNote>) => {
    if (!editingNote) return;
    
    updateNoteMutation.mutate({
      noteId: editingNote.id,
      updates
    });
  };

  const learnedCount = stickyNotes.filter((n) => n.isLearned).length;
  const totalCount = stickyNotes.length;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <StickyNoteIcon className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-gray-600 dark:text-gray-400">Loading your sticky notes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <StickyNoteIcon className="h-8 w-8 text-yellow-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Sticky Notes</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {totalCount} total • {learnedCount} learned • {totalCount - learnedCount} learning
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-wrap gap-4">
            <div className="relative min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search words or definitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === "all" ? "All Categories" : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={showLearnedFilter} onValueChange={(value: "all" | "learned" | "learning") => setShowLearnedFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="learned">Learned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Sticky Notes Board */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={boardRef}
          className="absolute inset-0 bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-orange-50/50 dark:from-gray-800/50 dark:via-gray-700/30 dark:to-gray-600/50 overflow-hidden"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.3) 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 30px 30px'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Cork Board Pattern */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(139, 69, 19, 0.1) 1px, transparent 1px),
                linear-gradient(0deg, rgba(139, 69, 19, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }} />
          </div>

          {filteredNotes.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <StickyNoteIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No Sticky Notes Found</h3>
                <p className="text-gray-500 dark:text-gray-500">
                  {stickyNotes.length === 0 
                    ? "Visit the Explore page to discover and add new vocabulary words!"
                    : "Try adjusting your search or filters to find your notes."
                  }
                </p>
              </div>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const position = notePositions[note.id] || { x: 0, y: 0 };
              const colorClass = note.color && STICKY_NOTE_COLORS[note.color as keyof typeof STICKY_NOTE_COLORS] 
                ? STICKY_NOTE_COLORS[note.color as keyof typeof STICKY_NOTE_COLORS]
                : STICKY_NOTE_COLORS[Object.keys(STICKY_NOTE_COLORS)[index % Object.keys(STICKY_NOTE_COLORS).length] as keyof typeof STICKY_NOTE_COLORS];
              const isDragging = dragState.isDragging && dragState.noteId === note.id;
              
              return (
                <div
                  key={note.id}
                  className={cn(
                    "absolute w-48 min-h-36 p-4 rounded-lg border-2 shadow-lg transform transition-all duration-200 select-none",
                    colorClass,
                    isDragging ? "scale-110 shadow-2xl cursor-grabbing" : "cursor-grab hover:shadow-xl hover:scale-105",
                    note.isLearned && "opacity-75"
                  )}
                  style={{
                    left: position.x,
                    top: position.y,
                    transform: isDragging 
                      ? `scale(1.1) rotate(${Math.sin(index) * 3}deg)`
                      : `rotate(${Math.sin(index) * 2}deg)`,
                    zIndex: isDragging ? 1000 : note.isLearned ? 1 : 10,
                    pointerEvents: 'auto'
                  }}
                  onMouseDown={(e) => handleMouseDown(e, note.id)}
                >
                  {/* Pin */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full shadow-md border-2 border-red-600"></div>
                  
                  {/* Drag Handle */}
                  <div className="absolute top-1 right-6">
                    <GripVertical className="h-3 w-3 text-gray-600 opacity-50" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{note.emoji || '📝'}</span>
                        <h3 className="font-bold text-lg truncate">{note.word}</h3>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsLearnedMutation.mutate({
                            noteId: note.id,
                            isLearned: !note.isLearned
                          });
                        }}
                        className="p-1 h-6 w-6"
                      >
                        {note.isLearned ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Circle className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <p className="text-sm leading-relaxed line-clamp-3">{note.definition}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <span className="text-xs text-blue-600 font-medium">AI-generated</span>
                    </div>
                    
                    {note.example && (
                      <p className="text-xs italic opacity-75 line-clamp-2">"{note.example}"</p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex gap-1">
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          {note.category}
                        </Badge>
                        <Badge className={cn("text-xs px-1.5 py-0.5", getDifficultyColor(note.difficulty))}>
                          {note.difficulty}
                        </Badge>
                      </div>
                      
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNote(note);
                                setUserNotes(note.userNotes || "");
                                setSelectedEmoji(note.emoji || "📝");
                                setSelectedColor((note.color as keyof typeof STICKY_NOTE_COLORS) || "yellow");
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent 
                            className="sm:max-w-lg"
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseMove={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                          >
                            <DialogHeader>
                              <DialogTitle>Customize "{note.word}"</DialogTitle>
                              <DialogDescription>
                                Personalize your sticky note with emojis, colors, and notes.
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              {/* Emoji Picker */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">Choose an Emoji</label>
                                <div className="grid grid-cols-8 gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800 max-h-32 overflow-y-auto">
                                  {EMOJI_OPTIONS.map((emoji, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      className={`text-2xl p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                                        selectedEmoji === emoji ? 'bg-blue-100 dark:bg-blue-900' : ''
                                      }`}
                                      onClick={() => setSelectedEmoji(emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Color Picker */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">Choose a Color</label>
                                <div className="grid grid-cols-4 gap-2">
                                  {Object.entries(STICKY_NOTE_COLORS).map(([colorName, colorClass]) => (
                                    <button
                                      key={colorName}
                                      type="button"
                                      className={`p-3 rounded-lg border-2 transition-all duration-200 ${colorClass} ${
                                        selectedColor === colorName 
                                          ? 'ring-2 ring-blue-500 ring-offset-2' 
                                          : 'hover:scale-105'
                                      }`}
                                      onClick={() => setSelectedColor(colorName)}
                                    >
                                      <div className="text-xs font-medium capitalize">{colorName}</div>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Personal Notes */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">Personal Notes</label>
                                <Textarea
                                  value={userNotes}
                                  onChange={(e) => setUserNotes(e.target.value)}
                                  placeholder="Add your personal notes here..."
                                  className="min-h-20"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onFocus={(e) => e.stopPropagation()}
                                />
                              </div>

                              {/* Preview */}
                              <div>
                                <label className="text-sm font-medium mb-2 block">Preview</label>
                                <div className={`p-3 rounded-lg border-2 ${STICKY_NOTE_COLORS[selectedColor as keyof typeof STICKY_NOTE_COLORS]} max-w-48`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xl">{selectedEmoji}</span>
                                    <div className="font-bold text-sm truncate">{note.word}</div>
                                  </div>
                                  <div className="text-xs opacity-80 line-clamp-2">{note.definition}</div>
                                </div>
                              </div>
                            </div>
                            
                            <DialogFooter>
                              <Button 
                                onClick={() => handleUpdateNote({ 
                                  userNotes, 
                                  emoji: selectedEmoji, 
                                  color: selectedColor 
                                })}
                                disabled={updateNoteMutation.isPending}
                              >
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNoteMutation.mutate(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    {note.userNotes && (
                      <div className="pt-2 border-t border-gray-300/50">
                        <p className="text-xs text-gray-700 line-clamp-2">{note.userNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}