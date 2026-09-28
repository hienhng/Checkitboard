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
import { 
  Search, Edit, Trash2, CheckCircle, Circle, StickyNote as StickyNoteIcon, 
  GripVertical, LayoutGrid, Plus, Sparkles, Wand2,
  ZoomIn, ZoomOut, Maximize2
} from "lucide-react";
import { StickyNote } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DragState {
  type: 'drag' | 'resize';
  noteId: number;
  pointerId: number;
  startX: number;
  startY: number;
  startLayout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scale: number;
  resizeHandle: 'se' | 'sw' | 'ne' | 'nw' | null;
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

const MIN_NOTE_SIZE = { width: 150, height: 120 };
const DEFAULT_NOTE_SIZE = { width: 200, height: 160 };
const MAX_NOTE_SIZE = { width: 400, height: 400 };
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function StickyNotesBoard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showLearnedFilter, setShowLearnedFilter] = useState<"all" | "learned" | "learning">("all");
  const [editingNote, setEditingNote] = useState<StickyNote | null>(null);
  const [userNotes, setUserNotes] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState("📝");
  const [selectedColor, setSelectedColor] = useState("yellow");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [customWord, setCustomWord] = useState("");
  const [customDefinition, setCustomDefinition] = useState("");
  const [isGeneratingDefinition, setIsGeneratingDefinition] = useState(false);
  const [createEmoji, setCreateEmoji] = useState("📝");
  const [createColor, setCreateColor] = useState("yellow");
  const [zoom, setZoom] = useState(1);
  const [activeDrag, setActiveDrag] = useState<{ noteId: number; type: DragState["type"] } | null>(null);
  const [noteLayout, setNoteLayout] = useState<Record<number, { x: number; y: number; width: number; height: number }>>(() => {
    try {
      const saved = localStorage.getItem('stickyNoteLayout');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const { toast } = useToast();

  // Save layout to localStorage
  useEffect(() => {
    if (Object.keys(noteLayout).length > 0) {
      localStorage.setItem('stickyNoteLayout', JSON.stringify(noteLayout));
    }
  }, [noteLayout]);

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
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, updates }: { noteId: number; updates: Partial<StickyNote> }) =>
      apiRequest("PATCH", `/api/sticky-notes/${noteId}`, updates),
    onSuccess: () => {
      toast({
        title: "Note Updated",
        description: "Your sticky note has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      setEditingNote(null);
    },
  });

  const toggleLearnedMutation = useMutation({
    mutationFn: ({ noteId, isLearned }: { noteId: number; isLearned: boolean }) =>
      apiRequest("PATCH", `/api/sticky-notes/${noteId}`, { isLearned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
    },
  });

  const createCustomNoteMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/sticky-notes", data),
    onSuccess: () => {
      toast({
        title: "Note Created",
        description: "Your custom vocabulary note has been added!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
      setShowCreateDialog(false);
      setCustomWord("");
      setCustomDefinition("");
      setCreateEmoji("📝");
      setCreateColor("yellow");
    },
    onError: (error: any) => {
      toast({
        title: "Could not create note",
        description: error.message || "Please check the word and definition, then try again.",
        variant: "destructive",
      });
    },
  });

  const generateDefinitionMutation = useMutation({
    mutationFn: (word: string) => apiRequest("POST", "/api/ai/generate-definition", { word }),
    onSuccess: (data: any) => {
      if (data.definition) {
        setCustomDefinition(data.definition);
      }
      setIsGeneratingDefinition(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate definition. Please try again.",
        variant: "destructive",
      });
      setIsGeneratingDefinition(false);
    },
  });

  // Initialize note positions for new notes
  useEffect(() => {
    if (!stickyNotes.length || !boardRef.current) return;
    
    const newLayout = { ...noteLayout };
    let hasChanges = false;
    
    stickyNotes.forEach((note, index) => {
      if (!newLayout[note.id]) {
        const col = index % 4;
        const row = Math.floor(index / 4);
        newLayout[note.id] = {
          x: 50 + col * 250,
          y: 50 + row * 220,
          width: DEFAULT_NOTE_SIZE.width,
          height: DEFAULT_NOTE_SIZE.height
        };
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setNoteLayout(newLayout);
    }
  }, [stickyNotes.length]);

  const handlePointerDown = (
    e: React.PointerEvent,
    noteId: number,
    type: DragState["type"],
    handle?: DragState["resizeHandle"]
  ) => {
    if (e.button !== 0) return;

    if (e.target instanceof Element && (
      e.target.closest('button') ||
      e.target.closest('[role="dialog"]') ||
      e.target.closest('select') ||
      e.target.closest('input') ||
      e.target.closest('textarea')
    )) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    const layout = noteLayout[noteId] || { ...DEFAULT_NOTE_SIZE, x: 0, y: 0 };

    dragRef.current = {
      type,
      noteId,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startLayout: layout,
      scale: zoom,
      resizeHandle: handle || null
    };
    setActiveDrag({ noteId, type });
    document.body.style.cursor = type === 'drag' ? 'grabbing' : (
      handle === 'se' || handle === 'nw' ? 'nwse-resize' : 'nesw-resize'
    );
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || e.pointerId !== drag.pointerId) return;
      e.preventDefault();
      const deltaX = (e.clientX - drag.startX) / drag.scale;
      const deltaY = (e.clientY - drag.startY) / drag.scale;

      setNoteLayout(prev => {
        const layout = prev[drag.noteId] || drag.startLayout;
        if (drag.type === 'drag') {
          return {
            ...prev,
            [drag.noteId]: {
              ...layout,
              x: Math.max(0, drag.startLayout.x + deltaX),
              y: Math.max(0, drag.startLayout.y + deltaY)
            }
          };
        }

        const handle = drag.resizeHandle;
        if (!handle) return prev;

        const width = handle.includes('e')
          ? clamp(drag.startLayout.width + deltaX, MIN_NOTE_SIZE.width, MAX_NOTE_SIZE.width)
          : handle.includes('w')
            ? clamp(drag.startLayout.width - deltaX, MIN_NOTE_SIZE.width, MAX_NOTE_SIZE.width)
            : drag.startLayout.width;
        const height = handle.includes('s')
          ? clamp(drag.startLayout.height + deltaY, MIN_NOTE_SIZE.height, MAX_NOTE_SIZE.height)
          : handle.includes('n')
            ? clamp(drag.startLayout.height - deltaY, MIN_NOTE_SIZE.height, MAX_NOTE_SIZE.height)
            : drag.startLayout.height;

        return {
          ...prev,
          [drag.noteId]: {
            x: handle.includes('w') ? drag.startLayout.x + drag.startLayout.width - width : drag.startLayout.x,
            y: handle.includes('n') ? drag.startLayout.y + drag.startLayout.height - height : drag.startLayout.y,
            width,
            height
          }
        };
      });
    };

    const handlePointerEnd = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setActiveDrag(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    window.addEventListener('blur', handlePointerEnd);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', handlePointerEnd);
    };
  }, []);

  const filteredNotes = (stickyNotes || []).filter((note) => {
    if (!note || !note.word || !note.definition) return false;
    
    const matchesSearch = note.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || note.category === selectedCategory;
    const matchesLearned = showLearnedFilter === "all" || 
                          (showLearnedFilter === "learned" && note.isLearned) ||
                          (showLearnedFilter === "learning" && !note.isLearned);
    return matchesSearch && matchesCategory && matchesLearned;
  });

  const categories = ["all", ...Array.from(new Set((stickyNotes || []).map((n) => n?.category).filter(Boolean)))];
  const learnedCount = (stickyNotes || []).filter((n) => n?.isLearned).length;
  const totalCount = (stickyNotes || []).length;

  const handleAutoArrange = () => {
    const newLayout: typeof noteLayout = {};
    
    filteredNotes.forEach((note, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      newLayout[note.id] = {
        x: 50 + col * 250,
        y: 50 + row * 220,
        width: DEFAULT_NOTE_SIZE.width,
        height: DEFAULT_NOTE_SIZE.height
      };
    });
    
    setNoteLayout(newLayout);
    toast({
      title: "Notes Arranged",
      description: "All sticky notes have been auto-arranged.",
    });
  };

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
    <div className="flex min-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-blue-50/70 to-indigo-100/80 shadow-sm dark:border-slate-700/80 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/50">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200/80 bg-white/75 p-5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-950/65 lg:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-orange-500/20">
                <StickyNoteIcon className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">My Canvas</h1>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300">
                    Study space
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Arrange your vocabulary notes and build connections.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900/70">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{totalCount}</span>
                <span className="ml-1 text-slate-500 dark:text-slate-400">notes</span>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{learnedCount}</span>
                <span className="ml-1 text-emerald-700/70 dark:text-emerald-300/70">learned</span>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-900/70">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  disabled={zoom <= 0.5}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  disabled={zoom >= 2}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setZoom(1)}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700/80 dark:bg-slate-900/60 md:flex-row md:flex-wrap md:items-center">
            <div className="relative min-w-64 flex-1 md:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search words or definitions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 border-slate-200 bg-white pl-10 shadow-none dark:border-slate-700 dark:bg-slate-950"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 w-full border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 md:w-44">
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
              <SelectTrigger className="h-10 w-full border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950 md:w-36">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="learned">Learned</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="h-10 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" onClick={handleAutoArrange}>
              <LayoutGrid className="h-4 w-4 mr-2" />
              Auto Arrange
            </Button>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button variant="default" className="h-10 bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom Note
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Custom Vocabulary Note</DialogTitle>
                  <DialogDescription>
                    Add your own vocabulary word and definition.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Word</label>
                    <Input
                      placeholder="Enter your vocabulary word..."
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Definition</label>
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Enter the definition or generate one with AI..."
                        value={customDefinition}
                        onChange={(e) => setCustomDefinition(e.target.value)}
                        rows={3}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (customWord?.trim()) {
                            setIsGeneratingDefinition(true);
                            generateDefinitionMutation.mutate(customWord.trim());
                          }
                        }}
                        disabled={!customWord?.trim() || isGeneratingDefinition}
                        className="w-full"
                      >
                        {isGeneratingDefinition ? (
                          <>
                            <Wand2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Color</label>
                      <Select value={createColor} onValueChange={setCreateColor}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.keys(STICKY_NOTE_COLORS).map(color => (
                            <SelectItem key={color} value={color}>
                              {color.charAt(0).toUpperCase() + color.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Emoji</label>
                      <Select value={createEmoji} onValueChange={setCreateEmoji}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EMOJI_OPTIONS.map(emoji => (
                            <SelectItem key={emoji} value={emoji}>{emoji}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (customWord && customDefinition) {
                        createCustomNoteMutation.mutate({
                          word: customWord,
                          definition: customDefinition,
                          category: "General",
                          difficulty: "medium",
                          emoji: createEmoji,
                          color: createColor,
                          isCustom: true,
                        });
                      }
                    }}
                    disabled={!customWord || !customDefinition}
                  >
                    Create Note
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div 
          ref={boardRef}
          className="relative min-h-full bg-gradient-to-br from-amber-50/60 via-yellow-50/30 to-orange-50/50 dark:from-slate-900/80 dark:via-slate-800/70 dark:to-indigo-950/40"
          style={{
            minWidth: zoom > 1 ? `${zoom * 100}%` : '100%',
            minHeight: `${Math.max(720, Math.ceil(filteredNotes.length / 4) * 220 + 300)}px`,
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.38) 2px, transparent 2px),
              radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px, 30px 30px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            transition: 'transform 180ms ease-out'
          }}
        >
          {filteredNotes.length === 0 ? (
            <div className="flex items-center justify-center px-6 py-20">
              <div className="max-w-md rounded-3xl border border-dashed border-slate-300 bg-white/70 p-10 text-center shadow-sm backdrop-blur-sm dark:border-slate-600 dark:bg-slate-900/60">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
                  <StickyNoteIcon className="h-8 w-8" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-100">Your canvas is ready</h3>
                <p className="mb-6 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {stickyNotes.length === 0 
                    ? "Add a vocabulary note to start building your personal study space."
                    : "Try adjusting your search or filters to find your notes."
                  }
                </p>
                {stickyNotes.length === 0 && (
                  <Button className="bg-indigo-600 text-white hover:bg-indigo-700" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first note
                  </Button>
                )}
              </div>
            </div>
          ) : (
            filteredNotes.map((note, index) => {
              const layout = noteLayout[note.id] || { ...DEFAULT_NOTE_SIZE, x: 0, y: 0 };
              const colorClass = note.color && STICKY_NOTE_COLORS[note.color as keyof typeof STICKY_NOTE_COLORS] 
                ? STICKY_NOTE_COLORS[note.color as keyof typeof STICKY_NOTE_COLORS]
                : STICKY_NOTE_COLORS[Object.keys(STICKY_NOTE_COLORS)[index % Object.keys(STICKY_NOTE_COLORS).length] as keyof typeof STICKY_NOTE_COLORS];
              const isDragging = activeDrag?.type === 'drag' && activeDrag.noteId === note.id;
              const isResizing = activeDrag?.type === 'resize' && activeDrag.noteId === note.id;
              
              return (
                <div
                  key={note.id}
                  className={cn(
                    "absolute select-none rounded-2xl border-2 shadow-lg transition-shadow duration-150 will-change-[left,top,width,height] touch-none",
                    colorClass,
                    (isDragging || isResizing) && "z-50 shadow-2xl ring-2 ring-indigo-500/80",
                    !note.isLearned && "shadow-xl"
                  )}
                  style={{
                    left: `${layout.x}px`,
                    top: `${layout.y}px`,
                    width: `${layout.width}px`,
                    height: `${layout.height}px`,
                    cursor: isDragging ? 'grabbing' : 'grab',
                     zIndex: (isDragging || isResizing) ? 1000 : 1
                  }}
                   onPointerDown={(e) => handlePointerDown(e, note.id, 'drag')}
                >
                  {/* Pin */}
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full shadow-md border-2 border-red-600"></div>
                  
                  {/* Drag Handle */}
                  <div className="drag-handle pointer-events-none absolute right-7 top-2">
                    <GripVertical className="h-4 w-4 text-current opacity-35" />
                  </div>

                  <div className="h-full p-3 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xl shrink-0">{note.emoji || '📝'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm truncate">{note.word}</div>
                          {note.category && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {note.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLearnedMutation.mutate({ 
                              noteId: note.id, 
                              isLearned: !note.isLearned 
                            });
                          }}
                        >
                          {note.isLearned ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Circle className="h-3 w-3" />
                          )}
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNote(note);
                                setUserNotes(note.userNotes || "");
                                setSelectedEmoji(note.emoji || "📝");
                                setSelectedColor(note.color || "yellow");
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent onClick={(e) => e.stopPropagation()}>
                            <DialogHeader>
                              <DialogTitle>Edit Note</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">Personal Notes</label>
                                <Textarea
                                  value={userNotes}
                                  onChange={(e) => setUserNotes(e.target.value)}
                                  rows={4}
                                  placeholder="Add your personal notes here..."
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Color</label>
                                  <Select value={selectedColor} onValueChange={setSelectedColor}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.keys(STICKY_NOTE_COLORS).map(color => (
                                        <SelectItem key={color} value={color}>
                                          {color.charAt(0).toUpperCase() + color.slice(1)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium mb-2 block">Emoji</label>
                                  <Select value={selectedEmoji} onValueChange={setSelectedEmoji}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {EMOJI_OPTIONS.map(emoji => (
                                        <SelectItem key={emoji} value={emoji}>{emoji}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => {
                                  if (editingNote) {
                                    updateNoteMutation.mutate({
                                      noteId: editingNote.id,
                                      updates: {
                                        userNotes,
                                        emoji: selectedEmoji,
                                        color: selectedColor as any
                                      }
                                    });
                                  }
                                }}
                              >
                                Save Changes
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this sticky note?')) {
                              deleteNoteMutation.mutate(note.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Definition */}
                    <div className="flex-1 overflow-auto text-xs leading-relaxed">
                      {note.definition}
                      {note.userNotes && (
                        <div className="mt-2 pt-2 border-t border-current/20">
                          <em>{note.userNotes}</em>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resize Handles */}
                  <div
                    className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize"
                    onPointerDown={(e) => handlePointerDown(e, note.id, 'resize', 'se')}
                    style={{ cursor: 'nwse-resize' }}
                  >
                    <Maximize2 className="h-3 w-3 text-gray-600 opacity-50" />
                  </div>
                  <div
                    className="absolute bottom-0 left-0 h-5 w-5 cursor-nesw-resize"
                    onPointerDown={(e) => handlePointerDown(e, note.id, 'resize', 'sw')}
                    style={{ cursor: 'nesw-resize' }}
                  />
                  <div
                    className="absolute right-0 top-0 h-5 w-5 cursor-nesw-resize"
                    onPointerDown={(e) => handlePointerDown(e, note.id, 'resize', 'ne')}
                    style={{ cursor: 'nesw-resize' }}
                  />
                  <div
                    className="absolute left-0 top-0 h-5 w-5 cursor-nwse-resize"
                    onPointerDown={(e) => handlePointerDown(e, note.id, 'resize', 'nw')}
                    style={{ cursor: 'nwse-resize' }}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
