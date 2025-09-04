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
  
  const [showJoinClass, setShowJoinClass] = useState(false);

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

  // Fetch study stats
  const { data: studyStats } = useQuery<any>({
    queryKey: ["/api/learner/study-stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });



  // Start a new vocabulary check-up (navigate to preview page)
  const startCheckUp = (listId: number) => {
    navigate(`/learner/test-preview/${listId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent"></div>
        <div className="relative px-6 py-12">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4">
              <h1 className="text-6xl font-bold text-foreground">
                Welcome to{" "}
                <span className="font-brand font-light bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent tracking-wide">
                  lexible
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Master vocabulary through interactive learning, track your progress, and achieve your language goals.
              </p>
              

            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 -mt-8 relative z-10">
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-2 h-12 p-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center justify-center rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="classes" 
                className="flex items-center justify-center rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
              >
                <School className="mr-2 h-4 w-4" />
                My Classes
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Modern Grid Layout */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              
              {/* Vocabulary Lists Card */}
              <Card className="md:col-span-2 lg:col-span-2 bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-6">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold">
                      <BookOpen className="inline mr-3 h-6 w-6" />
                      Vocabulary Lists
                    </CardTitle>
                    {vocabularyLists && vocabularyLists.length > 0 && (
                      <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                        {vocabularyLists.length} lists
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-blue-100 text-base mt-2">
                    Complete vocabulary check-ups and track your progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {listsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-muted-foreground">Loading your vocabulary lists...</span>
                    </div>
                  ) : vocabularyLists && vocabularyLists.length > 0 ? (
                    <div className="space-y-4">
                      {vocabularyLists.map(list => {
                        const isCompleted = list.submission && list.submission.completed;
                        const isDiscarded = list.submission && list.submission.isDiscarded;
                        const isGraded = isCompleted && list.submission?.gradedAt;
                        
                        return (
                          <div 
                            key={list.id} 
                            className={`group p-6 rounded-xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                              isDiscarded ? 'bg-red-50 border border-red-200 hover:bg-red-100' :
                              isGraded ? 'bg-green-50 border border-green-200 hover:bg-green-100' :
                              isCompleted ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100' :
                              'bg-white border border-gray-200 hover:border-primary/50'
                            }`}
                            onClick={() => startCheckUp(list.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-lg font-semibold text-foreground">{list.title}</h4>
                                  {isDiscarded && (
                                    <Badge className="bg-red-100 text-red-700 border-red-300">
                                      Discarded
                                    </Badge>
                                  )}
                                  {isGraded && !isDiscarded && (
                                    <Badge className="bg-green-100 text-green-700 border-green-300">
                                      {list.submission?.score}% - Graded
                                    </Badge>
                                  )}
                                  {isCompleted && !isGraded && !isDiscarded && (
                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                                      Pending Review
                                    </Badge>
                                  )}
                                  {!isCompleted && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                                      Ready to Start
                                    </Badge>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    📅 Due: {formatDueDate(list.dueDate)}
                                  </p>
                                  {list.educator && (
                                    <p className="text-sm text-muted-foreground">
                                      👨‍🏫 Created by: {list.educator.name}
                                    </p>
                                  )}
                                  {isCompleted && (
                                    <p className="text-sm text-muted-foreground">
                                      ✅ Completed: {list.submission?.submittedAt ? new Date(list.submission.submittedAt).toLocaleDateString() : 'Unknown Date'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-muted-foreground group-hover:text-primary transition-colors">
                                <ArrowRight className="h-6 w-6" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BookOpen className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No vocabulary lists yet</h3>
                      <p className="text-muted-foreground mb-6">Ask your educator to create vocabulary lists for your class.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flashcards Card */}
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-t-lg p-6">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xl font-bold">
                      <Brain className="inline mr-3 h-5 w-5" />
                      Flashcards
                    </CardTitle>
                    {flashcards && flashcards.length > 0 && (
                      (() => {
                        const cardCount = flashcards.filter(card => !card.learned).length;
                        return cardCount > 0 ? (
                          <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                            {cardCount}
                          </Badge>
                        ) : null;
                      })()
                    )}
                  </div>
                  <CardDescription className="text-blue-100 text-sm mt-2">
                    Review words you got wrong
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {flashcardsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-3 text-sm text-muted-foreground">Loading flashcards...</span>
                    </div>
                  ) : flashcards && flashcards.length > 0 && flashcards.filter(card => !card.learned).length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        Review {flashcards.filter(card => !card.learned).length} words you got wrong
                      </div>
                      {flashcards
                        .filter(card => !card.learned)
                        .slice(0, 2)
                        .map(card => (
                          <div key={card.id} className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-lg border border-blue-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-bold text-lg text-blue-900 mb-1">{card.word.word}</h4>
                                <p className="text-sm text-blue-600">
                                  {card.definition.correctDefinition || card.definition.studentDefinition}
                                </p>
                              </div>
                              <BookMarked className="h-5 w-5 text-blue-400" />
                            </div>
                          </div>
                        ))}
                      <div className="mt-4 text-center">
                        <Button 
                          className="w-full"
                          onClick={() => navigate('/learner/flashcards')}
                        >
                          Study All Flashcards
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-base font-medium text-foreground mb-2">No flashcards yet</h3>
                      <p className="text-sm text-muted-foreground">Complete some vocabulary tests to generate flashcards.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Row */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              {/* Study Stats */}
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Award className="mx-auto h-10 w-10 text-green-600 mb-3" />
                  <div className="text-2xl font-bold text-green-700">
                    {studyStats?.totalWordsStudied || 0}
                  </div>
                  <p className="text-sm text-green-600 font-medium">Words Studied</p>
                </CardContent>
              </Card>

              {/* Average Accuracy */}
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="mx-auto h-10 w-10 text-blue-600 mb-3" />
                  <div className="text-2xl font-bold text-blue-700">
                    {studyStats?.averageAccuracy || 0}%
                  </div>
                  <p className="text-sm text-blue-600 font-medium">Average Accuracy</p>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="space-y-2">
                    <Button 
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600"
                      onClick={() => navigate('/explore')}
                    >
                      <StickyNote className="mr-2 h-4 w-4" />
                      Explore Words
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowJoinClass(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Join Class
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg p-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-2xl font-bold">
                    <School className="inline mr-3 h-6 w-6" />
                    My Classes
                  </CardTitle>
                  {classes && classes.length > 0 && (
                    <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                      {classes.length} classes
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-blue-100 text-base mt-2">
                  Manage your class memberships and track progress
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {classesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-muted-foreground">Loading your classes...</span>
                  </div>
                ) : classes && classes.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((cls) => (
                      <Card key={cls.id} className="border hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold flex items-center">
                            <School className="mr-2 h-4 w-4 text-blue-500" />
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
                ) : (
                  <div className="text-center py-12">
                    <School className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No classes yet</h3>
                    <p className="text-muted-foreground mb-6">Join a class to access vocabulary lists and assignments.</p>
                    <Button onClick={() => setShowJoinClass(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Join a Class
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Join Class Dialog */}
        <Dialog open={showJoinClass} onOpenChange={setShowJoinClass}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join a Class</DialogTitle>
              <DialogDescription>
                Enter the class code provided by your educator to join a class.
              </DialogDescription>
            </DialogHeader>
            <JoinClass />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default LearnerDashboard;