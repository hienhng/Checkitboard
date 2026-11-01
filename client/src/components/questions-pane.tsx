import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle, Edit, FileText } from "lucide-react";
import { MultipleChoiceManager } from "@/components/multiple-choice-manager";
import { InputFormManager } from "@/components/input-form-manager";
import { defaultGridInQuestion } from "@shared/grid-in";
import type { VocabularyWord } from "@shared/schema";

interface QuestionsPaneProps {
  vocabularyList: { id: number; words: VocabularyWord[]; published?: boolean };
}
interface WordQuestionStatus {
  wordId: number;
  hasMultipleChoice: boolean;
  hasInputForm: boolean;
  multipleChoiceCount: number;
  inputFormCount: number;
}

export function QuestionsPane({ vocabularyList }: QuestionsPaneProps) {
  const [editing, setEditing] = useState<{ word: VocabularyWord; type: "input" | "multiple_choice" } | null>(null);
  const { data: statuses = [], isLoading, isError } = useQuery<WordQuestionStatus[]>({
    queryKey: [`/api/vocabulary-lists/${vocabularyList.id}/question-status`],
    enabled: !!vocabularyList.id,
  });
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Vocabulary questions</h3>
        <p className="mt-1 text-sm text-muted-foreground">Each new word automatically gets a grid-in question. Learners explain its meaning in their own words, and AI assesses their answers when they submit.</p>
        <p className="mt-2 text-sm text-muted-foreground">You can continue to publishing without generating any questions.</p>
      </div>
      {isLoading && <p role="status" className="text-sm text-muted-foreground">Preparing your questions…</p>}
      {isError && <p role="alert" className="text-sm text-destructive">Couldn't load question details. Refresh to try again.</p>}
      <div className="space-y-4">
        {vocabularyList.words.map(word => {
          const status = statuses.find(item => item.wordId === word.id);
          return (
            <Card key={word.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base font-medium">{word.word}</CardTitle>
                  <Badge variant="secondary"><CheckCircle className="mr-1 h-3 w-3" />{status?.hasInputForm || !status?.hasMultipleChoice ? "Grid-in · AI assessed" : "Multiple choice"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {(status?.hasInputForm || !status?.hasMultipleChoice) && <p className="text-sm text-muted-foreground">{defaultGridInQuestion(word).question}</p>}
                {!isLoading && !isError && !vocabularyList.published && <div className="flex flex-wrap gap-2">
                  {status?.hasInputForm && <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ word, type: "input" })}><Edit className="mr-2 h-4 w-4" />Customize question</Button>}
                  {status?.hasMultipleChoice && <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ word, type: "multiple_choice" })}><FileText className="mr-2 h-4 w-4" />Manage existing questions</Button>}
                </div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Questions for “{editing?.word.word}”</DialogTitle></DialogHeader>
          {editing?.type === "input" && <InputFormManager word={editing.word} />}
          {editing?.type === "multiple_choice" && <MultipleChoiceManager word={editing.word} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
