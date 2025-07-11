import OpenAI from "openai";
import { z } from "zod";
import * as groqService from "./groq";
import * as huggingfaceService from "./huggingface";

// Check if API keys are available
const openaiApiKey = process.env.OPENAI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

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
  return groqService.isGroqConfigured() || !!openai || huggingfaceService.isHuggingFaceConfigured();
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
  if (groqService.isGroqConfigured()) return "Groq";
  if (!!openai) return "OpenAI";
  if (huggingfaceService.isHuggingFaceConfigured()) return "Hugging Face";
  return "None";
}

/**
 * Generate definitions for words using available AI services (Groq preferred)
 */
export async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  // Try Groq first
  if (groqService.isGroqConfigured()) {
    try {
      return await groqService.generateDefinitions(words);
    } catch (error) {
      console.warn("Groq failed, falling back to other providers:", error);
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

  throw new Error("No AI service is available. Please configure GROQ_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Analyze a passage and extract potential vocabulary words using available AI services (Groq preferred)
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<string[]> {
  // Try Groq first
  if (groqService.isGroqConfigured()) {
    try {
      return await groqService.analyzePassage(passage, count);
    } catch (error) {
      console.warn("Groq failed, falling back to other providers:", error);
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

  throw new Error("No AI service is available. Please configure GROQ_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Grade a student's definition against the correct definition using available AI services (Groq preferred)
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

  // Try Groq first
  if (groqService.isGroqConfigured()) {
    try {
      return await groqService.gradeDefinition(word, studentDefinition, definitionToCheck);
    } catch (error) {
      console.warn("Groq failed, falling back to other providers:", error);
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
 * Generate example sentences for vocabulary words using available AI services (Groq preferred)
 */
export async function generateExampleSentences(words: string[], count: number = 1): Promise<Record<string, string[]>> {
  // Try Groq first
  if (groqService.isGroqConfigured()) {
    try {
      return await groqService.generateExampleSentences(words, count);
    } catch (error) {
      console.warn("Groq failed, falling back to other providers:", error);
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

  throw new Error("No AI service is available. Please configure GROQ_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}

/**
 * Generate personalized learning suggestions based on student performance using available AI services (Groq preferred)
 */
export async function generateLearningStrategies(words: string[], studentPerformance: Record<string, boolean>): Promise<{
  difficultWords?: string[];
  strengths?: string[];
  weaknesses?: string[];
  strategies: string[];
  encouragement?: string;
}> {
  // Try Groq first
  if (groqService.isGroqConfigured()) {
    try {
      return await groqService.generateLearningStrategies(words, studentPerformance);
    } catch (error) {
      console.warn("Groq failed, falling back to other providers:", error);
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
 * Generate a passage that includes all the provided vocabulary words using available AI services (Groq preferred)
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
  // Convert gradeLevel to difficulty format for Groq
  const difficulty = options.gradeLevel === "elementary" ? "elementary" :
                    options.gradeLevel === "high school" ? "high" : "middle";

  // Try Groq first
  if (groqService.isGroqConfigured()) {
    try {
      return await groqService.generatePassageFromWords(words, difficulty, options.topic);
    } catch (error) {
      console.warn("Groq failed, falling back to other providers:", error);
    }
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
      console.warn("OpenAI failed, falling back to Hugging Face:", error);
    }
  }

  // Try Hugging Face as final fallback
  if (huggingfaceService.isHuggingFaceConfigured()) {
    try {
      return await huggingfaceService.generatePassageFromWords(words, difficulty, options.topic);
    } catch (error) {
      console.warn("Hugging Face failed:", error);
    }
  }

  throw new Error("No AI service is available. Please configure GROQ_API_KEY, OPENAI_API_KEY, or HUGGINGFACE_API_KEY.");
}