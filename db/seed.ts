import { db } from "./index";
import * as schema from "@shared/schema";
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
    }).returning();
    console.log("Created educator:", educator.email);

    const learnerPassword = await hashPassword("password123");
    const [learner] = await db.insert(schema.users).values({
      email: "student@example.com",
      password: learnerPassword,
      name: "Tyler Smith",
      role: "learner",
    }).returning();
    console.log("Created learner:", learner.email);

    // Link parent to learner
    await db.insert(schema.parentStudent).values({
      parentEmail: "parent@example.com",
      studentId: learner.id,
    });
    console.log("Linked parent to learner");

    // Create sample vocabulary list
    const [vocabList] = await db.insert(schema.vocabularyLists).values({
      title: "Science Vocabulary - Rainforest Ecosystems",
      passage: "The rainforest ecosystem is one of the most biodiverse habitats on our planet. The complex canopy structure provides numerous microhabitats for various species. Scientists who study these ecosystems often observe fascinating symbiotic relationships between different organisms. The proliferation of unique plant and animal species in these environments continues to astound researchers.",
      educatorId: educator.id,
      published: true,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    }).returning();
    console.log("Created vocabulary list:", vocabList.title);

    // Create sample vocabulary words
    const words = ["ecosystem", "biodiverse", "canopy", "microhabitats", "symbiotic", "proliferation"];
    for (const word of words) {
      await db.insert(schema.vocabularyWords).values({
        word,
        listId: vocabList.id,
      });
    }
    console.log(`Added ${words.length} vocabulary words`);

    // Create another vocabulary list (completed)
    const [historyList] = await db.insert(schema.vocabularyLists).values({
      title: "History Terms - Civil War",
      passage: "The American Civil War was a civil war in the United States fought between northern and southern states. The Civil War began primarily as a result of the long-standing controversy over the enslavement of black people. War broke out in April 1861 when secessionist forces attacked Fort Sumter in South Carolina. The Emancipation Proclamation made abolition a central goal of the war. The Confederacy surrendered, ending the war, in 1865.",
      educatorId: educator.id,
      published: true,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // One week from now
    }).returning();
    console.log("Created vocabulary list:", historyList.title);

    // Create vocabulary words for history list
    const historyWords = ["emancipation", "proclamation", "confederacy", "secession", "abolition", "enslavement"];
    for (const word of historyWords) {
      await db.insert(schema.vocabularyWords).values({
        word,
        listId: historyList.id,
      });
    }
    console.log(`Added ${historyWords.length} vocabulary words to history list`);

    // Create a third vocabulary list
    const [literaryList] = await db.insert(schema.vocabularyLists).values({
      title: "Literary Terms - Shakespeare",
      passage: "William Shakespeare employed numerous literary devices in his works. His masterful use of soliloquy reveals characters' inner thoughts. His plays are filled with alliteration and metaphors that create vivid imagery. Shakespeare's protagonists often display tragic flaws leading to their downfall. The bard's works continue to influence literature with their eloquent prose and complex themes.",
      educatorId: educator.id,
      published: true,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    }).returning();
    console.log("Created vocabulary list:", literaryList.title);

    // Create vocabulary words for literary list
    const literaryWords = ["soliloquy", "alliteration", "metaphor", "protagonist", "tragic flaw", "eloquent"];
    for (const word of literaryWords) {
      await db.insert(schema.vocabularyWords).values({
        word,
        listId: literaryList.id,
      });
    }
    console.log(`Added ${literaryWords.length} vocabulary words to literary list`);

    // Create a fourth vocabulary list (Math)
    const [mathList] = await db.insert(schema.vocabularyLists).values({
      title: "Math Terminology - Geometry",
      passage: "Geometry is the branch of mathematics concerned with questions of shape, size, relative position of figures, and the properties of space. A geometric shape can be described as the geometric information which remains when location, scale, orientation, and reflection are removed from the description of a geometric object. The area of a circle is calculated using the formula πr², where r represents the radius. Triangles can be categorized as equilateral, isosceles, or scalene based on their sides.",
      educatorId: educator.id,
      published: true,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (past due)
    }).returning();
    console.log("Created vocabulary list:", mathList.title);

    // Create vocabulary words for math list
    const mathWords = ["geometry", "radius", "equilateral", "isosceles", "scalene", "circumference", "perimeter", "polygon", "quadrilateral", "theorem"];
    for (const word of mathWords) {
      await db.insert(schema.vocabularyWords).values({
        word,
        listId: mathList.id,
      });
    }
    console.log(`Added ${mathWords.length} vocabulary words to math list`);

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
      listId: vocabList.id,
      completed: true,
      score: 75,
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      gradedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
    }).returning();
    console.log("Created completed submission for science list");

    // Get math vocabulary words
    const mathVocabWords = await db.query.vocabularyWords.findMany({
      where: (vw) => schema.eq(vw.listId, mathList.id),
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
      where: (vw) => schema.eq(vw.listId, vocabList.id),
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
  }
}

seed();
