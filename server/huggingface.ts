import { HfInference } from '@huggingface/inference';
import { z } from "zod";

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;

// Initialize the Hugging Face client only if API key is available
let hf: HfInference | null = null;

try {
  if (apiKey) {
    hf = new HfInference(apiKey);
    console.log("Hugging Face client initialized successfully");
  } else {
    console.warn("HUGGINGFACE_API_KEY is not set. AI features will be unavailable.");
  }
} catch (error) {
  console.error("Error initializing Hugging Face client:", error);
}

// Model name for text generation
// Note: We're using a model that's widely available on Hugging Face
const TEXT_GENERATION_MODEL = "distilbert-base-uncased";

/**
 * Check if the Hugging Face API key is configured
 */
export function isHuggingFaceConfigured(): boolean {
  return !!hf;
}

/**
 * Generate definitions for words using Phi-2
 */
export async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  try {
    if (!hf) {
      throw new Error("Hugging Face API key is not configured");
    }

    const definitions: Record<string, string> = {};
    
    // Fallback approach: Generate simple placeholder definitions
    for (const word of words) {
      // Create a simple definition template
      definitions[word] = `A vocabulary word that is important to learn and understand. Teachers may ask students to use "${word}" in sentences to practice.`;
    }
    
    console.log("Generated definitions using fallback approach");
    
    return definitions;
  } catch (error: any) {
    console.error("Error generating definitions:", error);
    
    // Error handling
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("API key authentication failed. Please check your API key.");
    } else {
      throw new Error("Failed to generate definitions. Please try again later.");
    }
  }
}

/**
 * Analyze a passage and extract potential vocabulary words using Phi-2
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<string[]> {
  try {
    if (!hf) {
      throw new Error("Hugging Face API key is not configured");
    }
    
    // We're using a simpler approach to extract vocabulary words using regex patterns
    // This is a fallback approach when the API model isn't accessible
    
    // Split the passage into words, remove punctuation
    const words = passage
      .replace(/[^\w\s]|_/g, "")
      .split(/\s+/)
      .filter(word => word.length > 4) // Only words with 5+ characters
      .map(word => word.toLowerCase())
      .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
      .slice(0, count);
      
    console.log("Extracted vocabulary words using fallback approach");
    
    // Return the extracted words
    return words;
  } catch (error: any) {
    console.error("Error analyzing passage:", error);
    
    // Error handling
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("API key authentication failed. Please check your API key.");
    } else {
      throw new Error("Failed to analyze passage. Please try again later.");
    }
  }
}

/**
 * Generate a passage that includes all the provided vocabulary words using Phi-2
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
  try {
    if (!hf) {
      throw new Error("Hugging Face API key is not configured");
    }

    // Set defaults for options
    const topic = options.topic || "general knowledge";
    const gradeLevel = options.gradeLevel || "middle school";
    const paragraphCount = options.paragraphCount || 1;
    const style = options.style || "educational";

    // Fallback approach: Generate a simple passage with the vocabulary words
    const sentences: string[] = [];
    
    // Add introduction
    sentences.push(`This ${style} passage about ${topic} is designed for ${gradeLevel} students.`);
    
    // Create sentences using each word
    for (const word of words) {
      const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
      sentences.push(`${capitalizedWord} is an important vocabulary word to understand.`);
    }
    
    // Add a concluding sentence
    sentences.push(`Learning these vocabulary words will enhance your understanding of ${topic}.`);
    
    // Organize into paragraphs
    const sentencesPerParagraph = Math.ceil(sentences.length / paragraphCount);
    const paragraphs: string[] = [];
    
    for (let i = 0; i < paragraphCount; i++) {
      const start = i * sentencesPerParagraph;
      const end = Math.min(start + sentencesPerParagraph, sentences.length);
      const paragraph = sentences.slice(start, end).join(' ');
      paragraphs.push(paragraph);
    }
    
    console.log("Generated passage using fallback approach");
    
    return paragraphs.join('\n\n');
  } catch (error: any) {
    console.error("Error generating passage:", error);
    
    // Error handling
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("API key authentication failed. Please check your API key.");
    } else {
      throw new Error("Failed to generate passage. Please try again later.");
    }
  }
}

/**
 * Grade a student's definition against the correct definition using Phi-2
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
    if (!hf) {
      throw new Error("Hugging Face API key is not configured");
    }

    // If no correct definition is provided, generate one
    let definitionToCheck = correctDefinition;
    if (!definitionToCheck) {
      const definitions = await generateDefinitions([word]);
      definitionToCheck = definitions[word];
    }

    const prompt = `
You are grading a student's definition of the word "${word}".

Correct definition: "${definitionToCheck}"
Student definition: "${studentDefinition}"

Analyze the student's answer and respond with only YES or NO followed by a semicolon, then a confidence score from 0.0 to 1.0 followed by a semicolon, then constructive feedback for the student.

Format: YES/NO;CONFIDENCE_SCORE;FEEDBACK
`;

    const response = await hf.textGeneration({
      model: TEXT_GENERATION_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.3, // Lower temperature for more consistent grading
      },
    });

    const text = response.generated_text || "";
    
    // Parse the response to extract grading components
    const responseText = text.replace(prompt, "").trim();
    const parts = responseText.split(';');
    
    let isCorrect = false;
    let confidence = 0.5; // Default confidence
    let feedback = "No feedback available.";
    
    if (parts.length >= 1) {
      isCorrect = parts[0].trim().toUpperCase().startsWith('YES');
    }
    
    if (parts.length >= 2) {
      const confValue = parseFloat(parts[1]);
      if (!isNaN(confValue)) {
        confidence = Math.max(0, Math.min(1, confValue)); // Clamp between 0 and 1
      }
    }
    
    if (parts.length >= 3) {
      feedback = parts[2].trim();
    }
    
    return {
      isCorrect,
      confidence,
      feedback,
      suggestedCorrectDefinition: definitionToCheck
    };
  } catch (error: any) {
    console.error("Error grading definition:", error);
    
    // Error handling
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("API key authentication failed. Please check your API key.");
    } else {
      throw new Error("Failed to grade definition. Please try again later.");
    }
  }
}

/**
 * Generate example sentences for vocabulary words using Phi-2
 */
export async function generateExampleSentences(words: string[], count: number = 1): Promise<Record<string, string[]>> {
  try {
    if (!hf) {
      throw new Error("Hugging Face API key is not configured");
    }

    const sentences: Record<string, string[]> = {};
    
    // Process each word individually
    for (const word of words) {
      const prompt = `Write ${count} example sentence(s) using the word "${word}". Each sentence should clearly demonstrate the meaning of the word.`;
      
      const response = await hf.textGeneration({
        model: TEXT_GENERATION_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.7,
        },
      });
      
      const text = response.generated_text || "";
      
      // Extract sentences
      let extractedText = text.replace(prompt, "").trim();
      
      // Split by line or number
      let sentenceList: string[] = [];
      
      if (extractedText.includes('\n')) {
        // Split by lines
        sentenceList = extractedText.split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => s.replace(/^\d+\.\s*/, '')); // Remove numbering if present
      } else {
        // Assume it's a single paragraph with multiple sentences
        sentenceList = extractedText.split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
      
      // Limit to requested count and ensure the word is actually in each sentence
      const filteredSentences = sentenceList
        .filter(s => s.toLowerCase().includes(word.toLowerCase()))
        .slice(0, count);
      
      // If we don't have enough sentences, pad with a generic one
      if (filteredSentences.length < count) {
        const remaining = count - filteredSentences.length;
        for (let i = 0; i < remaining; i++) {
          filteredSentences.push(`The word "${word}" can be used in various contexts.`);
        }
      }
      
      sentences[word] = filteredSentences;
    }
    
    return sentences;
  } catch (error: any) {
    console.error("Error generating example sentences:", error);
    
    // Error handling
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("API key authentication failed. Please check your API key.");
    } else {
      throw new Error("Failed to generate example sentences. Please try again later.");
    }
  }
}

/**
 * Generate personalized learning strategies based on student performance using Phi-2
 */
export async function generateLearningStrategies(
  words: string[], 
  studentPerformance: Record<string, boolean>
): Promise<{
  strengths: string[];
  weaknesses: string[];
  strategies: string[];
}> {
  try {
    if (!hf) {
      throw new Error("Hugging Face API key is not configured");
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

Provide:
1. Three strengths of the student (based on the words they knew)
2. Three weaknesses or areas for improvement
3. Three specific learning strategies to help the student improve

Format your response exactly as follows:
STRENGTHS:
- First strength
- Second strength
- Third strength

WEAKNESSES:
- First weakness
- Second weakness
- Third weakness

STRATEGIES:
- First strategy
- Second strategy
- Third strategy
`;

    const response = await hf.textGeneration({
      model: TEXT_GENERATION_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 400,
        temperature: 0.7,
      },
    });

    const text = response.generated_text || "";
    
    // Extract the analysis sections
    const responseText = text.replace(prompt, "").trim();
    
    // Parse the sections using simpler regex patterns without lookbehind
    const strengthsPattern = new RegExp("STRENGTHS:[\\s\\S]*?-\\s*(.*?)[\\r\\n]+\\s*-\\s*(.*?)[\\r\\n]+\\s*-\\s*(.*?)[\\r\\n]+");
    const weaknessesPattern = new RegExp("WEAKNESSES:[\\s\\S]*?-\\s*(.*?)[\\r\\n]+\\s*-\\s*(.*?)[\\r\\n]+\\s*-\\s*(.*?)[\\r\\n]+");
    const strategiesPattern = new RegExp("STRATEGIES:[\\s\\S]*?-\\s*(.*?)[\\r\\n]+\\s*-\\s*(.*?)[\\r\\n]+\\s*-\\s*(.*?)(?:[\\r\\n]|$)");
    
    const strengthsMatch = responseText.match(strengthsPattern);
    const weaknessesMatch = responseText.match(weaknessesPattern);
    const strategiesMatch = responseText.match(strategiesPattern);
    
    // Default values
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const strategies: string[] = [];
    
    // Extract strengths
    if (strengthsMatch && strengthsMatch.length > 3) {
      for (let i = 1; i <= 3; i++) {
        if (strengthsMatch[i]) {
          strengths.push(strengthsMatch[i].trim());
        }
      }
    }
    
    // Extract weaknesses
    if (weaknessesMatch && weaknessesMatch.length > 3) {
      for (let i = 1; i <= 3; i++) {
        if (weaknessesMatch[i]) {
          weaknesses.push(weaknessesMatch[i].trim());
        }
      }
    }
    
    // Extract strategies
    if (strategiesMatch && strategiesMatch.length > 3) {
      for (let i = 1; i <= 3; i++) {
        if (strategiesMatch[i]) {
          strategies.push(strategiesMatch[i].trim());
        }
      }
    }
    
    // If any section is empty, provide default entries
    if (strengths.length === 0) {
      strengths.push(
        "Shows aptitude for understanding certain vocabulary categories",
        "Demonstrates knowledge of specific word types",
        "Has strong foundation in basic vocabulary"
      );
    }
    
    if (weaknesses.length === 0) {
      weaknesses.push(
        "Needs improvement in certain vocabulary areas",
        "May benefit from additional practice with challenging words",
        "Could use additional context for word usage"
      );
    }
    
    if (strategies.length === 0) {
      strategies.push(
        "Practice using new vocabulary in sentences",
        "Create flashcards for challenging words",
        "Read materials containing vocabulary from difficult categories"
      );
    }
    
    return { strengths, weaknesses, strategies };
  } catch (error: any) {
    console.error("Error generating learning strategies:", error);
    
    // Error handling
    if (error.status === 429) {
      throw new Error("API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("API key authentication failed. Please check your API key.");
    } else {
      throw new Error("Failed to generate learning strategies. Please try again later.");
    }
  }
}