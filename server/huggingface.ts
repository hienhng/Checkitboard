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

// Model name for Phi-2
const PHI2_MODEL = "microsoft/phi-2";

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
    
    // Process each word individually to be more reliable
    for (const word of words) {
      const prompt = `Define the word "${word}" in a clear, concise way suitable for students.`;
      
      const response = await hf.textGeneration({
        model: PHI2_MODEL,
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.7,
          top_p: 0.95,
        },
      });
      
      // Extract just the definition from the response
      const text = response.generated_text || "";
      // Clean up the response to get just the definition
      let definition = text.replace(prompt, "").trim();
      
      // Sometimes models repeat the word in the definition, clean that up
      definition = definition.replace(new RegExp(`^"?${word}"?\\s*:?\\s*`, "i"), "");
      definition = definition.replace(/^-\s*/, ""); // Remove leading dash
      definition = definition.replace(/^definition:?\s*/i, ""); // Remove the word "definition"
      
      // Store the definition
      definitions[word] = definition;
    }
    
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

    const prompt = `
Extract ${count} vocabulary words from the following passage that would be valuable for learning:

"${passage}"

Return only a numbered list of individual words, with no other text or explanation. Format:
1. word1
2. word2
...
${count}. word${count}
`;

    const response = await hf.textGeneration({
      model: PHI2_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.3, // Lower temperature for more predictable results
        top_p: 0.95,
      },
    });

    const text = response.generated_text || "";
    
    // Extract just the words from the response 
    const wordPattern = /\d+\.\s*([a-zA-Z]+)/g;
    const words: string[] = [];
    let match;
    while ((match = wordPattern.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        words.push(match[1].trim());
      }
    }
    
    // Limit to requested count
    return words.slice(0, count);
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

    const prompt = `
Write a ${style} passage about ${topic} at a ${gradeLevel} reading level. The passage should be about ${paragraphCount} paragraph(s) long and naturally incorporate ALL of the following vocabulary words: ${words.join(", ")}.

The passage should:
1. Use ALL the listed words naturally
2. Be coherent and educational
3. Be appropriate for ${gradeLevel} students
4. Be between 100-300 words
`;

    const response = await hf.textGeneration({
      model: PHI2_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 500, // Larger token limit for longer passages
        temperature: 0.8,
        top_p: 0.95,
      },
    });

    const generatedPassage = response.generated_text || "";
    // Remove the prompt from the response to get just the passage
    const passage = generatedPassage.replace(prompt, "").trim();
    
    return passage;
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
      model: PHI2_MODEL,
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
        model: PHI2_MODEL,
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
      model: PHI2_MODEL,
      inputs: prompt,
      parameters: {
        max_new_tokens: 400,
        temperature: 0.7,
      },
    });

    const text = response.generated_text || "";
    
    // Extract the analysis sections
    const responseText = text.replace(prompt, "").trim();
    
    // Parse the sections using simpler regex patterns
    const strengthsPattern = /STRENGTHS:[\s\S]*?-\s*(.*?)[\r\n]+\s*-\s*(.*?)[\r\n]+\s*-\s*(.*?)[\r\n]+/;
    const weaknessesPattern = /WEAKNESSES:[\s\S]*?-\s*(.*?)[\r\n]+\s*-\s*(.*?)[\r\n]+\s*-\s*(.*?)[\r\n]+/;
    const strategiesPattern = /STRATEGIES:[\s\S]*?-\s*(.*?)[\r\n]+\s*-\s*(.*?)[\r\n]+\s*-\s*(.*?)(?:[\r\n]|$)/;
    
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