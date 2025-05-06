import { db } from "@db";
import {
  users,
  vocabularyLists,
  vocabularyWords,
  submissions,
  wordDefinitions,
  flashcards,
  parentStudent,
  classes,
  studentClass,
  InsertUser,
  InsertVocabularyList,
  InsertVocabularyWord,
  InsertSubmission,
  InsertWordDefinition,
  InsertFlashcard,
  InsertParentStudent,
  InsertClass,
  InsertStudentClass,
} from "@shared/schema";
import { eq, and, desc, isNull, asc, count, sql, or } from "drizzle-orm";
export class DatabaseStorage {

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

  async getPublishedVocabularyLists(studentId?: number) {
    let query = db.query.vocabularyLists.findMany({
      where: eq(vocabularyLists.published, true),
      orderBy: [
        desc(vocabularyLists.createdAt),
      ],
      columns: {
        id: true,
        title: true,
        dueDate: true,
        published: true,
        educatorId: true,
        classId: true,
        createdAt: true,
        passage: true, // Include the passage text
      },
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
        class: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If studentId is provided, filter lists based on class access
    if (studentId) {
      // Get all classes the student is approved for
      const studentClasses = await db.query.studentClass.findMany({
        where: and(
          eq(studentClass.studentId, studentId),
          eq(studentClass.status, 'approved')
        ),
        columns: {
          classId: true,
        },
      });
      
      const classIds = studentClasses.map(sc => sc.classId);
      
      // Get vocabulary lists:
      // 1. Lists with no class restriction (classId is null)
      // 2. Lists assigned to classes the student is enrolled in
      return (await query).filter(list => 
        !list.classId || // No class restriction
        (list.classId && classIds.includes(list.classId)) // Or student is in the assigned class
      );
    }
    
    return await query;
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

  async getSubmissionByStudentAndList(studentId: number, listId: number, includeRedo: boolean = false) {
    if (includeRedo) {
      // Return all submissions for the student and list
      return await db.query.submissions.findFirst({
        where: and(
          eq(submissions.studentId, studentId),
          eq(submissions.listId, listId),
          eq(submissions.completed, false) // Return only incomplete ones
        ),
      });
    } else {
      // Return only non-redo submissions or incomplete redo submissions
      return await db.query.submissions.findFirst({
        where: and(
          eq(submissions.studentId, studentId),
          eq(submissions.listId, listId),
          or(
            eq(submissions.isRedo, false),
            eq(submissions.completed, false)
          )
        ),
      });
    }
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

    // Filter out any submissions that don't belong to this educator
    // @ts-ignore - Type definition doesn't correctly include the related entities
    return pendingSubmissions.filter(submission => submission.list !== null && submission.list.educatorId === educatorId);
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
            passage: true,
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
                word: true,
              },
            },
          },
        },
        wordDefinitions: {
          with: {
            word: {
              columns: {
                id: true,
                word: true,
              },
            },
          },
          columns: {
            id: true,
            isCorrect: true,
            studentDefinition: true,
            correctDefinition: true,
            showCorrectDefinition: true,
            addedToFlashcards: true,
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

  async gradeWordDefinition(id: number, isCorrect: boolean, addedToFlashcards: boolean, correctDefinition: string = '', showCorrectDefinition: boolean = true) {
    const [updatedDefinition] = await db
      .update(wordDefinitions)
      .set({ 
        isCorrect, 
        addedToFlashcards,
        correctDefinition, 
        showCorrectDefinition 
      })
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

  // Class management methods
  async getClassById(id: number) {
    return await db.query.classes.findFirst({
      where: eq(classes.id, id),
      with: {
        educator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        students: {
          with: {
            student: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        vocabularyLists: {
          columns: {
            id: true,
            title: true,
            published: true,
            dueDate: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getClassByCode(classCode: string) {
    return await db.query.classes.findFirst({
      where: eq(classes.classCode, classCode),
      with: {
        educator: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getClassesByEducator(educatorId: number) {
    return await db.query.classes.findMany({
      where: and(
        eq(classes.educatorId, educatorId),
        eq(classes.active, true)
      ),
      orderBy: [desc(classes.createdAt)],
      with: {
        students: {
          where: eq(studentClass.status, 'approved'),
          with: {
            student: {
              columns: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        vocabularyLists: {
          columns: {
            id: true,
            title: true,
            published: true,
            dueDate: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getClassesForStudent(studentId: number) {
    return await db.query.studentClass.findMany({
      where: and(
        eq(studentClass.studentId, studentId),
        eq(studentClass.status, 'approved')
      ),
      with: {
        class: {
          with: {
            educator: {
              columns: {
                id: true,
                name: true,
              },
            },
            vocabularyLists: {
              where: eq(vocabularyLists.published, true),
              columns: {
                id: true,
                title: true,
                dueDate: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  async getPendingJoinRequests(educatorId: number) {
    // Find classes created by this educator
    const educatorClasses = await db.query.classes.findMany({
      where: eq(classes.educatorId, educatorId),
      columns: {
        id: true,
      },
    });

    const classIds = educatorClasses.map(c => c.id);
    console.log("Class IDs for educator", educatorId, ":", classIds);

    if (classIds.length === 0) {
      console.log("No classes found for educator", educatorId);
      return [];
    }

    // Find pending join requests for those classes
    const pendingRequests = await db.query.studentClass.findMany({
      where: and(
        sql`${studentClass.classId} in (${sql.join(classIds, sql`, `)})`,
        eq(studentClass.status, 'pending')
      ),
      with: {
        student: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        class: {
          columns: {
            id: true,
            name: true,
            classCode: true,
          },
        },
      },
      orderBy: [desc(studentClass.createdAt)],
    });
    
    console.log("Pending requests found:", pendingRequests.length);
    return pendingRequests;
  }

  async createClass(classData: InsertClass) {
    const [newClass] = await db.insert(classes).values(classData).returning();
    return newClass;
  }

  async updateClass(id: number, data: Partial<InsertClass> & { active?: boolean }) {
    const [updatedClass] = await db
      .update(classes)
      .set(data)
      .where(eq(classes.id, id))
      .returning();
    return updatedClass;
  }

  async joinClass(studentClassData: InsertStudentClass) {
    console.log("Join class request received:", studentClassData);
    
    // Check if the student is already in the class
    const existingJoin = await db.query.studentClass.findFirst({
      where: and(
        eq(studentClass.studentId, studentClassData.studentId),
        eq(studentClass.classId, studentClassData.classId)
      ),
    });

    if (existingJoin) {
      console.log("Student already has a join request for this class:", existingJoin);
      return existingJoin;
    }

    // Create the new join request with explicit status
    const [joinRequest] = await db.insert(studentClass)
      .values({
        ...studentClassData,
        status: 'pending'
      })
      .returning();
    
    console.log("New join request created:", joinRequest);
    return joinRequest;
  }

  async updateJoinRequest(id: number, status: 'approved' | 'rejected') {
    const [updatedJoinRequest] = await db
      .update(studentClass)
      .set({ status })
      .where(eq(studentClass.id, id))
      .returning();
    return updatedJoinRequest;
  }
}

export const storage = new DatabaseStorage();
