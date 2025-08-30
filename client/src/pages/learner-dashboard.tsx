import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, 
  CheckCircle, 
  Award,
  FileText,
  ChevronRight,
  School,
  Eye,
  Brain,
  Search,
  Users,
  StickyNote,
  BookMarked,
  ArrowRight,
  Plus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { formatDate, formatDueDate, getScoreBgColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Flashcard } from "@/components/flashcard";
import { JoinClass } from "@/components/join-class";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ReactNode } from "react";

// Sticky note color constants
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

// Define interfaces for the data structures
interface VocabularyList {
  id: number;
  title: string;
  passage?: string;
  dueDate?: string | Date;
  words?: { id: number; word: string }[];
  submission?: {
    id: number;
    completed: boolean;
    isDiscarded?: boolean;
    discardReason?: string;
    score?: number;
    gradedAt?: string | Date;
    submittedAt?: string | Date;
  };
  educator?: {
    id: number;
    name: string;
  };
}

interface FlashcardType {
  id: number;
  word: {
    word: string;
  };
  definition: {
    studentDefinition: string;
    correctDefinition?: string;
    showCorrectDefinition?: boolean;
    isCorrect?: boolean;
    submission: {
      list: {
        title: string;
      };
    };
  };
  learned: boolean;
}



function LearnerDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State for the result details dialog

  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch published vocabulary lists
  const { data: vocabularyLists, isLoading: listsLoading } = useQuery<VocabularyList[]>({
    queryKey: ["/api/learner/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch learner's completed and graded submissions


  // Fetch learner's flashcards
  const { data: flashcards, isLoading: flashcardsLoading } = useQuery<FlashcardType[]>({
    queryKey: ["/api/learner/flashcards"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch the student's classes
  const { data: classes = [], isLoading: classesLoading } = useQuery<any[]>({
    queryKey: ["/api/learner/classes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch personalized explore words for glossary preview
  const { data: exploreData } = useQuery<any>({
    queryKey: ["/api/explore/words"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch sticky notes for preview
  const { data: stickyNotes } = useQuery<any[]>({
    queryKey: ["/api/sticky-notes"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Filter functions for search
  const filteredVocabularyLists = vocabularyLists?.filter(list => {
    if (!searchQuery) return true; // Show all results when not searching
    const searchTerm = searchQuery?.toLowerCase() || '';
    const title = list?.title?.toLowerCase() || '';
    const educatorName = list?.educator?.name?.toLowerCase() || '';
    return title.includes(searchTerm) || educatorName.includes(searchTerm);
  }) || [];

  const filteredClasses = classes?.filter(cls => {
    if (!searchQuery) return true; // Show all results when not searching
    const searchTerm = searchQuery?.toLowerCase() || '';
    const name = cls?.class?.name?.toLowerCase() || cls?.name?.toLowerCase() || '';
    const description = cls?.description?.toLowerCase() || '';
    return name.includes(searchTerm) || description.includes(searchTerm);
  }) || [];

  // Start a new vocabulary check-up (navigate to preview page)
  const startCheckUp = (listId: number) => {
    navigate(`/learner/test-preview/${listId}`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-5xl font-bold text-foreground"> 
              Wait a sec, <span className="font-modak bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent transition-all duration-300">checkit</span>
                <span className="text-foreground"> out!</span>
              </h2> 
              <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
                Complete vocabulary check-ups, join classes, and review your flashcards.
              </p>
              
              {/* Search Bar */}
              <div className="ml-2 mt-6 max-w-xl relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search classes and checkup lists..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full"
                  />
                </div>
                
                {/* Search Results Overlay */}
                {searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg border border-border shadow-lg p-4 max-h-64 overflow-y-auto z-50">
                    <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Search className="mr-2 h-4 w-4" />
                      Search Results for "{searchQuery}"
                    </h3>
                    
                    {/* Vocabulary Lists Results */}
                    {filteredVocabularyLists.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                          Vocabulary Lists ({filteredVocabularyLists.length})
                        </h4>
                        <div className="space-y-2">
                          {filteredVocabularyLists.map(list => {
                            const isCompleted = list.submission && list.submission.completed;
                            const isDiscarded = list.submission && list.submission.isDiscarded;
                            const isGraded = isCompleted && list.submission?.gradedAt;
                            
                            return (
                              <div 
                                key={list.id} 
                                className={`flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors ${
                                  isDiscarded ? 'bg-red-50 hover:bg-red-100' :
                                  isGraded ? 'bg-green-50 hover:bg-green-100' :
                                  isCompleted ? 'bg-yellow-50 hover:bg-yellow-100' :
                                  'bg-blue-50 hover:bg-blue-100'
                                }`}
                                onClick={() => startCheckUp(list.id)}
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-900">{list.title}</p>
                                    {isDiscarded && (
                                      <Badge className="bg-red-100 text-red-800 text-xs">
                                        Discarded
                                      </Badge>
                                    )}
                                    {isGraded && !isDiscarded && (
                                      <Badge className="bg-green-100 text-green-800 text-xs">
                                        {list.submission?.score}% - Graded
                                      </Badge>
                                    )}
                                    {isCompleted && !isGraded && !isDiscarded && (
                                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                        Pending
                                      </Badge>
                                    )}
                                    {!isCompleted && (
                                      <Badge className="bg-blue-100 text-blue-800 text-xs">
                                        Not Started
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500">
                                    By: {list.educator?.name} • Due: {formatDueDate(list.dueDate)}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Classes Results */}
                    {filteredClasses.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">
                          My Classes ({filteredClasses.length})
                        </h4>
                        <div className="space-y-2">
                          {filteredClasses.map((cls) => (
                            <div 
                              key={cls.id} 
                              className="p-3 bg-purple-50 rounded-md"
                            >
                              <p className="font-medium text-gray-900 flex items-center">
                                <School className="mr-2 h-4 w-4 text-purple-500" />
                                {cls.name}
                              </p>
                              {cls.description && (
                                <p className="text-sm text-gray-500 mt-1">{cls.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* No Results Message */}
                    {filteredVocabularyLists.length === 0 && 
                     filteredClasses.length === 0 && (
                      <div className="text-center py-6 text-gray-500">
                        <Search className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-sm">No results found for "{searchQuery}"</p>
                        <p className="text-xs text-gray-400 mt-1">Try searching for class names, vocabulary lists, or educator names</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
                  <TabsTrigger value="dashboard" className="flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="classes" className="flex items-center">
                    <School className="mr-2 h-4 w-4" />
                    My Classes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                  <div className="space-y-6">
                    {/* All Vocabulary Lists */}
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-blue-500 p-4 pb-4 text-center text-white">
                        <div className="w-full flex justify-between items-center">
                          <CardTitle className="text-xl">
                             All Vocabulary Lists
                          </CardTitle>
                          {vocabularyLists && vocabularyLists.length > 0 && (
                            <Badge variant="secondary" className="bg-blue text-white-800 font-medium">
                              {filteredVocabularyLists.length} lists
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {listsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading vocabulary lists...</div>
                        ) : filteredVocabularyLists && filteredVocabularyLists.length > 0 ? (
                          <div className="space-y-2">
                            {filteredVocabularyLists.map(list => {
                              const isCompleted = list.submission && list.submission.completed;
                              const isDiscarded = list.submission && list.submission.isDiscarded;
                              const isGraded = isCompleted && list.submission?.gradedAt;
                              
                              return (
                                <div 
                                  key={list.id} 
                                  className={`flex justify-between items-center mt-2 p-4 rounded-lg cursor-pointer transition-colors group ${
                                    isDiscarded ? 'bg-red-50 hover:bg-red-100 border-red-200' :
                                    isGraded ? 'bg-green-50 hover:bg-green-100' :
                                    isCompleted ? 'bg-yellow-50 hover:bg-yellow-100' :
                                    'bg-white hover:bg-blue-100'
                                  }`}
                                  onClick={() => startCheckUp(list.id)}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-neutral-dark">{list.title}</h4>
                                      {isDiscarded && (
                                        <Badge className="bg-red-100 text-red-800 text-xs">
                                          Discarded
                                        </Badge>
                                      )}
                                      {isGraded && !isDiscarded && (
                                        <Badge className="bg-green-100 text-green-800 text-xs">
                                           Graded
                                        </Badge>
                                      )}
                                      {isCompleted && !isGraded && !isDiscarded && (
                                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                                          Pending Grade
                                        </Badge>
                                      )}
                                      
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-sm text-gray-500">Due date: {formatDueDate(list.dueDate)}</p>
                                      {list.educator && (
                                        <p className="text-xs text-gray-400">Created by: {list.educator.name}</p>
                                      )}
                                      {isCompleted && (
                                        <p className="text-xs text-gray-500">
                                          Completed on: {list.submission?.submittedAt ? new Date(list.submission.submittedAt).toLocaleDateString() : 'Unknown Date'}
                                        </p>
                                      )}
                                      
                                    </div>
                                  </div>
                                  <div className="text-gray-400 group-hover:text-primary transition-colors">
                                    <ChevronRight className="h-5 w-5" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No vocabulary lists available.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    
                    {/* My Flashcards */}
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-purple-500 p-4 pb-4 text-center text-white">
                        <div className="w-full flex justify-between items-center">
                          <CardTitle className="text-xl font-bold">
                            My Flashcards
                          </CardTitle>
                          {flashcards && flashcards.length > 0 && (
                            (() => {
                              const cardCount = flashcards.filter(card => !card.learned).length;
                              
                              return cardCount > 0 ? (
                                <Badge variant="secondary" className="bg-white text-purple-800 font-medium">
                                  {cardCount} Cards
                                </Badge>
                              ) : null;
                            })()
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {flashcardsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading flashcards...</div>
                        ) : flashcards && flashcards.length > 0 && flashcards.filter(card => !card.learned).length > 0 ? (
                          <div>
                            {/* Show only first 3 flashcards in dashboard preview - read-only */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                              {flashcards
                                .filter(card => !card.learned)
                                .slice(0, 3) // Limit to 3 cards
                                .map(card => (
                                  <div key={card.id} className="w-full max-w-sm mx-auto">
                                    <div className="w-full h-56 bg-white rounded-lg border shadow-sm overflow-hidden">
                                      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                                        <div className="flex justify-between items-center">
                                          <div className="flex-1">
                                            <div className="mb-1 bg-white text-blue-700 border-blue-200 text-xs px-2 py-1 rounded border inline-block">
                                              Word
                                            </div>
                                            <h3 className="text-xl font-bold text-blue-900 text-center">{card.word.word}</h3>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="p-6 flex flex-col justify-center h-[calc(100%-90px)]">
                                        <div className="text-center">
                                          <div className="text-sm text-gray-500 mb-2">
                                            Click "Study All Cards" to practice
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            From: {card.definition?.submission?.list?.title || 'Unknown List'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                            
                            {/* Show count and button for remaining cards */}
                            <div className="px-4 pb-4">
                              {flashcards.filter(card => !card.learned).length > 3 && (
                                <div className="text-center text-sm text-gray-600 mb-3">
                                  Showing 3 of {flashcards.filter(card => !card.learned).length} flashcards
                                </div>
                              )}
                              <div className="text-center">
                                <Button 
                                  className="inline-flex items-center"
                                  onClick={() => navigate('/learner/flashcards')}
                                >
                                  {flashcards.filter(card => !card.learned).length > 3 
                                    ? `Study All ${flashcards.filter(card => !card.learned).length} Cards`
                                    : 'Open Study Center'
                                  }
                                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No flashcards to review.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Glossary and Sticky Notes Preview - Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Personalized Glossary Preview */}
                      <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 pb-4 text-center text-white">
                          <div className="w-full flex justify-between items-center">
                            <CardTitle className="text-xl flex items-center">
                              <BookMarked className="mr-2 h-5 w-5" />
                              Personalized Glossary
                            </CardTitle>
                            <Badge variant="secondary" className="bg-white/20 text-white">
                              {exploreData?.words?.length || 0} words
                            </Badge>
                          </div>
                          <CardDescription className="text-indigo-100 mt-2">
                            {exploreData?.personalized 
                              ? "Words to review from your tests" 
                              : "Vocabulary from your completed tests"
                            }
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          {exploreData?.words?.length > 0 ? (
                            <div className="space-y-3">
                              {exploreData.words.slice(0, 4).map((word: any, index: number) => (
                                <div key={index} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                                        {word.word}
                                      </h4>
                                      {word.isCorrect === false && (
                                        <Badge variant="destructive" className="text-xs">
                                          Review
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                                      {word.definition}
                                    </p>
                                    {word.listTitle && (
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        From: {word.listTitle}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {exploreData.words.length > 4 && (
                                <div className="text-center pt-2">
                                  <p className="text-sm text-gray-500 mb-3">
                                    Showing 4 of {exploreData.words.length} personalized words
                                  </p>
                                </div>
                              )}
                              
                              <div className="text-center pt-2">
                                <Button 
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => navigate('/explore')}
                                >
                                  <Brain className="mr-2 h-4 w-4" />
                                  Explore All Words
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <BookMarked className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                              <p className="text-sm text-gray-500 mb-3">
                                Complete vocabulary tests to see personalized word suggestions here!
                              </p>
                              <Button 
                                variant="outline"
                                onClick={() => navigate('/explore')}
                              >
                                <Brain className="mr-2 h-4 w-4" />
                                Explore Vocabulary
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Sticky Notes Board Preview */}
                      <Card className="overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 p-4 pb-4 text-center text-white">
                          <div className="w-full flex justify-between items-center">
                            <CardTitle className="text-xl flex items-center">
                              <StickyNote className="mr-2 h-5 w-5" />
                              My Canvas
                            </CardTitle>
                            <Badge variant="secondary" className="bg-white/20 text-white">
                              {stickyNotes?.length || 0} notes
                            </Badge>
                          </div>
                          <CardDescription className="text-yellow-100 mt-2">
                            Your saved vocabulary words for quick review
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          {stickyNotes && stickyNotes.length > 0 ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-hidden">
                                {stickyNotes.slice(0, 6).map((note: any, index: number) => {
                                  const colorClass = note.color && STICKY_NOTE_COLORS[note.color] 
                                    ? STICKY_NOTE_COLORS[note.color]
                                    : (index % 4 === 0 ? 'bg-yellow-200 border-yellow-300 text-yellow-900' :
                                       index % 4 === 1 ? 'bg-pink-200 border-pink-300 text-pink-900' :
                                       index % 4 === 2 ? 'bg-blue-200 border-blue-300 text-blue-900' :
                                       'bg-green-200 border-green-300 text-green-900');
                                  
                                  return (
                                    <div
                                      key={note.id}
                                      className={`p-3 rounded-lg border-2 shadow-sm transform rotate-${index % 2 === 0 ? '1' : '-1'} hover:rotate-0 transition-transform duration-200 cursor-pointer ${colorClass}`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-sm font-semibold truncate">
                                          {note.word}
                                        </div>
                                        <span className="text-lg">{note.emoji || '📝'}</span>
                                      </div>
                                      <div className="text-xs opacity-80 line-clamp-2">
                                        {note.definition}
                                      </div>
                                      {note.isLearned && (
                                        <div className="flex justify-end mt-1">
                                          <CheckCircle className="h-3 w-3 text-green-600" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {stickyNotes && stickyNotes.length > 6 && (
                                <div className="text-center pt-2">
                                  <p className="text-sm text-gray-500 mb-3">
                                    Showing 6 of {stickyNotes.length} sticky notes
                                  </p>
                                </div>
                              )}
                              
                              <div className="text-center pt-6 mt-4">
                                <Button 
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => navigate('/sticky-notes')}
                                >
                                  <StickyNote className="mr-2 h-4 w-4" />
                                  Open Cork Board
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-6">
                              <StickyNote className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                              <p className="text-sm text-gray-500 mb-3">
                                No sticky notes yet. Add vocabulary words to your board for quick review!
                              </p>
                              <Button 
                                variant="outline"
                                onClick={() => navigate('/sticky-notes')}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create First Note
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="classes">
                  <div className="space-y-6">
                    {/* Join Class Section */}
                    <JoinClass />
                    
                    {/* My Classes Section with Search */}
                    {filteredClasses.length > 0 && (
                      <Card>
                        <CardHeader className=" rounded-t-lg bg-purple-500 p-4 pb-4 text-center text-white">
                          <CardTitle className="flex items-center justify-center text-lg font-bold">
                            <School className="mr-2 h-5 w-5" />
                            My Classes
                            <Badge variant="secondary" className="ml-3 bg-purple-600 text-white">
                              {filteredClasses.length} classes
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredClasses.map((cls) => (
                              <Card key={cls.id} className="border hover:shadow-md transition-shadow">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base font-semibold flex items-center">
                                    <School className="mr-2 h-4 w-4 text-purple-500" />
                                    <span>{cls.class?.name || cls.name}</span>
                                  </CardTitle>
                                  {cls.description && (
                                    <CardDescription className="text-sm text-gray-600">
                                      {cls.description}
                                    </CardDescription>
                                  )}
                                </CardHeader>
                                <CardContent className="pt-0">
                                  <div className="flex items-center text-sm text-gray-500">
                                    <Users className="mr-1 h-3 w-3" />
                                    {cls.studentCount || 0} students
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
      </div>
    </div>
  );
}

export default LearnerDashboard;