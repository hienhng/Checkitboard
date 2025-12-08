import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Plus,
  CalendarClock,
  CircleCheckBig,
  UserCheck,
  ChevronDown,
  FileStack,
  GraduationCap,

} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { formatDate, formatDueDate, getScoreBgColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Flashcard } from "@/components/flashcard";
import { JoinClass } from "@/components/join-class";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ReactNode } from "react";

// Schema for joining a class
const joinClassSchema = z.object({
  classCode: z.string().min(6, "Class code must be at least 6 characters"),
});

type JoinClassData = z.infer<typeof joinClassSchema>;

// Sticky note color constants
const STICKY_NOTE_COLORS = {
  yellow: "bg-yellow-200 border-yellow-300 text-yellow-900",
  pink: "bg-pink-200 border-pink-300 text-pink-900",
  blue: "bg-blue-200 border-blue-300 text-blue-900",
  green: "bg-green-200 border-green-300 text-green-900",
  purple: "bg-purple-200 border-purple-300 text-purple-900",
  orange: "bg-orange-200 border-orange-300 text-orange-900",
  red: "bg-red-200 border-red-300 text-red-900",
  indigo: "bg-indigo-200 border-indigo-300 text-indigo-900",
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
  const queryClient = useQueryClient();

  // State for the result details dialog

  const [activeTab, setActiveTab] = useState("dashboard");

  const [showJoinClass, setShowJoinClass] = useState(false);
  const [openClasses, setOpenClasses] = useState<Record<number, boolean>>({});
  const [viewingListId, setViewingListId] = useState<number | null>(null);

  // Form for joining a class
  const joinForm = useForm<JoinClassData>({
    resolver: zodResolver(joinClassSchema),
    defaultValues: {
      classCode: "",
    },
  });

  // Mutation for joining a class
  const joinClassMutation = useMutation({
    mutationFn: async (data: JoinClassData) => {
      const response = await apiRequest("POST", "/api/join-class", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/classes"] });
      setShowJoinClass(false);
      joinForm.reset();
      toast({
        title: "Request submitted",
        description: "Your request to join the class has been submitted. Waiting for educator approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while joining the class.",
        variant: "destructive",
      });
    },
  });

  // Fetch published vocabulary lists
  const { data: vocabularyLists, isLoading: listsLoading } = useQuery<
    VocabularyList[]
  >({
    queryKey: ["/api/learner/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch learner's completed and graded submissions

  // Fetch learner's flashcards
  const { data: flashcards, isLoading: flashcardsLoading } = useQuery<
    FlashcardType[]
  >({
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

  // Fetch vocabulary list details for viewing
  const { data: viewingList } = useQuery<any>({
    queryKey: [`/api/vocabulary-lists/${viewingListId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: viewingListId !== null,
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
                <span className="font-brand font-light text-blue-600 bg-clip-text outline-blue-600 tracking-wide">
                  lexible
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Master vocabulary through interactive learning, track your
                progress, and achieve your language goals.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-12 -mt-8 relative z-10">
        <Tabs
          defaultValue="dashboard"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <div className="flex justify-center mb-8">
            <TabsList className="relative grid w-full max-w-xl grid-cols-2 h-12 p-1 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
              {/* Animated sliding background */}
              <div 
                className="absolute top-1 bottom-1 left-1 rounded-lg bg-primary shadow-lg transition-all duration-200 ease-in-out z-0"
                style={{
                  width: 'calc(50% - 6px)',
                  transform: activeTab === 'classes' ? 'translateX(calc(100% + 4px))' : 'translateX(0)'
                }}
              />

              <TabsTrigger
                value="dashboard"
                className="relative flex items-center justify-center rounded-lg bg-transparent data-[state=active]:text-white data-[state!=active]:text-slate-700 data-[state!=active]:hover:text-slate-900 transition-colors duration-200 z-10 overflow-hidden text-ellipsis whitespace-nowrap px-2"
              >
                <BookOpen className="mr-1.5 h-4 w-4 flex-shrink-0" />
                <span className="truncate">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger
                value="classes"
                className="relative flex items-center justify-center rounded-lg bg-transparent data-[state=active]:text-white data-[state!=active]:text-slate-700 data-[state!=active]:hover:text-slate-900 transition-colors duration-200 z-10"
              >
                <School className="mr-1.5 h-4 w-4 flex-shrink-0" />
                <span className="truncate">My Classes</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-8">
            {/* Modern Grid Layout */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Vocabulary Lists Card */}
              <Card className="md:col-span-2 lg:col-span-2 card-glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white p-6 relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                  <div className="flex justify-between items-center relative">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl font-bold">
                          Vocabulary Lists
                        </CardTitle>
                        <CardDescription className="text-blue-100 text-sm mt-1">
                          Complete vocabulary check-ups and track your progress
                        </CardDescription>
                      </div>
                    </div>
                    {vocabularyLists && vocabularyLists.length > 0 && (
                      <Badge className="bg-white/20 text-white border-white/30 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                        {vocabularyLists.length} lists
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {listsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <span className="ml-3 text-muted-foreground">
                        Loading your vocabulary lists...
                      </span>
                    </div>
                  ) : vocabularyLists && vocabularyLists.length > 0 ? (
                    <div className="space-y-4">
                      {vocabularyLists.map((list) => {
                        const isCompleted =
                          list.submission && list.submission.completed;
                        const isDiscarded =
                          list.submission && list.submission.isDiscarded;
                        const isGraded =
                          isCompleted && list.submission?.gradedAt;

                        return (
                          <div
                            key={list.id}
                            className={`group p-5 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 ${
                              isDiscarded
                                ? "bg-gradient-to-r from-red-50 to-rose-50 border-red-200/60 hover:border-red-300"
                                : isGraded
                                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200/60 hover:border-green-300"
                                  : isCompleted
                                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200/60 hover:border-yellow-300"
                                    : "bg-gradient-to-r from-slate-50 to-blue-50/50 border-slate-200/60 hover:border-primary/40"
                            }`}
                            onClick={() => startCheckUp(list.id)}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center flex-wrap gap-2 mb-3">
                                  <h4 className="text-lg font-semibold text-foreground truncate">
                                    {list.title}
                                  </h4>
                                  {isDiscarded && (
                                    <Badge className="bg-red-100/80 text-red-700 border-red-200 shadow-sm">
                                      Discarded
                                    </Badge>
                                  )}
                                  {isGraded && !isDiscarded && (
                                    <Badge className="bg-green-100/80 text-green-700 border-green-200 shadow-sm">
                                      {list.submission?.score}% - Graded
                                    </Badge>
                                  )}
                                  {isCompleted && !isGraded && !isDiscarded && (
                                    <Badge className="bg-yellow-100/80 text-yellow-700 border-yellow-200 shadow-sm">
                                      Pending Review
                                    </Badge>
                                  )}
                                  {!isCompleted && (
                                    <Badge className="bg-blue-100/80 text-blue-700 border-blue-200 shadow-sm">
                                      Ready to Start
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors duration-200">
                                    <CalendarClock className="h-4 w-4" />
                                    <span>Due: {formatDueDate(list.dueDate)}</span>
                                  </p>
                                  {list.educator && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors duration-200">
                                      <UserCheck className="h-4 w-4" />
                                      <span>{list.educator.name}</span>
                                    </p>
                                  )}
                                  {isCompleted && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-colors duration-200">
                                      <CircleCheckBig className="h-4 w-4" />
                                      <span>
                                        {list.submission?.submittedAt
                                          ? new Date(
                                              list.submission.submittedAt,
                                            ).toLocaleDateString()
                                          : "Unknown Date"}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                <ArrowRight className="h-5 w-5" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                        <BookOpen className="h-10 w-10 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
                        No vocabulary lists yet
                      </h3>
                      <p className="text-muted-foreground max-w-sm mx-auto">
                        Ask your educator to create vocabulary lists for your
                        class.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Flashcards Card */}
              <Card className="card-glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-500 via-purple-600 to-indigo-600 text-white p-6 relative">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
                  <div className="flex justify-between items-start relative">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold">
                          Flashcards
                        </CardTitle>
                        <CardDescription className="text-purple-100 text-sm mt-1">
                          Review words you got wrong
                        </CardDescription>
                      </div>
                    </div>
                    {flashcards &&
                      flashcards.length > 0 &&
                      (() => {
                        const cardCount = flashcards.filter(
                          (card) => !card.learned,
                        ).length;
                        return cardCount > 0 ? (
                          <Badge className="bg-white/20 text-white border-white/30 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                            {cardCount}
                          </Badge>
                        ) : null;
                      })()}
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {flashcardsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-3 text-sm text-muted-foreground">
                        Loading flashcards...
                      </span>
                    </div>
                  ) : flashcards &&
                    flashcards.length > 0 &&
                    flashcards.filter((card) => !card.learned).length > 0 ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        Review{" "}
                        {flashcards.filter((card) => !card.learned).length}{" "}
                        words you got wrong
                      </div>
                      {flashcards
                        .filter((card) => !card.learned)
                        .slice(0, 2)
                        .map((card) => (
                          <div
                            key={card.id}
                            className="group p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-xl border border-purple-200/50 hover:border-purple-300 hover:shadow-md transition-all duration-300 cursor-pointer"
                          >
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <h4 className="font-bold text-lg bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent mb-1">
                                  {card.word.word}
                                </h4>
                                <p className="text-sm text-slate-600 line-clamp-2">
                                  {card.definition.correctDefinition ||
                                    card.definition.studentDefinition}
                                </p>
                              </div>
                              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <BookMarked className="h-4 w-4 text-purple-500" />
                              </div>
                            </div>
                          </div>
                        ))}
                      <div className="mt-5">
                        <Button
                          className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all duration-300"
                          onClick={() => navigate("/learner/flashcards")}
                        >
                          Study All Flashcards
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
                        <Brain className="h-8 w-8 text-purple-500" />
                      </div>
                      <h3 className="text-base font-semibold text-foreground mb-2">
                        No flashcards yet
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Complete some vocabulary tests to generate flashcards.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats Row */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              {/* Study Stats */}
              <Card className="stat-card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-6 text-center relative">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                    <Award className="h-7 w-7 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {studyStats?.totalWordsStudied || 0}
                  </div>
                  <p className="text-sm text-green-600/80 font-medium mt-1">
                    Words Studied
                  </p>
                </CardContent>
              </Card>

              {/* Average Accuracy */}
              <Card className="stat-card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-6 text-center relative">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                    <CheckCircle className="h-7 w-7 text-blue-600" />
                  </div>
                  {studyStats?.averageAccuracy ? (
                    <>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        {Math.round(studyStats.averageAccuracy)}%
                      </div>
                      <p className="text-sm text-blue-600/80 font-medium mt-1">
                        Average Accuracy
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-semibold text-blue-700 mb-1">
                        No checkups yet
                      </div>
                      <p className="text-xs text-blue-600/70">
                        Complete a vocabulary checkup to track your accuracy
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="stat-card group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardContent className="p-6 relative">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-300 flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                    <Plus className="h-7 w-7 text-purple-600 icon-rotate-90 group-hover:rotate-90" />
                  </div>
                  <div className="space-y-2.5">
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={() => navigate("/learner/results")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View All Results
                    </Button>
                    <Button
                      size="sm"
                      className="w-full bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={() => navigate("/explore")}
                    >
                      <StickyNote className="mr-2 h-4 w-4" />
                      Explore Words
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-slate-50 text-black hover:bg-blue-50 transition-all duration-200"
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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground dark:text-foreground flex items-center gap-3">
                  <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  My Classes
                </h2>
                <p className="text-muted-foreground dark:text-muted-foreground mt-1">
                  Access your vocabulary lists and reading passages
                </p>
              </div>
              <Button onClick={() => setShowJoinClass(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Join Class
              </Button>
            </div>

            {classesLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading your classes...</p>
                </div>
              </div>
            ) : classes && classes.length > 0 ? (
              <div className="space-y-4">
                {classes.map((enrollment) => {
                  const classData = enrollment.class || enrollment;
                  const vocabLists = classData.vocabularyLists || [];
                  const isOpen = openClasses[enrollment.id] || false;

                  return (
                    <Card key={enrollment.id} className="overflow-hidden border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                      <Collapsible 
                        open={isOpen} 
                        onOpenChange={(open) => setOpenClasses(prev => ({ ...prev, [enrollment.id]: open }))}
                      >
                        <CollapsibleTrigger className="w-full">
                          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 text-white p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-lg">
                                  <School className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                  <CardTitle className="text-2xl font-bold">
                                    {classData.name}
                                  </CardTitle>
                                  <CardDescription className="text-blue-100 dark:text-blue-200 mt-1">
                                    Taught by {classData.educator?.name || "Unknown"}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <Badge className="bg-white/20 text-white border-white/30 px-3 py-1">
                                  {vocabLists.length} {vocabLists.length === 1 ? 'list' : 'lists'}
                                </Badge>
                                <ChevronDown 
                                  className={`h-5 w-5 transition-transform duration-200 ${
                                    isOpen ? 'rotate-180' : ''
                                  }`}
                                />
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <CardContent className="p-6">
                            {vocabLists.length > 0 ? (
                              <div className="space-y-4">
                                {vocabLists.map((list: any) => (
                                  <Card key={list.id} className="border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
                                    <CardHeader className="pb-3">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                            <FileStack className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            <CardTitle className="text-lg font-semibold">
                                              {list.title}
                                            </CardTitle>
                                            {list.type && (
                                              <Badge variant={list.type === 'test' ? 'default' : 'secondary'}>
                                                {list.type === 'test' ? 'Test' : 'Practice'}
                                              </Badge>
                                            )}
                                          </div>
                                          {list.dueDate && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                                              <CalendarClock className="h-4 w-4" />
                                              {formatDueDate(list.dueDate)}
                                            </div>
                                          )}
                                        </div>
                                        <Button
                                          size="sm"
                                          onClick={() => setViewingListId(list.id)}
                                          className="gap-2"
                                        >
                                          <Eye className="h-4 w-4" />
                                          View
                                        </Button>
                                      </div>
                                    </CardHeader>
                                    {list.passage && (
                                      <CardContent className="pt-0">
                                        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-4 border border-slate-200 dark:border-slate-700">
                                          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            Reading Passage
                                          </h4>
                                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {list.passage}
                                          </p>
                                        </div>
                                      </CardContent>
                                    )}
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <FileStack className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                                <p className="text-muted-foreground">No vocabulary lists in this class yet</p>
                              </div>
                            )}
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-lg">
                <CardContent className="py-16">
                  <div className="text-center">
                    <School className="mx-auto h-20 w-20 text-muted-foreground/30 mb-6" />
                    <h3 className="text-2xl font-semibold text-foreground mb-3">
                      No Classes Yet
                    </h3>
                    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                      Join a class to access vocabulary lists, reading passages, and track your learning progress.
                    </p>
                    <Button onClick={() => setShowJoinClass(true)} size="lg" className="gap-2">
                      <Plus className="h-5 w-5" />
                      Join Your First Class
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* View Passage and Words Dialog */}
        <Dialog open={viewingListId !== null} onOpenChange={(open) => !open && setViewingListId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                {viewingList?.title || "Vocabulary List"}
              </DialogTitle>
              {viewingList?.type && (
                <Badge variant={viewingList.type === 'test' ? 'default' : 'secondary'} className="w-fit mt-2">
                  {viewingList.type === 'test' ? 'Test' : 'Practice'}
                </Badge>
              )}
            </DialogHeader>
            
            {viewingList ? (
              <div className="space-y-6 mt-4">
                {/* Passage Section */}
                {viewingList.passage && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Reading Passage
                    </h3>
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-6 border border-slate-200 dark:border-slate-700">
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {viewingList.passage}
                      </p>
                    </div>
                  </div>
                )}

                {/* Vocabulary Words Section */}
                {viewingList.words && viewingList.words.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      Vocabulary Words ({viewingList.words.length})
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {viewingList.words.map((word: any) => (
                        <Card key={word.id} className="border border-slate-200 dark:border-slate-700">
                          <CardContent className="p-4 mt-1">
                            <div className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                              {word.word}
                            </div>
                            {word.definition && (
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {word.definition}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading...</span>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Join Class Dialog */}
        <Dialog open={showJoinClass} onOpenChange={setShowJoinClass}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Join a Class</DialogTitle>
              <DialogDescription>
                Enter the class code provided by your educator to join a class.
              </DialogDescription>
            </DialogHeader>
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit((data) => joinClassMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={joinForm.control}
                  name="classCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CL123456" {...field} />
                      </FormControl>
                      <FormDescription>
                        Class codes are usually 8 characters starting with 'CL'
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowJoinClass(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={joinClassMutation.isPending}>
                    {joinClassMutation.isPending ? "Submitting..." : "Join Class"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default LearnerDashboard;
