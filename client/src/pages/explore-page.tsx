import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  BookOpen,
  Lightbulb,
  Brain,
  Target,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Filter,
} from "lucide-react";

interface ExploreWord {
  word: string;
  definition: string;
  example?: string;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
  listTitle?: string;
  submissionId?: number;
  isCorrect?: boolean;
}

interface ExploreWordsResponse {
  words: ExploreWord[];
  personalized: boolean;
  message: string;
}

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const { toast } = useToast();

  // Fetch personalized words based on student's incorrect answers
  const { data: exploreData, isLoading } = useQuery<ExploreWordsResponse>({
    queryKey: ["/api/explore/words"],
  });

  const addToStickyNotesMutation = useMutation({
    mutationFn: (word: ExploreWord) =>
      apiRequest("POST", "/api/sticky-notes", {
        word: word.word,
        example: word.example || "No example provided",
        category: word.category || "General",
        difficulty: word.difficulty || "medium",
      }),
    onSuccess: () => {
      toast({
        title: "Added to Canvas!",
        description: "The word has been saved to your collection for study.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
    },
    onError: (error: any) => {
      if (error.message?.includes("already exists")) {
        toast({
          title: "Already Added",
          description: "This word is already in your sticky notes collection.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to add word to sticky notes",
          variant: "destructive",
        });
      }
    },
  });

  const words = exploreData?.words || [];

  const filteredWords = words.filter((word) => {
    const matchesSearch =
      (word.word || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (word.definition || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      (word.category || "General") === selectedCategory;
    const matchesDifficulty =
      selectedDifficulty === "all" ||
      (word.difficulty || "medium") === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = [
    "all",
    ...Array.from(new Set(words.map((word) => word.category || "General"))),
  ];
  const difficulties = ["all", "easy", "medium", "hard"];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
      case "medium":
        return "bg-gradient-to-r from-amber-500 to-orange-500 text-white";
      case "hard":
        return "bg-gradient-to-r from-red-500 to-rose-500 text-white";
      default:
        return "bg-gradient-to-r from-gray-500 to-slate-500 text-white";
    }
  };

  const handleAddToStickyNotes = (word: ExploreWord) => {
    addToStickyNotesMutation.mutate(word);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-950 dark:via-purple-950 dark:to-indigo-950">
        <div className="container mx-auto p-6 max-w-6xl">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Brain className="h-10 w-10 text-white animate-pulse" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Loading personalized vocabulary...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 dark:from-slate-950 dark:via-purple-950 dark:to-indigo-950">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Lightbulb className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-indigo-900 dark:from-gray-100 dark:via-purple-200 dark:to-indigo-200 bg-clip-text text-transparent">
                Glossary
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {exploreData?.personalized
                  ? "Personalized words based on your recent test performance"
                  : "Discover new vocabulary words to expand your knowledge"}
              </p>
            </div>
          </div>

          {/* Personalization Alert */}
          {exploreData && (
            <div
              className={`relative overflow-hidden rounded-xl p-4 ${
                exploreData.personalized
                  ? "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/50 dark:border-blue-800/50"
                  : "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-200/50 dark:border-green-800/50"
              }`}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNDB2NDBIMHoiLz48cGF0aCBkPSJNMjAgMjBjMTEuMDQ2IDAgMjAtOC45NTQgMjAtMjBIMGMwIDExLjA0NiA4Ljk1NCAyMCAyMCAyMHoiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
              <div className="relative flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  exploreData.personalized
                    ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                    : "bg-gradient-to-br from-green-500 to-emerald-600"
                }`}>
                  {exploreData.personalized ? (
                    <Target className="h-5 w-5 text-white" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-white" />
                  )}
                </div>
                <p className={`font-medium ${
                  exploreData.personalized
                    ? "text-blue-800 dark:text-blue-200"
                    : "text-green-800 dark:text-green-200"
                }`}>
                  {exploreData.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-700/50 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-64">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Search className="h-4 w-4 text-white" />
                </div>
                <Input
                  type="text"
                  placeholder="Search words or definitions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-14 h-12 bg-white/50 dark:bg-slate-800/50 border-gray-200/50 dark:border-slate-700/50 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <Filter className="h-4 w-4 text-white" />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200/50 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm font-medium backdrop-blur-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category === "all" ? "All Categories" : category}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200/50 dark:border-slate-700/50 rounded-xl bg-white/50 dark:bg-slate-800/50 text-sm font-medium backdrop-blur-sm"
                >
                  {difficulties.map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty === "all"
                        ? "All Difficulties"
                        : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-6 flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 py-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 mr-2 text-purple-500" />
            Showing {filteredWords.length} of {words.length} words
          </Badge>
        </div>

        {/* Words Grid */}
        {filteredWords.length === 0 ? (
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-slate-700/50 shadow-lg">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No Words Found
                </h3>
                <p className="text-gray-500 dark:text-gray-500 max-w-md mx-auto">
                  {words.length === 0
                    ? "Complete some vocabulary tests to see personalized word suggestions here!"
                    : "Try adjusting your search or filters to find more words."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredWords.map((word, index) => (
              <Card
                key={`${word.word}-${index}`}
                className="group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-white/20 dark:border-slate-700/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden"
              >
                {/* Gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"></div>
                
                <CardHeader className="pb-3 pt-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-3 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent font-bold group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300">
                        {word.word}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge 
                          variant="secondary" 
                          className="text-xs bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800 border border-gray-200/50 dark:border-gray-700/50"
                        >
                          {word.category || "General"}
                        </Badge>
                        <Badge
                          className={`text-xs ${getDifficultyColor(word.difficulty || "medium")} shadow-sm`}
                        >
                          {word.difficulty || "medium"}
                        </Badge>
                        {word.listTitle === "AI Suggestions" && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                          >
                            {exploreData?.personalized && exploreData.words.some(w => w.isCorrect === false) 
                              ? "🔗 Related Word" 
                              : "✨ AI Suggested"
                            }
                          </Badge>
                        )}
                      </div>
                      {word.listTitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          From: {word.listTitle}
                        </p>
                      )}
                    </div>
                    {exploreData?.personalized && word.isCorrect === false && (
                      <div className="flex-shrink-0">
                        <Badge className="text-xs bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-sm shadow-red-500/25">
                          Review
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pb-5">
                  <CardDescription className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {word.definition}
                  </CardDescription>

                  {word.example && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-100 dark:border-purple-800/30">
                      <p className="text-sm italic text-gray-700 dark:text-gray-300">
                        "{word.example}"
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleAddToStickyNotes(word)}
                    disabled={addToStickyNotesMutation.isPending}
                    size="sm"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300 rounded-xl h-11"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addToStickyNotesMutation.isPending
                      ? "Adding..."
                      : "Add to Sticky Notes"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
