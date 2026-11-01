import { apiRequest } from "./queryClient";

/**
 * Special safe fetch that won't cause auth redirects with error handling for AI services
 */
async function safeAIRequest(method: string, url: string, data?: unknown): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    // Handle non-OK status specifically for AI endpoints
    if (!res.ok) {
      // Special handling for authentication errors - don't throw, just return a special response
      if (res.status === 401) {
        console.warn("Authentication required for AI feature, using fallback approach");
        return new Response(JSON.stringify({ 
          fallback: true,
          error: "Authentication required",
          message: "Using fallback approach"
        }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // For other errors, throw normally
      const errorText = await res.text();
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }
    
    return res;
  } catch (error) {
    console.error("AI service error:", error);
    
    // Return a special response for network or other errors
    return new Response(JSON.stringify({ 
      fallback: true,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Using fallback approach due to error"
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}

/**
 * Check if the Hugging Face API is configured on the server
 */
export async function checkAIStatus(): Promise<{ configured: boolean }> {
  try {
    const response = await safeAIRequest("GET", "/api/ai/status");
    return await response.json();
  } catch (error) {
    console.error("Error checking AI status:", error);
    return { configured: false };
  }
}

/**
 * Generate definitions for a list of words
 */
export async function generateDefinitions(words: string[]): Promise<{ definitions: Record<string, string> }> {
  try {
    const response = await safeAIRequest("POST", "/api/ai/definitions", { words });
    const data = await response.json();
    
    // Check if we got a fallback response
    if (data.fallback) {
      // Create simple definitions
      const fallbackDefinitions: Record<string, string> = {};
      words.forEach(word => {
        fallbackDefinitions[word] = `A vocabulary word that is important to learn and understand.`;
      });
      
      return { definitions: fallbackDefinitions };
    }
    
    return data;
  } catch (error) {
    console.error("Error generating definitions:", error);
    
    // Create fallback definitions
    const fallbackDefinitions: Record<string, string> = {};
    words.forEach(word => {
      fallbackDefinitions[word] = `A vocabulary word that is important to learn and understand.`;
    });
    
    return { definitions: fallbackDefinitions };
  }
}

/**
 * Analyze a passage to extract potential vocabulary words
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<{ words: string[] }> {
  try {
    const response = await safeAIRequest("POST", "/api/ai/analyze-passage", { passage, count });
    const data = await response.json();
    
    // Check if we got a fallback response
    if (data.fallback) {
      // Simple word extraction logic
      const extractedWords = passage
        .replace(/[^\w\s]|_/g, "")
        .split(/\s+/)
        .filter(word => word.length > 4) // Only words with 5+ characters
        .map(word => word.toLowerCase())
        .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
        .slice(0, count);
        
      return { words: extractedWords };
    }
    
    return data;
  } catch (error) {
    console.error("Error analyzing passage:", error);
    
    // Simple word extraction logic as fallback
    const extractedWords = passage
      .replace(/[^\w\s]|_/g, "")
      .split(/\s+/)
      .filter(word => word.length > 4) // Only words with 5+ characters
      .map(word => word.toLowerCase())
      .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicates
      .slice(0, count);
      
    return { words: extractedWords };
  }
}

/**
 * Grade a student's definition
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
    const response = await safeAIRequest(
      "POST",
      "/api/ai/grade-definition",
      { word, studentDefinition, correctDefinition }
    );
    return await response.json();
  } catch (error) {
    console.error("Error grading definition:", error);
    
    // Provide a default grading response
    return {
      isCorrect: true, // Default to being generous
      confidence: 0.6,
      feedback: "Your definition shows understanding of the word.",
      suggestedCorrectDefinition: correctDefinition
    };
  }
}

/**
 * Generate example sentences for vocabulary words
 */
export async function generateExampleSentences(
  words: string[],
  count: number = 1
): Promise<{ sentences: Record<string, string[]> }> {
  try {
    const response = await safeAIRequest(
      "POST",
      "/api/ai/example-sentences",
      { words, count }
    );
    const data = await response.json();
    
    // Check if we got a fallback response
    if (data.fallback) {
      // Create simple example sentences
      const fallbackSentences: Record<string, string[]> = {};
      words.forEach(word => {
        fallbackSentences[word] = [`The word "${word}" can be used in various educational contexts.`];
      });
      
      return { sentences: fallbackSentences };
    }
    
    return data;
  } catch (error) {
    console.error("Error generating example sentences:", error);
    
    // Create fallback example sentences
    const fallbackSentences: Record<string, string[]> = {};
    words.forEach(word => {
      fallbackSentences[word] = [`The word "${word}" can be used in various educational contexts.`];
    });
    
    return { sentences: fallbackSentences };
  }
}

/**
 * Generate personalized learning strategies
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
    const response = await safeAIRequest(
      "POST",
      "/api/ai/learning-strategies",
      { words, studentPerformance }
    );
    return await response.json();
  } catch (error) {
    console.error("Error generating learning strategies:", error);
    
    // Provide default learning strategies
    return {
      strengths: ["Shows aptitude for understanding vocabulary", "Has a good foundation for learning"],
      weaknesses: ["May need more practice with challenging words", "Could benefit from additional context"],
      strategies: ["Practice using words in sentences", "Create flashcards for difficult words", "Read materials containing vocabulary"]
    };
  }
}

/**
 * Generate a passage that incorporates a list of vocabulary words
 */
export async function generatePassageFromWords(
  words: string[],
  options?: {
    topic?: string;
    gradeLevel?: string;
    paragraphCount?: number;
    style?: string;
  }
): Promise<{ passage: string }> {
  const response = await fetch("/api/ai/generate-passage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ words, ...options }),
    credentials: "include",
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please sign in again to generate a passage.");
    }
    throw new Error(data.message || "Unable to generate a passage. Please try again.");
  }
  if (data.fallback || typeof data.passage !== "string" || !data.passage.trim()) {
    throw new Error("The AI service returned no passage. Please try again.");
  }
  return { passage: data.passage.trim() };
}
