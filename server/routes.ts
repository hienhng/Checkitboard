import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { sendParentEmail } from "./email";
import { sendVerificationEmail, sendWelcomeEmail, generateVerificationToken } from "./email-verification";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail, generatePasswordResetToken } from "./password-reset";
import { hashPassword, comparePasswords } from "./auth";
import { 
  isAIConfigured, 
  generateDefinitions,
  analyzePassage,
  gradeDefinition,
  generateExampleSentences,
  generateLearningStrategies,
  generatePassageFromWords,
  generateSingleDefinition
} from "./ai";
import * as ai from "./ai";
import { generateMultipleChoiceQuestion } from "./ai-questions";
import { eq, and, desc, isNull, asc, not, inArray, sql } from "drizzle-orm";

import { db, pool } from "../db";
import {
  insertVocabularyListSchema,
  insertVocabularyWordSchema,
  insertSubmissionSchema,
  insertWordDefinitionSchema,
  insertFlashcardSchema,
  insertClassSchema,
  insertStudentClassSchema,
  joinClassSchema,
  classRequestResponseSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  insertMultipleChoiceQuestionSchema,
  insertMultipleChoiceAnswerSchema,
  insertStickyNoteSchema,
  updateStickyNoteSchema,
  insertEducatorSettingsSchema,
  updateEducatorSettingsSchema,
  vocabularyLists,
  vocabularyWords,
  submissions,
  wordDefinitions,
  flashcards,
  multipleChoiceQuestions,
  multipleChoiceAnswers,
  stickyNotes,
  users,
  classes,
  studentClass,
  educatorSettings,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Helper function to create notifications
  const createSystemNotification = async (
    userId: number, 
    type: string, 
    title: string, 
    message: string, 
    category: string, 
    relatedId?: number
  ) => {
    try {
      await storage.createNotification({
        userId,
        type,
        title,
        message,
        category,
        relatedId
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }
  };
  // Setup authentication routes
  setupAuth(app);

  // #region Educator Routes
  // Create a vocabulary list
  app.post("/api/vocabulary-lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can create vocabulary lists" });
      }
      
      // Pre-process the request data to ensure dueDate is properly formatted
      const requestData = {
        ...req.body,
        educatorId: req.user.id,
        // If dueDate is provided, ensure it's a valid date object
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        // Explicitly include classId if provided
        classId: req.body.classId || null
      };

      console.log("Creating vocabulary list with data:", {
        title: requestData.title,
        classId: requestData.classId,
        published: requestData.published
      });

      const validatedData = insertVocabularyListSchema.parse(requestData);

      const list = await storage.createVocabularyList(validatedData);
      
      // Create vocabulary words if provided
      if (req.body.words && Array.isArray(req.body.words)) {
        const wordPromises = req.body.words.map((word: string) => 
          storage.createVocabularyWord({
            word,
            listId: list.id,
          })
        );
        await Promise.all(wordPromises);
      }

      const completeList = await storage.getVocabularyListWithWords(list.id);
      
      res.status(201).json(completeList);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating vocabulary list:", error);
      res.status(500).json({ message: "Error creating vocabulary list" });
    }
  });

  // Get vocabulary lists for educator
  app.get("/api/educator/vocabulary-lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }

      const lists = await storage.getVocabularyListsByEducator(req.user.id);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching vocabulary lists:", error);
      res.status(500).json({ message: "Error fetching vocabulary lists" });
    }
  });
  
  // Get educator statistics
  app.get("/api/educator/statistics", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get educator's classes
      const educatorClasses = await storage.getClassesByEducator(req.user.id);
      
      // Get vocabulary lists
      const vocabularyLists = await storage.getVocabularyListsByEducator(req.user.id);
      
      // Calculate total students (unique students across all classes)
      const studentsSet = new Set();
      educatorClasses.forEach(cls => {
        cls.students.forEach(student => {
          studentsSet.add(student.student.id);
        });
      });
      
      // Format lists with words
      const listsWithDetails = await Promise.all(
        vocabularyLists.map(async (list) => {
          // Get words for this list
          const listWithWords = await storage.getVocabularyListWithWords(list.id);
          
          // Get class name if assigned
          let className = null;
          if (list.classId) {
            const classInfo = educatorClasses.find(c => c.id === list.classId);
            if (classInfo) {
              className = classInfo.name;
            }
          }
          
          return {
            id: list.id,
            title: list.title,
            passage: list.passage,
            dueDate: list.dueDate,
            published: list.published,
            class: className,
            words: listWithWords.words || []
          };
        })
      );
      
      const statistics = {
        totalStudents: studentsSet.size,
        totalClasses: educatorClasses.length,
        totalLists: vocabularyLists.length,
        lists: listsWithDetails
      };
      
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching educator statistics:", error);
      res.status(500).json({ message: "Error fetching educator statistics" });
    }
  });

  // Get a specific vocabulary list with words
  app.get("/api/vocabulary-lists/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const listId = parseInt(req.params.id);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      const list = await storage.getVocabularyListWithWords(listId);
      
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      // Check access permissions
      if (req.user.role === "learner") {
        // Learners can only access published lists
        if (!list.published) {
          return res.status(403).json({ message: "Access denied" });
        }
        
        // If the list is assigned to a class, check if the student is enrolled in that class
        if (list.classId) {
          const studentClasses = await storage.getClassesForStudent(req.user.id);
          const isEnrolledInClass = studentClasses.some(
            (enrollment: any) => enrollment.classId === list.classId && enrollment.status === 'approved'
          );
          
          if (!isEnrolledInClass) {
            return res.status(403).json({ message: "Access denied - you are not enrolled in the required class" });
          }
        }
      } else if (req.user.role === "educator") {
        // Educators can only access their own lists
        if (list.educatorId !== req.user.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      res.json(list);
    } catch (error) {
      console.error("Error fetching vocabulary list:", error);
      res.status(500).json({ message: "Error fetching vocabulary list" });
    }
  });

  // Start a vocabulary test (create submission)
  app.post("/api/vocabulary-lists/:id/start-test", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Access denied" });
      }

      const listId = parseInt(req.params.id);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      const list = await storage.getVocabularyList(listId);
      
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      if (!list.published) {
        return res.status(403).json({ message: "This test is not available" });
      }

      // If the list is assigned to a class, check if the student is enrolled in that class
      if (list.classId) {
        const studentClasses = await storage.getClassesForStudent(req.user.id);
        const isEnrolledInClass = studentClasses.some(
          (enrollment: any) => enrollment.classId === list.classId && enrollment.status === 'approved'
        );
        
        if (!isEnrolledInClass) {
          return res.status(403).json({ message: "Access denied - you are not enrolled in the required class" });
        }
      }

      // Check if student already has ANY submission for this list (prevent retaking)
      const existingSubmission = await storage.getSubmissionByStudentAndList(req.user.id, listId, false);
      
      if (existingSubmission) {
        // Student already has a submission, don't allow starting a new one
        return res.status(400).json({ 
          message: "You have already started or completed this test. Each test can only be taken once.",
          submissionId: existingSubmission.id,
          exists: true
        });
      }

      // Create new submission
      const submission = await storage.createSubmission({
        studentId: req.user.id,
        listId: listId,
        isRedo: false,
      });

      console.log("Created new submission:", submission.id);
      res.json({ submissionId: submission.id });
    } catch (error) {
      console.error("Error starting test:", error);
      res.status(500).json({ message: "Error starting test" });
    }
  });

  // Delete a vocabulary list
  app.delete("/api/vocabulary-lists/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can delete vocabulary lists" });
      }

      const listId = parseInt(req.params.id);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      // Verify the educator owns this list
      const existingList = await storage.getVocabularyList(listId);
      if (!existingList) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      if (existingList.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this vocabulary list" });
      }

      // Delete related data in the correct order due to foreign key constraints
      
      // 1. Delete fullscreen exits related to submissions for this list
      await db.execute(sql`
        DELETE FROM fullscreen_exits 
        WHERE submission_id IN (
          SELECT id FROM submissions WHERE list_id = ${listId}
        )
      `);
      
      // 2. Delete multiple choice answers related to submissions for this list
      await db.execute(sql`
        DELETE FROM multiple_choice_answers 
        WHERE submission_id IN (
          SELECT id FROM submissions WHERE list_id = ${listId}
        )
      `);
      
      // 3. Delete multiple choice questions related to words in this list
      await db.execute(sql`
        DELETE FROM multiple_choice_questions 
        WHERE word_id IN (
          SELECT id FROM vocabulary_words WHERE list_id = ${listId}
        )
      `);
      
      // 4. Delete flashcards related to words in this list
      await db.execute(sql`
        DELETE FROM flashcards 
        WHERE word_id IN (
          SELECT id FROM vocabulary_words WHERE list_id = ${listId}
        )
      `);
      
      // 5. Delete word definitions related to words in this list
      await db.execute(sql`
        DELETE FROM word_definitions 
        WHERE word_id IN (
          SELECT id FROM vocabulary_words WHERE list_id = ${listId}
        )
      `);
      
      // 6. Delete submissions for this list
      await db.execute(sql`
        DELETE FROM submissions WHERE list_id = ${listId}
      `);
      
      // 7. Delete vocabulary words in this list
      await db.execute(sql`
        DELETE FROM vocabulary_words WHERE list_id = ${listId}
      `);
      
      // 8. Finally delete the vocabulary list itself
      await db.delete(vocabularyLists).where(eq(vocabularyLists.id, listId));

      res.json({ message: "Vocabulary list deleted successfully" });
    } catch (error) {
      console.error("Error deleting vocabulary list:", error);
      res.status(500).json({ message: "Error deleting vocabulary list" });
    }
  });

  // Update a vocabulary list (publish/unpublish or assign to class)
  app.patch("/api/vocabulary-lists/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can update vocabulary lists" });
      }

      const listId = parseInt(req.params.id);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      const list = await storage.getVocabularyList(listId);
      
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      if (list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this list" });
      }

      // If assigning to a class, verify the class exists and belongs to the educator
      if (req.body.classId) {
        const classId = parseInt(req.body.classId);
        if (!isNaN(classId) && classId > 0) {
          const classObj = await storage.getClassById(classId);
          if (!classObj) {
            return res.status(404).json({ message: "Class not found" });
          }
          if (classObj.educatorId !== req.user.id) {
            return res.status(403).json({ message: "You don't have permission to assign to this class" });
          }
        }
      }
      
      // Pre-process request data to handle date format
      const requestData = {
        ...req.body,
        // If dueDate is provided, ensure it's a valid Date object
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined
      };

      // First update the basic list details
      let updatedList = await storage.updateVocabularyList(listId, requestData);
      
      // If words array is provided, update the vocabulary words
      if (req.body.words && Array.isArray(req.body.words)) {
        try {
          // Get the existing words for this list
          const listWithWords = await storage.getVocabularyListWithWords(listId);
          const existingWords = listWithWords?.words || [];
          
          // Find words to add (new) and words to remove (deleted)
          const wordStrings = existingWords.map((w: any) => w.word);
          const wordsToAdd = req.body.words.filter((word: string) => !wordStrings.includes(word));
          const wordsToRemove = existingWords.filter((w: any) => !req.body.words.includes(w.word));
          
          // Remove words that are no longer in the list
          for (const word of wordsToRemove) {
            await db.delete(vocabularyWords)
              .where(eq(vocabularyWords.id, word.id));
          }
          
          // Add new words to the list
          for (const word of wordsToAdd) {
            await storage.createVocabularyWord({
              listId,
              word
            });
          }
          
          // Get the updated list with all words
          const updatedListWithWords = await storage.getVocabularyListWithWords(listId);
          if (updatedListWithWords) {
            updatedList = updatedListWithWords;
          }
        } catch (wordError) {
          console.error("Error updating words for vocabulary list:", wordError);
          // We still return the updated list even if word updating failed
        }
      }
      
      res.json(updatedList);
    } catch (error) {
      console.error("Error updating vocabulary list:", error);
      res.status(500).json({ message: "Error updating vocabulary list" });
    }
  });

  // Update assignment properties for a vocabulary list
  app.patch("/api/vocabulary-lists/:id/properties", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can update assignment properties" });
      }

      const listId = parseInt(req.params.id);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      const list = await storage.getVocabularyList(listId);
      
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      if (list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this list" });
      }

      // Define schema for assignment properties
      const assignmentPropertiesSchema = z.object({
        gradeVisibility: z.enum(["immediate", "afterDue", "manual"]).optional(),
        allowRetakes: z.boolean().optional(),
        maxRetakeAttempts: z.number().min(1).max(10).optional(),
        timeLimit: z.number().min(1).max(300).optional().nullable(),
        shuffleQuestions: z.boolean().optional(),
        showCorrectAnswers: z.boolean().optional(),
      });

      const validatedData = assignmentPropertiesSchema.parse(req.body);
      
      // Convert timeLimit undefined to null for database
      const processedData = {
        ...validatedData,
        timeLimit: validatedData.timeLimit || null,
      };

      const updatedList = await storage.updateVocabularyList(listId, processedData);
      
      res.json(updatedList);
    } catch (error) {
      console.error("Error updating assignment properties:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid assignment properties", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error updating assignment properties" });
    }
  });

  // Add word to vocabulary list
  app.post("/api/vocabulary-lists/:listId/words", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can add words to vocabulary lists" });
      }

      const listId = parseInt(req.params.listId);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      const list = await storage.getVocabularyList(listId);
      
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      if (list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this list" });
      }

      const validatedData = insertVocabularyWordSchema.parse({
        ...req.body,
        listId,
      });

      const word = await storage.createVocabularyWord(validatedData);
      res.status(201).json(word);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error adding word to vocabulary list:", error);
      res.status(500).json({ message: "Error adding word to vocabulary list" });
    }
  });

  // Create a multiple choice question for a vocabulary word
  app.post("/api/vocabulary-words/:wordId/multiple-choice", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can create multiple choice questions" });
      }

      const wordId = parseInt(req.params.wordId);
      if (isNaN(wordId)) {
        return res.status(400).json({ message: "Invalid word ID" });
      }

      // Verify the word exists and the educator has permission
      const word = await db.query.vocabularyWords.findFirst({
        where: eq(vocabularyWords.id, wordId),
        with: {
          list: true
        }
      });

      if (!word) {
        return res.status(404).json({ message: "Vocabulary word not found" });
      }

      if (word.list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to create questions for this word" });
      }

      const validatedData = insertMultipleChoiceQuestionSchema.parse({
        ...req.body,
        wordId,
      });

      const [question] = await db.insert(multipleChoiceQuestions).values(validatedData).returning();
      res.status(201).json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating multiple choice question:", error);
      res.status(500).json({ message: "Error creating multiple choice question" });
    }
  });

  // Get multiple choice questions for a vocabulary word
  app.get("/api/vocabulary-words/:wordId/multiple-choice", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log("Multiple choice API: User not authenticated");
        return res.status(401).json({ message: "Not authenticated" });
      }

      const wordId = parseInt(req.params.wordId);
      if (isNaN(wordId)) {
        console.log("Multiple choice API: Invalid word ID", req.params.wordId);
        return res.status(400).json({ message: "Invalid word ID" });
      }

      console.log(`Multiple choice API: Fetching questions for word ${wordId} by user ${req.user.id} (${req.user.role})`);

      // Verify the word exists and user has permission to view it
      const word = await db.query.vocabularyWords.findFirst({
        where: eq(vocabularyWords.id, wordId),
        with: {
          list: true
        }
      });

      if (!word) {
        console.log("Multiple choice API: Word not found", wordId);
        return res.status(404).json({ message: "Vocabulary word not found" });
      }

      console.log(`Multiple choice API: Found word "${word.word}" in list "${word.list.title}" (listId: ${word.list.id})`);

      // Check if user has access to this word (educator who owns it or student enrolled in the class)
      let hasAccess = false;
      if (req.user.role === "educator" && word.list.educatorId === req.user.id) {
        hasAccess = true;
        console.log("Multiple choice API: Access granted - educator owns list");
      } else if (req.user.role === "learner" && word.list.classId) {
        // Check if student is enrolled in the class
        const enrollment = await db.query.studentClass.findFirst({
          where: and(
            eq(studentClass.studentId, req.user.id),
            eq(studentClass.classId, word.list.classId),
            eq(studentClass.status, "approved")
          )
        });
        hasAccess = !!enrollment;
        console.log(`Multiple choice API: Access ${hasAccess ? 'granted' : 'denied'} - student enrollment check for class ${word.list.classId}`);
      }

      if (!hasAccess) {
        console.log("Multiple choice API: Access denied for user", req.user.id);
        return res.status(403).json({ message: "You don't have permission to view questions for this word" });
      }

      const questions = await db.query.multipleChoiceQuestions.findMany({
        where: eq(multipleChoiceQuestions.wordId, wordId),
        orderBy: asc(multipleChoiceQuestions.createdAt)
      });

      console.log(`Multiple choice API: Found ${questions.length} questions for word ${wordId}`);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching multiple choice questions:", error);
      res.status(500).json({ message: "Error fetching multiple choice questions" });
    }
  });

  // Update a multiple choice question
  app.patch("/api/multiple-choice/:questionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can update multiple choice questions" });
      }

      const questionId = parseInt(req.params.questionId);
      if (isNaN(questionId)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }

      // Verify the question exists and the educator has permission
      const question = await db.query.multipleChoiceQuestions.findFirst({
        where: eq(multipleChoiceQuestions.id, questionId),
        with: {
          word: {
            with: {
              list: true
            }
          }
        }
      });

      if (!question) {
        return res.status(404).json({ message: "Multiple choice question not found" });
      }

      if (question.word.list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this question" });
      }

      const validatedData = insertMultipleChoiceQuestionSchema.partial().parse(req.body);
      const [updatedQuestion] = await db
        .update(multipleChoiceQuestions)
        .set(validatedData)
        .where(eq(multipleChoiceQuestions.id, questionId))
        .returning();

      res.json(updatedQuestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating multiple choice question:", error);
      res.status(500).json({ message: "Error updating multiple choice question" });
    }
  });

  // Delete a multiple choice question
  app.delete("/api/multiple-choice/:questionId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can delete multiple choice questions" });
      }

      const questionId = parseInt(req.params.questionId);
      if (isNaN(questionId)) {
        return res.status(400).json({ message: "Invalid question ID" });
      }

      // Verify the question exists and the educator has permission
      const question = await db.query.multipleChoiceQuestions.findFirst({
        where: eq(multipleChoiceQuestions.id, questionId),
        with: {
          word: {
            with: {
              list: true
            }
          }
        }
      });

      if (!question) {
        return res.status(404).json({ message: "Multiple choice question not found" });
      }

      if (question.word.list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to delete this question" });
      }

      // Delete any answers to this question first
      await db.delete(multipleChoiceAnswers).where(eq(multipleChoiceAnswers.questionId, questionId));
      
      // Delete the question
      await db.delete(multipleChoiceQuestions).where(eq(multipleChoiceQuestions.id, questionId));

      res.json({ message: "Multiple choice question deleted successfully" });
    } catch (error) {
      console.error("Error deleting multiple choice question:", error);
      res.status(500).json({ message: "Error deleting multiple choice question" });
    }
  });

  // Get pending submissions for grading (educator)
  app.get("/api/educator/submissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get all vocabulary lists created by this educator
      const educatorLists = await db.query.vocabularyLists.findMany({
        where: eq(vocabularyLists.educatorId, req.user.id),
        columns: {
          id: true,
        },
      });
      
      const listIds = educatorLists.map(list => list.id);
      
      // If no lists, return empty array
      if (listIds.length === 0) {
        return res.json([]);
      }
      
      // Get all completed but not graded submissions
      // Use raw SQL for the listing query since we're having issues with the ORM
      const result = await pool.query(`
        SELECT 
          s.id, 
          s.student_id, 
          s.list_id, 
          s.submitted_at,
          u.name as student_name, 
          u.email as student_email,
          v.title as list_title
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        JOIN vocabulary_lists v ON s.list_id = v.id
        WHERE s.completed = true 
        AND s.graded_at IS NULL
        AND v.educator_id = $1
        ORDER BY s.submitted_at DESC
      `, [req.user.id]);
      
      // Format the results to match the expected structure
      const submissions = result.rows.map(row => ({
        id: row.id,
        studentId: row.student_id,
        listId: row.list_id,
        submittedAt: row.submitted_at,
        student: {
          id: row.student_id,
          name: row.student_name,
          email: row.student_email
        },
        list: {
          id: row.list_id,
          title: row.list_title,
          educatorId: req.user.id
        }
      }));
      
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "Error fetching submissions" });
    }
  });

  // Get student's submission for a specific vocabulary list (for preview page)
  app.get("/api/vocabulary-lists/:listId/submission", async (req, res) => {
    try {

      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Allow both learners and educators to access submissions for debugging
      if (req.user.role !== "learner" && req.user.role !== "educator") {
        return res.status(403).json({ message: "Only students and educators can access submissions" });
      }

      const listId = parseInt(req.params.listId);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      // Get the student's completed and graded submission for this list
      const submission = await storage.getSubmissionByStudentAndList(req.user.id, listId, true);
      

      
      if (!submission || !submission.completed || !submission.gradedAt) {
        return res.status(404).json({ message: "No graded submission found" });
      }

      // Get submission with full details including definitions
      const submissionWithDetails = await storage.getSubmissionWithDefinitions(submission.id);
      
      res.json(submissionWithDetails);
    } catch (error) {
      console.error("Error fetching submission for list:", error);
      res.status(500).json({ message: "Error fetching submission" });
    }
  });

  // Get a specific submission with student definitions
  app.get("/api/submissions/:id", async (req, res) => {
    try {
      console.log("Submission auth debug:", {
        isAuth: req.isAuthenticated(),
        user: req.user,
        sessionID: req.sessionID,
        session: req.session
      });
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmissionWithDefinitions(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Check if user has access to this submission
      if (
        (req.user.role === "educator" && submission.list.educatorId !== req.user.id) ||
        (req.user.role === "learner" && submission.studentId !== req.user.id)
      ) {
        return res.status(403).json({ message: "You don't have access to this submission" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "Error fetching submission" });
    }
  });

  // Check if student has any existing submission for a list (completed or not)
  app.get("/api/submissions/check/:listId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can check submissions" });
      }

      const listId = parseInt(req.params.listId);
      if (isNaN(listId)) {
        return res.status(400).json({ message: "Invalid list ID" });
      }

      // Check for ANY existing submission (completed or not) for this student and list
      const existingSubmission = await storage.getSubmissionByStudentAndList(req.user.id, listId, false);
      
      if (!existingSubmission) {
        return res.status(404).json({ message: "No submission found" });
      }

      // Return basic submission info
      res.json({
        id: existingSubmission.id,
        completed: existingSubmission.completed,
        submittedAt: existingSubmission.submittedAt,
        gradedAt: existingSubmission.gradedAt,
        score: existingSubmission.score,
        exists: true
      });
    } catch (error) {
      console.error("Error checking for existing submission:", error);
      res.status(500).json({ message: "Error checking submission" });
    }
  });

  // Get detailed submission results for students
  app.get("/api/submissions/:id/results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmissionWithDefinitions(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Check if the user is the owner of the submission
      if (submission.studentId !== req.user?.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Only show results if the submission is completed and graded
      if (!submission.completed || !submission.gradedAt) {
        return res.status(404).json({ message: "Results not available" });
      }

      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission results:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Grade a submission
  app.post("/api/submissions/:id/grade", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can grade submissions" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Check if educator owns the vocabulary list
      const list = await storage.getVocabularyList(submission.listId);
      if (!list || list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to grade this submission" });
      }

      // Validate grading data
      const gradeSchema = z.object({
        definitions: z.array(z.object({
          definitionId: z.number(),
          isCorrect: z.boolean(),
          addToFlashcards: z.boolean().optional(),
          correctDefinition: z.string().optional(),
          showCorrectDefinition: z.boolean().optional(),
        })),
        multipleChoiceAnswers: z.array(z.object({
          answerId: z.number(),
          isCorrect: z.boolean(),
          addToFlashcards: z.boolean().optional(),
        })).optional(),
        score: z.number().min(0).max(100),
      });

      const validatedData = gradeSchema.parse(req.body);

      // Get all word definitions for this submission to check for skipped words
      const submissionWithDetails = await storage.getSubmissionWithDefinitions(submissionId);
      
      // Auto-grade skipped words as wrong
      const processedDefinitions = validatedData.definitions.map(def => {
        // Find the actual definition data to check if it was skipped
        const actualDefinition = submissionWithDetails?.wordDefinitions?.find(
          wd => wd.id === def.definitionId
        );
        
        // If student definition is null, empty, or just whitespace, automatically mark as wrong
        const isSkipped = !actualDefinition?.studentDefinition || 
                         actualDefinition.studentDefinition.trim() === '';
        
        if (isSkipped) {
          return {
            ...def,
            isCorrect: false,
            addToFlashcards: true // Automatically add skipped words to flashcards
          };
        }
        
        return def;
      });

      // Update each definition
      for (const def of processedDefinitions) {
        await storage.gradeWordDefinition(
          def.definitionId, 
          def.isCorrect, 
          def.addToFlashcards || false,
          def.correctDefinition || '',
          def.showCorrectDefinition !== undefined ? def.showCorrectDefinition : true
        );

        // If adding to flashcards, create a flashcard
        if (def.addToFlashcards) {
          const definition = await storage.getWordDefinition(def.definitionId);
          if (definition) {
            await storage.createFlashcard({
              studentId: submission.studentId,
              wordId: definition.wordId,
              definitionId: definition.id,
            });
          }
        }
      }

      // Update multiple choice answers if provided
      if (validatedData.multipleChoiceAnswers) {
        for (const mcAnswer of validatedData.multipleChoiceAnswers) {
          await storage.gradeMultipleChoiceAnswer(
            mcAnswer.answerId,
            mcAnswer.isCorrect
          );

          // If adding to flashcards, create a flashcard
          if (mcAnswer.addToFlashcards) {
            const answer = await storage.getMultipleChoiceAnswer(mcAnswer.answerId);
            if (answer) {
              await storage.createFlashcard({
                studentId: submission.studentId,
                wordId: answer.question.wordId,
                definitionId: null, // MC answers don't have definition IDs
              });
            }
          }
        }
      }

      // Update submission with score and graded timestamp
      const gradedSubmission = await storage.updateSubmission(submissionId, {
        score: validatedData.score,
        gradedAt: new Date(),
      });
      
      // Create notification for the student about their graded submission
      await createSystemNotification(
        submission.studentId,
        'submission_result',
        'Submission Graded',
        `Your submission for "${list.title}" has been graded. Score: ${validatedData.score}%`,
        'submission',
        submissionId
      );

      // Send email to parent if student has a linked parent
      const student = await storage.getUser(submission.studentId);
      const parentLinks = await storage.getParentEmailsForStudent(submission.studentId);
      
      if (parentLinks.length > 0) {
        const vocabList = await storage.getVocabularyList(submission.listId);
        const incorrectDefinitions = processedDefinitions.filter(d => !d.isCorrect);
        
        // Get the actual word texts for incorrect definitions
        const incorrectWords = [];
        for (const def of incorrectDefinitions) {
          const definition = await storage.getWordDefinition(def.definitionId);
          if (definition) {
            const word = await storage.getVocabularyWord(definition.wordId);
            if (word) {
              incorrectWords.push(word.word);
            }
          }
        }

        for (const parentLink of parentLinks) {
          await sendParentEmail({
            parentEmail: parentLink.parentEmail,
            studentName: student?.name || "your child",
            score: validatedData.score,
            incorrectWords,
            listTitle: vocabList?.title || "vocabulary check-up",
          });
        }
      }

      res.json(gradedSubmission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error grading submission:", error);
      res.status(500).json({ message: "Error grading submission" });
    }
  });

  // Reassign a vocabulary list to a student (for redoing)
  app.post("/api/submissions/:id/reassign", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can reassign submissions" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      
      if (!submission.completed) {
        return res.status(400).json({ message: "Cannot reassign an incomplete submission" });
      }

      // Check if educator owns the vocabulary list
      const list = await storage.getVocabularyList(submission.listId);
      if (!list || list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to reassign this submission" });
      }
      
      // Create a new submission for the same list but marked as a redo
      const newSubmission = await storage.createSubmission({
        studentId: submission.studentId,
        listId: submission.listId,
        isRedo: true // This marks it as a redoing attempt
      });

      res.status(201).json(newSubmission);
    } catch (error) {
      console.error("Error reassigning submission:", error);
      res.status(500).json({ message: "Error reassigning submission" });
    }
  });
  // #endregion

  // #region Learner Routes
  // Get published vocabulary lists for learner
  app.get("/api/learner/vocabulary-lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get lists filtered by the student's class enrollments
      const lists = await storage.getPublishedVocabularyLists(req.user.id);
      
      // Debug logging to verify class filtering is working correctly
      console.log(`Student ${req.user.id} requesting vocabulary lists:`);
      console.log(`- Student has ${lists.length} accessible lists`);
      lists.forEach(list => {
        console.log(`  - List ${list.id}: "${list.title}" (class: ${list.classId || 'NO CLASS - SHOULD NOT BE VISIBLE'})`);
      });
      
      // Also get the submission status for each list
      const listsWithStatus = await Promise.all(
        lists.map(async (list) => {
          // Check for any existing submission (completed or not) - use false for includeRedo to get current submission
          const currentSubmission = await storage.getSubmissionByStudentAndList(req.user.id, Number(list.id), false);
          
          // Always include the list, but attach submission status if it exists
          return {
            ...list,
            submission: currentSubmission ? {
              id: currentSubmission.id,
              completed: currentSubmission.completed || false,
              gradedAt: currentSubmission.gradedAt,
              score: currentSubmission.score,
              submittedAt: currentSubmission.submittedAt,
              isDiscarded: currentSubmission.isDiscarded || false,
              discardReason: currentSubmission.discardReason || null
            } : null,
            class: list.class ? {
              id: list.class.id,
              name: list.class.name
            } : null
          };
        })
      );

      res.json(listsWithStatus);
    } catch (error) {
      console.error("Error fetching vocabulary lists:", error);
      res.status(500).json({ message: "Error fetching vocabulary lists" });
    }
  });

  // Create a new submission for a vocabulary list
  app.post("/api/submissions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can submit vocabulary check-ups" });
      }

      // Directly create the submission data without going through schema validation
      const submissionData = {
        studentId: req.user.id,
        listId: req.body.listId,
        isRedo: req.body.isRedo === true
      };

      // Check if list exists and is published
      const list = await storage.getVocabularyList(submissionData.listId);
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      // For class lists, we don't require them to be published
      // Only enforce published=true for non-class lists
      if (!list.classId && !list.published) {
        return res.status(403).json({ message: "This vocabulary list is not published yet" });
      }

      // Check if student already has a submission for this list
      const existingSubmission = await storage.getSubmissionByStudentAndList(
        submissionData.studentId,
        submissionData.listId
      );

      if (existingSubmission && !submissionData.isRedo) {
        return res.status(400).json({ 
          message: "You already have a submission for this list",
          submissionId: existingSubmission.id
        });
      }

      // Use direct SQL insertion to avoid issues with schema
      const result = await pool.query(`
        INSERT INTO submissions (student_id, list_id, is_redo, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id, student_id, list_id, is_redo, created_at
      `, [submissionData.studentId, submissionData.listId, submissionData.isRedo]);
      
      // Format the response to match what the client expects
      const submission = {
        id: result.rows[0].id,
        studentId: result.rows[0].student_id,
        listId: result.rows[0].list_id,
        isRedo: result.rows[0].is_redo,
        createdAt: result.rows[0].created_at,
        completed: false
      };
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "Error creating submission" });
    }
  });

  // Add a definition to a submission
  app.post("/api/submissions/:submissionId/definitions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can submit definitions" });
      }

      const submissionId = parseInt(req.params.submissionId);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this submission" });
      }

      if (submission.completed) {
        return res.status(400).json({ message: "This submission is already completed" });
      }

      const validatedData = insertWordDefinitionSchema.parse({
        submissionId,
        wordId: req.body.wordId,
        studentDefinition: req.body.studentDefinition,
      });

      const definition = await storage.createWordDefinition(validatedData);
      res.status(201).json(definition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error adding definition to submission:", error);
      res.status(500).json({ message: "Error adding definition to submission" });
    }
  });

  // Complete a submission
  app.post("/api/submissions/:id/complete", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can complete submissions" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this submission" });
      }

      if (submission.completed) {
        return res.status(400).json({ message: "This submission is already completed" });
      }

      // Students can complete submissions even if they skipped some words
      // No longer requiring all words to have definitions

      const updatedSubmission = await storage.updateSubmission(submissionId, {
        completed: true,
        submittedAt: new Date(),
      });
      
      // Get full information about the list to use in notification
      const fullList = await storage.getVocabularyList(submission.listId);
      const student = await storage.getUser(submission.studentId);
      
      if (fullList && fullList.educatorId) {
        // Create notification for the educator about the new submission
        await createSystemNotification(
          fullList.educatorId,
          'new_submission',
          'New Submission Ready to Grade',
          `${student.name} has completed the vocabulary check-up for "${fullList.title}".`,
          'submission',
          submissionId
        );
      }
      
      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error completing submission:", error);
      res.status(500).json({ message: "Error completing submission" });
    }
  });
  
  // Get fullscreen exit events for a submission
  app.get("/api/submissions/:id/fullscreen-exits", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can view fullscreen exit data" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      // Get the submission to check permissions
      const submission = await storage.getSubmission(submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Get the list to verify the educator owns it
      const list = await storage.getVocabularyList(submission.listId);
      if (!list || list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to view this data" });
      }

      // Get fullscreen exit events
      const exitEvents = await storage.getFullscreenExitsBySubmission(submissionId);
      
      res.json(exitEvents);
    } catch (error) {
      console.error("Error fetching fullscreen exit events:", error);
      res.status(500).json({ message: "Error fetching fullscreen exit events" });
    }
  });

  // Record fullscreen exit during a vocabulary check-up
  app.post("/api/submissions/:id/fullscreen-exit", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can record fullscreen exits" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this submission" });
      }
      
      // Get user agent from request headers
      const userAgent = req.headers['user-agent'] || '';
      
      // Create the fullscreen exit record
      const exitRecord = await storage.createFullscreenExit({
        submissionId,
        userAgent,
        timestamp: req.body.timestamp || new Date().toISOString(),
      });
      
      res.status(201).json(exitRecord);
    } catch (error) {
      console.error("Error recording fullscreen exit:", error);
      res.status(500).json({ message: "Error recording fullscreen exit" });
    }
  });

  // Discard a submission with reason and auto-grade with 0%
  app.post("/api/submissions/:id/discard", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can discard submissions" });
      }

      const submissionId = parseInt(req.params.id);
      if (isNaN(submissionId)) {
        return res.status(400).json({ message: "Invalid submission ID" });
      }

      const { discardReason } = req.body;
      if (!discardReason || typeof discardReason !== 'string' || discardReason.trim() === '') {
        return res.status(400).json({ message: "Please provide a reason for discarding the test" });
      }

      const submission = await storage.getSubmission(submissionId);
      
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to discard this submission" });
      }

      if (submission.completed) {
        return res.status(400).json({ message: "This submission is already completed" });
      }

      // Update submission as discarded with proper tracking
      const currentDate = new Date();
      const updatedSubmission = await storage.updateSubmission(submissionId, {
        completed: true,
        submittedAt: currentDate,
        gradedAt: currentDate,
        score: 0,
        isDiscarded: true,
        discardReason: discardReason
      });
      
      // Get full information about the list to use in notification
      const fullList = await storage.getVocabularyList(submission.listId);
      const student = await storage.getUser(submission.studentId);
      
      if (fullList && fullList.educatorId) {
        // Create notification for the educator about the discarded submission
        await createSystemNotification(
          fullList.educatorId,
          'discard_test',
          'Discarded Submission',
          `${student.name} has discarded their vocabulary check-up for "${fullList.title}". Reason: ${discardReason}`,
          'submission',
          submissionId
        );
      }

      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error discarding submission:", error);
      res.status(500).json({ message: "Error discarding submission" });
    }
  });

  // Get learner's recent results (completed and graded submissions)
  app.get("/api/learner/results", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Access denied" });
      }

      const results = await storage.getGradedSubmissionsByStudent(req.user.id);
      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Error fetching results" });
    }
  });

  // Get learner's flashcards
  app.get("/api/learner/flashcards", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Access denied" });
      }

      const flashcards = await storage.getFlashcardsByStudent(req.user.id);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ message: "Error fetching flashcards" });
    }
  });

  // Get learner's study statistics
  app.get("/api/learner/study-stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get flashcards and submissions to calculate stats
      const flashcards = await storage.getFlashcardsByStudent(req.user.id);
      const submissions = await storage.getGradedSubmissionsByStudent(req.user.id);
      
      // Calculate basic stats
      const totalWordsStudied = flashcards.length;
      const masteredWords = flashcards.filter(card => card.learned).length;
      const averageAccuracy = submissions.length > 0 
        ? submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / submissions.length 
        : 0;
      
      // Simple streak calculation (this could be enhanced with actual date tracking)
      const studyStreak = submissions.length > 0 ? Math.min(submissions.length, 7) : 0;
      
      // Basic XP system (could be enhanced)
      const xp = (masteredWords * 100) + (submissions.length * 50);
      const level = Math.floor(xp / 1000) + 1;
      const xpToNextLevel = level * 1000;
      
      // Weekly goal (could be user-configurable)
      const weeklyGoal = 50;
      const weeklyProgress = Math.min(totalWordsStudied, weeklyGoal);

      const stats = {
        totalWordsStudied,
        averageAccuracy,
        studyStreak,
        totalTimeSpent: submissions.length * 300, // Estimated 5min per submission
        weeklyGoal,
        weeklyProgress,
        level,
        xp,
        xpToNextLevel,
        masteredWords,
        submissionsCount: submissions.length
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching study stats:", error);
      res.status(500).json({ message: "Error fetching study stats" });
    }
  });

  // Mark a flashcard as learned
  app.patch("/api/flashcards/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can update flashcards" });
      }

      const flashcardId = parseInt(req.params.id);
      if (isNaN(flashcardId)) {
        return res.status(400).json({ message: "Invalid flashcard ID" });
      }

      const flashcard = await storage.getFlashcard(flashcardId);
      
      if (!flashcard) {
        return res.status(404).json({ message: "Flashcard not found" });
      }

      if (flashcard.studentId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to update this flashcard" });
      }

      const updatedFlashcard = await storage.updateFlashcard(flashcardId, {
        learned: req.body.learned,
      });

      res.json(updatedFlashcard);
    } catch (error) {
      console.error("Error updating flashcard:", error);
      res.status(500).json({ message: "Error updating flashcard" });
    }
  });
  // #endregion

  // #region Class Management Routes
  // Create a new class (educator only)
  app.post("/api/classes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can create classes" });
      }

      // Generate a unique class code
      const classCode = `CL${Math.floor(100000 + Math.random() * 900000)}`; // 6-digit code with CL prefix

      const validatedData = insertClassSchema.parse({
        ...req.body,
        educatorId: req.user.id,
        classCode,
      });

      const newClass = await storage.createClass(validatedData);
      res.status(201).json(newClass);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating class:", error);
      res.status(500).json({ message: "Error creating class" });
    }
  });

  // Get classes for educator
  app.get("/api/educator/classes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }

      const classes = await storage.getClassesByEducator(req.user.id);
      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ message: "Error fetching classes" });
    }
  });
  
  // Get student performance data for a class
  app.get("/api/classes/:id/student-performance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can view student performance" });
      }

      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      // Verify the educator owns this class
      const classData = await db.query.classes.findFirst({
        where: and(
          eq(classes.id, classId),
          eq(classes.educatorId, req.user.id)
        ),
      });

      if (!classData) {
        return res.status(403).json({ message: "Access denied - you do not own this class" });
      }

      const studentPerformance = await storage.getStudentPerformanceByClass(classId);
      res.json(studentPerformance);
    } catch (error) {
      console.error("Error fetching student performance:", error);
      res.status(500).json({ message: "Error fetching student performance" });
    }
  });

  // Get a class by ID
  app.get("/api/classes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      
      const classData = await storage.getClassById(classId);
      
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Check if the user is the educator or a student in the class
      const isEducator = classData.educatorId === req.user.id;
      const isStudent = classData.students?.some(
        student => student.studentId === req.user?.id && student.status === 'approved'
      );
      
      if (!isEducator && !isStudent) {
        return res.status(403).json({ message: "You don't have access to this class" });
      }
      
      return res.json(classData);
    } catch (error) {
      console.error("Error fetching class:", error);
      return res.status(500).json({ message: "An error occurred while fetching the class" });
    }
  });
  
  // Get vocabulary lists for a specific class
  app.get("/api/classes/:id/lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const classId = parseInt(req.params.id);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      
      const classData = await storage.getClassById(classId);
      
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      // Check if the user is the educator or a student in the class
      const isEducator = classData.educatorId === req.user.id;
      const isStudent = classData.students?.some(
        student => student.studentId === req.user?.id && student.status === 'approved'
      );
      
      if (!isEducator && !isStudent) {
        return res.status(403).json({ message: "You don't have access to this class" });
      }
      
      // Get all lists for this class
      const lists = await db.query.vocabularyLists.findMany({
        where: eq(vocabularyLists.classId, classId),
        with: {
          educator: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          words: true,
        },
        orderBy: [desc(vocabularyLists.createdAt)]
      });
      
      // For students, return all lists in the class and include their submission status
      if (req.user.role === 'learner') {
        // No longer filtering by published status for class lists
        
        // Get the student's submissions for these lists
        const studentSubmissions = await Promise.all(
          lists.map(async (list) => {
            // Get latest submission - completed or not, using the storage function that includes all fields
            const submission = await storage.getSubmissionByStudentAndList(req.user!.id, list.id, false);
            
            return {
              ...list,
              submission: submission ? {
                id: submission.id,
                completed: submission.completed,
                score: submission.score,
                submittedAt: submission.submittedAt,
                gradedAt: submission.gradedAt,
                isDiscarded: submission.isDiscarded || false,
                discardReason: submission.discardReason || null
              } : null
            };
          })
        );
        
        return res.json(studentSubmissions);
      }
      
      // For educators, return all lists
      return res.json(lists);
    } catch (error) {
      console.error("Error fetching class lists:", error);
      return res.status(500).json({ message: "An error occurred while fetching the class lists" });
    }
  });
  
  // Get student performance data for a class
  app.get("/api/educator/classes/:classId/student-performance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const classId = parseInt(req.params.classId);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }
      
      // Verify the educator owns this class
      const classData = await db.query.classes.findFirst({
        where: and(
          eq(classes.id, classId),
          eq(classes.educatorId, req.user.id)
        ),
      });
      
      if (!classData) {
        return res.status(403).json({ message: "Access denied - you do not own this class" });
      }
      
      const studentPerformance = await storage.getStudentPerformanceByClass(classId);
      res.json(studentPerformance);
    } catch (error) {
      console.error("Error fetching student performance:", error);
      res.status(500).json({ message: "Error fetching student performance" });
    }
  });
  
  // Get individual student progress data for visualization
  app.get("/api/educator/students/:studentId/progress", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const studentId = parseInt(req.params.studentId);
      if (isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid student ID" });
      }
      
      // Optional class filter
      const classId = req.query.classId ? parseInt(req.query.classId as string) : null;
      
      // Verify the educator can access this student's data
      // If classId is provided, verify the educator owns this class and the student is in it
      if (classId) {
        const classData = await db.query.classes.findFirst({
          where: and(
            eq(classes.id, classId),
            eq(classes.educatorId, req.user.id)
          ),
          with: {
            students: {
              where: eq(studentClass.studentId, studentId)
            }
          }
        });
        
        if (!classData || classData.students.length === 0) {
          return res.status(403).json({ 
            message: "Access denied - either you don't own this class or the student is not in this class" 
          });
        }
      }
      
      // Get all submissions by this student, focusing on vocabulary checkups
      const studentSubmissions = await db.query.submissions.findMany({
        where: and(
          eq(submissions.studentId, studentId),
          eq(submissions.completed, true),
          // If classId is provided, we'll filter later
        ),
        with: {
          list: {
            columns: {
              id: true,
              title: true,
              classId: true,
            },
          },
          wordDefinitions: {
            columns: {
              id: true,
              isCorrect: true,
            },
          },
        },
        orderBy: [asc(submissions.submittedAt)]
      });
      
      // For class filtering, we'll need to get vocabulary lists for this class
      let filteredSubmissions = studentSubmissions;
      
      if (classId) {
        // Get list IDs in this class
        const classLists = await db.query.vocabularyLists.findMany({
          where: eq(vocabularyLists.classId, classId),
          columns: {
            id: true
          }
        });
        
        const classListIds = classLists.map(list => list.id);
        
        // Filter submissions to only those with lists in this class
        filteredSubmissions = studentSubmissions.filter(
          sub => classListIds.includes(sub.listId)
        );
      }
      
      // Format the response for the chart
      const formattedSubmissions = filteredSubmissions.map(submission => {
        // Calculate score
        const totalDefinitions = submission.wordDefinitions.length;
        const correctDefinitions = submission.wordDefinitions.filter(def => !!def.isCorrect).length;
        const score = totalDefinitions > 0 
          ? Math.round((correctDefinitions / totalDefinitions) * 100) 
          : 0;
        
        return {
          id: submission.id,
          listTitle: submission.list.title,
          score: score,
          submittedAt: submission.submittedAt,
          date: submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '' // Formatted date for display
        };
      });
      
      // Get student info
      const student = await db.query.users.findFirst({
        where: eq(users.id, studentId),
        columns: {
          id: true,
          name: true,
          email: true,
        },
      });
      
      // Sort the submissions by date for the chart
      formattedSubmissions.sort((a, b) => {
        const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return dateA - dateB;
      });
      
      // Return just the formatted submissions array
      // This matches what the student-progress-chart.tsx component expects
      res.json(formattedSubmissions);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ message: "Error fetching student progress" });
    }
  });

  // Get pending join requests for educator's classes
  app.get("/api/educator/join-requests", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Access denied" });
      }

      const joinRequests = await storage.getPendingJoinRequests(req.user.id);
      res.json(joinRequests);
    } catch (error) {
      console.error("Error fetching join requests:", error);
      res.status(500).json({ message: "Error fetching join requests" });
    }
  });

  // Respond to a join request (approve/reject)
  app.patch("/api/join-requests/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can manage join requests" });
      }

      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const validatedData = classRequestResponseSchema.parse({
        ...req.body,
        studentClassId: requestId,
      });

      // Verify the educator owns the class before allowing the response
      const joinRequest = await db.query.studentClass.findFirst({
        where: eq(studentClass.id, requestId),
        with: {
          class: {
            columns: {
              id: true,
              educatorId: true,
            },
          },
        },
      });

      if (!joinRequest || joinRequest.class.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to respond to this request" });
      }

      const updatedRequest = await storage.updateJoinRequest(requestId, validatedData.status);
      
      // Get student and class details for notification
      const student = await storage.getUser(joinRequest.studentId);
      const classInfo = await storage.getClassById(joinRequest.classId);
      
      if (!classInfo) {
        console.error("Class not found for notification", joinRequest.classId);
      } else {
        if (validatedData.status === 'approved') {
          // Create notification for the student about class admission
          await createSystemNotification(
            joinRequest.studentId,
            'class_admission',
            'Class Admission Approved',
            `You have been admitted to the class "${classInfo.name}".`,
            'class',
            classInfo.id
          );
        } else {
          // Create notification for the student about class rejection
          await createSystemNotification(
            joinRequest.studentId,
            'class_admission',
            'Class Admission Rejected',
            `Your request to join "${classInfo.name}" has been rejected.`,
            'class',
            classInfo.id
          );
        }
      }
      
      res.json(updatedRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error responding to join request:", error);
      res.status(500).json({ message: "Error responding to join request" });
    }
  });
  
  // Remove a student from a class (educator only)
  app.delete("/api/classes/:classId/students/:studentId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can remove students from classes" });
      }

      const classId = parseInt(req.params.classId);
      const studentId = parseInt(req.params.studentId);
      
      if (isNaN(classId) || isNaN(studentId)) {
        return res.status(400).json({ message: "Invalid class or student ID" });
      }

      // Verify the educator owns the class
      const classInfo = await db.query.classes.findFirst({
        where: eq(classes.id, classId),
        columns: {
          educatorId: true,
        },
      });

      if (!classInfo || classInfo.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to manage this class" });
      }

      // Get full class info and student info before removal
      const fullClassInfo = await storage.getClassById(classId);
      const student = await storage.getUser(studentId);
      
      // Remove the student from the class
      const result = await storage.removeStudentFromClass(studentId, classId);
      
      if (!result) {
        return res.status(404).json({ message: "Student not found in this class" });
      }
      
      // Create notification for the student about class removal
      await createSystemNotification(
        studentId,
        'class_removal',
        'Removed from Class',
        `You have been removed from the class "${fullClassInfo.name}".`,
        'class',
        classId
      );
      
      res.json({ message: "Student removed from class successfully" });
    } catch (error) {
      console.error("Error removing student from class:", error);
      res.status(500).json({ message: "Error removing student from class" });
    }
  });

  // Get educator settings
  app.get("/api/educator/settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can access settings" });
      }

      // Get or create educator settings
      let settings = await db.query.educatorSettings.findFirst({
        where: eq(educatorSettings.educatorId, req.user.id),
      });

      // If no settings exist, create default settings
      if (!settings) {
        const defaultSettings = {
          educatorId: req.user.id,
          emailNotifications: true,
          autoApproveRequests: false,
          allowStudentSelfEnroll: true,
          defaultDueDate: 7,
          gradeVisibility: "immediate" as const,
          allowRedos: true,
          maxRedoAttempts: 3,
        };

        const [newSettings] = await db
          .insert(educatorSettings)
          .values(defaultSettings)
          .returning();
        
        settings = newSettings;
      }

      res.json(settings);
    } catch (error) {
      console.error("Error fetching educator settings:", error);
      res.status(500).json({ message: "Error fetching settings" });
    }
  });

  // Update educator settings
  app.patch("/api/educator/settings", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can update settings" });
      }

      const validatedData = updateEducatorSettingsSchema.parse(req.body);

      // Update or create settings
      const existingSettings = await db.query.educatorSettings.findFirst({
        where: eq(educatorSettings.educatorId, req.user.id),
      });

      let updatedSettings;

      if (existingSettings) {
        // Update existing settings
        const [updated] = await db
          .update(educatorSettings)
          .set({
            ...validatedData,
            updatedAt: new Date(),
          })
          .where(eq(educatorSettings.educatorId, req.user.id))
          .returning();
        
        updatedSettings = updated;
      } else {
        // Create new settings with provided values and defaults
        const defaultSettings = {
          educatorId: req.user.id,
          emailNotifications: true,
          autoApproveRequests: false,
          allowStudentSelfEnroll: true,
          defaultDueDate: 7,
          gradeVisibility: "immediate" as const,
          allowRedos: true,
          maxRedoAttempts: 3,
          ...validatedData,
        };

        const [created] = await db
          .insert(educatorSettings)
          .values(defaultSettings)
          .returning();
        
        updatedSettings = created;
      }

      res.json(updatedSettings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating educator settings:", error);
      res.status(500).json({ message: "Error updating settings" });
    }
  });

  // Join a class (learner only)
  app.post("/api/join-class", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can join classes" });
      }

      const validatedData = joinClassSchema.parse(req.body);

      // Find the class by class code
      const classToJoin = await storage.getClassByCode(validatedData.classCode);
      if (!classToJoin) {
        return res.status(404).json({ message: "Class not found. Please check the class code and try again." });
      }

      if (!classToJoin.active) {
        return res.status(403).json({ message: "This class is no longer active" });
      }

      // Create a join request
      const joinRequest = await storage.joinClass({
        studentId: req.user.id,
        classId: classToJoin.id,
      });

      // Create notification for the educator about the join request
      await createSystemNotification(
        classToJoin.educatorId,
        'join_request',
        'New Class Join Request',
        `${req.user.name} has requested to join your class "${classToJoin.name}".`,
        'class',
        joinRequest.id
      );

      res.status(201).json({
        message: "Join request submitted successfully. Waiting for educator approval.",
        joinRequest,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error joining class:", error);
      res.status(500).json({ message: "Error joining class" });
    }
  });

  // Get classes for a student (learner only)
  app.get("/api/learner/classes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Access denied" });
      }

      const enrolledClasses = await storage.getClassesForStudent(req.user.id);
      res.json(enrolledClasses);
    } catch (error) {
      console.error("Error fetching enrolled classes:", error);
      res.status(500).json({ message: "Error fetching enrolled classes" });
    }
  });

  // Get a specific class by ID (for student)
  app.get("/api/classes/:classId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const classId = parseInt(req.params.classId);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      // Students should only be able to access classes they're enrolled in
      if (req.user.role === "learner") {
        const studentClasses = await storage.getClassesForStudent(req.user.id);
        const classFound = studentClasses.find((cls: any) => cls.id === classId);
        
        if (!classFound) {
          return res.status(403).json({ message: "You are not enrolled in this class" });
        }
      } else if (req.user.role === "educator") {
        // For educators, verify they own this class
        const classData = await db.query.classes.findFirst({
          where: and(
            eq(classes.id, classId),
            eq(classes.educatorId, req.user.id)
          ),
        });
        
        if (!classData) {
          return res.status(403).json({ message: "Access denied - you do not own this class" });
        }
      }

      const classData = await storage.getClassById(classId);
      if (!classData) {
        return res.status(404).json({ message: "Class not found" });
      }

      res.json(classData);
    } catch (error) {
      console.error("Error fetching class:", error);
      res.status(500).json({ message: "Error fetching class" });
    }
  });
  
  // Get vocabulary lists for a specific class (for students)
  app.get("/api/classes/:classId/lists", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const classId = parseInt(req.params.classId);
      if (isNaN(classId)) {
        return res.status(400).json({ message: "Invalid class ID" });
      }

      // Students should only be able to access classes they're enrolled in
      if (req.user.role === "learner") {
        const studentClasses = await storage.getClassesForStudent(req.user.id);
        const classFound = studentClasses.find((cls: any) => cls.id === classId);
        
        if (!classFound) {
          return res.status(403).json({ message: "You are not enrolled in this class" });
        }
      } else if (req.user.role === "educator") {
        // For educators, verify they own this class
        const classData = await db.query.classes.findFirst({
          where: and(
            eq(classes.id, classId),
            eq(classes.educatorId, req.user.id)
          ),
        });
        
        if (!classData) {
          return res.status(403).json({ message: "Access denied - you do not own this class" });
        }
      }

      // Get all published vocabulary lists for this class
      const lists = await db.query.vocabularyLists.findMany({
        where: and(
          eq(vocabularyLists.classId, classId),
          eq(vocabularyLists.published, true)
        ),
        with: {
          words: true,
          educator: {
            columns: {
              id: true,
              name: true
            }
          }
        }
      });

      // For learners, include their submission status
      if (req.user.role === "learner") {
        const enrichedLists = await Promise.all(lists.map(async (list) => {
          const submission = await storage.getSubmissionByStudentAndList(req.user.id, list.id, true);
          return {
            ...list,
            submission: submission ? {
              id: submission.id,
              completed: submission.completed,
              score: submission.score
            } : null
          };
        }));
        
        return res.json(enrichedLists);
      }

      res.json(lists);
    } catch (error) {
      console.error("Error fetching class lists:", error);
      res.status(500).json({ message: "Error fetching class lists" });
    }
  });
  // #endregion

  // #region AI Routes
  // Check if Hugging Face API is configured
  app.get("/api/ai/status", (req, res) => {
    try {
      const configured = isAIConfigured();
      res.json({ configured });
    } catch (error) {
      console.error("Error checking AI status:", error);
      res.status(500).json({ message: "Error checking AI status" });
    }
  });
  
  // Generate passage from vocabulary words
  app.post("/api/ai/generate-passage", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can use this feature" });
      }

      const schema = z.object({
        words: z.array(z.string()).nonempty("At least one word is required"),
        topic: z.string().optional(),
        gradeLevel: z.string().optional(),
        paragraphCount: z.number().min(1).max(5).optional(),
        style: z.string().optional()
      });

      const validatedData = schema.parse(req.body);
      const passage = await generatePassageFromWords(
        validatedData.words, 
        {
          topic: validatedData.topic,
          gradeLevel: validatedData.gradeLevel,
          paragraphCount: validatedData.paragraphCount,
          style: validatedData.style
        }
      );
      
      res.json({ passage });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating passage:", error);
      res.status(500).json({ message: "Error generating passage" });
    }
  });

  // Generate definitions for vocabulary words
  app.post("/api/ai/definitions", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const schema = z.object({
        words: z.array(z.string()).nonempty("At least one word is required")
      });

      const validatedData = schema.parse(req.body);
      const definitions = await generateDefinitions(validatedData.words);
      
      res.json({ definitions });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating definitions:", error);
      res.status(500).json({ message: "Error generating definitions" });
    }
  });

  // Generate multiple choice questions for vocabulary words
  app.post("/api/ai/multiple-choice", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can use this feature" });
      }

      const schema = z.object({
        word: z.string().min(1, "Word is required"),
        correctDefinition: z.string().min(1, "Correct definition is required")
      });

      const validatedData = schema.parse(req.body);
      
      // Generate multiple choice options using AI
      const { generateMultipleChoice } = await import("./ai");
      const questionData = await generateMultipleChoice(validatedData.word, validatedData.correctDefinition);
      
      res.json(questionData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating multiple choice question:", error);
      res.status(500).json({ message: "Error generating multiple choice question" });
    }
  });

  // Analyze passage to extract potential vocabulary words
  app.post("/api/ai/analyze-passage", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can use this feature" });
      }

      const schema = z.object({
        passage: z.string().min(50, "Passage must be at least 50 characters long"),
        count: z.number().min(1).max(20).optional()
      });

      const validatedData = schema.parse(req.body);
      const words = await analyzePassage(validatedData.passage, validatedData.count);
      
      res.json({ words });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error analyzing passage:", error);
      res.status(500).json({ message: "Error analyzing passage" });
    }
  });

  // Grade a student's definition
  app.post("/api/ai/grade-definition", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can use this feature" });
      }

      const schema = z.object({
        word: z.string().min(1, "Word is required"),
        studentDefinition: z.string().nullable().transform(val => val || "No definition provided"),
        correctDefinition: z.string().optional()
      });

      const validatedData = schema.parse(req.body);
      const grading = await gradeDefinition(
        validatedData.word,
        validatedData.studentDefinition,
        validatedData.correctDefinition
      );
      
      res.json(grading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error grading definition:", error);
      res.status(500).json({ message: "Error grading definition" });
    }
  });

  // Generate example sentences
  app.post("/api/ai/example-sentences", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const schema = z.object({
        words: z.array(z.string()).nonempty("At least one word is required"),
        count: z.number().min(1).max(5).optional()
      });

      const validatedData = schema.parse(req.body);
      const sentences = await generateExampleSentences(validatedData.words, validatedData.count);
      
      res.json({ sentences });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating example sentences:", error);
      res.status(500).json({ message: "Error generating example sentences" });
    }
  });

  // Generate personalized learning strategies
  app.post("/api/ai/learning-strategies", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can use this feature" });
      }

      const schema = z.object({
        words: z.array(z.string()).nonempty("At least one word is required"),
        studentPerformance: z.record(z.boolean())
      });

      const validatedData = schema.parse(req.body);
      const strategies = await generateLearningStrategies(
        validatedData.words,
        validatedData.studentPerformance
      );
      
      res.json(strategies);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error generating learning strategies:", error);
      res.status(500).json({ message: "Error generating learning strategies" });
    }
  });

  // Generate AI multiple choice question
  app.post("/api/ai/generate-question", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can generate questions" });
      }

      const { word, definition } = req.body;
      
      if (!word) {
        return res.status(400).json({ message: "Word is required" });
      }

      const question = await generateMultipleChoiceQuestion({ word, definition });
      res.json(question);
    } catch (error: any) {
      console.error("Error generating question:", error);
      res.status(500).json({ message: error.message || "Failed to generate question" });
    }
  });

  // Submit multiple choice answer for a question (learner)
  app.post("/api/submissions/:submissionId/multiple-choice-answer", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can submit answers" });
      }

      const submissionId = parseInt(req.params.submissionId);
      const { questionId, selectedAnswer } = req.body;

      if (isNaN(submissionId) || !questionId || !selectedAnswer) {
        return res.status(400).json({ message: "Valid submission ID, question ID, and selected answer are required" });
      }

      // Verify the submission belongs to the current user
      const submission = await db.query.submissions.findFirst({
        where: eq(submissions.id, submissionId)
      });

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      if (submission.studentId !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to submit answers for this submission" });
      }

      if (submission.completed) {
        return res.status(400).json({ message: "Cannot submit answers for a completed submission" });
      }

      // Get the question to validate and check correctness
      const question = await db.query.multipleChoiceQuestions.findFirst({
        where: eq(multipleChoiceQuestions.id, questionId)
      });

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      const isCorrect = question.correctAnswer === selectedAnswer;

      // Check if an answer already exists for this question and submission
      const existingAnswer = await db.query.multipleChoiceAnswers.findFirst({
        where: and(
          eq(multipleChoiceAnswers.submissionId, submissionId),
          eq(multipleChoiceAnswers.questionId, questionId)
        )
      });

      let answerRecord;
      if (existingAnswer) {
        // Update existing answer
        [answerRecord] = await db.update(multipleChoiceAnswers)
          .set({
            selectedAnswer,
            isCorrect
          })
          .where(eq(multipleChoiceAnswers.id, existingAnswer.id))
          .returning();
      } else {
        // Create new answer
        [answerRecord] = await db.insert(multipleChoiceAnswers)
          .values({
            submissionId,
            questionId,
            selectedAnswer,
            isCorrect
          })
          .returning();
      }

      res.status(201).json(answerRecord);
    } catch (error) {
      console.error("Error saving multiple choice answer:", error);
      res.status(500).json({ message: "Error saving multiple choice answer" });
    }
  });
  // #endregion

  // #region Notification Routes
  
  // Get all notifications for the user
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user!.id;
      const category = req.query.category as string | undefined;
      const notifications = await storage.getFilteredNotifications(userId, category);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  
  // Get unread notification count
  app.get("/api/notifications/count", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching notification count:", error);
      res.status(500).json({ error: "Failed to fetch notification count" });
    }
  });
  
  // Mark a notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  
  // Mark all notifications as read (with optional category filter)
  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user!.id;
      const { category } = req.body;
      await storage.markAllNotificationsAsRead(userId, category);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });
  
  // Delete a notification
  app.delete("/api/notifications/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });
  
  // #endregion

  // #region Email Verification Routes

  // Verify email endpoint - support both GET and POST
  const verifyEmailHandler = async (req: any, res: any) => {
    try {
      const token = req.method === 'GET' ? req.query.token : req.body.token;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          success: false,
          message: "Invalid verification token" 
        });
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid or expired verification token" 
        });
      }

      // Check if token is expired (24 hours)
      if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
        return res.status(400).json({ 
          success: false,
          message: "Verification token has expired" 
        });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.json({
          success: true,
          message: "Email is already verified!",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: true,
          }
        });
      }

      // Update user to verified
      await storage.updateUserVerification(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      // Send welcome email
      try {
        const { sendWelcomeEmail } = await import("./email-verification");
        await sendWelcomeEmail({
          email: user.email,
          name: user.name,
          role: user.role as 'educator' | 'learner',
        });
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail verification if welcome email fails
      }

      res.json({ 
        success: true,
        message: "Email verified successfully! Welcome to Lexible!",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: true,
        }
      });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ 
        success: false,
        message: "Error verifying email" 
      });
    }
  };

  app.get("/api/verify-email", verifyEmailHandler);
  app.post("/api/verify-email", verifyEmailHandler);

  // Resend verification email
  app.post("/api/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.emailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Update user with new token
      await storage.updateUserVerification(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: expiresAt,
      });

      // Send verification email
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        verificationToken,
      });

      res.json({ message: "Verification email sent successfully" });
    } catch (error) {
      console.error("Error resending verification email:", error);
      if (error instanceof Error && error.message.includes('Email service not configured')) {
        res.status(503).json({ message: "Email service is not configured. Please contact support." });
      } else {
        res.status(500).json({ message: "Error sending verification email" });
      }
    }
  });

  // Check email verification status
  app.get("/api/email-verification-status", async (req, res) => {
    try {
      const { email } = req.query;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        emailVerified: user.emailVerified,
        email: user.email,
      });
    } catch (error) {
      console.error("Error checking verification status:", error);
      res.status(500).json({ message: "Error checking verification status" });
    }
  });

  // #endregion

  // #region Settings Routes

  // Update user profile
  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const schema = z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        profilePicture: z.string().optional(),
      });

      const validatedData = schema.parse(req.body);

      // Update user profile
      await db.update(users)
        .set({ 
          name: validatedData.name,
          profilePicture: validatedData.profilePicture,
        })
        .where(eq(users.id, req.user.id));

      // Get updated user data
      const updatedUser = await storage.getUser(req.user.id);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        profilePicture: updatedUser.profilePicture,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Error updating profile" });
    }
  });

  // Change password
  app.patch("/api/user/password", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const schema = z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
      });

      const validatedData = schema.parse(req.body);

      // Get current user data
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Import password comparison and hashing functions from auth
      const { comparePasswords, hashPassword } = await import("./auth");
      
      // Verify current password using the same method as login
      const isCurrentPasswordValid = await comparePasswords(validatedData.currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password using the same method as registration
      const hashedNewPassword = await hashPassword(validatedData.newPassword);

      // Update password
      await db.update(users)
        .set({ password: hashedNewPassword })
        .where(eq(users.id, req.user.id));

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Error changing password" });
    }
  });

  // Send help/contact message
  app.post("/api/help/contact", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const schema = z.object({
        subject: z.string().min(5, "Subject must be at least 5 characters"),
        message: z.string().min(20, "Message must be at least 20 characters"),
      });

      const validatedData = schema.parse(req.body);

      // Create email content
      const emailContent = `
        <h2>New Support Request from Lexible</h2>
        <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
        <p><strong>Role:</strong> ${req.user.role}</p>
        <p><strong>User ID:</strong> ${req.user.id}</p>
        <p><strong>Subject:</strong> ${validatedData.subject}</p>
        <h3>Message:</h3>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${validatedData.message.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p><small>This message was sent from the Lexible platform on ${new Date().toLocaleString()}.</small></p>
      `;

      // Use the same email transporter configuration from other email functions
      const nodemailer = await import("nodemailer");
      
      if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        throw new Error('Email configuration is missing. Please check EMAIL_USER and EMAIL_APP_PASSWORD environment variables.');
      }

      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'giahienhn@gmail.com',
        subject: `Lexible Support: ${validatedData.subject}`,
        html: emailContent,
        replyTo: req.user.email,
      };

      console.log('Attempting to send contact support email...');
      await transporter.sendMail(mailOptions);
      console.log('Contact support email sent successfully');

      res.json({ message: "Your message has been sent successfully. We'll get back to you soon!" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error sending help message:", error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
          res.status(503).json({ 
            message: "Email service authentication failed. Please try again later or contact support directly at giahienhn@gmail.com" 
          });
        } else if (error.message.includes('configuration')) {
          res.status(503).json({ 
            message: "Email service is not configured properly. Please contact support directly at giahienhn@gmail.com" 
          });
        } else {
          res.status(500).json({ 
            message: "Error sending message. Please try again later.", 
            details: error.message 
          });
        }
      } else {
        res.status(500).json({ message: "Error sending message. Please try again later." });
      }
    }
  });

  // #endregion

  // Email verification endpoint
  app.post("/api/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: "Verification token is required" 
        });
      }

      // Find user with this verification token
      const user = await storage.getUserByVerificationToken(token);
      
      if (!user) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid or expired verification token" 
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({ 
          success: false, 
          message: "Email address has already been verified" 
        });
      }

      // Update user as verified
      await storage.updateUserVerification(user.id, {
        emailVerified: true,
        emailVerificationToken: null
      });

      // Send welcome email
      const { sendWelcomeEmail } = await import("./email-verification");
      try {
        await sendWelcomeEmail({
          email: user.email,
          name: user.name,
          role: user.role
        });
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail the verification if welcome email fails
      }

      res.json({ 
        success: true, 
        message: "Email verified successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Internal server error during verification" 
      });
    }
  });

  // Test email endpoint
  app.post("/api/test-email", async (req, res) => {
    try {
      const nodemailer = await import("nodemailer");
      
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: req.body.email || 'checkitdev1@gmail.com',
        subject: 'Lexible Email Test',
        html: '<h1>Email Test Successful!</h1><p>Your Gmail configuration is working properly.</p>',
      });

      res.json({ message: "Test email sent successfully!" });
    } catch (error) {
      console.error("Email test failed:", error);
      res.status(500).json({ message: "Email test failed", error: error.message });
    }
  });

  // Forgot password endpoint
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
      }

      // Generate password reset token and expiration (1 hour)
      const resetToken = generatePasswordResetToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await storage.updateUserPasswordReset(user.id, {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      });

      // Send password reset email
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetToken,
      });

      res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Error processing password reset request" });
    }
  });

  // Reset password endpoint
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      
      console.log('Reset password request:', { 
        token: token?.substring(0, 10) + '...', 
        hasPassword: !!password,
        requestBody: req.body 
      });
      
      // Find user by reset token
      const user = await storage.getUserByPasswordResetToken(token);
      console.log('User found:', user ? { 
        email: user.email, 
        hasToken: !!user.passwordResetToken, 
        expires: user.passwordResetExpires,
        tokenMatch: user.passwordResetToken === token
      } : 'No user found');
      
      if (!user || !user.passwordResetExpires) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token has expired
      if (new Date() > user.passwordResetExpires) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Verify the new password is different from the old one
      const isSamePassword = await comparePasswords(password, user.password);
      if (isSamePassword) {
        return res.status(400).json({ message: "New password must be different from your current password" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(password);

      // Update user's password and clear reset token
      await storage.updateUserPasswordReset(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      });

      // Send confirmation email
      await sendPasswordResetConfirmationEmail({
        email: user.email,
        name: user.name,
      });

      // If user is currently logged in, log them out by destroying session
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
        });
      }

      res.json({ message: "Password successfully reset. Please log in with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // Fullscreen exit tracking endpoint
  app.post("/api/fullscreen-exit", async (req, res) => {
    try {
      const { submissionId, exitedAt } = req.body;
      
      if (!submissionId || !exitedAt) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      await storage.createFullscreenExit({
        submissionId: parseInt(submissionId),
        exitedAt: new Date(exitedAt)
      });

      res.json({ message: "Fullscreen exit logged successfully" });
    } catch (error) {
      console.error("Error logging fullscreen exit:", error);
      res.status(500).json({ message: "Failed to log fullscreen exit" });
    }
  });

  // #region AI Service Testing Routes

  // Test Groq AI service endpoint
  app.post("/api/test-groq", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "educator") {
        return res.status(403).json({ message: "Only educators can test AI services" });
      }

      const { words, testType = "definitions" } = req.body;

      if (!words || !Array.isArray(words) || words.length === 0) {
        return res.status(400).json({ message: "Please provide an array of words to test" });
      }

      let result;
      const { isAIConfigured, getPrimaryAIProvider } = await import("./ai");

      if (!isAIConfigured()) {
        return res.status(503).json({ 
          message: "No AI service is configured. Please configure GROQ_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY." 
        });
      }

      const provider = getPrimaryAIProvider();

      switch (testType) {
        case "definitions":
          const { generateDefinitions } = await import("./ai");
          result = await generateDefinitions(words);
          break;
        case "passage":
          const { generatePassageFromWords } = await import("./ai");
          result = await generatePassageFromWords(words, { 
            topic: req.body.topic || "general knowledge",
            gradeLevel: req.body.gradeLevel || "middle school"
          });
          break;
        case "analyze":
          const { analyzePassage } = await import("./ai");
          const passage = req.body.passage;
          if (!passage) {
            return res.status(400).json({ message: "Please provide a passage to analyze" });
          }
          result = await analyzePassage(passage, req.body.wordCount || 10);
          break;
        default:
          return res.status(400).json({ message: "Invalid test type. Use 'definitions', 'passage', or 'analyze'" });
      }

      res.json({
        success: true,
        provider,
        testType,
        input: testType === "analyze" ? { passage: req.body.passage } : { words },
        result
      });
    } catch (error) {
      console.error("Error testing AI service:", error);
      res.status(500).json({ 
        message: "Error testing AI service", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Get AI service status
  app.get("/api/ai-status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { isAIConfigured, getPrimaryAIProvider } = await import("./ai");
      const { isGroqConfigured } = await import("./groq");
      const { isHuggingFaceConfigured } = await import("./huggingface");

      res.json({
        isConfigured: isAIConfigured(),
        primaryProvider: getPrimaryAIProvider(),
        providers: {
          groq: isGroqConfigured(),
          openai: process.env.OPENAI_API_KEY ? true : false,
          huggingface: isHuggingFaceConfigured()
        }
      });
    } catch (error) {
      console.error("Error getting AI status:", error);
      res.status(500).json({ message: "Error getting AI status" });
    }
  });

  // AI definition generation endpoint
  app.post("/api/ai/generate-definition", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can generate definitions" });
      }

      const { word } = req.body;
      if (!word || typeof word !== 'string') {
        return res.status(400).json({ message: "Word is required" });
      }

      const { generateSingleDefinition } = await import("./ai");
      const definition = await generateSingleDefinition(word.trim());
      
      console.log("Generated definition for word:", word, "->", definition);
      
      if (!definition) {
        return res.status(500).json({ 
          message: "No definition generated by AI service" 
        });
      }

      res.json({ definition });
    } catch (error) {
      console.error("Error generating definition:", error);
      res.status(500).json({ 
        message: "Failed to generate definition", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Create custom sticky note
  app.post("/api/sticky-notes/custom", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can create custom notes" });
      }

      const noteData = {
        ...req.body,
        studentId: req.user.id,
        isCustom: true
      };

      const validatedData = insertStickyNoteSchema.parse(noteData);
      const newNote = await storage.createStickyNote(validatedData);

      res.status(201).json(newNote);
    } catch (error) {
      console.error("Error creating custom sticky note:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ 
        message: "Failed to create custom note",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // #endregion

  // #region Explore Routes
  // Get personalized vocabulary words for exploration based on incorrect answers
  app.get("/api/explore/words", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can access explore words" });
      }

      // Get words that the student got wrong (not marked as correct)
      const incorrectWords = await db.select({
        word: vocabularyWords.word,
        definition: vocabularyWords.definition,
        listTitle: vocabularyLists.title,
        submissionId: wordDefinitions.submissionId,
        isCorrect: wordDefinitions.isCorrect
      })
      .from(wordDefinitions)
      .innerJoin(vocabularyWords, eq(wordDefinitions.wordId, vocabularyWords.id))
      .innerJoin(vocabularyLists, eq(vocabularyWords.listId, vocabularyLists.id))
      .innerJoin(submissions, eq(wordDefinitions.submissionId, submissions.id))
      .where(and(
        eq(submissions.studentId, req.user.id),
        eq(wordDefinitions.isCorrect, false)
      ))
      .orderBy(desc(wordDefinitions.createdAt))
      .limit(20);

      // Get some fallback words from completed tests for variety
      const fallbackWords = await db.select({
        word: vocabularyWords.word,
        definition: vocabularyWords.definition,
        listTitle: vocabularyLists.title,
        submissionId: sql<number>`NULL`.as('submissionId'),
        isCorrect: sql<boolean>`NULL`.as('isCorrect')
      })
      .from(vocabularyWords)
      .innerJoin(vocabularyLists, eq(vocabularyWords.listId, vocabularyLists.id))
      .innerJoin(submissions, eq(vocabularyLists.id, submissions.listId))
      .where(eq(submissions.studentId, req.user.id))
      .orderBy(sql`RANDOM()`)
      .limit(5);

      // Always add smart vocabulary suggestions using AI
      const { generateVocabularySuggestions, generateContextualSuggestions } = await import("./ai");
      let aiSuggestions: any[] = [];
      
      try {
        // If we have incorrect words, generate contextual suggestions based on them
        if (incorrectWords.length > 0) {
          const wrongWords = incorrectWords.map(w => w.word);
          const contextualSuggestions = await generateContextualSuggestions(wrongWords);
          aiSuggestions = contextualSuggestions.map((word: any) => ({
            word: word.word,
            definition: word.definition,
            example: word.example,
            category: word.category || "General",
            difficulty: word.difficulty || "medium",
            listTitle: "AI Suggestions",
            submissionId: null,
            isCorrect: null
          }));
        } else {
          // If no wrong words, generate general vocabulary suggestions
          const suggestions = await generateVocabularySuggestions();
          aiSuggestions = suggestions.map((word: any) => ({
            word: word.word,
            definition: word.definition,
            example: word.example,
            category: word.category || "General",
            difficulty: word.difficulty || "medium",
            listTitle: "AI Suggestions",
            submissionId: null,
            isCorrect: null
          }));
        }
      } catch (error) {
        console.error("Error generating AI vocabulary suggestions:", error);
      }

      // Combine all words: incorrect words + AI suggestions + fallback words
      const combinedWords = [...fallbackWords, ...aiSuggestions].slice(0, 10);
      const finalWords = [...incorrectWords, ...combinedWords].slice(0, 20);

      const message = incorrectWords.length === 0 
        ? "Great job! No incorrect words found. Here are some suggested words to expand your vocabulary."
        : `Found ${incorrectWords.length} words to review. Here are related words and synonyms to deepen your understanding!`;

      res.json({
        words: finalWords,
        personalized: incorrectWords.length > 0,
        message
      });
    } catch (error) {
      console.error("Error fetching explore words:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // #region Sticky Notes Routes

  // Get all sticky notes for a student
  app.get("/api/sticky-notes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can access sticky notes" });
      }

      const notes = await db.query.stickyNotes.findMany({
        where: eq(stickyNotes.studentId, req.user.id),
        orderBy: desc(stickyNotes.updatedAt),
      });

      res.json(notes);
    } catch (error) {
      console.error("Error fetching sticky notes:", error);
      res.status(500).json({ message: "Error fetching sticky notes" });
    }
  });

  // Create a new sticky note
  app.post("/api/sticky-notes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can create sticky notes" });
      }

      // Check if word already exists in user's sticky notes
      const existingNote = await db.query.stickyNotes.findFirst({
        where: and(
          eq(stickyNotes.studentId, req.user.id),
          eq(stickyNotes.word, req.body.word)
        ),
      });

      if (existingNote) {
        return res.status(409).json({ message: "Word already exists in your sticky notes" });
      }

      // Generate AI definition for the word (inherent feature)
      let aiDefinition = "Definition not available";
      try {
        aiDefinition = await ai.generateSingleDefinition(req.body.word);
      } catch (error) {
        console.warn("Failed to generate AI definition:", error);
      }

      const validatedData = insertStickyNoteSchema.parse({
        ...req.body,
        studentId: req.user.id,
        definition: aiDefinition, // Always use AI-generated definition
      });

      const [newNote] = await db.insert(stickyNotes)
        .values(validatedData)
        .returning();

      res.status(201).json(newNote);
    } catch (error) {
      console.error("Error creating sticky note:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error creating sticky note" });
    }
  });

  // Update a sticky note
  app.patch("/api/sticky-notes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can update sticky notes" });
      }

      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }

      // Verify note exists and belongs to user
      const existingNote = await db.query.stickyNotes.findFirst({
        where: and(
          eq(stickyNotes.id, noteId),
          eq(stickyNotes.studentId, req.user.id)
        ),
      });

      if (!existingNote) {
        return res.status(404).json({ message: "Sticky note not found" });
      }

      // Handle position updates separately from other updates
      const { positionX, positionY, ...otherUpdates } = req.body;
      
      let updateData: any = {
        updatedAt: new Date()
      };

      // If position data is provided, include it
      if (typeof positionX === 'number') {
        updateData.positionX = positionX;
      }
      if (typeof positionY === 'number') {
        updateData.positionY = positionY;
      }

      // If other updates are provided, validate them
      if (Object.keys(otherUpdates).length > 0) {
        const validatedData = updateStickyNoteSchema.parse(otherUpdates);
        updateData = { ...updateData, ...validatedData };
      }

      const [updatedNote] = await db.update(stickyNotes)
        .set(updateData)
        .where(eq(stickyNotes.id, noteId))
        .returning();

      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating sticky note:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: "Error updating sticky note" });
    }
  });

  // Delete a sticky note
  app.delete("/api/sticky-notes/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (req.user.role !== "learner") {
        return res.status(403).json({ message: "Only learners can delete sticky notes" });
      }

      const noteId = parseInt(req.params.id);
      if (isNaN(noteId)) {
        return res.status(400).json({ message: "Invalid note ID" });
      }

      // Verify note exists and belongs to user
      const existingNote = await db.query.stickyNotes.findFirst({
        where: and(
          eq(stickyNotes.id, noteId),
          eq(stickyNotes.studentId, req.user.id)
        ),
      });

      if (!existingNote) {
        return res.status(404).json({ message: "Sticky note not found" });
      }

      await db.delete(stickyNotes)
        .where(eq(stickyNotes.id, noteId));

      res.json({ message: "Sticky note deleted successfully" });
    } catch (error) {
      console.error("Error deleting sticky note:", error);
      res.status(500).json({ message: "Error deleting sticky note" });
    }
  });

  // #endregion

  // #region Search API

  // Global search endpoint
  app.get("/api/search", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { q } = req.query;
      if (!q || typeof q !== "string" || q.length < 2) {
        return res.json([]);
      }

      const query = q.trim().toLowerCase();
      const results: any[] = [];

      if (req.user.role === "educator") {
        // Search vocabulary lists
        const vocabularyResults = await db.query.vocabularyLists.findMany({
          where: and(
            eq(vocabularyLists.educatorId, req.user.id),
            sql`LOWER(${vocabularyLists.title}) LIKE ${`%${query}%`}`
          ),
          with: {
            class: true
          },
          limit: 10
        });

        vocabularyResults.forEach(list => {
          results.push({
            id: list.id,
            title: list.title,
            type: 'vocabulary_list',
            description: list.class ? `Assigned to ${list.class.name}` : 'Not assigned',
            url: `/educator/vocabulary/${list.id}`
          });
        });

        // Search classes
        const classResults = await db.query.classes.findMany({
          where: and(
            eq(classes.educatorId, req.user.id),
            sql`LOWER(${classes.name}) LIKE ${`%${query}%`}`
          ),
          limit: 10
        });

        classResults.forEach(cls => {
          results.push({
            id: cls.id,
            title: cls.name,
            type: 'class',
            description: cls.description || 'Class',
            url: `/educator/classes`
          });
        });

        // Search students in educator's classes
        const studentResults = await db.query.users.findMany({
          where: and(
            eq(users.role, "learner"),
            sql`LOWER(${users.name}) LIKE ${`%${query}%`}`
          ),
          with: {
            studentClasses: {
              with: {
                class: {
                  where: eq(classes.educatorId, req.user.id)
                }
              }
            }
          },
          limit: 10
        });

        studentResults.forEach(student => {
          if (student.studentClasses.length > 0) {
            const classNames = student.studentClasses.map(sc => sc.class?.name).filter(Boolean).join(', ');
            results.push({
              id: student.id,
              title: student.name,
              type: 'student',
              description: `Student in ${classNames}`,
              url: `/educator/classes`
            });
          }
        });

      } else if (req.user.role === "learner") {
        // Search vocabulary lists assigned to student
        const studentClassIds = await db.query.studentClass.findMany({
          where: eq(studentClass.studentId, req.user.id),
          columns: { classId: true }
        });

        if (studentClassIds.length > 0) {
          const classIds = studentClassIds.map(sc => sc.classId);
          
          const vocabularyResults = await db.query.vocabularyLists.findMany({
            where: and(
              eq(vocabularyLists.published, true),
              inArray(vocabularyLists.classId, classIds),
              sql`LOWER(${vocabularyLists.title}) LIKE ${`%${query}%`}`
            ),
            with: {
              class: true
            },
            limit: 10
          });

          vocabularyResults.forEach(list => {
            results.push({
              id: list.id,
              title: list.title,
              type: 'vocabulary_list',
              description: `From ${list.class?.name || 'Unknown class'}`,
              url: `/learner/vocabulary/${list.id}`
            });
          });
        }

        // Search student's classes
        const classResults = await db.query.classes.findMany({
          where: and(
            inArray(classes.id, studentClassIds.map(sc => sc.classId)),
            sql`LOWER(${classes.name}) LIKE ${`%${query}%`}`
          ),
          limit: 10
        });

        classResults.forEach(cls => {
          results.push({
            id: cls.id,
            title: cls.name,
            type: 'class',
            description: cls.description || 'Class',
            url: `/learner/class/${cls.id}`
          });
        });
      }

      // Sort results by relevance (exact matches first, then partial matches)
      results.sort((a, b) => {
        const aExact = a.title.toLowerCase() === query;
        const bExact = b.title.toLowerCase() === query;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });

      res.json(results.slice(0, 20)); // Limit to 20 results
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({ message: "Error performing search" });
    }
  });

  // #endregion

  const httpServer = createServer(app);
  return httpServer;
}
