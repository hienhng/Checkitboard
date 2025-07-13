import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FlashcardStudyMode } from "@/components/flashcard-modes/flashcard-study";
import { LearnMode } from "@/components/flashcard-modes/learn-mode";
import { TestMode } from "@/components/flashcard-modes/test-mode";
import { MatchMode } from "@/components/flashcard-modes/match-mode";
import { SpellMode } from "@/components/flashcard-modes/spell-mode";
import { StudyStats } from "@/components/study-stats";
import { 
  Brain, 
  Target, 
  Gamepad2, 
  Shuffle, 
  Trophy, 
  Flame, 
  BookOpen,
  CheckCircle,
  Star,
  Clock,
  BarChart3
} from "lucide-react";

type StudyMode = "flashcards" | "learn" | "test" | "match" | "spell";

interface Flashcard {
  id: number;
  word: { word: string };
  definition: { 
    studentDefinition: string;
    correctDefinition?: string;
    showCorrectDefinition?: boolean;
    isCorrect?: boolean;
    submission: { list: { title: string } }
  };
  learned: boolean;
  difficulty?: number; // 1-5 scale
  lastStudied?: Date;
  studyCount?: number;
  successRate?: number;
}

export default function FlashcardsPage() {
  const { toast } = useToast();
  const [activeMode, setActiveMode] = React.useState<StudyMode>("flashcards");
  const [currentSessionStats, setCurrentSessionStats] = React.useState({
    wordsStudied: 0,
    correctAnswers: 0,
    timeSpent: 0,
    streak: 0
  });

  // Fetch learner's flashcards
  const { data: flashcards, isLoading: flashcardsLoading } = useQuery({
    queryKey: ["/api/learner/flashcards"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch study progress/stats
  const { data: studyStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/learner/study-stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const learningCards = (flashcards as Flashcard[] || []).filter(card => !card.learned);
  const masteredCards = (flashcards as Flashcard[] || []).filter(card => card.learned);

  // Calculate overall progress
  const totalCards = flashcards?.length || 0;
  const masteredCount = masteredCards.length;
  const overallProgress = totalCards > 0 ? (masteredCount / totalCards) * 100 : 0;

  // Study mode descriptions and icons
  const studyModes = [
    {
      id: "flashcards" as StudyMode,
      name: "Flashcards",
      icon: BookOpen,
      description: "Classic flip cards to review terms and definitions",
      difficulty: 1,
      estimatedTime: Math.ceil(learningCards.length * 0.5),
      activeStyles: "bg-blue-600 hover:bg-blue-700 text-white"
    },
    {
      id: "learn" as StudyMode,
      name: "Learn",
      icon: Brain,
      description: "Adaptive learning with spaced repetition",
      difficulty: 2,
      estimatedTime: Math.ceil(learningCards.length * 1.5),
      activeStyles: "bg-purple-600 hover:bg-purple-700 text-white"
    },
    {
      id: "test" as StudyMode,
      name: "Test",
      icon: Target,
      description: "Multiple choice and written questions",
      difficulty: 3,
      estimatedTime: Math.ceil(learningCards.length * 2),
      activeStyles: "bg-green-600 hover:bg-green-700 text-white"
    },
    {
      id: "match" as StudyMode,
      name: "Match",
      icon: Gamepad2,
      description: "Fun drag-and-drop matching game",
      difficulty: 2,
      estimatedTime: Math.ceil(learningCards.length * 1),
      activeStyles: "bg-orange-600 hover:bg-orange-700 text-white"
    },
    {
      id: "spell" as StudyMode,
      name: "Spell",
      icon: CheckCircle,
      description: "Type the correct definition or word",
      difficulty: 4,
      estimatedTime: Math.ceil(learningCards.length * 1.5),
      activeStyles: "bg-pink-600 hover:bg-pink-700 text-white"
    }
  ];

  const renderModeContent = () => {
    if (learningCards.length === 0) {
      return (
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
            <p className="text-gray-600 mb-4">
              You don't have any flashcards to study right now. Get words wrong on vocabulary tests to add them here.
            </p>
            <Button onClick={() => window.location.href = "/learner/dashboard"}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      );
    }

    switch (activeMode) {
      case "flashcards":
        return (
          <FlashcardStudyMode 
            cards={learningCards} 
            onSessionComplete={(stats) => setCurrentSessionStats(stats)}
          />
        );
      case "learn":
        return (
          <LearnMode 
            cards={learningCards} 
            onSessionComplete={(stats) => setCurrentSessionStats(stats)}
          />
        );
      case "test":
        return (
          <TestMode 
            cards={learningCards} 
            onSessionComplete={(stats) => setCurrentSessionStats(stats)}
          />
        );
      case "match":
        return (
          <MatchMode 
            cards={learningCards} 
            onSessionComplete={(stats) => setCurrentSessionStats(stats)}
          />
        );
      case "spell":
        return (
          <SpellMode 
            cards={learningCards} 
            onSessionComplete={(stats) => setCurrentSessionStats(stats)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      <div className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header with Stats */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Study Center
                </h1>
                <p className="text-gray-600">
                  Master your vocabulary with multiple study modes
                </p>
              </div>
              
              {/* Quick Stats */}
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalCards}</div>
                  <div className="text-sm text-gray-500">Total Cards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{masteredCount}</div>
                  <div className="text-sm text-gray-500">Mastered</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{learningCards.length}</div>
                  <div className="text-sm text-gray-500">Learning</div>
                </div>
              </div>
            </div>

            {/* Overall Progress */}
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm text-gray-500">{Math.round(overallProgress)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </div>
          
          <div className="px-4 sm:px-6 lg:px-8">
            <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as StudyMode)}>
              {/* Mode Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {studyModes.map((mode) => {
                  const Icon = mode.icon;
                  const isActive = activeMode === mode.id;
                  const isDisabled = learningCards.length === 0;
                  
                  return (
                    <Button
                      key={mode.id}
                      variant="ghost"
                      className={`h-auto p-4 flex flex-col items-center space-y-2 transition-colors border ${
                        isActive 
                          ? `${mode.activeStyles} border-transparent` 
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 bg-white text-gray-900 hover:text-gray-900"
                      }`}
                      onClick={() => setActiveMode(mode.id)}
                      disabled={isDisabled}
                    >
                      <Icon className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-medium">{mode.name}</div>
                        <div className="text-xs opacity-75">
                          {mode.estimatedTime}min
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {Array.from({ length: mode.difficulty }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-current" />
                        ))}
                      </div>
                    </Button>
                  );
                })}
              </div>

              {/* Mode Description */}
              {learningCards.length > 0 && (
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      {React.createElement(
                        studyModes.find(mode => mode.id === activeMode)?.icon || BookOpen, 
                        { className: "h-5 w-5 text-blue-600" }
                      )}
                      <div>
                        <h3 className="font-medium">
                          {studyModes.find(mode => mode.id === activeMode)?.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {studyModes.find(mode => mode.id === activeMode)?.description}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>~{studyModes.find(mode => mode.id === activeMode)?.estimatedTime}min</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Target className="h-4 w-4" />
                          <span>{learningCards.length} cards</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Study Mode Content */}
              <div className="mt-6">
                {renderModeContent()}
              </div>

              {/* Study Statistics */}
              {!statsLoading && studyStats && (
                <div className="mt-8">
                  <StudyStats stats={studyStats} currentSession={currentSessionStats} />
                </div>
              )}
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}