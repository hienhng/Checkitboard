import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Clock, Eye, CheckCircle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const assignmentPropertiesSchema = z.object({
  gradeVisibility: z.enum(["immediate", "afterDue", "manual"]).default("immediate"),
  timeLimit: z.number().min(1).max(300).optional(), // minutes
  shuffleQuestions: z.boolean().default(false),
  showCorrectAnswers: z.boolean().default(true),
  allowRedos: z.boolean().default(true),
  maxRedoAttempts: z.number().min(1).max(10).default(3),
});

type AssignmentPropertiesForm = z.infer<typeof assignmentPropertiesSchema>;

interface AssignmentPropertiesProps {
  vocabularyList: any;
  trigger?: React.ReactNode;
}

export function AssignmentProperties({ vocabularyList, trigger }: AssignmentPropertiesProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<AssignmentPropertiesForm>({
    resolver: zodResolver(assignmentPropertiesSchema),
    defaultValues: {
      gradeVisibility: vocabularyList?.gradeVisibility || "immediate",
      timeLimit: vocabularyList?.timeLimit || undefined,
      shuffleQuestions: vocabularyList?.shuffleQuestions ?? false,
      showCorrectAnswers: vocabularyList?.showCorrectAnswers ?? true,
      allowRedos: vocabularyList?.allowRedos ?? true,
      maxRedoAttempts: vocabularyList?.maxRedoAttempts || 3,
    },
  });

  const updatePropertiesMutation = useMutation({
    mutationFn: async (data: AssignmentPropertiesForm) => {
      const response = await apiRequest("PATCH", `/api/vocabulary-lists/${vocabularyList.id}/properties`, data);
      if (!response.ok) {
        throw new Error("Failed to update assignment properties");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Assignment properties updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update assignment properties",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssignmentPropertiesForm) => {
    // Convert empty timeLimit to undefined for the API
    const processedData = {
      ...data,
      timeLimit: data.timeLimit || undefined,
    };
    updatePropertiesMutation.mutate(processedData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Properties
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Assignment Properties
          </DialogTitle>
          <DialogDescription>
            Configure settings for "{vocabularyList?.title}" assignment
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Grade Visibility */}
            <FormField
              control={form.control}
              name="gradeVisibility"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    Grade Visibility
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select when students can see grades" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="immediate">Show grades immediately</SelectItem>
                      <SelectItem value="afterDue">Show grades after due date</SelectItem>
                      <SelectItem value="manual">Show grades manually</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Control when students can see their grades for this assignment
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />



            {/* Time Limit */}
            <FormField
              control={form.control}
              name="timeLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Time Limit (minutes)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={300}
                      placeholder="No time limit"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </FormControl>
                  <FormDescription>
                    Set a time limit for this assignment. Leave empty for no limit.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Shuffle Questions */}
            <FormField
              control={form.control}
              name="shuffleQuestions"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Shuffle Questions</FormLabel>
                    <FormDescription>
                      Present vocabulary words in random order for each student
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Show Correct Answers */}
            <FormField
              control={form.control}
              name="showCorrectAnswers"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center text-base">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Show Correct Answers
                    </FormLabel>
                    <FormDescription>
                      Show students the correct answers after they complete the assignment
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Allow Retakes */}
            <FormField
              control={form.control}
              name="allowRedos"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center text-base">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Allow Retakes
                    </FormLabel>
                    <FormDescription>
                      Allow students to retake this assignment if they want to improve their score
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Max Retake Attempts */}
            {form.watch("allowRedos") && (
              <FormField
                control={form.control}
                name="maxRedoAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Maximum Retake Attempts
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        min={1}
                        max={10}
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Set the maximum number of times a student can retake this assignment (1-10)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatePropertiesMutation.isPending}
              >
                {updatePropertiesMutation.isPending ? "Saving..." : "Save Properties"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}