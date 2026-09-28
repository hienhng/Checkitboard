import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, BookOpen, Lightbulb, Brain, Target, TrendingUp, AlertCircle } from "lucide-react";

interface ExploreWord {
  word: string;
  definition: string;
  example: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  listTitle?: string;
  submissionId?: number;
  isCorrect?: boolean;
}

interface ExploreWordsResponse {
  words: ExploreWord[];
  personalized: boolean;
  message: string;
}

const exploreWords: ExploreWord[] = [
  {
    word: "serendipity",
    definition: "The occurrence and development of events by chance in a happy or beneficial way",
    example: "Finding the perfect book at the library by serendipity changed her perspective on life.",
    difficulty: "hard",
    category: "Abstract"
  },
  {
    word: "ubiquitous",
    definition: "Present, appearing, or found everywhere",
    example: "Smartphones have become ubiquitous in modern society.",
    difficulty: "medium",
    category: "Descriptive"
  },
  {
    word: "ephemeral",
    definition: "Lasting for a very short time",
    example: "The beauty of cherry blossoms is ephemeral, lasting only a few weeks.",
    difficulty: "hard",
    category: "Time"
  },
  {
    word: "resilient",
    definition: "Able to withstand or recover quickly from difficult conditions",
    example: "The resilient community rebuilt after the natural disaster.",
    difficulty: "medium",
    category: "Character"
  },
  {
    word: "eloquent",
    definition: "Fluent or persuasive in speaking or writing",
    example: "Her eloquent speech moved the audience to tears.",
    difficulty: "medium",
    category: "Communication"
  },
  {
    word: "ambiguous",
    definition: "Open to more than one interpretation; having a double meaning",
    example: "The politician's ambiguous statement left voters confused about his position.",
    difficulty: "medium",
    category: "Clarity"
  },
  {
    word: "meticulous",
    definition: "Showing great attention to detail; very careful and precise",
    example: "The scientist's meticulous research led to a groundbreaking discovery.",
    difficulty: "medium",
    category: "Work Style"
  },
  {
    word: "innovative",
    definition: "Featuring new methods; advanced and original",
    example: "The company's innovative approach to sustainable energy impressed investors.",
    difficulty: "easy",
    category: "Technology"
  },
  {
    word: "pragmatic",
    definition: "Dealing with things sensibly and realistically",
    example: "She took a pragmatic approach to solving the budget crisis.",
    difficulty: "medium",
    category: "Approach"
  },
  {
    word: "profound",
    definition: "Very great or intense; showing great knowledge or insight",
    example: "The professor's lecture had a profound impact on the students' understanding.",
    difficulty: "medium",
    category: "Impact"
  }
];

export default function ExplorePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  const addToStickyNotesMutation = useMutation({
    mutationFn: (word: ExploreWord) => 
      apiRequest("POST", "/api/sticky-notes", {
        word: word.word,
        definition: word.definition,
        example: word.example,
        category: word.category,
        difficulty: word.difficulty
      }),
    onSuccess: () => {
      toast({
        title: "Word Added!",
        description: "Word has been added to your sticky notes for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sticky-notes"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add word to sticky notes",
        variant: "destructive",
      });
    }
  });

  const filteredWords = exploreWords.filter(word => {
    const matchesSearch = word.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         word.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || word.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(exploreWords.map(w => w.category)))];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Explore Vocabulary</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Discover new words and add them to your sticky notes for later review
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search words or definitions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === "all" ? "All Categories" : category}
            </option>
          ))}
        </select>
      </div>

      {/* Words Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWords.map((word, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {word.word}
                </CardTitle>
                <Badge className={getDifficultyColor(word.difficulty)}>
                  {word.difficulty}
                </Badge>
              </div>
              <Badge variant="outline" className="w-fit">
                {word.category}
              </Badge>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Definition:</h4>
                <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {word.definition}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Example:</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm italic leading-relaxed">
                  "{word.example}"
                </p>
              </div>
              
              <Button
                onClick={() => addToStickyNotesMutation.mutate(word)}
                disabled={addToStickyNotesMutation.isPending}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addToStickyNotesMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Adding...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Add to Sticky Notes
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWords.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No words found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or category filter
          </p>
        </div>
      )}
    </div>
  );
}