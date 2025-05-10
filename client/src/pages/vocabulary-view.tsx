import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { formatDate, createMarkup } from "@/lib/utils";
import { ChevronLeft, BookOpen, Calendar, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VocabularyWord {
  id: number;
  word: string;
}

interface Educator {
  id: number;
  name: string;
}

interface VocabularyList {
  id: number;
  title: string;
  passage?: string;
  dueDate?: string;
  words: VocabularyWord[];
  educator?: Educator;
}

export default function VocabularyView() {
  const { listId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Fetch vocabulary list with words
  const { data: list, isLoading } = useQuery<VocabularyList | null>({
    queryKey: ["/api/vocabulary-lists", listId],
    queryFn: async () => {
      if (!listId) return null;
      const response = await apiRequest("GET", `/api/vocabulary-lists/${listId}`);
      return response.json();
    },
    enabled: !!listId
  });

  // Start a new vocabulary check-up
  const startCheckUp = async () => {
    try {
      if (!listId) return;
      
      // First create a submission
      const res = await apiRequest("POST", "/api/submissions", { listId: parseInt(listId) });
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

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="container max-w-5xl mx-auto py-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-2/3 bg-gray-200 rounded mb-8"></div>
            <div className="h-64 w-full bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="container max-w-5xl mx-auto py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Vocabulary List Not Found</h1>
          <p className="text-muted-foreground mb-6">The vocabulary list you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/learner/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="container max-w-5xl mx-auto py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4">
            <div onClick={() => window.history.back()} className="flex items-center cursor-pointer">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </div>
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                <CardTitle className="text-2xl">{list.title}</CardTitle>
                {list.dueDate && (
                  <Badge variant="outline" className="flex items-center">
                    <Calendar className="mr-1 h-3.5 w-3.5" />
                    Due: {formatDate(list.dueDate)}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {list.educator && (
                  <span className="text-sm text-muted-foreground">
                    Created by {list.educator.name}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            
            {list.passage && (
              <CardContent className="border-t pt-4">
                <h3 className="text-lg font-medium mb-2 flex items-center">
                  <BookOpen className="mr-2 h-4 w-4" /> Reading Passage
                </h3>
                <div className="bg-muted/30 p-4 rounded-md text-sm leading-relaxed mb-6">
                  <div dangerouslySetInnerHTML={createMarkup(list.passage)} />
                </div>
              </CardContent>
            )}
            
            <CardContent className={list.passage ? "" : "border-t pt-4"}>
              <h3 className="text-lg font-medium mb-3">Vocabulary Words ({list.words?.length || 0})</h3>
              
              {list.words && list.words.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {list.words.map((word: VocabularyWord, index: number) => (
                    <Badge 
                      key={word.id} 
                      variant="outline"
                      className="py-2 px-3 text-sm justify-center font-medium"
                    >
                      {word.word}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No vocabulary words found in this list.</p>
              )}
            </CardContent>
            
            <CardFooter className="border-t bg-muted/20 flex justify-between gap-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
              <Button 
                className="w-full flex items-center justify-center" 
                onClick={startCheckUp}
              >
                Start Check-Up
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}