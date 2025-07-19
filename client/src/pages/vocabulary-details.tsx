import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { MultipleChoiceManager } from "@/components/multiple-choice-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, createMarkup } from "@/lib/utils";
import { ChevronLeft, BookOpen, Calendar, School, HelpCircle, Users } from "lucide-react";
import type { VocabularyList, VocabularyWord } from "@shared/schema";

interface VocabularyListWithDetails extends VocabularyList {
  words: VocabularyWord[];
  class?: {
    id: number;
    name: string;
  };
  educator?: {
    id: number;
    name: string;
  };
}

export default function VocabularyDetails() {
  const { listId } = useParams();
  const [, navigate] = useLocation();
  
  // Fetch vocabulary list with words for educator
  const { data: list, isLoading } = useQuery<VocabularyListWithDetails | null>({
    queryKey: ["/api/vocabulary-lists", listId],
    queryFn: async () => {
      if (!listId) return null;
      const response = await apiRequest("GET", `/api/vocabulary-lists/${listId}`);
      return response.json();
    },
    enabled: !!listId
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="container max-w-6xl mx-auto py-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 w-full bg-gray-200 rounded mb-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="container max-w-6xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Vocabulary List Not Found</h1>
          <p className="text-muted-foreground mb-6">The vocabulary list you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/educator/assignments")}>Return to Vocabulary Management</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="container max-w-6xl mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/educator/assignments")} className="mb-4">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Vocabulary Management
          </Button>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold tracking-tight">{list.title}</h1>
              <div className="flex items-center gap-2">
                <Badge variant={list.published ? "default" : "secondary"}>
                  {list.published ? "Published" : "Draft"}
                </Badge>
                {list.class && (
                  <Badge variant="outline">
                    <School className="h-3 w-3 mr-1" />
                    {list.class.name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                <span>{list.words?.length || 0} words</span>
              </div>
              {list.dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Due {formatDate(list.dueDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="words">Words & Questions</TabsTrigger>
            <TabsTrigger value="passage">Reading Passage</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Words</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{list.words?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">vocabulary words</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">-</div>
                  <p className="text-xs text-muted-foreground">multiple choice</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{list.published ? "Live" : "Draft"}</div>
                  <p className="text-xs text-muted-foreground">current status</p>
                </CardContent>
              </Card>
            </div>

            {list.class && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Class Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{list.class.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        This vocabulary list is assigned to students in this class
                      </p>
                    </div>
                    <Badge variant="outline">
                      <School className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="words" className="space-y-6">
            {!list.words || list.words.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No vocabulary words found.</p>
                  <p className="text-sm">Edit the vocabulary list to add words.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {list.words.map((word) => (
                  <Card key={word.id}>
                    <CardHeader>
                      <CardTitle className="text-xl">{word.word}</CardTitle>
                      {word.definition && (
                        <p className="text-muted-foreground">{word.definition}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <MultipleChoiceManager word={word} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="passage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reading Passage</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The source text containing the vocabulary words
                </p>
              </CardHeader>
              <CardContent>
                {list.passage ? (
                  <div 
                    className="prose prose-sm max-w-none leading-relaxed text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={createMarkup(list.passage)}
                  />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reading passage provided.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}