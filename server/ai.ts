import OpenAI from "openai";
import { z } from "zod";
import * as geminiService from "./gemini.js";
import * as huggingfaceService from "./huggingface.js";

// Check if API keys are available
const openaiApiKey = process.env.OPENAI_API_KEY;

// Initialize the OpenAI client only if API key is available
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

try {
  if (openaiApiKey) {
    openai = new OpenAI({ apiKey: openaiApiKey });
    console.log("OpenAI client initialized successfully");
  } else {
    console.warn("OPENAI_API_KEY is not set.");
  }
} catch (error) {
  console.error("Error initializing OpenAI client:", error);
}

/**
 * Check if any AI service is configured
 */
export function isAIConfigured(): boolean {
  return geminiService.isGeminiConfigured() || !!openai || huggingfaceService.isHuggingFaceConfigured();
}

/**
 * Check if the OpenAI API key is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!openai;
}

/**
 * Get the primary AI service provider name
 */
export function getPrimaryAIProvider(): string {
  if (geminiService.isGeminiConfigured()) return "Gemini";
  if (!!openai) return "OpenAI";
  if (huggingfaceService.isHuggingFaceConfigured()) return "Hugging Face";
  return "None";
}

/**
 * Generate definitions for words using available AI services (Gemini preferred)
 */
export async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.generateDefinitions(words);
    } catch (error) {
      console.warn("Gemini failed, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        For each of the following words, provide a clear, concise definition suitable for a vocabulary learning platform.
        Format the response as a JSON object where each key is the word and each value is its definition.
        Make definitions easy to understand for learners.
        
        Words: ${words.join(", ")}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const definitions = JSON.parse(content);
      return definitions;
    } catch (error: any) {
      console.warn("OpenAI failed, falling back to Hugging Face:", error);
    }
  }

  // Try Hugging Face as final fallback
  if (huggingfaceService.isHuggingFaceConfigured()) {
    try {
      return await huggingfaceService.generateDefinitions(words);
    } catch (error) {
      console.warn("Hugging Face failed:", error);
    }
  }

  throw new Error("No AI service is available. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Generate definition for a single word using available AI services (Gemini preferred)
 */
export async function generateSingleDefinition(word: string): Promise<string> {
  try {
    console.log("Generating single definition for:", word);
    const definitions = await generateDefinitions([word]);
    console.log("Generated definitions object:", definitions);
    const definition = definitions[word];
    console.log("Extracted definition:", definition);
    return definition || "Definition not available";
  } catch (error) {
    console.error("Error generating single definition:", error);
    return "Definition not available";
  }
}

/**
 * Analyze a passage and extract potential vocabulary words using available AI services (Gemini preferred)
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<string[]> {
  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.analyzePassage(passage, count);
    } catch (error) {
      console.warn("Gemini failed, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        Analyze the following passage and identify ${count} words that would be valuable for vocabulary learning.
        Focus on words that are:
        1. Important for understanding the passage
        2. Likely to appear in other academic or literary contexts
        3. Appropriate for expanding a student's vocabulary
        
        Return only a JSON array of these words, with no additional text or explanation.
        
        Passage:
        ${passage}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const result = JSON.parse(content);
      return Array.isArray(result.words) ? result.words : [];
    } catch (error) {
      console.warn("OpenAI failed, falling back to Hugging Face:", error);
    }
  }

  // Try Hugging Face as final fallback
  if (huggingfaceService.isHuggingFaceConfigured()) {
    try {
      return await huggingfaceService.analyzePassage(passage, count);
    } catch (error) {
      console.warn("Hugging Face failed:", error);
    }
  }

  throw new Error("No AI service is available. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Grade a student's definition against the correct definition using available AI services (Gemini preferred)
 */
export async function gradeDefinition(
  word: string,
  studentDefinition: string,
  correctDefinition?: string
): Promise<{
  isCorrect: boolean;
  confidence?: number;
  feedback: string;
  suggestedCorrectDefinition?: string;
}> {
  // If no correct definition is provided, generate one
  let definitionToCheck = correctDefinition;
  if (!definitionToCheck) {
    const definitions = await generateDefinitions([word]);
    definitionToCheck = definitions[word];
  }

  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.gradeDefinition(word, studentDefinition, definitionToCheck);
    } catch (error) {
      console.warn("Gemini failed, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        Grade this student's definition of the word "${word}".
        
        Student definition: "${studentDefinition}"
        Correct definition: "${definitionToCheck}"
        
        Provide a JSON response with the following fields:
        - isCorrect: boolean (true if the student's definition captures the essence of the word)
        - confidence: number (between 0 and 1, indicating your confidence in the assessment)
        - feedback: string (constructive feedback for the student)
        - suggestedCorrectDefinition: string (optional, only if the correct definition provided seems incomplete)
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const grading = JSON.parse(content);
      
      const gradingSchema = z.object({
        isCorrect: z.boolean(),
        confidence: z.number().min(0).max(1),
        feedback: z.string(),
        suggestedCorrectDefinition: z.string().optional(),
      });

      return gradingSchema.parse(grading);
    } catch (error) {
      console.warn("OpenAI failed, using simple fallback grading:", error);
    }
  }

  // Simple fallback grading
  const isCorrect = studentDefinition.toLowerCase().includes(word.toLowerCase()) ||
                   definitionToCheck.toLowerCase().split(' ').some(keyword => 
                     studentDefinition.toLowerCase().includes(keyword.toLowerCase())
                   );
  
  return {
    isCorrect,
    feedback: isCorrect ? "Good effort! Your definition shows understanding." : "Try to focus on the main meaning of the word."
  };
}

/**
 * Generate contextual vocabulary suggestions based on words the student got wrong
 */
export async function generateContextualSuggestions(wrongWords: string[]): Promise<Array<{
  word: string;
  definition: string;
  example: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}>> {
  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.generateContextualSuggestions(wrongWords);
    } catch (error) {
      console.warn("Gemini failed for contextual suggestions, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        Based on these vocabulary words the student got wrong: ${wrongWords.join(', ')}
        
        Generate 6-8 related vocabulary words that would help the student learn similar concepts.
        Focus on:
        - Synonyms and antonyms of the wrong words
        - Words with similar difficulty levels
        - Words from related topics or categories
        - Words that share roots or linguistic connections
        
        For each word, provide:
        - word: the vocabulary word
        - definition: clear, concise definition
        - example: example sentence showing usage
        - category: one of [Academic, Science, Literature, History, Arts, Daily Life, Technology]
        - difficulty: one of [easy, medium, hard]
        
        Return a JSON array of objects with these fields. Choose words that build naturally on what the student is already learning.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const result = JSON.parse(content);
      return result.words || [];
    } catch (error) {
      console.warn("OpenAI failed for contextual suggestions:", error);
    }
  }

  // Fallback suggestions based on common word relationships
  const fallbackSuggestions = [];
  const academicWords = ["comprehend", "analyze", "synthesize", "evaluate"];
  const dailyWords = ["persevere", "collaborate", "communicate", "adapt"];
  
  // Add some contextual words based on wrong words
  if (wrongWords.some(w => w.toLowerCase().includes('understand') || w.toLowerCase().includes('know'))) {
    fallbackSuggestions.push({
      word: "comprehend",
      definition: "To understand something fully",
      example: "It took time for her to comprehend the complex theory.",
      category: "Academic",
      difficulty: "medium" as const
    });
  }
  
  // Fill with general suggestions if needed
  const remainingSlots = Math.max(0, 4 - fallbackSuggestions.length);
  for (let i = 0; i < remainingSlots; i++) {
    const words = i % 2 === 0 ? academicWords : dailyWords;
    const word = words[i % words.length];
    fallbackSuggestions.push({
      word: word,
      definition: `Definition for ${word}`,
      example: `Example sentence with ${word}.`,
      category: i % 2 === 0 ? "Academic" : "Daily Life",
      difficulty: "medium" as const
    });
  }

  return fallbackSuggestions.slice(0, 6);
}

/**
 * Generate smart vocabulary suggestions for students to expand their learning
 */
export async function generateVocabularySuggestions(): Promise<Array<{
  word: string;
  definition: string;
  example: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}>> {
  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.generateVocabularySuggestions();
    } catch (error) {
      console.warn("Gemini failed for vocabulary suggestions, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        Generate 8 high-quality vocabulary words that would be beneficial for students to learn.
        Focus on commonly used academic and everyday words that expand vocabulary effectively.
        
        For each word, provide:
        - word: the vocabulary word
        - definition: clear, concise definition
        - example: example sentence showing usage
        - category: one of [Academic, Science, Literature, History, Arts, Daily Life, Technology]
        - difficulty: one of [easy, medium, hard]
        
        Return a JSON array of objects with these fields. Choose words that are educational and appropriate for vocabulary building.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const result = JSON.parse(content);
      return result.words || [];
    } catch (error) {
      console.warn("OpenAI failed for vocabulary suggestions:", error);
    }
  }

  // Fallback suggestions if AI services are unavailable
  return [
    {
      word: "eloquent",
      definition: "Having or showing the ability to use language clearly and effectively",
      example: "The professor gave an eloquent speech about the importance of education.",
      category: "Academic",
      difficulty: "medium" as const
    },
    {
      word: "resilient",
      definition: "Able to recover quickly from difficult conditions",
      example: "Despite facing many challenges, she remained resilient and optimistic.",
      category: "Daily Life",
      difficulty: "medium" as const
    },
    {
      word: "innovative",
      definition: "Introducing new ideas; original and creative in thinking",
      example: "The company's innovative approach revolutionized the industry.",
      category: "Technology",
      difficulty: "medium" as const
    },
    {
      word: "meticulous",
      definition: "Showing great attention to detail; very careful and precise",
      example: "The scientist was meticulous in recording every observation.",
      category: "Academic",
      difficulty: "hard" as const
    }
  ];
}

/**
 * Generate example sentences for vocabulary words using available AI services (Gemini preferred)
 */
export async function generateExampleSentences(words: string[], count: number = 1): Promise<Record<string, string[]>> {
  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.generateExampleSentences(words, count);
    } catch (error) {
      console.warn("Gemini failed, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        For each of the following words, provide ${count} example sentence(s) that clearly demonstrate the meaning and usage of the word.
        Format the response as a JSON object where each key is the word and each value is an array of sentences.
        Make the sentences appropriate for educational purposes and suitable for vocabulary learning.
        
        Words: ${words.join(", ")}
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const sentences = JSON.parse(content);
      return sentences;
    } catch (error) {
      console.warn("OpenAI failed, falling back to Hugging Face:", error);
    }
  }

  // Try Hugging Face as final fallback
  if (huggingfaceService.isHuggingFaceConfigured()) {
    try {
      return await huggingfaceService.generateExampleSentences(words, count);
    } catch (error) {
      console.warn("Hugging Face failed:", error);
    }
  }

  throw new Error("No AI service is available. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Generate personalized learning suggestions based on student performance using available AI services (Gemini preferred)
 */
export async function generateLearningStrategies(words: string[], studentPerformance: Record<string, boolean>): Promise<{
  difficultWords?: string[];
  strengths?: string[];
  weaknesses?: string[];
  strategies: string[];
  encouragement?: string;
}> {
  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      return await geminiService.generateLearningStrategies(words, studentPerformance);
    } catch (error) {
      console.warn("Gemini failed, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const wordsCorrect = Object.entries(studentPerformance)
        .filter(([_, isCorrect]) => isCorrect)
        .map(([word]) => word);
      
      const wordsIncorrect = Object.entries(studentPerformance)
        .filter(([_, isCorrect]) => !isCorrect)
        .map(([word]) => word);

      const prompt = `
        Analyze a student's vocabulary performance and provide personalized learning strategies.
        
        Words the student knew correctly: ${wordsCorrect.join(", ")}
        Words the student had difficulty with: ${wordsIncorrect.join(", ")}
        
        Provide a JSON response with the following fields:
        - strengths: array of strings (areas where the student shows strength)
        - weaknesses: array of strings (areas where the student needs improvement)
        - strategies: array of strings (specific learning strategies tailored to this student)
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const strategies = JSON.parse(content);
      
      const strategiesSchema = z.object({
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        strategies: z.array(z.string()),
      });

      return strategiesSchema.parse(strategies);
    } catch (error) {
      console.warn("OpenAI failed, using fallback strategies:", error);
    }
  }

  // Simple fallback
  const incorrectWords = words.filter(word => studentPerformance[word] === false);
  const correctWords = words.filter(word => studentPerformance[word] === true);
  
  return {
    strategies: [
      "Review difficult words using flashcards",
      "Practice using vocabulary words in sentences",
      "Read more texts to see words in context"
    ],
    encouragement: `Good job on getting ${correctWords.length} out of ${words.length} words correct!`
  };
}

/**
 * Generate a passage that includes all the provided vocabulary words using available AI services (Gemini preferred)
 */
export async function generatePassageFromWords(
  words: string[], 
  options: { 
    topic?: string; 
    gradeLevel?: string;
    paragraphCount?: number;
    style?: string;
  } = {}
): Promise<string> {
  console.log("generatePassageFromWords called with:", { words, options });
  let lastError: unknown;
  
  console.log("Gemini configured?", geminiService.isGeminiConfigured());

  // Try Gemini first
  if (geminiService.isGeminiConfigured()) {
    try {
      console.log("Attempting to generate passage using Gemini API...");
      const result = await geminiService.generatePassageFromWords(words, options);
      console.log("Gemini API call successful! Generated passage length:", result.length);
      return result;
    } catch (error: any) {
      lastError = error;
      console.error("Gemini failed, falling back to other providers:");
      console.error("Error type:", typeof error);
      console.error("Error message:", error.message);
      console.error("Full error:", error);
    }
  } else {
    console.log("Gemini is not configured, skipping to next provider");
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const topic = options.topic || "general knowledge";
      const gradeLevel = options.gradeLevel || "middle school";
      const paragraphCount = options.paragraphCount || 1;
      const style = options.style || "educational";

      const prompt = `
        Create an engaging and coherent ${style} passage (${paragraphCount} paragraph(s)) about ${topic} at a ${gradeLevel} reading level
        that naturally incorporates ALL of the following vocabulary words. The passage should flow naturally and not feel forced.
        
        Vocabulary words to include: ${words.join(", ")}
        
        Important:
        1. Use ALL the listed words in their exact form
        2. Make the passage coherent and educational
        3. Ensure the passage is appropriate for ${gradeLevel} students
        4. The passage should be between 100-300 words, depending on the number of vocabulary words
        5. Return ONLY the passage, with no explanations, titles, or metadata
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      return content.trim();
    } catch (error: any) {
      lastError = new Error("The backup AI service could not generate a passage. Please try again shortly.");
      console.warn("OpenAI failed, falling back to Hugging Face:", error);
    }
  }

  // Try Hugging Face as final fallback
  if (huggingfaceService.isHuggingFaceConfigured()) {
    try {
      return await huggingfaceService.generatePassageFromWords(words, options);
    } catch (error) {
      lastError = new Error("The backup AI service could not generate a passage. Please try again shortly.");
      console.warn("Hugging Face failed:", error);
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("No AI service is available. Please configure GEMINI_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Generate multiple choice questions with plausible distractors using available AI services (Gemini preferred)
 */
export async function generateMultipleChoice(word: string, correctDefinition: string): Promise<{
  word: string;
  correctAnswer: string;
  options: string[];
}> {
  // Try Gemini first
  const geminiClient = geminiService.gemini;
  if (geminiClient) {
    try {
      const prompt = `
        Create a multiple choice question for the vocabulary word "${word}".
        
        The correct definition is: "${correctDefinition}"
        
        Generate 3 plausible but incorrect distractors (wrong definitions) that could confuse a student learning this word.
        The distractors should be:
        1. Similar in style and length to the correct definition
        2. Plausible alternatives that might sound right
        3. Different enough from the correct answer to test understanding
        
        Provide a JSON response with:
        - word: the vocabulary word
        - correctAnswer: the exact correct definition provided
        - distractors: array of 3 incorrect but plausible definitions
      `;

      const response = await geminiClient.chat.completions.create({
        model: geminiService.GEMINI_MODEL,
        reasoning_effort: "low",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from Gemini");
      }

      const questionData = JSON.parse(content);
      
      // Shuffle the options (correct answer + distractors)
      const allOptions = [correctDefinition, ...questionData.distractors];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
      
      return {
        word,
        correctAnswer: correctDefinition,
        options: shuffledOptions
      };
    } catch (error) {
      console.warn("Gemini failed, falling back to other providers:", error);
    }
  }

  // Try OpenAI as fallback
  if (openai) {
    try {
      const prompt = `
        Create a multiple choice question for the vocabulary word "${word}".
        
        The correct definition is: "${correctDefinition}"
        
        Generate 3 plausible but incorrect distractors (wrong definitions) that could confuse a student learning this word.
        The distractors should be:
        1. Similar in style and length to the correct definition
        2. Plausible alternatives that might sound right
        3. Different enough from the correct answer to test understanding
        
        Provide a JSON response with:
        - word: the vocabulary word
        - correctAnswer: the exact correct definition provided
        - distractors: array of 3 incorrect but plausible definitions
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content returned from OpenAI");
      }

      const questionData = JSON.parse(content);
      
      // Shuffle the options (correct answer + distractors)
      const allOptions = [correctDefinition, ...questionData.distractors];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
      
      return {
        word,
        correctAnswer: correctDefinition,
        options: shuffledOptions
      };
    } catch (error) {
      console.warn("OpenAI failed, using simple fallback:", error);
    }
  }

  // Simple fallback with generic distractors
  const genericDistractors = [
    "A type of tool or equipment used in various activities",
    "A concept related to human behavior and psychology",
    "A process or method used to achieve specific outcomes"
  ];
  
  const allOptions = [correctDefinition, ...genericDistractors];
  const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);
  
  return {
    word,
    correctAnswer: correctDefinition,
    options: shuffledOptions
  };
}
