import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChevronLeft, BookOpen, Calendar, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ClassListsPage() {
  const { classId } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Start a new vocabulary check-up
  const startCheckUp = async (listId: number) => {
    try {
      // Create a submission using the secure endpoint
      const res = await apiRequest("POST", `/api/vocabulary-lists/${listId}/start-test`);
      const data = await res.json();
      
      // Navigate to the check-up page with the submission ID
      navigate(`/learner/checkup/${data.submissionId}`);
    } catch (error: any) {
      // Handle incomplete submission case
      if (error.message?.includes("incomplete submission")) {
        try {
          // Try to parse the error message to get the existing submission ID
          // Remove status code prefix (e.g., "400: ") and parse JSON
          const jsonPart = error.message.replace(/^\d+:\s*/, "");
          const errorData = JSON.parse(jsonPart);
          if (errorData.submissionId) {
            navigate(`/learner/checkup/${errorData.submissionId}`);
            return;
          }
        } catch {
          // If we can't parse, proceed with showing the error
        }
      }
      
      // Handle retake limit errors and other errors
      toast({
        title: "Cannot start test",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Query for fetching class details
  const { 
    data: classData, 
    isLoading: classLoading
  } = useQuery({
    queryKey: ["/api/classes", classId],
    queryFn: async () => {
      if (!classId) return null;
      const response = await apiRequest("GET", `/api/classes/${classId}`);
      return response.json();
    },
    enabled: !!classId
  });

  // Query for fetching vocabulary lists for this class
  const { 
    data: lists = [], 
    isLoading: listsLoading 
  } = useQuery({
    queryKey: ["/api/classes", classId, "lists"],
    queryFn: async () => {
      if (!classId) return [];
      const response = await apiRequest("GET", `/api/classes/${classId}/lists`);
      return response.json();
    },
    enabled: !!classId
  });

  // Filter lists based on search term
  const filteredLists = lists.filter((list: any) => 
    list.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (classLoading || listsLoading) {
    return (
      <div className="workspace-page">
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link to="/learner/dashboard">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Skeleton className="h-10 w-1/3 mt-2" />
          <Skeleton className="h-6 w-1/4 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-4 w-1/2 mb-2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="mb-8">
        <Button variant="ghost" asChild>
          <Link to="/learner/dashboard">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="page-title">
          {classData?.name} Vocabulary Lists
        </h1>
        <p className="text-muted-foreground text-center mt-2">
          Explore all vocabulary lists available in this class
        </p>
        
        {!listsLoading && lists.length > 0 && (
          <div className="flex justify-center mt-4">
            <div className="bg-primary/10 px-4 py-2 rounded-full text-sm text-primary font-medium">
              {lists.filter((list: any) => list.submission?.completed).length} / {lists.length} Lists Completed
            </div>
          </div>
        )}
      </div>

      {/* Search and filter */}
      <div className="mb-8">
        <div className="relative max-w-md mx-auto">
          <input
            type="text"
            placeholder="Search vocabulary lists..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredLists.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-medium mb-2">No vocabulary lists found</h3>
          <p className="text-muted-foreground mb-4">
            There are no vocabulary lists available in this class{searchTerm ? " matching your search" : ""}.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLists.map((list: any) => (
            <Card key={list.id} className="overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex justify-between items-center">
                  <CardTitle>{list.title}</CardTitle>
                  {list.submission ? (
                    list.submission.isDiscarded ? (
                      <Badge className="bg-red-100 text-red-800">Abandoned</Badge>
                    ) : list.submission.completed ? (
                      list.submission.gradedAt ? (
                        <Badge className="bg-green-100 text-green-800">
                          {list.submission.score}% - Graded
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Pending Grade</Badge>
                      )
                    ) : (
                      <Badge variant="outline">In Progress</Badge>
                    )
                  ) : (
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">New</Badge>
                  )}
                </div>
                <CardDescription className="flex items-center mt-1">
                  {list.educator && (
                    <span className="flex items-center text-sm text-muted-foreground">
                      By {list.educator.name}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {list.passage && (
                  <div className="mb-4">
                    <p className="text-sm font-medium mb-1">Reading Passage</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {list.passage}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Due: {list.dueDate ? formatDate(list.dueDate) : "No due date"}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <ClipboardList className="h-4 w-4 mr-1" />
                    <span>{list.words?.length || 0} Words</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/20">
                {list.submission?.isDiscarded ? (
                  <div className="w-full">
                    <Button 
                      asChild 
                      className="w-full mb-2"
                      variant="outline"
                    >
                      <Link to={`/learner/vocabulary/${list.id}`}>
                        View Words
                      </Link>
                    </Button>
                    {list.submission.discardReason && (
                      <p className="text-xs text-red-600 text-center italic">
                        Reason: {list.submission.discardReason}
                      </p>
                    )}
                  </div>
                ) : list.submission?.completed ? (
                  <Button 
                    asChild 
                    className="w-full"
                    variant="outline"
                  >
                    <Link to={`/learner/vocabulary/${list.id}`}>
                      View Completed
                    </Link>
                  </Button>
                ) : (
                  <Button 
                    asChild 
                    className="w-full"
                    variant="outline"
                  >
                    <Link to={`/learner/vocabulary/${list.id}`}>
                      View Words
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}