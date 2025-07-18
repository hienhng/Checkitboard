import { db, pool } from "@db";
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
  notifications,
  fullscreenExits,
  InsertUser,
  InsertVocabularyList,
  InsertVocabularyWord,
  InsertSubmission,
  InsertWordDefinition,
  InsertFlashcard,
  InsertParentStudent,
  InsertClass,
  InsertStudentClass,
  InsertNotification,
  InsertFullscreenExit,
} from "@shared/schema";
import { eq, and, desc, isNull, asc, count, sql, or, inArray } from "drizzle-orm";
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
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    });
    return user;
  }

  async getUserByVerificationToken(token: string) {
    return await db.query.users.findFirst({
      where: eq(users.emailVerificationToken, token),
    });
  }

  async updateUserVerification(id: number, data: { 
    emailVerified?: boolean; 
    emailVerificationToken?: string | null; 
    emailVerificationExpires?: Date | null;
  }) {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerified: users.emailVerified,
      });
    return user;
  }

  async updateUserPasswordReset(id: number, data: {
    passwordResetToken?: string | null,
    passwordResetExpires?: Date | null,
    password?: string
  }) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });
    return user;
  }

  async getUserByPasswordResetToken(token: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.passwordResetToken, token),
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
    // Students can only see vocabulary lists assigned to classes they're enrolled in
    // No global lists should be visible
    
    if (!studentId) {
      return []; // No student ID means no access to any lists
    }

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
    
    // If student is not in any classes, they can't see any vocabulary lists
    if (classIds.length === 0) {
      return [];
    }

    // Get only the class-specific lists for classes the student is enrolled in
    const classQuery = `
      SELECT 
        vl.id, vl.title, vl.due_date, vl.published, 
        vl.educator_id, vl.class_id, vl.created_at, vl.passage,
        e.id as educator_id, e.name as educator_name,
        c.id as class_id, c.name as class_name
      FROM vocabulary_lists vl
      LEFT JOIN users e ON vl.educator_id = e.id
      LEFT JOIN classes c ON vl.class_id = c.id
      WHERE vl.class_id = ANY($1) AND vl.published = true
      ORDER BY vl.created_at DESC
    `;
    
    const result = await pool.query(classQuery, [classIds]);
    const classListRows = result.rows;
    
    // Get words for each list
    const wordQuery = `
      SELECT vw.id, vw.word, vw.list_id
      FROM vocabulary_words vw
      WHERE vw.list_id = ANY($1)
    `;
    
    const listIds = classListRows.map((list: any) => list.id);
    const wordResult = await pool.query(wordQuery, [listIds]);
    const wordRows = wordResult.rows;
    
    // Format class lists to match the structure from the ORM query
    const classLists = classListRows.map((row: any) => ({
      id: row.id,
      title: row.title,
      dueDate: row.due_date,
      published: row.published,
      educatorId: row.educator_id,
      classId: row.class_id,
      createdAt: row.created_at,
      passage: row.passage,
      words: wordRows
        .filter((word: any) => word.list_id === row.id)
        .map((word: any) => ({
          id: word.id,
          word: word.word
        })),
      educator: row.educator_id ? {
        id: row.educator_id,
        name: row.educator_name
      } : null,
      class: row.class_id ? {
        id: row.class_id,
        name: row.class_name
      } : null
    }));
    
    return classLists;
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
      columns: {
        id: true,
        studentId: true,
        listId: true,
        completed: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        isRedo: true,
        createdAt: true
      }
    });
  }

  async getSubmissionWithDefinitions(id: number) {
    return await db.query.submissions.findFirst({
      where: eq(submissions.id, id),
      columns: {
        id: true,
        studentId: true,
        listId: true,
        completed: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        isRedo: true,
        createdAt: true
      },
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
      // Return the most recent completed and graded submission for viewing results
      return await db.query.submissions.findFirst({
        where: and(
          eq(submissions.studentId, studentId),
          eq(submissions.listId, listId),
          eq(submissions.completed, true) // Return only completed ones
        ),
        orderBy: [desc(submissions.gradedAt), desc(submissions.submittedAt)],
        columns: {
          id: true,
          studentId: true,
          listId: true,
          completed: true,
          score: true,
          submittedAt: true,
          gradedAt: true,
          isRedo: true,
          isDiscarded: true,
          discardReason: true,
          createdAt: true
        }
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
        columns: {
          id: true,
          studentId: true,
          listId: true,
          completed: true,
          score: true,
          submittedAt: true,
          gradedAt: true,
          isRedo: true,
          isDiscarded: true,
          discardReason: true,
          createdAt: true
        }
      });
    }
  }

  async getPendingSubmissionsForEducator(educatorId: number) {
    // Get all vocabulary lists created by this educator
    const educatorLists = await db.query.vocabularyLists.findMany({
      where: eq(vocabularyLists.educatorId, educatorId),
      columns: {
        id: true
      }
    });
    
    // Get list IDs
    const listIds = educatorLists.map(list => list.id);
    
    // If educator has no lists, return empty array
    if (listIds.length === 0) {
      return [];
    }
    
    // Find all completed but ungraded submissions
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
          columns: {
            id: true, 
            title: true,
            educatorId: true
          },
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
    
    // Filter submissions to only include those for lists created by this educator
    return pendingSubmissions.filter(submission => 
      submission.list && submission.list.educatorId === educatorId
    );
  }

  async getGradedSubmissionsByStudent(studentId: number) {
    // First get all completed submissions for this student
    const allSubmissions = await db.query.submissions.findMany({
      where: and(
        eq(submissions.studentId, studentId),
        eq(submissions.completed, true)
      ),
      columns: {
        id: true,
        studentId: true,
        listId: true,
        completed: true,
        score: true,
        submittedAt: true,
        gradedAt: true,
        isRedo: true,
        createdAt: true
      },
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
    
    // Filter after query to only include submissions that have been graded
    return allSubmissions.filter(submission => submission.gradedAt !== null);
  }

  async createSubmission(submissionData: InsertSubmission) {
    // Create a properly typed object with only the fields we know exist in the database
    const validSubmissionData: typeof submissionData = {
      studentId: submissionData.studentId,
      listId: submissionData.listId,
      isRedo: submissionData.isRedo ?? false
    };
    
    const [submission] = await db.insert(submissions).values(validSubmissionData).returning();
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
      columns: {
        id: true,
        studentId: true,
        wordId: true,
        definitionId: true,
        learned: true,
        createdAt: true
      },
      with: {
        word: {
          columns: {
            id: true,
            word: true,
            listId: true
          }
        },
        definition: {
          columns: {
            id: true,
            submissionId: true,
            wordId: true,
            studentDefinition: true,
            correctDefinition: true,
            showCorrectDefinition: true,
            isCorrect: true,
            addedToFlashcards: true
          },
          with: {
            submission: {
              columns: {
                id: true,
                studentId: true,
                listId: true,
                completed: true,
                score: true
              },
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
  
  // Get student performance data for a class
  async getStudentPerformanceByClass(classId: number) {
    // First, get all students in the class
    const classData = await db.query.classes.findFirst({
      where: eq(classes.id, classId),
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
          },
        },
      },
    });

    if (!classData) {
      return [];
    }

    // Get all list IDs for this class
    const listIds = classData.vocabularyLists.map(list => list.id);
    
    // Get all student IDs in this class
    const studentIds = classData.students.map(student => student.student.id);
    
    // For each student, get their submissions and calculate stats
    const studentPerformance = await Promise.all(
      studentIds.map(async (studentId) => {
        // Get student info
        const student = classData.students.find(s => s.student.id === studentId)?.student;
        
        // Skip if no lists in this class
        if (listIds.length === 0) {
          return {
            studentId: student.id,
            studentName: student.name,
            studentEmail: student.email,
            averageScore: null,
            joinedAt: classData.students.find(s => s.student.id === studentId)?.createdAt,
            submissions: [],
          };
        }

        // Get all submissions by this student for lists in this class
        const studentSubmissions = await db.query.submissions.findMany({
          columns: {
            id: true,
            studentId: true,
            listId: true,
            completed: true,
            score: true,
            submittedAt: true,
            gradedAt: true,
            isRedo: true,
            createdAt: true,
            // notes column is explicitly not selected
          },
          where: and(
            eq(submissions.studentId, studentId),
            eq(submissions.completed, true),
            inArray(submissions.listId, listIds)
          ),
          with: {
            list: {
              columns: {
                id: true,
                title: true,
              },
            },
            wordDefinitions: {
              columns: {
                id: true,
                isCorrect: true,
              },
            },
          },
        });

        // Calculate average score from submissions
        const scores = studentSubmissions.filter((sub: any) => sub.score !== null).map((sub: any) => sub.score);
        const averageScore = scores.length > 0 ? scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length : null;

        // Get join date for this student in this class
        const joinData = classData.students.find(s => s.student.id === studentId);

        return {
          studentId: student.id,
          studentName: student.name,
          studentEmail: student.email,
          averageScore,
          joinedAt: joinData?.createdAt,
          submissions: studentSubmissions
            .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
            .slice(0, 5)
            .map((sub: any) => ({
              id: sub.id,
              listTitle: sub.list.title,
              score: sub.score,
              submittedAt: sub.submittedAt,
              gradedAt: sub.gradedAt,
            })),
        };
      })
    );

    return studentPerformance;
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
              // Don't filter by published status, so students can see all lists
              columns: {
                id: true,
                title: true,
                dueDate: true,
                published: true,
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

    if (classIds.length === 0) {
      return [];
    }

    // Find pending join requests for those classes
    return await db.query.studentClass.findMany({
      where: and(
        inArray(studentClass.classId, classIds),
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
    // Check if the student is already in the class
    const existingJoin = await db.query.studentClass.findFirst({
      where: and(
        eq(studentClass.studentId, studentClassData.studentId),
        eq(studentClass.classId, studentClassData.classId)
      ),
    });

    if (existingJoin) {
      return existingJoin;
    }

    // Create the new join request with explicit status
    const [joinRequest] = await db.insert(studentClass)
      .values({
        ...studentClassData,
        status: 'pending'
      })
      .returning();
    
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
  
  async removeStudentFromClass(studentId: number, classId: number) {
    // Delete the student from the class
    const [removedRecord] = await db
      .delete(studentClass)
      .where(
        and(
          eq(studentClass.studentId, studentId),
          eq(studentClass.classId, classId),
          eq(studentClass.status, 'approved') // Only remove approved students
        )
      )
      .returning();
    return removedRecord;
  }

  // Notification methods
  async createNotification(notificationData: InsertNotification) {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }
  
  async getNotificationsByUser(userId: number) {
    return await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)],
    });
  }
  
  async getFilteredNotifications(userId: number, category?: string) {
    if (category && category !== 'all') {
      return await db.select().from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.category, category)
        ))
        .orderBy(desc(notifications.createdAt));
    } else {
      return await db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt));
    }
  }
  
  async getUnreadNotificationCount(userId: number) {
    const result = await db.select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
    return result[0]?.count || 0;
  }
  
  async markNotificationAsRead(id: number) {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
    return true;
  }
  
  async markAllNotificationsAsRead(userId: number, category?: string) {
    if (category && category !== 'all') {
      await db.update(notifications)
        .set({ read: true })
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.category, category)
        ));
    } else {
      await db.update(notifications)
        .set({ read: true })
        .where(eq(notifications.userId, userId));
    }
    
    return true;
  }
  
  async deleteNotification(id: number) {
    await db.delete(notifications).where(eq(notifications.id, id));
    return true;
  }
  
  // Fullscreen Exit Event Methods
  async createFullscreenExit(exitData: InsertFullscreenExit) {
    // Convert timestamp string to Date object if it exists
    const data = {
      ...exitData,
      timestamp: exitData.timestamp ? new Date(exitData.timestamp) : undefined
    };
    
    const [newExit] = await db.insert(fullscreenExits).values(data).returning();
    return newExit;
  }
  
  async getFullscreenExitsBySubmission(submissionId: number) {
    return await db.query.fullscreenExits.findMany({
      where: eq(fullscreenExits.submissionId, submissionId),
      orderBy: [asc(fullscreenExits.timestamp)]
    });
  }
}

export const storage = new DatabaseStorage();
