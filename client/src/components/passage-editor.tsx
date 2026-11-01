import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, Loader2, Plus, Trophy, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckupSteps } from "@/components/checkup-steps";
import { AIPassageAssist } from "@/components/ai-assist";
import { WordToPassage } from "@/components/word-to-passage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface PassageEditorProps {
  onSuccess: (list: { id: number }, continueToPublishing: boolean) => void;
}

const steps = ["Details", "Passage", "Vocabulary", "Review"] as const;
const wordEdges = new RegExp("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$", "gu");
const headings = ["Set up your checkup", "Add a reading passage", "Choose vocabulary words", "Review your checkup"];
const descriptions = [
  "Give it a name and choose how your students will take part.",
  "Bring your own reading material, or create a passage from a word list.",
  "Choose the words you want your students to learn. You can adjust these before saving.",
  "Take a final look, then save a draft or continue to publishing.",
];

export function PassageEditor({ onSuccess }: PassageEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [title, setTitle] = useState("");
  const [checkupType, setCheckupType] = useState<"practice" | "test">("practice");
  const [dueDate, setDueDate] = useState("");
  const [passage, setPassage] = useState("");
  const [passageMode, setPassageMode] = useState("manual");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [manualWord, setManualWord] = useState("");
  const [error, setError] = useState("");
  const [continueAfterSave, setContinueAfterSave] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const passageRef = useRef<HTMLDivElement>(null);
  const skipWordClick = useRef(false);

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  const createListMutation = useMutation({
    mutationFn: async (continueToPublishing: boolean) => {
      setContinueAfterSave(continueToPublishing);
      const response = await apiRequest("POST", "/api/vocabulary-lists", {
        title: title.trim(), passage: passage.trim(), words: selectedWords, type: checkupType,
        dueDate: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : undefined,
        published: false,
      });
      return { list: await response.json(), continueToPublishing };
    },
    onSuccess: ({ list, continueToPublishing }) => onSuccess(list, continueToPublishing),
    onError: (saveError: Error) => toast({ title: "Couldn't save your checkup", description: saveError.message, variant: "destructive" }),
  });

  const validateThrough = (target: number) => {
    if (target > 0 && !title.trim()) return "Give your checkup a name to continue.";
    if (target > 1 && !passage.trim()) return "Add a reading passage to continue.";
    if (target > 2 && selectedWords.length === 0) return "Choose at least one vocabulary word to continue.";
    return "";
  };

  const goToStep = (next: number) => {
    const message = next > step ? validateThrough(next) : "";
    setError(message);
    if (message) return;
    setStep(next);
    setFurthestStep(previous => Math.max(previous, next));
  };

  const addWords = (words: string[]) => {
    setSelectedWords(previous => {
      const seen = new Set(previous.map(word => word.toLocaleLowerCase()));
      return [...previous, ...words.map(word => word.trim()).filter(word => {
        if (!word || seen.has(word.toLocaleLowerCase())) return false;
        seen.add(word.toLocaleLowerCase());
        return true;
      })];
    });
    setError("");
  };

  const updatePassage = (next: string) => {
    if (next !== passage) setSelectedWords([]);
    setPassage(next);
    setError("");
  };

  const save = (continueToPublishing: boolean) => {
    const message = validateThrough(3);
    if (message) { setError(message); return; }
    createListMutation.mutate(continueToPublishing);
  };

  const selected = new Set(selectedWords.map(word => word.toLocaleLowerCase()));
  const wordCount = passage.trim() ? passage.trim().split(/\s+/).length : 0;
  const isSaving = createListMutation.isPending;

  if (!user || user.role !== "educator") return <p>Only educators can create checkups.</p>;

  return (
    <div className="space-y-7 p-4 sm:p-6">
      <CheckupSteps steps={steps} currentStep={step} onStepChange={goToStep} canVisitStep={index => index <= furthestStep && !validateThrough(index)} disabled={isSaving} />
      <div>
        <p className="mb-2 text-xs font-medium text-primary">Step {step + 1} of {steps.length}</p>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight outline-none">{headings[step]}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{descriptions[step]}</p>
      </div>

      <section hidden={step !== 0} aria-label="Checkup details" className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <Label htmlFor="checkup-title">Checkup name <span className="text-muted-foreground">(required)</span></Label>
          <Input id="checkup-title" placeholder="e.g., Exploring rainforest ecosystems" value={title} onChange={event => { setTitle(event.target.value); setError(""); }} aria-invalid={!!error && !title.trim()} aria-describedby={error ? "checkup-error" : undefined} />
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Checkup type</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([{ value: "practice", title: "Practice", description: "Let students learn at their own pace and save their progress.", icon: BookOpen }, { value: "test", title: "Test", description: "Use fullscreen mode and track exits during an assessment.", icon: Trophy }] as const).map(({ value, title: label, description, icon: Icon }) => (
              <label key={value} className={cn("relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-ring", checkupType === value ? "border-primary bg-primary/5" : "hover:bg-muted/40")}>
                <input type="radio" name="checkup-type" value={value} checked={checkupType === value} onChange={() => setCheckupType(value)} className="sr-only" />
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span className="flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1.5 block text-xs leading-5 text-muted-foreground">{description}</span></span>
                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", checkupType === value && "border-primary bg-primary text-primary-foreground")}>{checkupType === value && <Check className="h-3 w-3" />}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="max-w-sm space-y-2">
          <Label htmlFor="checkup-due-date">Due date <span className="text-muted-foreground">(optional)</span></Label>
          <Input id="checkup-due-date" type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} />
          <p className="text-xs leading-5 text-muted-foreground">You can also set a deadline when you publish.</p>
        </div>
      </section>

      {/* Keep the AI editor mounted so returning to this step preserves its inputs. */}
      <section hidden={step !== 1} aria-label="Reading passage" className="space-y-5">
        <Tabs value={passageMode} onValueChange={setPassageMode}>
          <TabsList className="mb-4 grid h-auto w-full grid-cols-2 sm:max-w-md">
            <TabsTrigger value="manual" className="gap-2 px-2 py-2"><BookOpen className="h-4 w-4" />Use my passage</TabsTrigger>
            <TabsTrigger value="ai" className="gap-2 px-2 py-2"><Wand2 className="h-4 w-4" />Generate with AI</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="space-y-2">
            <Label htmlFor="reading-passage">Reading passage <span className="text-muted-foreground">(required)</span></Label>
            <Textarea id="reading-passage" placeholder="Paste or write the passage your students will read…" rows={10} value={passage} onChange={event => updatePassage(event.target.value)} aria-invalid={!!error && !passage.trim()} aria-describedby="passage-help" className="text-sm leading-7" />
            <p id="passage-help" className="text-xs text-muted-foreground">{wordCount > 0 ? `${wordCount} words · ` : ""}You'll choose vocabulary in the next step. Editing the passage clears your word selection.</p>
          </TabsContent>
          <TabsContent value="ai" forceMount className={cn(passageMode !== "ai" && "hidden")}>
            <WordToPassage onPassageGenerated={(generatedPassage, words) => {
              setPassage(generatedPassage || "");
              setSelectedWords([]);
              addWords(words);
              setPassageMode("manual");
              setError("");
              toast({ title: "Passage added", description: "Review the text, then continue to choose vocabulary." });
            }} />
          </TabsContent>
        </Tabs>
      </section>

      {step === 2 && <section aria-label="Vocabulary selection" className="space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <p className="mb-3 text-xs leading-5 text-muted-foreground">Click a word to select it. Click again to remove it, or highlight a phrase.</p>
            <div ref={passageRef} className="max-h-[440px] overflow-y-auto whitespace-pre-wrap rounded-xl border bg-muted/20 p-4 text-sm leading-8 sm:p-5"
              onMouseUp={() => {
                const selection = window.getSelection();
                if (!selection || selection.isCollapsed || !passageRef.current?.contains(selection.anchorNode) || !passageRef.current?.contains(selection.focusNode)) return;
                const phrase = selection.toString().trim();
                if (phrase) { addWords([phrase]); skipWordClick.current = true; selection.removeAllRanges(); }
              }}
              onClickCapture={event => { if (skipWordClick.current) { event.stopPropagation(); skipWordClick.current = false; } }}>
              {passage.split(/(\s+)/).map((token, index) => {
                const word = token.replace(wordEdges, "");
                if (!word || /^\s+$/.test(token)) return <span key={index}>{token}</span>;
                const isSelected = selected.has(word.toLocaleLowerCase());
                return <button key={index} type="button" aria-pressed={isSelected} aria-label={`${isSelected ? "Remove" : "Select"} ${word}`} className={cn("rounded px-0.5 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isSelected && "bg-primary/15 font-semibold text-primary")} onClick={() => isSelected ? setSelectedWords(previous => previous.filter(value => value.toLocaleLowerCase() !== word.toLocaleLowerCase())) : addWords([word])}>{token}</button>;
              })}
            </div>
          </div>
          <div className="rounded-xl border p-4">
            <h3 className="text-sm font-semibold">Selected words <span className="ml-1 text-muted-foreground">{selectedWords.length}</span></h3>
            <p className="mb-4 mt-1.5 text-xs leading-5 text-muted-foreground">Choose at least one word. Each will need a question before publishing.</p>
            <div className="mb-4 flex flex-wrap gap-2" aria-live="polite">
              {selectedWords.map(word => <Badge key={word} variant="secondary" className="gap-1 py-1">{word}<button type="button" onClick={() => setSelectedWords(previous => previous.filter(value => value !== word))} aria-label={`Remove ${word}`} className="rounded-sm p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" /></button></Badge>)}
              {!selectedWords.length && <p className="text-xs text-muted-foreground">Your words will appear here.</p>}
            </div>
            <form onSubmit={event => { event.preventDefault(); addWords([manualWord]); setManualWord(""); }} className="space-y-2">
              <Label htmlFor="manual-vocabulary" className="text-xs">Add a word or phrase</Label>
              <div className="flex gap-2"><Input id="manual-vocabulary" value={manualWord} onChange={event => setManualWord(event.target.value)} placeholder="e.g., biodiversity" /><Button type="submit" variant="outline" size="icon" className="shrink-0" disabled={!manualWord.trim()} aria-label="Add vocabulary word"><Plus /></Button></div>
            </form>
          </div>
        </div>
        {passage.trim().length >= 50 && <details className="rounded-xl border p-4"><summary className="cursor-pointer text-sm font-medium">Want a hand choosing words? Try AI suggestions</summary><div className="mt-4"><AIPassageAssist passage={passage} onSelectWords={addWords} /></div></details>}
      </section>}

      {step === 3 && <section aria-label="Review checkup" className="space-y-5">
        <div className="divide-y rounded-xl border">
          <div className="flex items-start justify-between gap-4 p-4 sm:p-5"><div><h3 className="font-semibold">{title}</h3><p className="mt-2 text-xs text-muted-foreground">{checkupType === "test" ? "Test" : "Practice"} · {dueDate ? `Due ${format(new Date(`${dueDate}T12:00:00`), "MMM d, yyyy")}` : "No due date"}</p></div><Button variant="ghost" size="sm" disabled={isSaving} onClick={() => goToStep(0)}>Edit details</Button></div>
          <div className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Reading passage <span className="font-normal text-muted-foreground">· {wordCount} words</span></h3><Button variant="ghost" size="sm" disabled={isSaving} onClick={() => goToStep(1)}>Edit passage</Button></div><p className="max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{passage}</p></div>
          <div className="p-4 sm:p-5"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Vocabulary · {selectedWords.length} {selectedWords.length === 1 ? "word" : "words"}</h3><Button variant="ghost" size="sm" disabled={isSaving} onClick={() => goToStep(2)}>Edit words</Button></div><div className="flex flex-wrap gap-2">{selectedWords.map(word => <Badge key={word} variant="secondary">{word}</Badge>)}</div></div>
        </div>
        <div className="rounded-xl bg-primary/5 p-4 text-sm leading-6"><h3 className="font-semibold">Next: choose classes and share</h3><p className="mt-1 text-muted-foreground">Each vocabulary word gets a grid-in question automatically. AI assesses learners’ answers when they submit. Choose classes and publish when you're ready.</p></div>
      </section>}

      {error && <p id="checkup-error" role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
        {step > 0 ? <Button variant="outline" onClick={() => goToStep(step - 1)} disabled={isSaving}><ArrowLeft />Back</Button> : <p className="text-xs text-muted-foreground">Start with the basics.</p>}
        <div className="flex flex-wrap gap-2">
          {step === 3 ? <>
            <Button variant="outline" onClick={() => save(false)} disabled={isSaving}>{isSaving && !continueAfterSave ? "Saving…" : "Save draft"}</Button>
            <Button onClick={() => save(true)} disabled={isSaving}>{isSaving && continueAfterSave ? <><Loader2 className="animate-spin" />Saving…</> : <>Continue to publishing<ArrowRight /></>}</Button>
          </> : <Button onClick={() => goToStep(step + 1)}>Continue to {steps[step + 1].toLowerCase()}<ArrowRight /></Button>}
        </div>
      </div>
    </div>
  );
}
