import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Users, BookOpen, Settings, Copy, Check, Mail, FileText, TrendingUp } from "lucide-react";
import { RequestApprovalButton } from "@/components/request-approval";

const classSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100, "Class name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface CreateClassDialogProps {
  onClassCreated?: (classData: any) => void;
  trigger?: React.ReactNode;
}

export function CreateClassDialog({ onClassCreated, trigger }: CreateClassDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createClassMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const res = await apiRequest("POST", "/api/classes", data);
      return res.json();
    },
    onSuccess: (newClass) => {
      toast({
        title: "Class created successfully",
        description: `${newClass.name} has been created with code: ${newClass.classCode}`,
      });
      
      // Refresh the classes query
      queryClient.invalidateQueries({ queryKey: ["/api/educator/classes"] });
      
      // Notify parent component
      onClassCreated?.(newClass);
      
      // Reset form and close dialog
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating class",
        description: error.message || "Failed to create class. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClassFormData) => {
    createClassMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New Class
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
          <DialogDescription>
            Create a new class to organize your students and assignments.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 7th Grade English"
                      {...field}
                    />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for your class..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createClassMutation.isPending}
              >
                {createClassMutation.isPending ? "Creating..." : "Create Class"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ClassCodeDisplay({ classCode }: { classCode: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy class code:', err);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">{classCode}</code>
      <Button
        variant="ghost"
        size="sm"
        onClick={copyToClipboard}
        className="h-8 w-8 p-0"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

interface StudentProgressDialogProps {
  classData: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StudentProgressDialog({ classData, open, onOpenChange }: StudentProgressDialogProps) {
  const { data: studentProgress = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/classes", classData.id, "student-performance"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/classes/${classData.id}/student-performance`);
      return response.json();
    },
    enabled: open, // Only fetch when dialog is open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Students in {classData.name}</DialogTitle>
          <DialogDescription>
            View student information and their progress in this class
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading student data...</p>
            </div>
          ) : studentProgress.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
              <p className="text-sm text-gray-500">
                Students can join this class using the class code: <strong>{classData.classCode}</strong>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {studentProgress.map((student: any) => (
                <Card key={student.studentId} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="bg-blue-100 rounded-full p-2">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{student.studentName}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {student.studentEmail}
                          </div>
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            {student.submissions?.length || 0} submissions
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">
                          {student.averageScore !== null ? `${Math.round(student.averageScore)}%` : 'No scores yet'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined: {new Date(student.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {student.submissions && student.submissions.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <h5 className="text-sm font-medium text-gray-700">Recent Submissions:</h5>
                      <div className="space-y-2">
                        {student.submissions.slice(0, 3).map((submission: any) => (
                          <div key={submission.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                            <div>
                              <p className="text-sm font-medium">{submission.listTitle}</p>
                              <p className="text-xs text-gray-500">
                                Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <Badge variant={submission.score >= 70 ? "default" : submission.score >= 50 ? "secondary" : "destructive"}>
                                {submission.score !== null ? `${submission.score}%` : 'Pending'}
                              </Badge>
                              {submission.gradedAt && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Graded: {new Date(submission.gradedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                        {student.submissions.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            ... and {student.submissions.length - 3} more submissions
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 text-center py-4 bg-gray-50 rounded">
                      <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No submissions yet</p>
                      <p className="text-xs text-gray-400">Student hasn't completed any vocabulary check-ups</p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ClassManagement() {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [showStudentDialog, setShowStudentDialog] = useState(false);

  // Fetch educator's classes
  const { data: classes = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/educator/classes"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/classes");
      return response.json();
    },
  });

  // Fetch pending join requests count
  const { data: joinRequestsData } = useQuery<any[]>({
    queryKey: ["/api/educator/join-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/educator/join-requests");
      return response.json();
    },
  });

  const pendingRequestsCount = joinRequestsData?.length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Class Management</h3>
            <p className="text-sm text-gray-500">Loading your classes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Class Management</h3>
            <p className="text-sm text-red-500">Error loading classes. Please try again.</p>
          </div>
          <CreateClassDialog />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Class Management</h3>
          <p className="text-sm text-gray-500">Manage your classes and students</p>
        </div>
        <div className="flex items-center space-x-3">
          <RequestApprovalButton requestCount={pendingRequestsCount} />
          <CreateClassDialog />
        </div>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              Create your first class to start organizing students and assignments.
            </p>
            <CreateClassDialog 
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Class
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls: any) => (
            <Card key={cls.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    {cls.description && (
                      <CardDescription className="text-sm">
                        {cls.description}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={cls.active ? "default" : "secondary"}>
                    {cls.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Class Code:</p>
                  <ClassCodeDisplay classCode={cls.classCode} />
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>{cls.students?.length || 0} students</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    <span>{cls.vocabularyLists?.length || 0} lists</span>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Created: {new Date(cls.createdAt).toLocaleDateString()}
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedClass(cls);
                      setShowStudentDialog(true);
                    }}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Students
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {classes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Class Overview</CardTitle>
            <CardDescription>Summary of all your classes</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Class Code</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Lists</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls: any) => (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>
                      <ClassCodeDisplay classCode={cls.classCode} />
                    </TableCell>
                    <TableCell>{cls.students?.length || 0}</TableCell>
                    <TableCell>{cls.vocabularyLists?.length || 0}</TableCell>
                    <TableCell>
                      <Badge variant={cls.active ? "default" : "secondary"}>
                        {cls.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(cls.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Student Progress Dialog */}
      {selectedClass && (
        <StudentProgressDialog
          classData={selectedClass}
          open={showStudentDialog}
          onOpenChange={setShowStudentDialog}
        />
      )}
    </div>
  );
}