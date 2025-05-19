import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
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
  dueDate: timestamp("due_date"),
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Word Definitions by Students
export const wordDefinitions = pgTable("word_definitions", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  wordId: integer("word_id").references(() => vocabularyWords.id).notNull(),
  studentDefinition: text("student_definition").notNull(),
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

// Relationships definitions
export const usersRelations = relations(users, ({ many }) => ({
  vocabularyLists: many(vocabularyLists),
  submissions: many(submissions),
  flashcards: many(flashcards),
  createdClasses: many(classes, { relationName: 'educator' }),
  enrolledClasses: many(studentClass, { relationName: 'student' }),
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

export const parentStudentRelations = relations(parentStudent, ({ one }) => ({
  student: one(users, {
    fields: [parentStudent.studentId],
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

export const insertVocabularyListSchema = createInsertSchema(vocabularyLists, {
  title: (schema) => schema.min(3, "Title must be at least 3 characters"),
  passage: (schema) => schema.min(10, "Passage must be at least 10 characters"),
}).omit({ id: true, createdAt: true, published: true });

export const insertVocabularyWordSchema = createInsertSchema(vocabularyWords, {
  word: (schema) => schema.min(1, "Word cannot be empty"),
}).omit({ id: true, createdAt: true, definition: true });

export const insertSubmissionSchema = createInsertSchema(submissions, {
  studentId: (schema) => schema,
  listId: (schema) => schema,
  isRedo: (schema) => schema,
}).omit({ id: true, createdAt: true, completed: true, score: true, submittedAt: true, gradedAt: true });

export const insertWordDefinitionSchema = createInsertSchema(wordDefinitions, {
  studentDefinition: (schema) => schema.min(1, "Definition cannot be empty"),
}).omit({ id: true, createdAt: true, isCorrect: true, addedToFlashcards: true });

export const insertParentStudentSchema = createInsertSchema(parentStudent, {
  parentEmail: (schema) => schema.email("Please enter a valid email"),
}).omit({ id: true, createdAt: true });

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true, learned: true });

export const insertClassSchema = createInsertSchema(classes, {
  name: (schema) => schema.min(2, "Class name must be at least 2 characters"),
  classCode: (schema) => schema.min(6, "Class code must be at least 6 characters"),
}).omit({ id: true, createdAt: true, active: true });

export const insertStudentClassSchema = createInsertSchema(studentClass).omit({ id: true, createdAt: true, status: true });

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
