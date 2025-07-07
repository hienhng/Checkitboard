import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form validation schema
const formSchema = z.object({
  classId: z.number().min(1, "Please select a class"),
});

interface EditVocabularyFormProps {
  vocabularyList: any;
  classes: any[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditVocabularyForm({ vocabularyList, classes, onSuccess, onCancel }: EditVocabularyFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(vocabularyList.title || "");
  const [passage, setPassage] = useState(vocabularyList.passage || "");
  const [selectedWords, setSelectedWords] = useState<string[]>(
    vocabularyList.words?.map((w: any) => w.word) || []
  );
  const [dueDate, setDueDate] = useState<Date | undefined>(
    vocabularyList.dueDate ? new Date(vocabularyList.dueDate) : undefined
  );

  // Form for class selection
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      classId: vocabularyList.classId || 0,
    }
  });

  // Handle passage text selection for vocabulary words
  const handlePassageSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim().toLowerCase();
      const words = selectedText.split(/\s+/).filter(word => 
        word.length > 2 && !selectedWords.includes(word)
      );
      
      if (words.length > 0) {
        setSelectedWords(prev => [...prev, ...words]);
        selection.removeAllRanges();
      }
    }
  };

  // Handle word click in passage
  const handleWordClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.textContent) {
      const word = target.textContent.toLowerCase().replace(/[^\w]/g, '');
      if (word.length > 2 && !selectedWords.includes(word)) {
        setSelectedWords(prev => [...prev, word]);
      }
    }
  };

  // Remove word from selection
  const handleRemoveWord = (wordToRemove: string) => {
    setSelectedWords(prev => prev.filter(word => word !== wordToRemove));
  };

  // Create clickable passage
  const createClickablePassage = (text: string) => {
    const words = text.split(/(\s+)/);
    return words.map((segment, index) => {
      if (segment.trim() && !segment.match(/^\s+$/)) {
        const cleanWord = segment.toLowerCase().replace(/[^\w]/g, '');
        const isSelected = selectedWords.includes(cleanWord);
        return (
          <span
            key={index}
            className={`cursor-pointer hover:bg-yellow-100 ${
              isSelected ? 'bg-yellow-200 font-semibold border-b-2 border-yellow-400' : ''
            }`}
            onClick={handleWordClick}
          >
            {segment}
          </span>
        );
      }
      return segment;
    });
  };

  // Mutation to update vocabulary list
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        title: data.title,
        passage: data.passage,
        words: data.words,
        dueDate: data.dueDate ? data.dueDate.toISOString() : undefined,
        classId: data.classId,
      };
      
      const res = await apiRequest("PATCH", `/api/vocabulary-lists/${vocabularyList.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating vocabulary list",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the vocabulary list.",
        variant: "destructive",
      });
      return;
    }

    if (!passage.trim()) {
      toast({
        title: "Passage required",
        description: "Please enter a reading passage.",
        variant: "destructive",
      });
      return;
    }

    if (selectedWords.length === 0) {
      toast({
        title: "Vocabulary words required",
        description: "Please select at least one vocabulary word.",
        variant: "destructive",
      });
      return;
    }

    // Validate class selection
    const result = await form.trigger("classId");
    if (!result) {
      toast({
        title: "Class selection required",
        description: "Please select a class to assign this vocabulary list.",
        variant: "destructive",
      });
      return;
    }

    const { classId } = form.getValues();

    updateMutation.mutate({
      title,
      passage,
      words: selectedWords,
      dueDate,
      classId,
    });
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="list-title">List Title</Label>
            <Input
              id="list-title"
              type="text"
              placeholder="e.g., Science Vocabulary - Rainforest Ecosystems"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Reading Passage */}
          <div>
            <Label htmlFor="reading-passage">Reading Passage</Label>
            <div className="mt-1">
              <Textarea
                id="reading-passage"
                placeholder="Enter your reading passage here..."
                value={passage}
                onChange={(e) => setPassage(e.target.value)}
                rows={8}
                className="mb-2"
              />
              <p className="text-xs text-gray-500 mb-2">
                Click on words in the preview below to select vocabulary words
              </p>
              {passage && (
                <div 
                  className="border rounded-md p-3 bg-gray-50 cursor-text text-sm leading-relaxed"
                  onMouseUp={handlePassageSelection}
                >
                  {createClickablePassage(passage)}
                </div>
              )}
            </div>
          </div>

          {/* Selected Vocabulary Words */}
          <div>
            <Label className="block text-sm font-medium text-gray-700">
              Selected Vocabulary Words ({selectedWords.length})
            </Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {selectedWords.map((word) => (
                <Badge key={word} className="highlighted-word">
                  {word}
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-white-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    onClick={() => handleRemoveWord(word)}
                    aria-label={`Remove ${word}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {selectedWords.length === 0 && (
                <p className="text-sm text-gray-500">
                  No words selected yet. Click on words in the passage above.
                </p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <Label>Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a due date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Class Assignment */}
          <FormField
            control={form.control}
            name="classId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Class</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleSubmit}
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? "Updating..." : "Update Vocabulary List"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}