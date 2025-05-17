import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CheckCircle, 
  Award,
  FileText,
  ChevronRight,
  School,
  Eye,
  Brain,
  Calendar,
  BarChart3,
  Clock,
  MessageSquare
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
      <div className="flex min-h-screen bg-gray-50">
        <Navbar />
        
        {/* Main Content */}
        <div className="flex-1 md:ml-64 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header with profile */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Let's Start Your New Course 😍</h1>
              </div>
              
              {/* Profile Section */}
              <div className="mt-4 md:mt-0 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 mb-2">
                  <img 
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4,c0aede,d1d4f9"
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Lucy Turner</h3>
                <p className="text-sm text-gray-500">Student / Grade 3</p>
                
                {/* Language Proficiency */}
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e0e0e0" strokeWidth="3"></circle>
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="100" strokeDashoffset="30"></circle>
                      </svg>
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-medium">70%</div>
                    </div>
                    <p className="text-xs font-medium mt-1 text-center">French</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e0e0e0" strokeWidth="3"></circle>
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="100" strokeDashoffset="20"></circle>
                      </svg>
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-medium">80%</div>
                    </div>
                    <p className="text-xs font-medium mt-1 text-center">Spanish</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative w-10 h-10">
                      <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#e0e0e0" strokeWidth="3"></circle>
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="100" strokeDashoffset="40"></circle>
                      </svg>
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-medium">60%</div>
                    </div>
                    <p className="text-xs font-medium mt-1 text-center">Italian</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Dashboard Content */}
            <div>
              <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="hidden">
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="classes">My Classes</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Performance Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-semibold">Performance</h3>
                          <p className="text-sm text-gray-500">6 courses completed</p>
                        </div>
                        <div className="relative w-10 h-10">
                          <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#e0e0e0" strokeWidth="3"></circle>
                            <circle cx="18" cy="18" r="16" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="100" strokeDashoffset="18"></circle>
                          </svg>
                          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs font-medium">82%</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end h-48">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div 
                              className={`w-12 ${i === 2 ? 'h-40 bg-blue-500' : 'h-28 bg-blue-300'} rounded-full`}
                            ></div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Time Spent Chart */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-semibold">Time spent on learning</h3>
                          <p className="text-sm text-gray-500">8 courses completed</p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-green-400 mr-1"></div>
                            <span className="text-xs text-gray-500">Listening</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-red-400 mr-1"></div>
                            <span className="text-xs text-gray-500">Reading</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full bg-blue-400 mr-1"></div>
                            <span className="text-xs text-gray-500">Writing</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between h-48 items-end">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <div className="flex flex-col space-y-1">
                              <div className="w-1 h-12 bg-green-400 mx-auto"></div>
                              <div className="w-1 h-8 bg-red-400 mx-auto"></div>
                              <div className="w-1 h-20 bg-blue-400 mx-auto"></div>
                            </div>
                            <div className="mt-1 text-xs text-gray-500">Dec {17 + i}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Your Courses */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold">Your Courses</h2>
                      <button className="text-sm text-blue-600 hover:underline">View all</button>
                    </div>
                    
                    <div className="space-y-4">
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="flex items-center text-xl">
                            <BookOpen className="mr-2 h-5 w-5 text-primary" />
                            Pending Vocabulary Check-Ups
                          </CardTitle>
                          <CardDescription>
                            Complete these vocabulary check-ups assigned by your teacher.
                          </CardDescription>
                        </div>
                        {(() => {
                          if (vocabularyLists && vocabularyLists.length > 0) {
                            const pendingCount = vocabularyLists.filter(list => 
                              !list.submission || !list.submission.completed
                            ).length;
                            
                            return pendingCount > 0 ? (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                {pendingCount} Pending
                              </Badge>
                            ) : null;
                          }
                          return null;
                        })()}
                      </CardHeader>
                      <CardContent>
                        {listsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading check-ups...</div>
                        ) : vocabularyLists && vocabularyLists.length > 0 && vocabularyLists.filter(list => 
                          !list.submission || !list.submission.completed
                        ).length > 0 ? (
                          <div className="divide-y divide-gray-200">
                            {vocabularyLists
                              .filter(list => !list.submission || !list.submission.completed)
                              .map(list => (
                                <div key={list.id} className="py-4 flex items-center">
                                  <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary text-white flex items-center justify-center">
                                    <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="ml-3 flex-1">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-sm font-medium text-neutral-dark">{list.title}</h4>
                                      <p className="text-sm text-gray-500">{formatDueDate(list.dueDate)}</p>
                                    </div>
                                    <div className="mt-1 flex items-center">
                                      <p className="text-sm text-gray-500">
                                        {list.words?.length || 0} vocabulary words - {list.educator?.name}
                                      </p>
                                    </div>
                                    <div className="mt-2">
                                      <Button 
                                        size="sm"
                                        variant="outline"
                                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-primary hover:bg-blue-50"
                                        onClick={() => startCheckUp(list.id)}
                                      >
                                        Start Check-Up
                                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                      </Button>
                                    </div>
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
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                          <Award className="mr-2 h-5 w-5 text-secondary" />
                          Recent Results
                        </CardTitle>
                        <CardDescription>
                          Your recent vocabulary check-up results.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {resultsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading results...</div>
                        ) : results && results.length > 0 ? (
                          <div className="divide-y divide-gray-200">
                            {results.map(result => (
                              <div key={result.id} className="py-4 flex items-center cursor-pointer hover:bg-gray-50 px-2 rounded-md transition-colors" onClick={() => setSelectedResult(result)}>
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
                            No completed check-ups yet.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    {/* My Flashcards */}
                    <Card>
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="flex items-center text-xl">
                            <Brain className="mr-2 h-5 w-5 text-accent" />
                            My Flashcards
                          </CardTitle>
                          <CardDescription>
                            Review vocabulary words you're still learning.
                          </CardDescription>
                        </div>
                        {(() => {
                          if (flashcards && flashcards.length > 0) {
                            const cardCount = flashcards.filter(card => !card.learned).length;
                            
                            return cardCount > 0 ? (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                                {cardCount} Cards
                              </Badge>
                            ) : null;
                          }
                          return null;
                        })()}
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
                  <JoinClass />
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