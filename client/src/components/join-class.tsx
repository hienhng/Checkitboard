import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  PlusCircle, 
  School,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  BookOpen
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatDate } from "@/lib/utils";

// Schema for joining a class
const joinClassSchema = z.object({
  classCode: z.string().min(6, "Class code must be at least 6 characters"),
});

type JoinClassData = z.infer<typeof joinClassSchema>;

export function JoinClass() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);

  // Form for joining a class
  const form = useForm<JoinClassData>({
    resolver: zodResolver(joinClassSchema),
    defaultValues: {
      classCode: "",
    },
  });

  // Query for fetching student's enrolled classes
  const { 
    data: enrolledClasses = [], 
    isLoading 
  } = useQuery<any[]>({
    queryKey: ["/api/learner/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/learner/classes");
      return response.json();
    },
  });

  // Mutation for joining a class
  const joinClassMutation = useMutation({
    mutationFn: async (data: JoinClassData) => {
      const response = await apiRequest("POST", "/api/join-class", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learner/classes"] });
      setIsJoinDialogOpen(false);
      form.reset();
      toast({
        title: "Request submitted",
        description: "Your request to join the class has been submitted. Waiting for educator approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while joining the class.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: JoinClassData) => {
    joinClassMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">My Classes</h2>
        <Button onClick={() => setIsJoinDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Join Class
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading classes...</div>
      ) : enrolledClasses?.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <School className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold tracking-tight">No Classes Yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            You haven't joined any classes yet. Enter a class code to join a class and access learning materials.
          </p>
          <Button onClick={() => setIsJoinDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Join a Class
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {enrolledClasses?.map((enrollment: any) => (
            <Card key={enrollment.id} className="overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle>{enrollment.class.name}</CardTitle>
                <CardDescription className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  Taught by {enrollment.class.educator.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Vocabulary Lists
                  </h4>
                  {enrollment.class.vocabularyLists?.length > 0 ? (
                    <div className="space-y-2">
                      {enrollment.class.vocabularyLists.map((list: any) => (
                        <div
                          key={list.id}
                          className="flex items-center justify-between p-2 border rounded-md"
                        >
                          <span className="font-medium">{list.title}</span>
                          {list.dueDate && (
                            <Badge variant="outline">
                              Due {formatDate(list.dueDate)}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No vocabulary lists assigned yet.
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/50 border-t">
                <Button 
                  variant="link" 
                  className="p-0" 
                  onClick={() => navigate(`/learner/class/${enrollment.class.id}`)}
                >
                  View All Lists
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Join Class Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Class</DialogTitle>
            <DialogDescription>
              Enter the class code provided by your educator to join a class.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="classCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CL123456" {...field} />
                    </FormControl>
                    <FormDescription>
                      Class codes are usually 8 characters starting with 'CL'
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsJoinDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={joinClassMutation.isPending}>
                  {joinClassMutation.isPending ? "Submitting..." : "Join Class"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}