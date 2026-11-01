import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckupSteps } from "@/components/checkup-steps";
import { format } from "date-fns";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Settings,
  Eye,
  Clock,
  Shuffle,
  CheckCircle,
  RotateCcw,
  Calendar,
  Users,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Send,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Class, VocabularyList, VocabularyWord } from "@shared/schema";

type PublishList = Omit<VocabularyList, "dueDate"> & {
  dueDate: string | null;
  words: VocabularyWord[];
};

const publishConfigSchema = z.object({
  type: z.enum(["test", "practice"]).default("practice"),
  dueDate: z.string().refine(value => !value || !Number.isNaN(new Date(value).getTime()), "Choose a valid due date").optional(),
  gradeVisibility: z.enum(["immediate", "afterDue", "manual"]).default("immediate"),
  timeLimit: z.number().int().min(1).max(300).optional(),
  shuffleQuestions: z.boolean().default(false),
  showCorrectAnswers: z.boolean().default(true),
  allowRedos: z.boolean().default(true),
  maxRedoAttempts: z.number().int().min(1).max(10).default(3),
  selectedClasses: z.array(z.number()).min(1, "Please select at least one class"),
}).superRefine((data, context) => {
  if (data.gradeVisibility === "afterDue" && !data.dueDate) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["dueDate"], message: "Add a due date to release grades after the deadline." });
  }
});

type PublishConfigForm = z.infer<typeof publishConfigSchema>;

export default function PublishVocabularyList() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [publishedCount, setPublishedCount] = useState(0);
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const publishingSteps = ["Settings", "Classes", "Review"] as const;

  useEffect(() => { stepHeading.current?.focus(); }, [step]);

  const listId = parseInt(id || "0");

  // Fetch vocabulary list
  const { data: vocabularyList, isLoading: loadingList } = useQuery<PublishList>({
    queryKey: [`/api/vocabulary-lists/${listId}`],
    enabled: !!listId,
  });

  // Fetch educator's classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/educator/classes"],
  });

  const form = useForm<PublishConfigForm>({
    resolver: zodResolver(publishConfigSchema),
    defaultValues: {
      type: vocabularyList?.type || "practice",
      dueDate: vocabularyList?.dueDate || "",
      gradeVisibility: vocabularyList?.gradeVisibility || "immediate",
      timeLimit: vocabularyList?.timeLimit || undefined,
      shuffleQuestions: vocabularyList?.shuffleQuestions ?? false,
      showCorrectAnswers: vocabularyList?.showCorrectAnswers ?? true,
      allowRedos: vocabularyList?.allowRedos ?? true,
      maxRedoAttempts: vocabularyList?.maxRedoAttempts || 3,
      selectedClasses: [],
    },
  });

  // Reset form when vocabulary list loads
  useEffect(() => {
    if (vocabularyList) {
      form.reset({
        type: vocabularyList.type || "practice",
        dueDate: vocabularyList.dueDate ? format(new Date(vocabularyList.dueDate), "yyyy-MM-dd'T'HH:mm") : "",
        gradeVisibility: vocabularyList.gradeVisibility || "immediate",
        timeLimit: vocabularyList.timeLimit || undefined,
        shuffleQuestions: vocabularyList.shuffleQuestions ?? false,
        showCorrectAnswers: vocabularyList.showCorrectAnswers ?? true,
        allowRedos: vocabularyList.allowRedos ?? true,
        maxRedoAttempts: vocabularyList.maxRedoAttempts || 3,
        selectedClasses: vocabularyList.classId ? [vocabularyList.classId] : [],
      });
    }
  }, [vocabularyList, form]);

  const publishMutation = useMutation({
    mutationFn: async (data: PublishConfigForm) => {
      const response = await apiRequest("POST", `/api/vocabulary-lists/${listId}/publish-multi`, {
        classIds: data.selectedClasses,
        type: data.type,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        gradeVisibility: data.gradeVisibility,
        timeLimit: data.timeLimit || null,
        shuffleQuestions: data.shuffleQuestions,
        showCorrectAnswers: data.showCorrectAnswers,
        allowRedos: data.allowRedos,
        maxRedoAttempts: data.maxRedoAttempts,
      });
      
      const result = await response.json();
      return result.publishedLists?.length || data.selectedClasses.length;
    },
    onSuccess: (count) => {
      setPublishedCount(count);
      setShowConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ["/api/educator/vocabulary-lists"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish vocabulary list",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PublishConfigForm) => {
    publishMutation.mutate(data);
  };

  const goToStep = async (next: number) => {
    if (next > step) {
      const fields: (keyof PublishConfigForm)[] = ["type", "dueDate", "gradeVisibility", "timeLimit", "shuffleQuestions", "showCorrectAnswers", "allowRedos", "maxRedoAttempts"];
      if (next === 2) fields.push("selectedClasses");
      if (!await form.trigger(fields, { shouldFocus: true })) return;
    }
    setStep(next);
    setFurthestStep(previous => Math.max(previous, next));
  };

  const values = form.watch();
  const selectedClassNames = classes.filter(cls => values.selectedClasses.includes(cls.id)).map(cls => cls.name);

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    navigate("/educator/assignments");
  };

  if (loadingList || loadingClasses) {
    return (
      <div className="workspace-page">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
            <p className="text-muted-foreground dark:text-gray-400">Loading configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!vocabularyList) {
    return (
      <div className="workspace-page">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground dark:text-gray-100 mb-2">
            Vocabulary List Not Found
          </h2>
          <Button onClick={() => navigate("/educator/assignments")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="workspace-page">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/educator/assignments")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Assignments
          </Button>
          
          <div className="bg-card dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-border dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="page-title">
                  Publish your checkup
                </h1>
                <p className="text-muted-foreground dark:text-gray-400">
                  Set up the student experience, choose classes, then review before sharing.
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">{vocabularyList.title}</p>
                <p className="text-xs mt-1">{vocabularyList.words?.length || 0} vocabulary words</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6"><CheckupSteps steps={publishingSteps} currentStep={step} onStepChange={next => { void goToStep(next); }} canVisitStep={index => index <= furthestStep} disabled={publishMutation.isPending} /></div>
        <div className="mb-5" aria-live="polite">
          <p className="text-xs font-medium text-primary">Step {step + 1} of {publishingSteps.length}</p>
          <h2 ref={stepHeading} tabIndex={-1} className="mt-2 text-xl font-semibold outline-none">{["Set the student experience", "Choose your classes", "Ready to share?"][step]}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{["Choose how students complete this checkup and see their results.", "Select at least one class. Only these classes will receive the checkup.", "Check the details below. Publishing makes this checkup available to the selected classes."][step]}</p>
        </div>
        <Form {...form}>
          <form onSubmit={event => {
            event.preventDefault();
            if (step < 2) { void goToStep(step + 1); return; }
            void form.handleSubmit(onSubmit, errors => setStep(errors.selectedClasses ? 1 : 0))(event);
          }} className="space-y-6">
            <div hidden={step !== 0} className="space-y-5">
            {/* Assignment Type & Due Date */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Basic Settings
                </CardTitle>
                <CardDescription>
                  Set the assignment type and due date
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="practice">Practice Mode</SelectItem>
                            <SelectItem value="test">Test Mode</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {field.value === "test" 
                            ? "Fullscreen mode with exit tracking" 
                            : "Casual mode with progress saving"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center">
                          <Calendar className="mr-2 h-4 w-4" />
                          Due Date (Optional)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Set a deadline for this assignment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Grade & Display Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Grade & Display Settings
                </CardTitle>
                <CardDescription>
                  Control when and how students see their results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="gradeVisibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade Visibility</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="immediate">Show grades immediately</SelectItem>
                          <SelectItem value="afterDue">Show grades after due date</SelectItem>
                          <SelectItem value="manual">Show grades manually</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        When students can see their grades
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="showCorrectAnswers"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Show Correct Answers
                        </FormLabel>
                        <FormDescription>
                          Display correct answers to students after submission
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Test Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Test Settings
                </CardTitle>
                <CardDescription>
                  Configure time limits and question shuffling
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="timeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Limit (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={300}
                          placeholder="No time limit"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value === "" ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty for no time limit
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shuffleQuestions"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="flex items-center">
                          <Shuffle className="mr-2 h-4 w-4" />
                          Shuffle Questions
                        </FormLabel>
                        <FormDescription>
                          Randomize question order for each student
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Retake Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Retake Settings
                </CardTitle>
                <CardDescription>
                  Allow students to retake the assignment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="allowRedos"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Allow Retakes</FormLabel>
                        <FormDescription>
                          Let students retake this assignment
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("allowRedos") && (
                  <FormField
                    control={form.control}
                    name="maxRedoAttempts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Retake Attempts</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Number of times students can retake (1-10)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            </div>

            <div hidden={step !== 1}>
            {/* Class Assignment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Assign to Classes
                </CardTitle>
                <CardDescription>
                  Select one or more classes to publish this assignment to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="selectedClasses"
                  render={() => (
                    <FormItem>
                      <div className="space-y-3">
                        {classes.length === 0 ? (
                          <div className="space-y-3"><p className="text-sm text-muted-foreground">You'll need a class before publishing. Your checkup is already saved as a draft.</p><Button type="button" variant="outline" onClick={() => navigate("/educator/classes")}>Create a class<ArrowRight /></Button></div>
                        ) : (
                          classes.map((cls: any) => (
                            <FormField
                              key={cls.id}
                              control={form.control}
                              name="selectedClasses"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={cls.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(cls.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, cls.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== cls.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none flex-1">
                                      <FormLabel className="font-medium cursor-pointer">
                                        {cls.name}
                                      </FormLabel>
                                      <FormDescription>
                                        {cls.studentCount || 0} students enrolled
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                );
                              }}
                            />
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            </div>

            {step === 2 && <Card>
              <CardHeader><CardTitle>{vocabularyList.title}</CardTitle><CardDescription>{vocabularyList.words.length} vocabulary words · {values.type === "test" ? "Test" : "Practice"}</CardDescription></CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Assigned classes</h3><Button type="button" variant="ghost" size="sm" onClick={() => { void goToStep(1); }}>Edit classes</Button></div><p className="text-sm text-muted-foreground">{selectedClassNames.join(", ")}</p></div>
                <div className="rounded-xl border p-4"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Student experience</h3><Button type="button" variant="ghost" size="sm" onClick={() => { void goToStep(0); }}>Edit settings</Button></div>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    {[
                      ["Due date", values.dueDate ? format(new Date(values.dueDate), "MMM d, yyyy · h:mm a") : "No deadline"],
                      ["Grades", { immediate: "Visible immediately", afterDue: "Visible after the due date", manual: "Released manually" }[values.gradeVisibility]],
                      ["Time limit", values.timeLimit ? `${values.timeLimit} minutes` : "No time limit"],
                      ["Question order", values.shuffleQuestions ? "Shuffled for each student" : "Original order"],
                      ["Correct answers", values.showCorrectAnswers ? "Shown after submission" : "Hidden"],
                      ["Retakes", values.allowRedos ? `Up to ${values.maxRedoAttempts} attempts` : "Not allowed"],
                    ].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}
                  </dl>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">This checkup will be available to {selectedClassNames.length} {selectedClassNames.length === 1 ? "class" : "classes"} when you publish.</p>
              </CardContent>
            </Card>}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card py-5">
              <Button
                type="button"
                variant="outline"
                onClick={() => step > 0 ? void goToStep(step - 1) : navigate(`/educator/vocabulary/${listId}?setup=1`)}
                disabled={publishMutation.isPending}
              >
                <ArrowLeft />{step > 0 ? "Back" : "Back to checkup"}
              </Button>
              {step < 2 ? <Button type="submit" disabled={publishMutation.isPending || (step === 1 && classes.length === 0)}>Continue to {publishingSteps[step + 1].toLowerCase()}<ArrowRight /></Button> : <Button
                type="submit"
                disabled={publishMutation.isPending || classes.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {publishMutation.isPending ? (
                  <>
                    <Send className="mr-2 h-4 w-4 animate-pulse" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Publish to {selectedClassNames.length} {selectedClassNames.length === 1 ? "class" : "classes"}
                  </>
                )}
              </Button>}
            </div>
          </form>
        </Form>

        {/* Success Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={open => { if (!open) handleConfirmationClose(); }}>
          <DialogContent>
            <DialogHeader>
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <DialogTitle className="text-center text-xl">
                Assignment Published Successfully!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your vocabulary assignment "{vocabularyList.title}" has been published to{" "}
                {publishedCount} {publishedCount === 1 ? "class" : "classes"}.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 my-4">
              <h4 className="font-medium text-sm mb-2">Assignment Details:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground dark:text-gray-300">
                <li>• Type: {form.getValues("type") === "test" ? "Test Mode" : "Practice Mode"}</li>
                <li>• Vocabulary Words: {vocabularyList.words?.length || 0}</li>
                <li>• Classes: {publishedCount}</li>
                {form.getValues("dueDate") && (
                  <li>• Due Date: {new Date(form.getValues("dueDate")!).toLocaleString()}</li>
                )}
                {form.getValues("timeLimit") && (
                  <li>• Time Limit: {form.getValues("timeLimit")} minutes</li>
                )}
              </ul>
            </div>
            <DialogFooter>
              <Button onClick={handleConfirmationClose} className="w-full">
                Back to Assignments
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
