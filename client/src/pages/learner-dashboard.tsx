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
  Search
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

interface SubmissionResult {
  id: number;
  score: number;
  submittedAt: string | Date;
  list: {
    id: number;
    title: string;
    passage?: string;
  };
  wordDefinitions?: {
    id: number;
    studentDefinition: string;
    correctDefinition?: string;
    isCorrect: boolean;
    showCorrectDefinition?: boolean;
    word?: {
      id: number;
      word: string;
    };
  }[];
}

export default function LearnerDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // State for the result details dialog
  const [selectedResult, setSelectedResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch published vocabulary lists
  const { data: vocabularyLists, isLoading: listsLoading } = useQuery<VocabularyList[]>({
    queryKey: ["/api/learner/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch learner's completed and graded submissions
  const { data: results, isLoading: resultsLoading } = useQuery<SubmissionResult[]>({
    queryKey: ["/api/learner/results"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

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

  // Filter functions for search
  const filteredVocabularyLists = vocabularyLists?.filter(list =>
    list.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    list.educator?.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredClasses = classes?.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cls.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Start a new vocabulary check-up
  const startCheckUp = async (listId: number) => {
    try {
      // First create a submission
      const res = await apiRequest("POST", "/api/submissions", { listId });
      const data = await res.json();
      
      // Navigate to the check-up page with the submission ID
      navigate(`/learner/checkup/${data.id}`);
    } catch (error: any) {
      // If a submission already exists, we might get back the existing submission ID
      if (error.message?.includes("already have a submission")) {
        try {
          const data = JSON.parse(error.message);
          if (data.submissionId) {
            navigate(`/learner/checkup/${data.submissionId}`);
            return;
          }
        } catch {
          // If we can't parse the error message, just show the error
        }
      }
      
      toast({
        title: "Error starting check-up",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-neutral-light">
        <Navbar />
        
        {/* Main Content */}
        <div className="flex-1">
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-5xl font-bold text-neutral-dark"> Welcome to <span className="text-black transition duration-300 ease-in-out hover:text-blue-500">Checkit</span>
              </h2> 
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Complete vocabulary check-ups, join classes, and review your flashcards.
              </p>
              
              {/* Search Bar */}
              <div className="mt-6 max-w-md">
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
              </div>
            </div>
            
            {/* Content */}
            <div className="px-4 sm:px-6 lg:px-8">
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
                    {/* Pending Vocabulary Check-Ups */}
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-blue-500 p-4 pb-4 text-center text-white">
                        <div className="w-full flex justify-between items-center">
                          <CardTitle className="text-xl font-bold">
                            Pending Vocabulary Check-Ups
                            
                          </CardTitle>
                          {vocabularyLists && vocabularyLists.length > 0 && (
                            (() => {
                              const pendingCount = filteredVocabularyLists.filter(list => 
                                !list.submission || !list.submission.completed
                              ).length;
                              
                              return pendingCount > 0 ? (
                                <Badge variant="secondary" className="bg-blue text-white-800 font-medium">
                                  {pendingCount} lists
                                </Badge>
                              ) : null;
                            })()
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {listsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading check-ups...</div>
                        ) : filteredVocabularyLists && filteredVocabularyLists.length > 0 && filteredVocabularyLists.filter(list => 
                          !list.submission || !list.submission.completed
                        ).length > 0 ? (
                          <div className="space-y-2">
                            {filteredVocabularyLists
                              .filter(list => !list.submission || !list.submission.completed)
                              .map(list => (
                                <div 
                                  key={list.id} 
                                  className="flex justify-between items-center mt-2 p-4 bg-white rounded-lg cursor-pointer hover:bg-blue-100 transition-colors group"
                                  onClick={() => startCheckUp(list.id)}
                                >
                                  <div className="flex-1">
                                    <h4 className="font-medium text-neutral-dark">{list.title}</h4>
                                    <p className="text-sm text-gray-500">Due date: {formatDueDate(list.dueDate)}</p>
                                  </div>
                                  <div className="text-gray-400 group-hover:text-primary transition-colors">
                                    <ChevronRight className="h-5 w-5" />
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No pending vocabulary check-ups.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* Recent Results */}
                    <Card className="overflow-hidden">
                      <CardHeader className="bg-green-500 p-4 pb-4 text-center text-white">
                        <div className="w-full flex justify-between items-center">
                          <CardTitle className="text-xl font-bold">
                            Recent Results
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {resultsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading results...</div>
                        ) : results && results.length > 0 ? (
                          <div className="divide-y divide-gray-200">
                            {results.map(result => (
                              <div key={result.id} className="py-4 flex items-center cursor-pointer hover:bg-blue-100 px-2 rounded-md transition-colors" onClick={() => setSelectedResult(result)}>
                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-green-500 text-white flex items-center justify-center">
                                  <CheckCircle className="h-5 w-5" />
                                </div>
                                <div className="ml-3 flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-neutral-dark">{result.list.title}</h4>
                                    <Badge className={getScoreBgColor(result.score)}>
                                      {result.score}% Score
                                    </Badge>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between">
                                    <p className="text-sm text-gray-500">
                                      Completed on {formatDate(result.submittedAt)} - 
                                      {result.wordDefinitions?.filter(d => d.isCorrect).length || 0}/
                                      {result.wordDefinitions?.length || 0} correct
                                    </p>
                                    <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600 h-6">
                                      <Eye className="h-3.5 w-3.5" /> View Details
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No completed check-ups yet. Wait for your mentor to grade your submissions.
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
                            <div className="flex overflow-x-auto overflow-y-hidden hide-scrollbar pb-6 pt-2 px-0 sm:px-4 space-x-6 sm:justify-center justify-start h-[280px]">
                              {flashcards
                                .filter(card => !card.learned)
                                .map(card => (
                                  <div key={card.id} className="flex-none mx-auto sm:mx-0">
                                    <Flashcard flashcard={card} />
                                  </div>
                                ))}
                            </div>
                            
                            {flashcards.filter(card => !card.learned).length > 0 && (
                              <div className="mt-4 text-center">
                                <Button 
                                  className="inline-flex items-center"
                                  onClick={() => navigate('/learner/flashcards')}
                                >
                                  Review All Flashcards
                                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            No flashcards to review.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="classes">
                  <div className="space-y-6">
                    {/* Join Class Section */}
                    <JoinClass />
                    
                    {/* My Classes Section with Search */}
                    {filteredClasses.length > 0 && (
                      <Card>
                        <CardHeader className="bg-purple-500 p-4 pb-4 text-center text-white">
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
                                    {cls.name}
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
        </div>
      </div>
      
      {/* Result Details Dialog */}
      {selectedResult && (
        <Dialog open={!!selectedResult} onOpenChange={(open) => !open && setSelectedResult(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center">
                <Award className="mr-2 h-5 w-5 text-secondary" />
                {selectedResult?.list?.title}
                <Badge className={`ml-3 ${getScoreBgColor(selectedResult?.score)}`}>
                  {selectedResult?.score}% Score
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Completed on {formatDate(selectedResult?.submittedAt)} - 
                {selectedResult?.wordDefinitions?.filter(d => d.isCorrect).length || 0}/
                {selectedResult?.wordDefinitions?.length || 0} correct
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Passage */}
              {selectedResult?.list?.passage && (
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Assigned Passage</h3>
                  <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                    <p className="whitespace-pre-line">{selectedResult.list.passage}</p>
                  </div>
                </div>
              )}
              
              {/* Word Definitions */}
              <div className="space-y-3">
                <h3 className="text-lg font-medium">Your Answers</h3>
                {selectedResult?.wordDefinitions?.map(def => (
                  <div key={def.id} className="p-4 border rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-neutral-dark">{def.word?.word || 'Unknown word'}</h4>
                      {def.isCorrect ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                          Correct
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          Incorrect
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-2">
                      <div>
                        <p className="text-sm text-gray-500">Your definition:</p>
                        <p className="text-sm">{def.studentDefinition}</p>
                      </div>
                      {!def.isCorrect && def.showCorrectDefinition && def.correctDefinition && (
                        <div>
                          <p className="text-sm text-gray-500">Correct definition:</p>
                          <p className="text-sm text-green-700">{def.correctDefinition}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}