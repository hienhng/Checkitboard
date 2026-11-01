import { db, pool } from "./index.js";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting database seed...");

    // Check if we have any users first
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length > 0) {
      console.log("Database already contains users, skipping seed");
      return;
    }

    // Create sample users
    const educatorPassword = await hashPassword("password123");
    const [educator] = await db.insert(schema.users).values({
      email: "teacher@example.com",
      password: educatorPassword,
      name: "Jane Doe",
      role: "educator",
      emailVerified: true,
    }).returning();
    console.log("Created educator:", educator.email);

    const learnerPassword = await hashPassword("password123");
    const [learner] = await db.insert(schema.users).values({
      email: "student@example.com",
      password: learnerPassword,
      name: "Tyler Smith",
      role: "learner",
      emailVerified: true,
    }).returning();
    console.log("Created learner:", learner.email);

    // Link parent to learner
    await db.insert(schema.parentStudent).values({
      parentEmail: "parent@example.com",
      studentId: learner.id,
    });
    console.log("Linked parent to learner");

    // Create a class
    const [sampleClass] = await db.insert(schema.classes).values({
      name: "English 101",
      description: "Introduction to English vocabulary and grammar",
      classCode: "EN101",
      educatorId: educator.id,
      active: true,
    }).returning();
    console.log("Created class:", sampleClass.name);

    // Add student to class
    await db.insert(schema.studentClass).values({
      studentId: learner.id,
      classId: sampleClass.id,
      status: "approved",
    });
    console.log("Added student to class");

    // Create science vocabulary list
    const [scienceList] = await db.insert(schema.vocabularyLists).values({
      title: "Science Vocabulary - Rainforest Ecosystems",
      passage: "The rainforest ecosystem is one of the most biodiverse habitats on our planet. The complex canopy structure provides numerous microhabitats for various species. Scientists who study these ecosystems often observe fascinating symbiotic relationships between different organisms. The proliferation of unique plant and animal species in these environments continues to astound researchers.",
      educatorId: educator.id,
      classId: sampleClass.id,
      published: true,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }).returning();
    console.log("Created science vocabulary list:", scienceList.title);

    // Create sample science vocabulary words
    const scienceWords = ["ecosystem", "biodiverse", "canopy", "microhabitats", "symbiotic", "proliferation"];
    for (const word of scienceWords) {
      await db.insert(schema.vocabularyWords).values({
        word,
        listId: scienceList.id,
      });
    }
    console.log(`Added ${scienceWords.length} science vocabulary words`);

    // Create math vocabulary list
    const [mathList] = await db.insert(schema.vocabularyLists).values({
      title: "Math Vocabulary - Geometry Concepts",
      passage: "In geometry, we study properties of shapes and spaces. A polygon is a closed figure with straight sides, while a circle is defined by a set of points equidistant from a center point. Parallel lines never intersect, while perpendicular lines form right angles. Understanding these concepts helps in calculating area, perimeter, and volume of different shapes.",
      educatorId: educator.id,
      classId: sampleClass.id,
      published: true,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    }).returning();
    console.log("Created math vocabulary list:", mathList.title);

    // Create sample math vocabulary words
    const mathWords = ["polygon", "circle", "parallel", "perpendicular", "area", "perimeter", "volume", "angle", "radius", "diameter"];
    for (const word of mathWords) {
      await db.insert(schema.vocabularyWords).values({
        word,
        listId: mathList.id,
      });
    }
    console.log(`Added ${mathWords.length} math vocabulary words`);

    // Create a completed submission for the math list
    const [mathSubmission] = await db.insert(schema.submissions).values({
      studentId: learner.id,
      listId: mathList.id,
      completed: true,
      score: 90,
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      gradedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    }).returning();
    console.log("Created completed submission for math list");

    // Create a completed submission for science list
    const [scienceSubmission] = await db.insert(schema.submissions).values({
      studentId: learner.id,
      listId: scienceList.id,
      completed: true,
      score: 75,
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      gradedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    }).returning();
    console.log("Created completed submission for science list");

    // Get math vocabulary words
    const mathVocabWords = await db.query.vocabularyWords.findMany({
      where: eq(schema.vocabularyWords.listId, mathList.id),
    });

    // Add word definitions for math submission (one incorrect)
    for (let i = 0; i < mathVocabWords.length; i++) {
      const word = mathVocabWords[i];
      const isCorrect = i !== 9; // Make the last word incorrect
      
      const [definition] = await db.insert(schema.wordDefinitions).values({
        submissionId: mathSubmission.id,
        wordId: word.id,
        studentDefinition: isCorrect 
          ? "Correct definition provided by student" 
          : "Incorrect definition provided by student",
        isCorrect,
        addedToFlashcards: !isCorrect,
      }).returning();

      // If incorrect, add to flashcards
      if (!isCorrect) {
        await db.insert(schema.flashcards).values({
          studentId: learner.id,
          wordId: word.id,
          definitionId: definition.id,
        });
      }
    }
    console.log("Added word definitions for math submission");

    // Get science vocabulary words
    const scienceVocabWords = await db.query.vocabularyWords.findMany({
      where: eq(schema.vocabularyWords.listId, scienceList.id),
    });

    // Add word definitions for science submission (three incorrect)
    for (let i = 0; i < scienceVocabWords.length; i++) {
      const word = scienceVocabWords[i];
      const isCorrect = i < 3; // Make 3 words incorrect (last 3)
      
      const [definition] = await db.insert(schema.wordDefinitions).values({
        submissionId: scienceSubmission.id,
        wordId: word.id,
        studentDefinition: isCorrect 
          ? "Correct definition provided by student" 
          : "Incorrect definition provided by student",
        isCorrect,
        addedToFlashcards: !isCorrect,
      }).returning();

      // If incorrect, add to flashcards
      if (!isCorrect) {
        await db.insert(schema.flashcards).values({
          studentId: learner.id,
          wordId: word.id,
          definitionId: definition.id,
        });
      }
    }
    console.log("Added word definitions for science submission");

    console.log("Database seed completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
