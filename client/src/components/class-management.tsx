import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Users, 
  BookOpen, 
  PlusCircle, 
  User, 
  CheckCircle, 
  XCircle,
  Copy,
  School
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Schema for creating a class
const createClassSchema = z.object({
  name: z.string().min(2, "Class name must be at least 2 characters"),
  description: z.string().optional(),
});

type CreateClassData = z.infer<typeof createClassSchema>;

export function ClassManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("classes");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Form for creating a new class
  const form = useForm<CreateClassData>({
    resolver: zodResolver(createClassSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Query for fetching educator's classes
  const { 
    data: classes = [], 
    isLoading: classesLoading 
  } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
  });

  // Query for fetching pending join requests
  const { 
    data: joinRequests = [], 
    isLoading: requestsLoading 
  } = useQuery<any[]>({
    queryKey: ["/api/educator/join-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/join-requests");
      return response.json();
    },
  });

  // Mutation for creating a new class
  const createClassMutation = useMutation({
    mutationFn: async (data: CreateClassData) => {
      const response = await apiRequest("POST", "/api/classes", data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Class created",
        description: "The class has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while creating the class.",
        variant: "destructive",
      });
    },
  });

  // Mutation for responding to join requests
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ 
      requestId, 
      status 
    }: { 
      requestId: number; 
      status: "approved" | "rejected" 
    }) => {
      const response = await apiRequest("PATCH", `/api/join-requests/${requestId}`, { status });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/educator/join-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] });
      toast({
        title: "Request updated",
        description: "The join request has been processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "An error occurred while processing the request.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CreateClassData) => {
    createClassMutation.mutate(data);
  };

  // Copy class code to clipboard
  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Class code copied to clipboard.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Class Management</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Class
        </Button>
      </div>

      <Tabs defaultValue="classes" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="classes" className="flex items-center">
            <School className="mr-2 h-4 w-4" />
            My Classes
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Join Requests
            {joinRequests?.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {joinRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          {classesLoading ? (
            <div className="text-center py-8">Loading classes...</div>
          ) : classes?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                You haven't created any classes yet. Create your first class to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes?.map((cls: any) => (
                <Card key={cls.id} className="overflow-hidden">
                  <CardHeader className="bg-primary/5">
                    <CardTitle className="flex justify-between items-center">
                      <span>{cls.name}</span>
                    </CardTitle>
                    <CardDescription className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      {cls.students?.length || 0} students
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {cls.description && <p className="mb-4">{cls.description}</p>}
                    <div className="flex items-center justify-between p-2 bg-muted rounded-md mb-4">
                      <div>
                        <p className="text-sm font-medium">Class Code</p>
                        <p className="font-bold">{cls.classCode}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyClassCode(cls.classCode)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Vocabulary Lists</p>
                      {cls.vocabularyLists?.length > 0 ? (
                        <div className="space-y-1">
                          {cls.vocabularyLists.map((list: any) => (
                            <div
                              key={list.id}
                              className="flex items-center justify-between p-2 bg-background border rounded-md"
                            >
                              <span>{list.title}</span>
                              {list.published ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800">Published</Badge>
                              ) : (
                                <Badge variant="outline">Draft</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No vocabulary lists assigned to this class yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/50 flex justify-between">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {requestsLoading ? (
            <div className="text-center py-8">Loading join requests...</div>
          ) : joinRequests?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                There are currently no pending join requests.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Pending Join Requests</h3>
              <div className="border rounded-md divide-y">
                {joinRequests?.map((request: any) => (
                  <div
                    key={request.id}
                    className="p-4 flex flex-col md:flex-row md:items-center md:justify-between"
                  >
                    <div className="mb-4 md:mb-0">
                      <p className="font-medium flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        {request.student.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.student.email}
                      </p>
                      <p className="text-sm mt-1">
                        Wants to join <span className="font-medium">{request.class.name}</span>
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        className="flex-1 md:flex-none"
                        onClick={() =>
                          respondToRequestMutation.mutate({
                            requestId: request.id,
                            status: "rejected",
                          })
                        }
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        className="flex-1 md:flex-none"
                        onClick={() =>
                          respondToRequestMutation.mutate({
                            requestId: request.id,
                            status: "approved",
                          })
                        }
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Class Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Class</DialogTitle>
            <DialogDescription>
              Create a class to organize your students and vocabulary lists.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., English 101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the class purpose or content"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createClassMutation.isPending}>
                  {createClassMutation.isPending ? "Creating..." : "Create Class"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}