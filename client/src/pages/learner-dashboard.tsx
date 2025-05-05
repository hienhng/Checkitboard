import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Award,
  FileText,
  ChevronRight,
  Brain
} from "lucide-react";
import { getQueryFn, apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, formatDueDate, getScoreBgColor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Flashcard } from "@/components/flashcard";

export default function LearnerDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch published vocabulary lists
  const { data: vocabularyLists, isLoading: listsLoading } = useQuery({
    queryKey: ["/api/learner/vocabulary-lists"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch learner's completed and graded submissions
  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["/api/learner/results"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch learner's flashcards
  const { data: flashcards, isLoading: flashcardsLoading } = useQuery({
    queryKey: ["/api/learner/flashcards"],
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
    <div className="flex flex-col min-h-screen bg-neutral-light">
      <Navbar />
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-2xl font-bold text-neutral-dark">Student Dashboard</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Complete vocabulary check-ups and review your flashcards.
            </p>
          </div>
          
          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="space-y-6">
              {/* Pending Vocabulary Check-Ups */}
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
                  {vocabularyLists && vocabularyLists.filter(list => 
                    !list.submission || !list.submission.completed
                  ).length > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                      {vocabularyLists.filter(list => 
                        !list.submission || !list.submission.completed
                      ).length} Pending
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {listsLoading ? (
                    <div className="py-4 text-center text-sm text-gray-500">Loading check-ups...</div>
                  ) : vocabularyLists && vocabularyLists.filter(list => 
                    !list.submission || !list.submission.completed
                  ).length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {vocabularyLists
                        .filter(list => !list.submission || !list.submission.completed)
                        .map((list) => (
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
                      {results.map((result) => (
                        <div key={result.id} className="py-4 flex items-center">
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
                              {result.wordDefinitions && 
                               result.wordDefinitions.some(d => !d.isCorrect) && (
                                <p className="text-sm text-gray-500">
                                  {result.wordDefinitions.filter(d => !d.isCorrect).length} word(s) added to flashcards
                                </p>
                              )}
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
                  {flashcards && flashcards.filter(card => !card.learned).length > 0 && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      {flashcards.filter(card => !card.learned).length} Cards
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  {flashcardsLoading ? (
                    <div className="py-4 text-center text-sm text-gray-500">Loading flashcards...</div>
                  ) : flashcards && flashcards.filter(card => !card.learned).length > 0 ? (
                    <div>
                      <div className="flex overflow-x-auto hide-scrollbar pb-4 space-x-4">
                        {flashcards
                          .filter(card => !card.learned)
                          .map((card) => (
                            <Flashcard key={card.id} flashcard={card} />
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
          </div>
        </div>
      </div>
    </div>
  );
}
