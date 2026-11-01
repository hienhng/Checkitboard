import type { VocabularyWord } from "./schema";

export function defaultGridInQuestion(word: Pick<VocabularyWord, "id" | "word" | "definition">) {
  return {
    wordId: word.id,
    question: `What does "${word.word}" mean in the passage? Explain in your own words.`,
    correctAnswer: word.definition?.trim() || "",
    caseSensitive: false,
    showAnswer: true,
  };
}
