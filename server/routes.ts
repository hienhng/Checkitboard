import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { sendParentEmail } from "./email";
import { eq, and, desc, isNull, asc } from "drizzle-orm";
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
  vocabularyLists,
  vocabularyWords,
  submissions,
  wordDefinitions,
  flashcards,
  users,
  classes,
  studentClass,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
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

      const validatedData = insertVocabularyListSchema.parse({
        ...req.body,
        educatorId: req.user.id,
      });

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

      // Check if user has access to this list
      if (req.user.role === "educator" && list.educatorId !== req.user.id) {
        return res.status(403).json({ message: "You don't have access to this list" });
      }

      res.json(list);
    } catch (error) {
      console.error("Error fetching vocabulary list:", error);
      res.status(500).json({ message: "Error fetching vocabulary list" });
    }
  });

  // Update a vocabulary list (publish/unpublish)
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

      const updatedList = await storage.updateVocabularyList(listId, req.body);
      res.json(updatedList);
    } catch (error) {
      console.error("Error updating vocabulary list:", error);
      res.status(500).json({ message: "Error updating vocabulary list" });
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

  // Get a specific submission with student definitions
  app.get("/api/submissions/:id", async (req, res) => {
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
        score: z.number().min(0).max(100),
      });

      const validatedData = gradeSchema.parse(req.body);

      // Update each definition
      for (const def of validatedData.definitions) {
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

      // Update submission with score and graded timestamp
      const gradedSubmission = await storage.updateSubmission(submissionId, {
        score: validatedData.score,
        gradedAt: new Date(),
      });

      // Send email to parent if student has a linked parent
      const student = await storage.getUser(submission.studentId);
      const parentLinks = await storage.getParentEmailsForStudent(submission.studentId);
      
      if (parentLinks.length > 0) {
        const vocabList = await storage.getVocabularyList(submission.listId);
        const incorrectDefinitions = validatedData.definitions.filter(d => !d.isCorrect);
        
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

      const lists = await storage.getPublishedVocabularyLists();
      
      // Also get the submission status for each list
      const listsWithStatus = await Promise.all(
        lists.map(async (list) => {
          const submission = await storage.getSubmissionByStudentAndList(req.user.id, list.id);
          return {
            ...list,
            submission: submission || null,
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

      const validatedData = insertSubmissionSchema.parse({
        studentId: req.user.id,
        listId: req.body.listId,
      });

      // Check if list exists and is published
      const list = await storage.getVocabularyList(validatedData.listId);
      if (!list) {
        return res.status(404).json({ message: "Vocabulary list not found" });
      }

      if (!list.published) {
        return res.status(403).json({ message: "This vocabulary list is not published yet" });
      }

      // Check if student already has a submission for this list
      const existingSubmission = await storage.getSubmissionByStudentAndList(
        validatedData.studentId,
        validatedData.listId
      );

      if (existingSubmission && !validatedData.isRedo) {
        return res.status(400).json({ 
          message: "You already have a submission for this list",
          submissionId: existingSubmission.id
        });
      }

      const submission = await storage.createSubmission(validatedData);
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

      // Check if all words have definitions
      const list = await storage.getVocabularyListWithWords(submission.listId);
      const definitions = await storage.getWordDefinitionsBySubmission(submissionId);
      
      if (!list || !list.words || definitions.length < list.words.length) {
        return res.status(400).json({ 
          message: "All words must have definitions before completing the submission",
          definitionsCount: definitions.length,
          wordsCount: list?.words?.length || 0
        });
      }

      const updatedSubmission = await storage.updateSubmission(submissionId, {
        completed: true,
        submittedAt: new Date(),
      });

      res.json(updatedSubmission);
    } catch (error) {
      console.error("Error completing submission:", error);
      res.status(500).json({ message: "Error completing submission" });
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

  const httpServer = createServer(app);

  return httpServer;
}
