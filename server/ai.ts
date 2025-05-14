import OpenAI from "openai";
import { z } from "zod";

// Initialize the OpenAI client
// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Check if the OpenAI API key is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate definitions for words
 */
export async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  try {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key is not configured");
    }

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

    // Parse the JSON response
    const definitions = JSON.parse(content);
    return definitions;
  } catch (error) {
    console.error("Error generating definitions:", error);
    throw new Error("Failed to generate definitions");
  }
}

/**
 * Analyze a passage and extract potential vocabulary words
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<string[]> {
  try {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key is not configured");
    }

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

    // Parse the JSON response
    const result = JSON.parse(content);
    return Array.isArray(result.words) ? result.words : [];
  } catch (error) {
    console.error("Error analyzing passage:", error);
    throw new Error("Failed to analyze passage");
  }
}

/**
 * Grade a student's definition against the correct definition
 */
export async function gradeDefinition(
  word: string,
  studentDefinition: string,
  correctDefinition?: string
): Promise<{
  isCorrect: boolean;
  confidence: number;
  feedback: string;
  suggestedCorrectDefinition?: string;
}> {
  try {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key is not configured");
    }

    // If no correct definition is provided, generate one
    let definitionToCheck = correctDefinition;
    if (!definitionToCheck) {
      const definitions = await generateDefinitions([word]);
      definitionToCheck = definitions[word];
    }

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

    // Parse the JSON response
    const grading = JSON.parse(content);
    
    // Validate the response with Zod
    const gradingSchema = z.object({
      isCorrect: z.boolean(),
      confidence: z.number().min(0).max(1),
      feedback: z.string(),
      suggestedCorrectDefinition: z.string().optional(),
    });

    return gradingSchema.parse(grading);
  } catch (error) {
    console.error("Error grading definition:", error);
    throw new Error("Failed to grade definition");
  }
}

/**
 * Generate example sentences for vocabulary words
 */
export async function generateExampleSentences(words: string[], count: number = 1): Promise<Record<string, string[]>> {
  try {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key is not configured");
    }

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

    // Parse the JSON response
    const sentences = JSON.parse(content);
    return sentences;
  } catch (error) {
    console.error("Error generating example sentences:", error);
    throw new Error("Failed to generate example sentences");
  }
}

/**
 * Generate personalized learning suggestions based on student performance
 */
export async function generateLearningStrategies(words: string[], studentPerformance: Record<string, boolean>): Promise<{
  strengths: string[];
  weaknesses: string[];
  strategies: string[];
}> {
  try {
    if (!isOpenAIConfigured()) {
      throw new Error("OpenAI API key is not configured");
    }

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

    // Parse the JSON response
    const strategies = JSON.parse(content);
    
    // Validate the response with Zod
    const strategiesSchema = z.object({
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      strategies: z.array(z.string()),
    });

    return strategiesSchema.parse(strategies);
  } catch (error) {
    console.error("Error generating learning strategies:", error);
    throw new Error("Failed to generate learning strategies");
  }
}