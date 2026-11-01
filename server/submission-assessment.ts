import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { submissions, vocabularyLists, vocabularyWords, inputFormQuestions, inputFormAnswers, multipleChoiceQuestions, multipleChoiceAnswers } from "../shared/schema";
import { assessGridInAnswers } from "./ai-assessment";

export async function completeQuestionSubmission(submissionId: number, studentId: number) {
  return db.transaction(async tx => {
    // Answer saves acquire the same lock so a delayed autosave cannot overwrite a final grade.
    const [submission] = await tx.select().from(submissions).where(and(
      eq(submissions.id, submissionId), eq(submissions.studentId, studentId),
    )).for("update");
    if (!submission || submission.completed) throw new Error("This submission is already completed or unavailable.");
    const [list] = await tx.select().from(vocabularyLists).where(eq(vocabularyLists.id, submission.listId));
    const inputs = await tx.select({
      id: inputFormQuestions.id, question: inputFormQuestions.question,
      referenceAnswer: inputFormQuestions.correctAnswer, word: vocabularyWords.word,
      definition: vocabularyWords.definition,
    }).from(inputFormQuestions).innerJoin(vocabularyWords, eq(inputFormQuestions.wordId, vocabularyWords.id))
      .where(eq(vocabularyWords.listId, submission.listId));
    const choices = await tx.select({ id: multipleChoiceQuestions.id }).from(multipleChoiceQuestions)
      .innerJoin(vocabularyWords, eq(multipleChoiceQuestions.wordId, vocabularyWords.id))
      .where(eq(vocabularyWords.listId, submission.listId));
    const inputAnswers = await tx.select().from(inputFormAnswers).where(eq(inputFormAnswers.submissionId, submissionId));
    const mcAnswers = await tx.select().from(multipleChoiceAnswers).where(eq(multipleChoiceAnswers.submissionId, submissionId));
    const answerById = new Map(inputAnswers.map(answer => [answer.questionId, answer.studentAnswer]));
    const assessments = await assessGridInAnswers(inputs.map(question => ({
      questionId: question.id, word: question.word, question: question.question,
      referenceAnswer: question.referenceAnswer || question.definition,
      studentAnswer: answerById.get(question.id) || "",
    })), list.passage);

    for (const assessment of assessments) {
      await tx.insert(inputFormAnswers).values({
        submissionId, questionId: assessment.questionId,
        studentAnswer: answerById.get(assessment.questionId) || "", isCorrect: assessment.isCorrect,
      }).onConflictDoUpdate({
        target: [inputFormAnswers.submissionId, inputFormAnswers.questionId],
        set: { isCorrect: assessment.isCorrect },
      });
    }
    const choiceIds = new Set(choices.map(question => question.id));
    const correct = assessments.filter(assessment => assessment.isCorrect).length +
      mcAnswers.filter(answer => choiceIds.has(answer.questionId) && answer.isCorrect).length;
    const total = inputs.length + choices.length;
    const [updated] = await tx.update(submissions).set({
      completed: true, submittedAt: new Date(), gradedAt: new Date(),
      score: total ? Math.round(correct / total * 100) : 0,
    }).where(eq(submissions.id, submissionId)).returning();
    return updated;
  });
}
