import { eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { vocabularyWords, inputFormQuestions, multipleChoiceQuestions } from "../shared/schema.js";
import { defaultGridInQuestion } from "../shared/grid-in.js";

// Also prepares older lists without requiring a data migration. Lock the words
// while checking/inserting so simultaneous publish or test requests cannot duplicate questions.
export async function ensureDefaultGridInQuestions(listId: number) {
  await db.transaction(async tx => {
    const words = await tx.select().from(vocabularyWords)
      .where(eq(vocabularyWords.listId, listId)).orderBy(vocabularyWords.id).for("update");
    if (!words.length) return;
    const ids = words.map(word => word.id);
    const inputs = await tx.select({ wordId: inputFormQuestions.wordId }).from(inputFormQuestions)
      .where(inArray(inputFormQuestions.wordId, ids));
    const choices = await tx.select({ wordId: multipleChoiceQuestions.wordId }).from(multipleChoiceQuestions)
      .where(inArray(multipleChoiceQuestions.wordId, ids));
    const covered = new Set([...inputs, ...choices].map(question => question.wordId));
    const defaults = words.filter(word => !covered.has(word.id)).map(defaultGridInQuestion);
    if (defaults.length) await tx.insert(inputFormQuestions).values(defaults);
  });
}
