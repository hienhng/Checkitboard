import React, { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Flashcard } from "@/components/flashcard";
import { Brain, CheckCircle, ArrowLeft, Shuffle } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function FlashcardsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("learning");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffled, setShuffled] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Fetch learner's flashcards
  const { 
    data: flashcards, 
    isLoading: flashcardsLoading,
    refetch: refetchFlashcards
  } = useQuery({
    queryKey: ["/api/learner/flashcards"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Define the flashcard type
  type Flashcard = {
    id: number;
    word: { word: string };
    definition: { 
      studentDefinition: string;
      submission: { list: { title: string } }
    };
    learned: boolean;
  };

  // Get learning cards (not yet learned)
  const learningCards = React.useMemo(() => 
    (flashcards as Flashcard[] || []).filter(card => !card.learned),
    [flashcards]
  );
  
  // Get learned cards
  const learnedCards = React.useMemo(() => 
    (flashcards as Flashcard[] || []).filter(card => card.learned),
    [flashcards]
  );
  
  // Ensure current index is valid whenever card lists change
  useEffect(() => {
    const currentCards = activeTab === "learning" ? learningCards : learnedCards;
    if (currentIndex >= currentCards.length && currentCards.length > 0) {
      setCurrentIndex(0);
    }
  }, [learningCards, learnedCards, activeTab, currentIndex]);

  // Shuffle cards
  const shuffleCards = () => {
    setShuffled(true);
    // Reset to first card
    setCurrentIndex(0);
    toast({
      title: "Cards shuffled",
      description: "The cards have been randomly rearranged for better learning.",
    });
  };

  // Navigate to next or previous card
  const navigateCard = (direction: "next" | "prev") => {
    const currentCards = activeTab === "learning" ? learningCards : learnedCards;
    
    // Safety check to avoid division by zero or empty array problems
    if (!currentCards || currentCards.length === 0) {
      return;
    }
    
    // Reset the flipped state when navigating to a new card
    setIsFlipped(false);
    
    if (direction === "next") {
      setCurrentIndex(prev => (prev + 1) % currentCards.length);
    } else {
      setCurrentIndex(prev => (prev - 1 + currentCards.length) % currentCards.length);
    }
  };

  // Get the cards to display based on current tab
  const cardsToDisplay = activeTab === "learning" ? learningCards : learnedCards;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      
      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <Link to="/learner/dashboard">
                  <Button variant="ghost" className="p-0 mb-2">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                  </Button>
                </Link>
                <h2 className="text-2xl font-bold text-neutral-dark">My Flashcards</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Practice vocabulary words to improve your retention.
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={shuffleCards}
                  disabled={flashcardsLoading || cardsToDisplay.length === 0}
                >
                  <Shuffle className="h-4 w-4 mr-2" /> Shuffle
                </Button>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-4 sm:px-6 lg:px-8">
            <Tabs 
              defaultValue="learning" 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value);
                // Reset to first card when switching tabs to avoid index out of bounds
                setCurrentIndex(0);
                // Refresh the flashcards data to ensure we're showing the latest state
                refetchFlashcards();
              }}
            >
              <div className="flex justify-between items-center">
                <TabsList>
                  <TabsTrigger value="learning" className="flex items-center">
                    <Brain className="h-4 w-4 mr-2" /> 
                    Learning
                    {learningCards.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                        {learningCards.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="learned" className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2" /> 
                    Learned
                    {learnedCards.length > 0 && (
                      <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
                        {learnedCards.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="learning" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Words I'm Learning</CardTitle>
                    <CardDescription>
                      Review these vocabulary words until you feel confident, then mark them as learned.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {flashcardsLoading ? (
                      <div className="py-6 text-center text-sm text-gray-500">Loading flashcards...</div>
                    ) : learningCards.length > 0 ? (
                      <div>
                        {/* Flashcard viewer with navigation */}
                        <div className="flex flex-col items-center justify-center py-6">
                          <div className="text-sm text-gray-500 mb-4">
                            Card {currentIndex + 1} of {learningCards.length} {shuffled && "(Shuffled)"}
                          </div>
                          
                          <div className="w-full md:max-w-md mx-auto flex justify-center overflow-visible">
                            <div className="flex-shrink-0">
                              <Flashcard 
                                flashcard={learningCards[currentIndex]} 
                                externalFlipped={isFlipped}
                                onFlippedChange={setIsFlipped}
                                onLearnedChange={(learned) => {
                                  if (learned) {
                                    // Get the updated list of learning cards after the state update
                                    const updatedLearningCards = learningCards.filter(card => 
                                      card.id !== learningCards[currentIndex].id
                                    );
                                    
                                    // After the API call completes and the list is updated
                                    // we need to wait a moment before navigating to avoid the "card not available" issue
                                    setTimeout(() => {
                                      // If there are more cards to show, navigate to next
                                      if (updatedLearningCards.length > 0) {
                                        // Check if we need to adjust the index
                                        if (currentIndex >= updatedLearningCards.length) {
                                          // If the current index would be out of bounds, go to the start
                                          setCurrentIndex(0);
                                        } else {
                                          // Otherwise, stay at the same index (which will show the next card)
                                          navigateCard("next");
                                        }
                                      } else {
                                        // If no more cards, reset the index to 0
                                        setCurrentIndex(0);
                                      }
                                      
                                      // Force a refetch to ensure we have the latest data
                                      refetchFlashcards();
                                    }, 300);
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex space-x-4 mt-6">
                            <Button 
                              onClick={() => navigateCard("prev")}
                              disabled={learningCards.length <= 1}
                              variant="outline"
                            >
                              Previous
                            </Button>
                            <Button 
                              onClick={() => navigateCard("next")}
                              disabled={learningCards.length <= 1}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <p className="text-sm text-gray-500 mb-4">
                          You don't have any flashcards to learn. When you get words wrong on a vocabulary 
                          check-up, they will appear here.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="learned" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Words I've Learned</CardTitle>
                    <CardDescription>
                      These are vocabulary words you've already mastered.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {flashcardsLoading ? (
                      <div className="py-6 text-center text-sm text-gray-500">Loading flashcards...</div>
                    ) : learnedCards.length > 0 ? (
                      <div>
                        {/* Flashcard viewer with navigation */}
                        <div className="flex flex-col items-center justify-center py-6">
                          <div className="text-sm text-gray-500 mb-4">
                            Card {currentIndex + 1} of {learnedCards.length}
                          </div>
                          
                          <div className="w-full md:max-w-md mx-auto flex justify-center overflow-visible">
                            <div className="flex-shrink-0">
                              <Flashcard 
                                flashcard={learnedCards[currentIndex]} 
                                externalFlipped={isFlipped}
                                onFlippedChange={setIsFlipped}
                                onLearnedChange={(learned) => {
                                  if (!learned) {
                                    // Get the updated list of learned cards after the state update
                                    const updatedLearnedCards = learnedCards.filter(card => 
                                      card.id !== learnedCards[currentIndex].id
                                    );
                                    
                                    // After the API call completes and the list is updated
                                    // we need to wait a moment before navigating to avoid the "card not available" issue
                                    setTimeout(() => {
                                      // If there are more cards to show, navigate to next
                                      if (updatedLearnedCards.length > 0) {
                                        // Check if we need to adjust the index
                                        if (currentIndex >= updatedLearnedCards.length) {
                                          // If the current index would be out of bounds, go to the start
                                          setCurrentIndex(0);
                                        } else {
                                          // Otherwise, stay at the same index (which will show the next card)
                                          navigateCard("next");
                                        }
                                      } else {
                                        // If no more cards, reset the index to 0
                                        setCurrentIndex(0);
                                        // If there are no more learned cards, switch to learning tab
                                        if (updatedLearnedCards.length === 0) {
                                          setActiveTab("learning");
                                        }
                                      }
                                      
                                      // Force a refetch to ensure we have the latest data
                                      refetchFlashcards();
                                    }, 300);
                                  }
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="flex space-x-4 mt-6">
                            <Button 
                              onClick={() => navigateCard("prev")}
                              disabled={learnedCards.length <= 1}
                              variant="outline"
                            >
                              Previous
                            </Button>
                            <Button 
                              onClick={() => navigateCard("next")}
                              disabled={learnedCards.length <= 1}
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-gray-500">
                        You haven't marked any words as learned yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
