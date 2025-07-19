import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import type { VocabularyWord, MultipleChoiceQuestion } from "@shared/schema";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, HelpCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const multipleChoiceSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  correctAnswer: z.enum(["A", "B", "C", "D"], { required_error: "Please select the correct answer" }),
  optionA: z.string().min(1, "Option A cannot be empty"),
  optionB: z.string().min(1, "Option B cannot be empty"),
  optionC: z.string().min(1, "Option C cannot be empty"),
  optionD: z.string().min(1, "Option D cannot be empty"),
});

type MultipleChoiceFormData = z.infer<typeof multipleChoiceSchema>;

interface MultipleChoiceManagerProps {
  word: VocabularyWord;
}

export function MultipleChoiceManager({ word }: MultipleChoiceManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<MultipleChoiceQuestion | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<MultipleChoiceFormData>({
    resolver: zodResolver(multipleChoiceSchema),
    defaultValues: {
      question: "",
      correctAnswer: "A",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
    },
  });

  const { data: questions = [], isLoading } = useQuery({
    queryKey: [`/api/vocabulary-words/${word.id}/multiple-choice`],
    enabled: !!word.id,
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: MultipleChoiceFormData) => {
      const response = await apiRequest("POST", `/api/vocabulary-words/${word.id}/multiple-choice`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Multiple choice question created successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-words/${word.id}/multiple-choice`] });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating question",
        description: error.message || "Failed to create multiple choice question",
        variant: "destructive",
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ questionId, data }: { questionId: number; data: Partial<MultipleChoiceFormData> }) => {
      const response = await apiRequest("PATCH", `/api/multiple-choice/${questionId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-words/${word.id}/multiple-choice`] });
      setIsDialogOpen(false);
      setEditingQuestion(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating question",
        description: error.message || "Failed to update question",
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: number) => {
      const response = await apiRequest("DELETE", `/api/multiple-choice/${questionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Question deleted successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/vocabulary-words/${word.id}/multiple-choice`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting question",
        description: error.message || "Failed to delete question",
        variant: "destructive",
      });
    },
  });

  const generateQuestionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/ai/generate-question`, {
        word: word.word,
        definition: word.definition || "",
      });
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue("question", data.question);
      form.setValue("optionA", data.optionA);
      form.setValue("optionB", data.optionB);
      form.setValue("optionC", data.optionC);
      form.setValue("optionD", data.optionD);
      form.setValue("correctAnswer", data.correctAnswer);
      toast({ title: "AI question generated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error generating question",
        description: error.message || "Failed to generate AI question",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (editingQuestion) {
      form.reset({
        question: editingQuestion.question,
        correctAnswer: editingQuestion.correctAnswer as "A" | "B" | "C" | "D",
        optionA: editingQuestion.optionA,
        optionB: editingQuestion.optionB,
        optionC: editingQuestion.optionC,
        optionD: editingQuestion.optionD,
      });
    } else {
      form.reset({
        question: "",
        correctAnswer: "A",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
      });
    }
  }, [editingQuestion, form]);

  const onSubmit = (data: MultipleChoiceFormData) => {
    if (editingQuestion) {
      updateQuestionMutation.mutate({ questionId: editingQuestion.id, data });
    } else {
      createQuestionMutation.mutate(data);
    }
  };

  const handleEdit = (question: MultipleChoiceQuestion) => {
    setEditingQuestion(question);
    setIsDialogOpen(true);
  };

  const handleDelete = (questionId: number) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingQuestion(null);
    form.reset();
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading questions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Multiple Choice Questions</h3>
          <Badge variant="outline">{questions.length} questions</Badge>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {
              setEditingQuestion(null);
              setIsDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
          
          <Button 
            onClick={() => {
              setEditingQuestion(null);
              setIsDialogOpen(true);
              setTimeout(() => generateQuestionMutation.mutate(), 100);
            }}
            variant="outline"
            className="border-purple-200 hover:bg-purple-50 hover:border-purple-300"
            disabled={generateQuestionMutation.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {generateQuestionMutation.isPending ? "Generating..." : "Generate with AI"}
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? "Edit" : "Create"} Multiple Choice Question for "{word.word}"
              </DialogTitle>
              {!editingQuestion && (
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => generateQuestionMutation.mutate()}
                    disabled={generateQuestionMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    {generateQuestionMutation.isPending ? "Generating..." : "Generate with AI"}
                  </Button>
                </div>
              )}
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
                          placeholder="What does the word mean in this context?"
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
                    name="optionA"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option A</FormLabel>
                        <FormControl>
                          <Input placeholder="First option" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="optionB"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option B</FormLabel>
                        <FormControl>
                          <Input placeholder="Second option" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="optionC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option C</FormLabel>
                        <FormControl>
                          <Input placeholder="Third option" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="optionD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Option D</FormLabel>
                        <FormControl>
                          <Input placeholder="Fourth option" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="correctAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select the correct answer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                          <SelectItem value="D">D</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                  >
                    {editingQuestion ? "Update" : "Create"} Question
                  </Button>
                </div>
              </form>
            </Form>
        </DialogContent>
      </Dialog>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No multiple choice questions created yet.</p>
            <p className="text-sm mb-4">Add questions to help students test their understanding of this word.</p>
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                variant="outline"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Manually
              </Button>
              <Button 
                onClick={() => {
                  setIsDialogOpen(true);
                  setTimeout(() => generateQuestionMutation.mutate(), 100);
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                disabled={generateQuestionMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {generateQuestionMutation.isPending ? "Generating..." : "Generate with AI"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {questions.map((question: MultipleChoiceQuestion) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{question.question}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(question)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(question.id)}
                      disabled={deleteQuestionMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={`p-2 rounded ${question.correctAnswer === 'A' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <strong>A:</strong> {question.optionA}
                  </div>
                  <div className={`p-2 rounded ${question.correctAnswer === 'B' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <strong>B:</strong> {question.optionB}
                  </div>
                  <div className={`p-2 rounded ${question.correctAnswer === 'C' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <strong>C:</strong> {question.optionC}
                  </div>
                  <div className={`p-2 rounded ${question.correctAnswer === 'D' ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <strong>D:</strong> {question.optionD}
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  Correct answer: <Badge variant="secondary">{question.correctAnswer}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}