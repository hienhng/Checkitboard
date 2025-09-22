import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Plus, Edit, HelpCircle, FileText, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MultipleChoiceManager } from "@/components/multiple-choice-manager";
import { InputFormManager } from "@/components/input-form-manager";
import type { VocabularyWord } from "@shared/schema";

interface VocabularyList {
  id: number;
  title: string;
  passage?: string;
  dueDate?: string;
  words: VocabularyWord[];
  educator?: {
    id: number;
    name: string;
  };
}

interface QuestionsPaneProps {
  vocabularyList: VocabularyList;
}

interface WordQuestionStatus {
  wordId: number;
  hasMultipleChoice: boolean;
  hasInputForm: boolean;
  multipleChoiceCount: number;
  inputFormCount: number;
}

export function QuestionsPane({ vocabularyList }: QuestionsPaneProps) {
  const [selectedQuestionType, setSelectedQuestionType] = useState<Record<number, "multiple-choice" | "input-form">>({});
  const [dialogOpen, setDialogOpen] = useState<Record<number, boolean>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch question status for all words
  const { data: questionStatuses = [], isLoading } = useQuery<WordQuestionStatus[]>({
    queryKey: [`/api/vocabulary-lists/${vocabularyList.id}/question-status`],
    enabled: !!vocabularyList.id,
  });

  const openDialog = (wordId: number) => {
    setDialogOpen(prev => ({ ...prev, [wordId]: true }));
  };

  const closeDialog = (wordId: number) => {
    setDialogOpen(prev => ({ ...prev, [wordId]: false }));
  };

  const getQuestionStatus = (wordId: number) => {
    const status = questionStatuses.find(s => s.wordId === wordId);
    if (!status) return { hasQuestions: false, type: "none", count: 0 };
    
    if (status.hasMultipleChoice && status.hasInputForm) {
      return { hasQuestions: true, type: "both", count: status.multipleChoiceCount + status.inputFormCount };
    } else if (status.hasMultipleChoice) {
      return { hasQuestions: true, type: "multiple-choice", count: status.multipleChoiceCount };
    } else if (status.hasInputForm) {
      return { hasQuestions: true, type: "input-form", count: status.inputFormCount };
    }
    
    return { hasQuestions: false, type: "none", count: 0 };
  };

  const getStatusBadge = (wordId: number) => {
    const status = getQuestionStatus(wordId);
    
    if (!status.hasQuestions) {
      return (
        <Badge variant="destructive" className="flex items-center">
          <XCircle className="mr-1 h-3 w-3" />
          No Questions
        </Badge>
      );
    }
    
    return (
      <Badge variant="default" className="flex items-center">
        <CheckCircle className="mr-1 h-3 w-3" />
        {status.count} Question{status.count > 1 ? 's' : ''}
      </Badge>
    );
  };

  const handleQuestionTypeChange = (wordId: number, questionType: "multiple-choice" | "input-form") => {
    setSelectedQuestionType(prev => ({ ...prev, [wordId]: questionType }));
    openDialog(wordId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const wordsWithoutQuestions = vocabularyList.words.filter(word => !getQuestionStatus(word.id).hasQuestions);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Question Management</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage questions for each vocabulary word. All words must have at least one question before publishing.
          </p>
        </div>
        
        {wordsWithoutQuestions.length > 0 && (
          <Badge variant="destructive" className="flex items-center">
            <AlertCircle className="mr-1 h-3 w-3" />
            {wordsWithoutQuestions.length} word{wordsWithoutQuestions.length > 1 ? 's' : ''} need questions
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {vocabularyList.words.map((word) => {
          const status = getQuestionStatus(word.id);
          
          return (
            <Card key={word.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">{word.word}</CardTitle>
                  {getStatusBadge(word.id)}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <Select
                    value={selectedQuestionType[word.id] || ""}
                    onValueChange={(value: "multiple-choice" | "input-form") => 
                      handleQuestionTypeChange(word.id, value)
                    }
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Choose question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">
                        <div className="flex items-center">
                          <HelpCircle className="mr-2 h-4 w-4" />
                          Multiple Choice
                        </div>
                      </SelectItem>
                      <SelectItem value="input-form">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          Input Form
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {status.hasQuestions && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(word.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Manage Questions
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Question Management Dialogs */}
      {vocabularyList.words.map((word) => (
        <Dialog 
          key={`dialog-${word.id}`} 
          open={dialogOpen[word.id] || false} 
          onOpenChange={(open) => open ? openDialog(word.id) : closeDialog(word.id)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Manage Questions for "{word.word}"
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              {selectedQuestionType[word.id] === "multiple-choice" && (
                <MultipleChoiceManager word={word} />
              )}
              
              {selectedQuestionType[word.id] === "input-form" && (
                <InputFormManager word={word} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </div>
  );
}