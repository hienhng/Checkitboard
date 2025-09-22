import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { VocabularyWord, InputFormQuestion } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const inputFormSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  correctAnswer: z.string().min(1, "Correct answer cannot be empty"),
  caseSensitive: z.boolean().default(false),
  showAnswer: z.boolean().default(true),
});

type InputFormData = z.infer<typeof inputFormSchema>;

interface InputFormManagerProps {
  word: VocabularyWord;
}

export function InputFormManager({ word }: InputFormManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<InputFormQuestion | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InputFormData>({
    resolver: zodResolver(inputFormSchema),
    defaultValues: {
      question: "",
      correctAnswer: "",
      caseSensitive: false,
      showAnswer: true,
    },
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: [`/api/vocabulary-words/${word.id}/input-form`],
    enabled: !!word.id,
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: InputFormData) => {
      const response = await apiRequest("POST", `/api/vocabulary-words/${word.id}/input-form`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Input form question created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-words/${word.id}/input-form`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-lists/${word.listId}/question-status`] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating question",
        description: error.message || "Failed to create input form question",
        variant: "destructive",
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async (data: InputFormData) => {
      if (!editingQuestion) throw new Error("No question selected for editing");
      const response = await apiRequest("PATCH", `/api/input-form/${editingQuestion.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Input form question updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-words/${word.id}/input-form`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-lists/${word.listId}/question-status`] });
      setIsDialogOpen(false);
      setEditingQuestion(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating question",
        description: error.message || "Failed to update input form question",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await apiRequest("DELETE", `/api/input-form/${questionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Input form question deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-words/${word.id}/input-form`] });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-lists/${word.listId}/question-status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting question",
        description: error.message || "Failed to delete input form question",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (question: InputFormQuestion) => {
    setEditingQuestion(question);
    form.reset({
      question: question.question,
      correctAnswer: question.correctAnswer,
      caseSensitive: question.caseSensitive,
      showAnswer: question.showAnswer,
    });
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingQuestion(null);
    form.reset({
      question: "",
      correctAnswer: "",
      caseSensitive: false,
      showAnswer: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InputFormData) => {
    if (editingQuestion) {
      updateQuestionMutation.mutate(data);
    } else {
      createQuestionMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Input Form Questions</h3>
          <Badge variant="secondary">{questions.length} questions</Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? "Edit Input Form Question" : "Create Input Form Question"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter the question (e.g., What is the definition of this word?)"
                          className="min-h-[80px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="correctAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter the correct answer"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="caseSensitive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Case Sensitive</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Require exact case matching
                          </div>
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

                  <FormField
                    control={form.control}
                    name="showAnswer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Show Answer</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Display correct answer to students
                          </div>
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
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                  >
                    {editingQuestion ? "Update Question" : "Create Question"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No input form questions created yet.</p>
            <p className="text-sm">Click "Add Question" to create your first question.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question: InputFormQuestion, index: number) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">Question {index + 1}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{question.question}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(question)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteQuestionMutation.mutate(question.id)}
                      disabled={deleteQuestionMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Correct Answer: </span>
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {question.correctAnswer}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Case Sensitive: {question.caseSensitive ? "Yes" : "No"}
                    </span>
                    <span>
                      Show Answer: {question.showAnswer ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}