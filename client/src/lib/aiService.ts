import { apiRequest } from "./queryClient";

/**
 * Check if the OpenAI API is configured on the server
 */
export async function checkAIStatus(): Promise<{ configured: boolean }> {
  const response = await apiRequest(
    "GET",
    "/api/ai/status"
  );
  return response.json();
}

/**
 * Generate definitions for a list of words
 */
export async function generateDefinitions(words: string[]): Promise<{ definitions: Record<string, string> }> {
  const response = await apiRequest(
    "POST",
    "/api/ai/definitions",
    { words }
  );
  return response.json();
}

/**
 * Analyze a passage to extract potential vocabulary words
 */
export async function analyzePassage(passage: string, count?: number): Promise<{ words: string[] }> {
  const response = await apiRequest(
    "POST",
    "/api/ai/analyze-passage",
    { passage, count }
  );
  return response.json();
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
  const response = await apiRequest(
    "POST",
    "/api/ai/grade-definition",
    { word, studentDefinition, correctDefinition }
  );
  return response.json();
}

/**
 * Generate example sentences for vocabulary words
 */
export async function generateExampleSentences(
  words: string[],
  count?: number
): Promise<{ sentences: Record<string, string[]> }> {
  const response = await apiRequest(
    "POST",
    "/api/ai/example-sentences",
    { words, count }
  );
  return response.json();
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
  const response = await apiRequest(
    "POST",
    "/api/ai/learning-strategies",
    { words, studentPerformance }
  );
  return response.json();
}