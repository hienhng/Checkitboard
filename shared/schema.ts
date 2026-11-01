import { pgTable, text, serial, integer, boolean, timestamp, json, unique, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// User table definition
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["educator", "learner"] }).notNull(),
  name: text("name").notNull(),
  profilePicture: text("profile_picture"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Classes/Groups for organizing students
export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  classCode: text("class_code").notNull().unique(),
  educatorId: integer("educator_id").references(() => users.id).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student-Class relationships
export const studentClass = pgTable("student_class", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => classes.id).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Parent-student relationships
export const parentStudent = pgTable("parent_student", {
  id: serial("id").primaryKey(),
  parentEmail: text("parent_email").notNull(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vocabulary Lists
export const vocabularyLists = pgTable("vocabulary_lists", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  passage: text("passage").notNull(),
  educatorId: integer("educator_id").references(() => users.id).notNull(),
  classId: integer("class_id").references(() => classes.id),
  published: boolean("published").default(false).notNull(),
  type: text("type", { enum: ["test", "practice"] }).default("practice").notNull(),
  dueDate: timestamp("due_date"),
  // Assignment-specific settings
  gradeVisibility: text("grade_visibility", { enum: ["immediate", "afterDue", "manual"] }).default("immediate").notNull(),
  gradesReleased: boolean("grades_released").default(false).notNull(),
  timeLimit: integer("time_limit"), // in minutes, null means no time limit
  shuffleQuestions: boolean("shuffle_questions").default(false).notNull(),
  showCorrectAnswers: boolean("show_correct_answers").default(true).notNull(),
  allowRedos: boolean("allow_redos").default(true).notNull(),
  maxRedoAttempts: integer("max_redo_attempts").default(3).notNull(),
  parentListId: integer("parent_list_id").references((): AnyPgColumn => vocabularyLists.id), // For tracking duplicates created during multi-class publishing
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vocabulary Words
export const vocabularyWords = pgTable("vocabulary_words", {
  id: serial("id").primaryKey(),
  word: text("word").notNull(),
  listId: integer("list_id").references(() => vocabularyLists.id).notNull(),
  definition: text("definition"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Multiple Choice Questions for vocabulary words
export const multipleChoiceQuestions = pgTable("multiple_choice_questions", {
  id: serial("id").primaryKey(),
  wordId: integer("word_id").references(() => vocabularyWords.id).notNull(),
  question: text("question").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Input Form Questions for vocabulary words
export const inputFormQuestions = pgTable("input_form_questions", {
  id: serial("id").primaryKey(),
  wordId: integer("word_id").references(() => vocabularyWords.id).notNull(),
  question: text("question").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  caseSensitive: boolean("case_sensitive").default(false).notNull(),
  showAnswer: boolean("show_answer").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Student answers to multiple choice questions
export const multipleChoiceAnswers = pgTable("multiple_choice_answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  questionId: integer("question_id").references(() => multipleChoiceQuestions.id).notNull(),
  selectedAnswer: text("selected_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSubmissionQuestion: unique().on(table.submissionId, table.questionId)
}));

// Student answers to input form questions
export const inputFormAnswers = pgTable("input_form_answers", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  questionId: integer("question_id").references(() => inputFormQuestions.id).notNull(),
  studentAnswer: text("student_answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSubmissionQuestion: unique().on(table.submissionId, table.questionId)
}));

// Student Submissions
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  listId: integer("list_id").references(() => vocabularyLists.id).notNull(),
  completed: boolean("completed").default(false).notNull(),
  score: integer("score"),
  submittedAt: timestamp("submitted_at"),
  gradedAt: timestamp("graded_at"),
  isRedo: boolean("is_redo").default(false).notNull(),
  isDiscarded: boolean("is_discarded").default(false).notNull(),
  discardReason: text("discard_reason"),
  exitReason: text("exit_reason"), // Reason provided when exiting a test
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Word Definitions by Students
export const wordDefinitions = pgTable("word_definitions", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  wordId: integer("word_id").references(() => vocabularyWords.id).notNull(),
  studentDefinition: text("student_definition"),
  correctDefinition: text("correct_definition"),
  showCorrectDefinition: boolean("show_correct_definition").default(true).notNull(),
  isCorrect: boolean("is_correct"),
  addedToFlashcards: boolean("added_to_flashcards").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Flashcards
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  wordId: integer("word_id").references(() => vocabularyWords.id).notNull(),
  definitionId: integer("definition_id").references(() => wordDefinitions.id),
  learned: boolean("learned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sticky Notes for student vocabulary review
export const stickyNotes = pgTable("sticky_notes", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => users.id).notNull(),
  word: text("word").notNull(),
  definition: text("definition").notNull(),
  example: text("example"),
  category: text("category").notNull(),
  difficulty: text("difficulty", { enum: ["easy", "medium", "hard"] }).notNull(),
  userNotes: text("user_notes"),
  emoji: text("emoji").default("📝"),
  color: text("color", { enum: ["yellow", "pink", "blue", "green", "purple", "orange", "red", "indigo"] }).default("yellow"),
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  isLearned: boolean("is_learned").default(false).notNull(),
  isCustom: boolean("is_custom").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Educator Settings for class management preferences
export const educatorSettings = pgTable("educator_settings", {
  id: serial("id").primaryKey(),
  educatorId: integer("educator_id").references(() => users.id).notNull().unique(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  autoApproveRequests: boolean("auto_approve_requests").default(false).notNull(),
  allowStudentSelfEnroll: boolean("allow_student_self_enroll").default(true).notNull(),
  defaultDueDate: integer("default_due_date").default(7).notNull(), // days
  gradeVisibility: text("grade_visibility", { enum: ["immediate", "afterDue", "manual"] }).default("immediate").notNull(),
  allowRedos: boolean("allow_redos").default(true).notNull(),
  maxRedoAttempts: integer("max_redo_attempts").default(3).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relationships definitions
export const usersRelations = relations(users, ({ one, many }) => ({
  vocabularyLists: many(vocabularyLists),
  submissions: many(submissions),
  flashcards: many(flashcards),
  stickyNotes: many(stickyNotes),
  createdClasses: many(classes, { relationName: 'educator' }),
  enrolledClasses: many(studentClass, { relationName: 'student' }),
  educatorSettings: one(educatorSettings),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  educator: one(users, {
    fields: [classes.educatorId],
    references: [users.id],
    relationName: 'educator'
  }),
  students: many(studentClass),
  vocabularyLists: many(vocabularyLists),
}));

export const studentClassRelations = relations(studentClass, ({ one }) => ({
  student: one(users, {
    fields: [studentClass.studentId],
    references: [users.id],
    relationName: 'student'
  }),
  class: one(classes, {
    fields: [studentClass.classId],
    references: [classes.id],
  }),
}));

export const vocabularyListsRelations = relations(vocabularyLists, ({ one, many }) => ({
  educator: one(users, {
    fields: [vocabularyLists.educatorId],
    references: [users.id],
  }),
  class: one(classes, {
    fields: [vocabularyLists.classId],
    references: [classes.id],
  }),
  words: many(vocabularyWords),
  submissions: many(submissions),
}));

export const vocabularyWordsRelations = relations(vocabularyWords, ({ one, many }) => ({
  list: one(vocabularyLists, {
    fields: [vocabularyWords.listId],
    references: [vocabularyLists.id],
  }),
  definitions: many(wordDefinitions),
  flashcards: many(flashcards),
  multipleChoiceQuestions: many(multipleChoiceQuestions),
  inputFormQuestions: many(inputFormQuestions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  list: one(vocabularyLists, {
    fields: [submissions.listId],
    references: [vocabularyLists.id],
  }),
  wordDefinitions: many(wordDefinitions),
  multipleChoiceAnswers: many(multipleChoiceAnswers),
  inputFormAnswers: many(inputFormAnswers),
}));

export const wordDefinitionsRelations = relations(wordDefinitions, ({ one, many }) => ({
  submission: one(submissions, {
    fields: [wordDefinitions.submissionId],
    references: [submissions.id],
  }),
  word: one(vocabularyWords, {
    fields: [wordDefinitions.wordId],
    references: [vocabularyWords.id],
  }),
  flashcard: many(flashcards),
}));

export const flashcardsRelations = relations(flashcards, ({ one }) => ({
  student: one(users, {
    fields: [flashcards.studentId],
    references: [users.id],
  }),
  word: one(vocabularyWords, {
    fields: [flashcards.wordId],
    references: [vocabularyWords.id],
  }),
  definition: one(wordDefinitions, {
    fields: [flashcards.definitionId],
    references: [wordDefinitions.id],
  }),
}));

export const multipleChoiceQuestionsRelations = relations(multipleChoiceQuestions, ({ one, many }) => ({
  word: one(vocabularyWords, {
    fields: [multipleChoiceQuestions.wordId],
    references: [vocabularyWords.id],
  }),
  answers: many(multipleChoiceAnswers),
}));

export const multipleChoiceAnswersRelations = relations(multipleChoiceAnswers, ({ one }) => ({
  submission: one(submissions, {
    fields: [multipleChoiceAnswers.submissionId],
    references: [submissions.id],
  }),
  question: one(multipleChoiceQuestions, {
    fields: [multipleChoiceAnswers.questionId],
    references: [multipleChoiceQuestions.id],
  }),
}));

export const parentStudentRelations = relations(parentStudent, ({ one }) => ({
  student: one(users, {
    fields: [parentStudent.studentId],
    references: [users.id],
  }),
}));

export const stickyNotesRelations = relations(stickyNotes, ({ one }) => ({
  student: one(users, {
    fields: [stickyNotes.studentId],
    references: [users.id],
  }),
}));

export const inputFormQuestionsRelations = relations(inputFormQuestions, ({ one, many }) => ({
  word: one(vocabularyWords, {
    fields: [inputFormQuestions.wordId],
    references: [vocabularyWords.id],
  }),
  answers: many(inputFormAnswers),
}));

export const inputFormAnswersRelations = relations(inputFormAnswers, ({ one }) => ({
  submission: one(submissions, {
    fields: [inputFormAnswers.submissionId],
    references: [submissions.id],
  }),
  question: one(inputFormQuestions, {
    fields: [inputFormAnswers.questionId],
    references: [inputFormQuestions.id],
  }),
}));

export const educatorSettingsRelations = relations(educatorSettings, ({ one }) => ({
  educator: one(users, {
    fields: [educatorSettings.educatorId],
    references: [users.id],
  }),
}));

// Validation schemas
export const insertUserSchema = createInsertSchema(users, {
  email: (schema) => schema.email("Please enter a valid email"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  role: (schema) => schema.refine((val) => ["educator", "learner"].includes(val), {
    message: "Role must be either 'educator' or 'learner'",
  }),
}).omit({ id: true, createdAt: true });

export const loginUserSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password confirmation is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertVocabularyListSchema = createInsertSchema(vocabularyLists, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  passage: (schema) => schema.min(10, "Passage must be at least 10 characters"),
}).omit({ id: true, createdAt: true });

export const insertVocabularyWordSchema = createInsertSchema(vocabularyWords, {
  word: (schema) => schema.min(1, "Word cannot be empty"),
}).omit({ id: true, createdAt: true, definition: true });

export const insertSubmissionSchema = createInsertSchema(submissions, {
  studentId: (schema) => schema,
  listId: (schema) => schema,
  isRedo: (schema) => schema,
}).omit({ id: true, createdAt: true, completed: true, score: true, submittedAt: true, gradedAt: true });

export const insertWordDefinitionSchema = createInsertSchema(wordDefinitions, {
  studentDefinition: (schema) => schema.optional(),
}).omit({ id: true, createdAt: true, isCorrect: true, addedToFlashcards: true });

export const insertParentStudentSchema = createInsertSchema(parentStudent, {
  parentEmail: (schema) => schema.email("Please enter a valid email"),
}).omit({ id: true, createdAt: true });

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true, learned: true });

export const insertClassSchema = createInsertSchema(classes, {
  name: (schema) => schema.min(2, "Class name must be at least 2 characters"),
  classCode: (schema) => schema.min(6, "Class code must be at least 6 characters"),
}).omit({ id: true, createdAt: true, active: true });

export const insertStickyNoteSchema = createInsertSchema(stickyNotes, {
  word: (schema) => schema.min(1, "Word cannot be empty"),
  definition: (schema) => schema.min(1, "Definition cannot be empty"),
  category: (schema) => schema.min(1, "Category cannot be empty"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateStickyNoteSchema = createInsertSchema(stickyNotes, {
  word: (schema) => schema.min(1, "Word cannot be empty").optional(),
  definition: (schema) => schema.min(1, "Definition cannot be empty").optional(),
  category: (schema) => schema.min(1, "Category cannot be empty").optional(),
}).omit({ id: true, studentId: true, createdAt: true, updatedAt: true }).partial();

export const insertEducatorSettingsSchema = createInsertSchema(educatorSettings, {
  defaultDueDate: (schema) => schema.min(1).max(30),
  maxRedoAttempts: (schema) => schema.min(1).max(10),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const updateEducatorSettingsSchema = createInsertSchema(educatorSettings, {
  defaultDueDate: (schema) => schema.min(1).max(30).optional(),
  maxRedoAttempts: (schema) => schema.min(1).max(10).optional(),
}).omit({ id: true, educatorId: true, createdAt: true, updatedAt: true }).partial();

export const insertStudentClassSchema = createInsertSchema(studentClass).omit({ id: true, createdAt: true, status: true });

export const insertMultipleChoiceQuestionSchema = createInsertSchema(multipleChoiceQuestions, {
  question: (schema) => schema.min(5, "Question must be at least 5 characters"),
  correctAnswer: (schema) => schema.refine((val) => ["A", "B", "C", "D"].includes(val), {
    message: "Correct answer must be A, B, C, or D",
  }),
  optionA: (schema) => schema.min(1, "Option A cannot be empty"),
  optionB: (schema) => schema.min(1, "Option B cannot be empty"),
  optionC: (schema) => schema.min(1, "Option C cannot be empty"),
  optionD: (schema) => schema.min(1, "Option D cannot be empty"),
}).omit({ id: true, createdAt: true });

export const insertMultipleChoiceAnswerSchema = createInsertSchema(multipleChoiceAnswers, {
  selectedAnswer: (schema) => schema.refine((val) => ["A", "B", "C", "D"].includes(val), {
    message: "Selected answer must be A, B, C, or D",
  }),
}).omit({ id: true, createdAt: true, isCorrect: true });

export const insertInputFormQuestionSchema = createInsertSchema(inputFormQuestions, {
  question: (schema) => schema.min(5, "Question must be at least 5 characters"),
  correctAnswer: (schema) => schema.default(""),
}).omit({ id: true, createdAt: true });

export const insertInputFormAnswerSchema = createInsertSchema(inputFormAnswers, {
  studentAnswer: (schema) => schema.min(1, "Answer cannot be empty"),
}).omit({ id: true, createdAt: true, isCorrect: true });

// Schema for join class request
export const joinClassSchema = z.object({
  classCode: z.string().min(6, "Class code must be at least 6 characters"),
});

// Schema for class join request response
export const classRequestResponseSchema = z.object({
  studentClassId: z.number(),
  status: z.enum(["approved", "rejected"]),
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type VocabularyList = typeof vocabularyLists.$inferSelect;
export type InsertVocabularyList = z.infer<typeof insertVocabularyListSchema>;
export type VocabularyWord = typeof vocabularyWords.$inferSelect;
export type InsertVocabularyWord = z.infer<typeof insertVocabularyWordSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type WordDefinition = typeof wordDefinitions.$inferSelect;
export type InsertWordDefinition = z.infer<typeof insertWordDefinitionSchema>;
export type ParentStudent = typeof parentStudent.$inferSelect;
export type InsertParentStudent = z.infer<typeof insertParentStudentSchema>;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Class = typeof classes.$inferSelect;
export type InsertClass = z.infer<typeof insertClassSchema>;
export type StudentClass = typeof studentClass.$inferSelect;
export type InsertStudentClass = z.infer<typeof insertStudentClassSchema>;
export type JoinClassRequest = z.infer<typeof joinClassSchema>;
export type ClassRequestResponse = z.infer<typeof classRequestResponseSchema>;
export type MultipleChoiceQuestion = typeof multipleChoiceQuestions.$inferSelect;
export type InsertMultipleChoiceQuestion = z.infer<typeof insertMultipleChoiceQuestionSchema>;
export type MultipleChoiceAnswer = typeof multipleChoiceAnswers.$inferSelect;
export type InsertMultipleChoiceAnswer = z.infer<typeof insertMultipleChoiceAnswerSchema>;
export type InputFormQuestion = typeof inputFormQuestions.$inferSelect;
export type InsertInputFormQuestion = z.infer<typeof insertInputFormQuestionSchema>;
export type InputFormAnswer = typeof inputFormAnswers.$inferSelect;
export type InsertInputFormAnswer = z.infer<typeof insertInputFormAnswerSchema>;
export type StickyNote = typeof stickyNotes.$inferSelect;
export type InsertStickyNote = z.infer<typeof insertStickyNoteSchema>;
export type UpdateStickyNote = z.infer<typeof updateStickyNoteSchema>;
export type EducatorSettings = typeof educatorSettings.$inferSelect;
export type InsertEducatorSettings = z.infer<typeof insertEducatorSettingsSchema>;
export type UpdateEducatorSettings = z.infer<typeof updateEducatorSettingsSchema>;

// Export select schemas
export const selectUserSchema = createSelectSchema(users);
export const selectVocabularyListSchema = createSelectSchema(vocabularyLists);
export const selectVocabularyWordSchema = createSelectSchema(vocabularyWords);
export const selectSubmissionSchema = createSelectSchema(submissions);
export const selectWordDefinitionSchema = createSelectSchema(wordDefinitions);
export const selectFlashcardSchema = createSelectSchema(flashcards);
export const selectParentStudentSchema = createSelectSchema(parentStudent);
export const selectClassSchema = createSelectSchema(classes);
export const selectStudentClassSchema = createSelectSchema(studentClass);
export const selectMultipleChoiceQuestionSchema = createSelectSchema(multipleChoiceQuestions);
export const selectMultipleChoiceAnswerSchema = createSelectSchema(multipleChoiceAnswers);
export const selectInputFormQuestionSchema = createSelectSchema(inputFormQuestions);
export const selectInputFormAnswerSchema = createSelectSchema(inputFormAnswers);
export const selectStickyNoteSchema = createSelectSchema(stickyNotes);
export const selectEducatorSettingsSchema = createSelectSchema(educatorSettings);

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'class_admission', 'submission_result', 'class_removal', 'submission_received', 'join_request', 'discard_test'
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  category: text("category").notNull(), // 'class', 'submission', 'system'
  relatedId: integer("related_id"), // Can be classId, submissionId, or requestId depending on type
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Add notifications to user relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Add notification schema validators
export const insertNotificationSchema = createInsertSchema(notifications, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  message: (schema) => schema.min(5, "Message must be at least 5 characters"),
  type: (schema) => schema.refine(
    (val) => ['class_admission', 'submission_result', 'class_removal', 'submission_received', 'join_request', 'discard_test'].includes(val),
    { message: "Invalid notification type" }
  ),
  category: (schema) => schema.refine(
    (val) => ['class', 'submission', 'system'].includes(val),
    { message: "Invalid notification category" }
  ),
}).omit({ id: true, createdAt: true, read: true });

export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Fullscreen exit events for tracking when students exit fullscreen during check-ups
export const fullscreenExits = pgTable("fullscreen_exits", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  userAgent: text("user_agent"),
});

export const fullscreenExitsRelations = relations(fullscreenExits, ({ one }) => ({
  submission: one(submissions, {
    fields: [fullscreenExits.submissionId],
    references: [submissions.id],
  }),
}));

export const insertFullscreenExitSchema = createInsertSchema(fullscreenExits)
  .omit({ id: true })
  .extend({
    timestamp: z.string().optional(),
  });

export const selectFullscreenExitSchema = createSelectSchema(fullscreenExits);
export type FullscreenExit = typeof fullscreenExits.$inferSelect;
export type InsertFullscreenExit = z.infer<typeof insertFullscreenExitSchema>;
