import { PageHeader, StatCard, EmptyState } from "@/components/workspace-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";

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
  const { user } = useAuth();
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

  const reviewCards = (flashcards || []).filter(card => !card.learned);
  return <div className="workspace-page">
    <PageHeader eyebrow="Your learning workspace" title={`A little progress, ${user?.name?.split(" ")[0] || "every day"}.`} description="Pick up a new word, revisit an old one, and keep your curiosity going." actions={<Button variant="outline" onClick={() => setShowJoinClass(true)}><Plus />Join a class</Button>} />
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4"><StatCard label="Your classes" value={classes.length} icon={School} loading={classesLoading} detail="Learn together" /><StatCard label="Words studied" value={studyStats?.totalWordsStudied ?? "—"} icon={BookOpen} loading={!studyStats} detail="Building your vocabulary" tone="green" /><StatCard label="Average accuracy" value={studyStats?.averageAccuracy != null ? Math.round(studyStats.averageAccuracy) + "%" : "—"} icon={CheckCircle} loading={!studyStats} detail="Every attempt is progress" /><StatCard label="Words to revisit" value={reviewCards.length} icon={Brain} tone="amber" loading={flashcardsLoading} detail="A little practice goes a long way" /></div>
    <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList className="mb-6"><TabsTrigger value="dashboard"><BookOpen className="h-4 w-4" />Overview</TabsTrigger><TabsTrigger value="classes"><School className="h-4 w-4" />My classes<Badge variant="secondary">{classes.length}</Badge></TabsTrigger></TabsList>
      <TabsContent value="dashboard" className="space-y-6">
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-primary/15 bg-accent/65 p-6 sm:flex-row sm:items-center"><div><p className="eyebrow text-primary">Your daily dose of discovery</p><h2 className="text-xl font-semibold">Make a little time for your words.</h2><p className="mt-2 max-w-md text-xs leading-6 text-muted-foreground">A quick flashcard session is a small step toward lasting knowledge.</p></div><Button onClick={() => navigate("/learner/flashcards")} className="shrink-0">Let’s practice<ArrowRight className="h-4 w-4" /></Button></div>
            <Card><CardHeader><div className="section-heading"><div><CardTitle>Your assignments</CardTitle><CardDescription className="mt-1">The next chapter in your learning.</CardDescription></div><Badge variant="secondary">{vocabularyLists?.length || 0} lists</Badge></div></CardHeader><CardContent>{listsLoading ? <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div> : vocabularyLists?.length ? <div className="divide-y">{vocabularyLists.map(list => <div key={list.id} className="flex flex-wrap items-start gap-3 py-4 first:pt-1 last:pb-0"><span className="icon-container mt-1"><FileText className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><button onClick={() => setViewingListId(list.id)} className="text-left text-sm font-semibold leading-6 hover:text-primary">{list.title}</button><p className="mt-1 text-xs leading-5 text-muted-foreground">{list.educator?.name || "Your educator"} · {formatDueDate(list.dueDate)}</p><div className="mt-2 flex flex-wrap items-center gap-2"><Badge variant={list.submission?.isDiscarded ? "warning" : list.submission?.completed ? "success" : "outline"}>{list.submission?.isDiscarded ? "Exited" : list.submission?.completed ? "Completed" : "Ready to start"}</Badge>{list.words?.length != null && <span className="text-[11px] text-muted-foreground">{list.words.length} words</span>}</div></div><Button size="sm" variant={list.submission?.completed ? "outline" : "default"} onClick={() => list.submission?.completed ? navigate(`/test-results/${list.submission.id}`) : startCheckUp(list.id)}>{list.submission?.completed ? "View results" : "Open checkup"}<ArrowRight /></Button></div>)}</div> : <EmptyState icon={BookOpen} title="Your learning starts with a class" description="Join your educator’s class to find reading passages and vocabulary assignments." action={<Button size="sm" onClick={() => setShowJoinClass(true)}><Plus />Join your first class</Button>} />}</CardContent></Card>
          </div>
          <div className="space-y-5">
            <Card><CardHeader><div className="section-heading"><CardTitle>Words to revisit</CardTitle><span className="icon-container h-8 w-8"><Brain className="h-4 w-4" /></span></div><CardDescription>A second look makes it stick.</CardDescription></CardHeader><CardContent>{flashcardsLoading ? <Skeleton className="h-28 w-full" /> : reviewCards.length ? <><div className="space-y-3">{reviewCards.slice(0, 3).map(card => <button key={card.id} className="block w-full rounded-xl border bg-background/60 p-3.5 text-left transition-colors hover:border-primary/40" onClick={() => navigate("/learner/flashcards")}><span className="block text-sm font-semibold text-primary">{card.word.word}</span><span className="mt-1.5 line-clamp-2 block text-xs leading-5 text-muted-foreground">{card.definition.correctDefinition || card.definition.studentDefinition || "Ready for another look?"}</span></button>)}</div><Button variant="outline" className="mt-4 w-full" onClick={() => navigate("/learner/flashcards")}>Study flashcards<ArrowRight /></Button></> : <EmptyState icon={Brain} title="A fresh start" description="Words from your checkups will appear here for a little extra practice." />}</CardContent></Card>
            <Card><CardHeader><CardTitle>Explore a little further</CardTitle></CardHeader><CardContent className="space-y-2">{[{ url: "/explore", label: "Discover your word glossary", icon: Search }, { url: "/sticky-notes", label: "Put an idea on your canvas", icon: StickyNote }, { url: "/learner/results", label: "Look back at your results", icon: FileText }].map(({ url, label, icon: Icon }) => <button key={url} onClick={() => navigate(url)} className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"><Icon className="h-4 w-4 shrink-0 text-primary" />{label}<ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0" /></button>)}</CardContent></Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="classes" className="space-y-4"><div className="section-heading mb-5"><div><h2 className="section-title">A place to learn together</h2><p className="mt-1 text-sm text-muted-foreground">Your classes, reading passages, and vocabulary lists.</p></div></div>{classesLoading ? <Skeleton className="h-40 w-full" /> : classes.length ? classes.map(enrollment => { const classData = enrollment.class || enrollment; const vocabLists = classData.vocabularyLists || []; return <Card key={enrollment.id} className="overflow-hidden"><Collapsible open={openClasses[enrollment.id] || false} onOpenChange={open => setOpenClasses(previous => ({ ...previous, [enrollment.id]: open }))}><CollapsibleTrigger className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-muted/50"><span className="icon-container"><School className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{classData.name}</span><span className="mt-1 block text-xs text-muted-foreground">{classData.educator?.name || "Your educator"}</span></span><Badge variant="outline">{enrollment.status === "pending" ? "Awaiting approval" : vocabLists.length + " lists"}</Badge><ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${openClasses[enrollment.id] ? "rotate-180" : ""}`} /></CollapsibleTrigger><CollapsibleContent><CardContent className="border-t pt-4">{vocabLists.length ? <div className="divide-y">{vocabLists.map((list: any) => <div key={list.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-medium">{list.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatDueDate(list.dueDate)}</p></div><Button variant="outline" size="sm" onClick={() => setViewingListId(list.id)}>View passage<ArrowRight /></Button></div>)}</div> : <EmptyState icon={FileText} title={enrollment.status === "pending" ? "Your request is on its way" : "A new chapter is coming"} description={enrollment.status === "pending" ? "Your educator will approve your request before you can access this class." : "Your educator’s vocabulary lists will appear here."} />}</CardContent></CollapsibleContent></Collapsible></Card>; }) : <Card><EmptyState icon={School} title="Find your learning community" description="Enter a class code from your educator to get started." action={<Button onClick={() => setShowJoinClass(true)}><Plus />Join a class</Button>} /></Card>}</TabsContent>
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
  </div>;
}
export default LearnerDashboard;
