import { db } from "@db";
import {
  users,
  vocabularyLists,
  vocabularyWords,
  submissions,
  wordDefinitions,
  flashcards,
  parentStudent,
  InsertUser,
  InsertVocabularyList,
  InsertVocabularyWord,
  InsertSubmission,
  InsertWordDefinition,
  InsertFlashcard,
  InsertParentStudent,
} from "@shared/schema";
import { eq, and, desc, isNull, asc, count, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  // User methods
  async getUser(id: number) {
    return await db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async getUserByEmail(email: string) {
    return await db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async createUser(userData: InsertUser) {
    const [user] = await db.insert(users).values(userData).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    });
    return user;
  }

  // Vocabulary list methods
  async getVocabularyList(id: number) {
    return await db.query.vocabularyLists.findFirst({
      where: eq(vocabularyLists.id, id),
    });
  }

  async getVocabularyListWithWords(id: number) {
    return await db.query.vocabularyLists.findFirst({
      where: eq(vocabularyLists.id, id),
      with: {
        words: {
          orderBy: asc(vocabularyWords.id),
        },
        educator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getVocabularyListsByEducator(educatorId: number) {
    return await db.query.vocabularyLists.findMany({
      where: eq(vocabularyLists.educatorId, educatorId),
      orderBy: [
        desc(vocabularyLists.createdAt),
      ],
      with: {
        words: {
          columns: {
            id: true,
            word: true,
          },
        },
      },
    });
  }

  async getPublishedVocabularyLists() {
    return await db.query.vocabularyLists.findMany({
      where: eq(vocabularyLists.published, true),
      orderBy: [
        desc(vocabularyLists.createdAt),
      ],
      with: {
        words: {
          columns: {
            id: true,
            word: true,
          },
        },
        educator: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async createVocabularyList(listData: InsertVocabularyList) {
    const [list] = await db.insert(vocabularyLists).values(listData).returning();
    return list;
  }

  async updateVocabularyList(id: number, data: Partial<InsertVocabularyList> & { published?: boolean }) {
    const [updatedList] = await db
      .update(vocabularyLists)
      .set(data)
      .where(eq(vocabularyLists.id, id))
      .returning();
    return updatedList;
  }

  // Vocabulary word methods
  async getVocabularyWord(id: number) {
    return await db.query.vocabularyWords.findFirst({
      where: eq(vocabularyWords.id, id),
    });
  }

  async createVocabularyWord(wordData: InsertVocabularyWord) {
    const [word] = await db.insert(vocabularyWords).values(wordData).returning();
    return word;
  }

  // Submission methods
  async getSubmission(id: number) {
    return await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
    });
  }

  async getSubmissionWithDefinitions(id: number) {
    return await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      with: {
        student: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        list: {
          with: {
            words: true,
            educator: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        wordDefinitions: {
          with: {
            word: true,
          },
        },
      },
    });
  }

  async getSubmissionByStudentAndList(studentId: number, listId: number) {
    return await db.query.submissions.findFirst({
      where: and(
        eq(submissions.studentId, studentId),
        eq(submissions.listId, listId)
      ),
    });
  }

  async getPendingSubmissionsForEducator(educatorId: number) {
    // Simplified approach: Find all the vocabulary lists created by this educator
    // And query submissions with a join to ensure proper filtering
    const pendingSubmissions = await db.query.submissions.findMany({
      where: and(
        eq(submissions.completed, true),
        isNull(submissions.gradedAt)
      ),
      with: {
        student: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        list: {
          where: eq(vocabularyLists.educatorId, educatorId),
          with: {
            words: {
              columns: {
                id: true,
                word: true,
              },
            },
          },
        },
      },
      orderBy: [desc(submissions.submittedAt)],
    });

    // Filter out any submissions where list is null (these are not for this educator)
    return pendingSubmissions.filter(submission => submission.list !== null);
  }

  async getGradedSubmissionsByStudent(studentId: number) {
    return await db.query.submissions.findMany({
      where: and(
        eq(submissions.studentId, studentId),
        eq(submissions.completed, true)
      ),
      with: {
        list: {
          columns: {
            id: true,
            title: true,
          },
          with: {
            educator: {
              columns: {
                id: true,
                name: true,
              },
            },
            words: {
              columns: {
                id: true,
              },
            },
          },
        },
        wordDefinitions: {
          columns: {
            id: true,
            isCorrect: true,
          },
        },
      },
      orderBy: [desc(submissions.gradedAt), desc(submissions.submittedAt)],
    });
  }

  async createSubmission(submissionData: InsertSubmission) {
    const [submission] = await db.insert(submissions).values(submissionData).returning();
    return submission;
  }

  async updateSubmission(id: number, data: { 
    completed?: boolean, 
    submittedAt?: Date, 
    score?: number, 
    gradedAt?: Date 
  }) {
    const [updatedSubmission] = await db
      .update(submissions)
      .set(data)
      .where(eq(submissions.id, id))
      .returning();
    return updatedSubmission;
  }

  // Word definition methods
  async getWordDefinition(id: number) {
    return await db.query.wordDefinitions.findFirst({
      where: eq(wordDefinitions.id, id),
    });
  }

  async getWordDefinitionsBySubmission(submissionId: number) {
    return await db.query.wordDefinitions.findMany({
      where: eq(wordDefinitions.submissionId, submissionId),
      with: {
        word: true,
      },
    });
  }

  async createWordDefinition(definitionData: InsertWordDefinition) {
    const [definition] = await db.insert(wordDefinitions).values(definitionData).returning();
    return definition;
  }

  async gradeWordDefinition(id: number, isCorrect: boolean, addedToFlashcards: boolean) {
    const [updatedDefinition] = await db
      .update(wordDefinitions)
      .set({ isCorrect, addedToFlashcards })
      .where(eq(wordDefinitions.id, id))
      .returning();
    return updatedDefinition;
  }

  // Flashcard methods
  async getFlashcard(id: number) {
    return await db.query.flashcards.findFirst({
      where: eq(flashcards.id, id),
    });
  }

  async getFlashcardsByStudent(studentId: number) {
    return await db.query.flashcards.findMany({
      where: eq(flashcards.studentId, studentId),
      with: {
        word: true,
        definition: {
          with: {
            submission: {
              with: {
                list: {
                  columns: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [desc(flashcards.createdAt)],
    });
  }

  async createFlashcard(flashcardData: InsertFlashcard) {
    const [flashcard] = await db.insert(flashcards).values(flashcardData).returning();
    return flashcard;
  }

  async updateFlashcard(id: number, data: { learned: boolean }) {
    const [updatedFlashcard] = await db
      .update(flashcards)
      .set(data)
      .where(eq(flashcards.id, id))
      .returning();
    return updatedFlashcard;
  }

  // Parent-student linking methods
  async linkParentToStudent(linkData: InsertParentStudent) {
    const [link] = await db.insert(parentStudent).values(linkData).returning();
    return link;
  }

  async getParentEmailsForStudent(studentId: number) {
    return await db.query.parentStudent.findMany({
      where: eq(parentStudent.studentId, studentId),
    });
  }
}

export const storage = new DatabaseStorage();
