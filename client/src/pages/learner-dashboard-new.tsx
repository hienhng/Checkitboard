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
                      {/* Course Cards */}
                      {vocabularyLists && vocabularyLists.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {vocabularyLists.slice(0, 3).map(list => (
                            <div 
                              key={list.id} 
                              className="bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                              onClick={() => navigate(`/learner/vocabulary/${list.id}`)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h3 className="font-medium text-gray-800">{list.title}</h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    {list.words?.length || 0} words • {formatDueDate(list.dueDate)}
                                  </p>
                                </div>
                                <div className="text-blue-500">
                                  <ChevronRight size={20} />
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* English for Beginners Card */}
                          <div className="bg-blue-50 p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-medium text-gray-800">English for beginners</h3>
                                <p className="text-sm text-gray-500 mt-1">24/30 Lessons</p>
                              </div>
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 5.14v14l11-7-11-7z" fill="currentColor" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-white rounded-xl">
                          <p className="text-gray-500">No courses available. Join a class to get started!</p>
                          <Button className="mt-4" onClick={() => setActiveTab("classes")}>
                            Browse Classes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Daily Activity */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Recent Results</h3>
                      </div>
                      
                      {resultsLoading ? (
                        <div className="py-4 text-center text-sm text-gray-500">Loading results...</div>
                      ) : results && results.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                          {results.slice(0, 3).map(result => (
                            <div key={result.id} className="py-3 flex items-center cursor-pointer hover:bg-gray-50 px-2 rounded-md transition-colors" onClick={() => setSelectedResult(result)}>
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5" />
                              </div>
                              <div className="ml-3 flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-gray-800">{result.list.title}</h4>
                                  <Badge className={getScoreBgColor(result.score)}>
                                    {result.score}% Score
                                  </Badge>
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <p className="text-xs text-gray-500">
                                    Completed on {formatDate(result.submittedAt)}
                                  </p>
                                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-blue-600 h-6">
                                    <Eye className="h-3.5 w-3.5" /> View
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
                    </div>
                    
                    <div className="bg-white p-6 rounded-3xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <h3 className="text-lg font-semibold">Daily activity</h3>
                        </div>
                        <div className="text-sm text-gray-500">Today, 20 December</div>
                      </div>
                      
                      <div className="space-y-4 mt-6">
                        <div className="relative pl-6 before:content-[''] before:absolute before:top-2 before:left-2 before:w-2 before:h-2 before:bg-yellow-400 before:rounded-full">
                          <div className="mb-1 text-sm font-medium">Introduction to Spanish</div>
                          <div className="text-xs text-gray-500">10:00 - 11:00</div>
                        </div>
                        
                        <div className="relative pl-6 before:content-[''] before:absolute before:top-2 before:left-2 before:w-2 before:h-2 before:bg-blue-400 before:rounded-full">
                          <div className="mb-1 text-sm font-medium">English for travel</div>
                          <div className="text-xs text-gray-500">15:30 - 17:00</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flashcards Section */}
                  <div className="mt-8">
                    <Card className="rounded-3xl shadow-sm overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardTitle className="flex items-center text-xl">
                          <Brain className="mr-2 h-5 w-5" />
                          Flashcards to Review
                        </CardTitle>
                        <CardDescription className="text-blue-100">
                          Practice these vocabulary words to master them.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        {flashcardsLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading flashcards...</div>
                        ) : flashcards && flashcards.length > 0 && flashcards.filter(card => !card.learned).length > 0 ? (
                          <div>
                            <div className="flex overflow-x-auto overflow-y-hidden hide-scrollbar pb-6 pt-2 px-0 sm:px-4 space-x-6 sm:justify-center justify-start h-[280px]">
                              {flashcards
                                .filter(card => !card.learned)
                                .slice(0, 3)
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
                            No flashcards to review at the moment.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="classes">
                  <JoinClass />
                  <div className="mt-8 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center text-xl">
                          <School className="mr-2 h-5 w-5 text-primary" />
                          My Classes
                        </CardTitle>
                        <CardDescription>
                          Classes you've joined and their vocabulary lists.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {classesLoading ? (
                          <div className="py-4 text-center text-sm text-gray-500">Loading classes...</div>
                        ) : classes.length > 0 ? (
                          <div className="divide-y divide-gray-200">
                            {classes.map((cls: any) => (
                              <div key={cls.id} className="py-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="text-lg font-medium text-neutral-dark">
                                      {cls.class.name}
                                    </h4>
                                    <p className="text-sm text-gray-500">
                                      {cls.class.educator?.name || 'Unknown teacher'}
                                    </p>
                                  </div>
                                  <Button 
                                    variant="outline"
                                    onClick={() => navigate(`/learner/class/${cls.classId}`)}
                                  >
                                    View Lists
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-gray-500">
                            You haven't joined any classes yet. Use the form above to join a class.
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      {/* Result Details Dialog */}
      {selectedResult && (
        <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedResult.list.title} - Results</DialogTitle>
              <DialogDescription>
                Completed on {formatDate(selectedResult.submittedAt)} - Score: {selectedResult.score}%
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <h3 className="text-lg font-medium">Your Answers</h3>
              {selectedResult?.wordDefinitions?.map(def => (
                <div key={def.id} className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-neutral-dark">{def.word?.word || 'Unknown word'}</h4>
                    {def.isCorrect ? (
                      <Badge className="bg-green-100 text-green-800">Correct</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Incorrect</Badge>
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
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}