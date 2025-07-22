import Groq from 'groq-sdk';
import { z } from "zod";

// Check if API key is available
const apiKey = process.env.GROQ_API_KEY;

// Initialize the Groq client only if API key is available
let groq: Groq | null = null;

try {
  if (apiKey) {
    groq = new Groq({
      apiKey: apiKey,
    });
    console.log("Groq client initialized successfully");
  } else {
    console.warn("GROQ_API_KEY is not set. AI features will be unavailable.");
  }
} catch (error) {
  console.error("Error initializing Groq client:", error);
}

// Default model for text generation
const DEFAULT_MODEL = "llama3-8b-8192";

/**
 * Check if the Groq API key is configured
 */
export function isGroqConfigured(): boolean {
  return !!groq;
}

/**
 * Generate definitions for words using Groq
 */
export async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }

    const definitions: Record<string, string> = {};
    
    // Process words in batches to avoid token limits
    const batchSize = 5;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      const prompt = `Please provide clear, educational definitions for these vocabulary words. Format your response as a JSON object with the word as key and definition as value:

Words: ${batch.join(', ')}

Return only valid JSON in this format:
{
  "word1": "definition here",
  "word2": "definition here"
}`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an educational assistant that provides clear, concise definitions for vocabulary words. Always respond with valid JSON format only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 1000,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const batchDefinitions = JSON.parse(content);
          Object.assign(definitions, batchDefinitions);
        } catch (parseError) {
          console.warn("Failed to parse batch definitions, using fallback");
          // Fallback for this batch
          for (const word of batch) {
            definitions[word] = `A vocabulary word that students should learn and understand.`;
          }
        }
      }
    }
    
    console.log(`Generated definitions for ${Object.keys(definitions).length} words using Groq`);
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
 * Analyze a passage and extract potential vocabulary words using Groq
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<string[]> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }
    
    const prompt = `Analyze the following passage and identify the ${count} most challenging vocabulary words that would be appropriate for students to learn. Focus on words that are:
1. Not too common or basic
2. Important for reading comprehension
3. Would benefit from definition practice

Passage:
"${passage}"

Return only a JSON array of the words:
["word1", "word2", "word3"]`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational assistant that identifies vocabulary words from passages. Always respond with valid JSON format only - an array of strings."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const words = JSON.parse(content);
        if (Array.isArray(words)) {
          console.log(`Extracted ${words.length} vocabulary words from passage using Groq`);
          return words.slice(0, count); // Ensure we don't exceed requested count
        }
      } catch (parseError) {
        console.warn("Failed to parse extracted words, using fallback approach");
      }
    }
    
    // Fallback: simple word extraction using regex
    const words = passage
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 5) // Focus on longer words
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, count);
    
    console.log(`Used fallback word extraction, found ${words.length} words`);
    return words;
  } catch (error: any) {
    console.error("Error analyzing passage:", error);
    
    // Fallback approach on error
    const words = passage
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 5)
      .filter((word, index, arr) => arr.indexOf(word) === index)
      .slice(0, count);
    
    return words;
  }
}

// Export the groq client
export { groq };

/**
 * Generate a passage that includes all the provided vocabulary words using Groq
 */
export async function generatePassageFromWords(
  words: string[],
  difficulty: 'elementary' | 'middle' | 'high' = 'middle',
  topic?: string
): Promise<string> {
  try {
    console.log("generatePassageFromWords called with:", { words, difficulty, topic });
    
    if (!groq) {
      console.error("Groq client is null - API key not configured properly");
      throw new Error("Groq API key is not configured");
    }

    const difficultyDescriptions = {
      elementary: "simple language suitable for elementary school students (grades 3-5)",
      middle: "moderate complexity suitable for middle school students (grades 6-8)",
      high: "advanced language suitable for high school students (grades 9-12)"
    };

    const topicContext = topic ? ` The passage should be about ${topic}.` : '';
    
    const prompt = `Create an educational passage using ${difficultyDescriptions[difficulty]} that naturally incorporates all of these vocabulary words: ${words.join(', ')}.

Requirements:
- Use each vocabulary word at least once in a natural, contextually appropriate way
- Make the passage engaging and educational
- Length should be 200-400 words
- Use proper paragraph structure${topicContext}

Words to include: ${words.join(', ')}

Write only the passage, no additional text or explanations:`;

    console.log("Calling Groq API to generate passage...");
    console.log("Using model:", DEFAULT_MODEL);
    console.log("Prompt length:", prompt.length);
    
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational content creator that writes engaging passages for vocabulary learning. Write clear, well-structured passages that naturally incorporate vocabulary words."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 1500,
    });
    
    console.log("Groq API response received");
    console.log("Response choices length:", completion.choices?.length || 0);

    const passage = completion.choices[0]?.message?.content?.trim();
    
    if (passage) {
      console.log(`Generated passage with ${words.length} vocabulary words using Groq`);
      return passage;
    } else {
      throw new Error("No passage content received from Groq API");
    }
  } catch (error: any) {
    console.error("Error generating passage with Groq:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name
    });
    
    if (error.status === 429) {
      throw new Error("Groq API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Groq API key authentication failed. Please check your GROQ_API_KEY.");
    } else {
      throw new Error(`Groq API error: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Grade a student's definition against the correct definition using Groq
 */
export async function gradeDefinition(
  word: string,
  studentDefinition: string,
  correctDefinition: string
): Promise<{ isCorrect: boolean; feedback: string }> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }

    const prompt = `Grade this student's definition of the word "${word}".

Correct definition: "${correctDefinition}"
Student's definition: "${studentDefinition}"

Evaluate if the student's definition captures the essential meaning of the word. Consider:
- Does it convey the core concept?
- Is it substantially correct even if not perfectly worded?
- Would it demonstrate understanding of the word's meaning?

Respond with valid JSON only:
{
  "isCorrect": true/false,
  "feedback": "Brief encouraging feedback for the student"
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational grading assistant. Be fair but encouraging in your assessment. Focus on whether the student demonstrates understanding of the word's meaning. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: 300,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const result = JSON.parse(content);
        if (typeof result.isCorrect === 'boolean' && typeof result.feedback === 'string') {
          return result;
        }
      } catch (parseError) {
        console.warn("Failed to parse grading result, using fallback");
      }
    }
    
    // Fallback: simple keyword matching
    const isCorrect = studentDefinition.toLowerCase().includes(word.toLowerCase()) ||
                     correctDefinition.toLowerCase().split(' ').some(keyword => 
                       studentDefinition.toLowerCase().includes(keyword.toLowerCase())
                     );
    
    return {
      isCorrect,
      feedback: isCorrect ? "Good effort! Your definition shows understanding." : "Try to focus on the main meaning of the word."
    };
  } catch (error: any) {
    console.error("Error grading definition:", error);
    
    // Simple fallback grading
    const isCorrect = studentDefinition.toLowerCase().includes(word.toLowerCase());
    return {
      isCorrect,
      feedback: "Your definition has been reviewed."
    };
  }
}

/**
 * Generate example sentences for vocabulary words using Groq
 */
export async function generateExampleSentences(words: string[], count: number = 1): Promise<Record<string, string[]>> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }

    const examples: Record<string, string[]> = {};
    
    // Process words in batches
    const batchSize = 3;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      
      const prompt = `Create ${count} example sentence${count > 1 ? 's' : ''} for each of these vocabulary words. The sentences should clearly demonstrate the word's meaning and be appropriate for students.

Words: ${batch.join(', ')}

Return valid JSON in this format:
{
  "word1": ["sentence 1", "sentence 2"],
  "word2": ["sentence 1", "sentence 2"]
}`;

      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an educational assistant that creates example sentences for vocabulary words. Always respond with valid JSON format only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: DEFAULT_MODEL,
        temperature: 0.5,
        max_tokens: 800,
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        try {
          const batchExamples = JSON.parse(content);
          Object.assign(examples, batchExamples);
        } catch (parseError) {
          console.warn("Failed to parse example sentences, using fallback");
          // Fallback for this batch
          for (const word of batch) {
            examples[word] = [`Here is an example sentence using the word ${word}.`];
          }
        }
      }
    }
    
    console.log(`Generated example sentences for ${Object.keys(examples).length} words using Groq`);
    return examples;
  } catch (error: any) {
    console.error("Error generating example sentences:", error);
    
    // Fallback approach
    const examples: Record<string, string[]> = {};
    for (const word of words) {
      examples[word] = [`This is an example sentence containing the word ${word}.`];
    }
    
    return examples;
  }
}

/**
 * Generate personalized learning strategies based on student performance using Groq
 */
export async function generateContextualSuggestions(wrongWords: string[]): Promise<Array<{
  word: string;
  definition: string;
  example: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}>> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }

    const prompt = `Based on these vocabulary words the student got wrong: ${wrongWords.join(', ')}

Generate 6-8 related vocabulary words that would help the student learn similar concepts and improve their understanding.

Focus on providing:
- Synonyms and antonyms of the wrong words
- Words with similar difficulty levels and complexity
- Words from related topics, categories, or semantic fields
- Words that share linguistic roots or connections
- Words that would naturally extend the student's learning

For each word, provide:
- word: the vocabulary word
- definition: clear, concise definition
- example: example sentence showing usage
- category: one of [Academic, Science, Literature, History, Arts, Daily Life, Technology]
- difficulty: one of [easy, medium, hard]

Respond with valid JSON only in this format:
{
  "words": [
    {
      "word": "example",
      "definition": "definition here",
      "example": "example sentence here",
      "category": "Academic", 
      "difficulty": "medium"
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational vocabulary specialist that generates contextually relevant vocabulary words based on student performance. Focus on building vocabulary systematically through related words. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 1200,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const result = JSON.parse(content);
        if (Array.isArray(result.words)) {
          return result.words;
        }
      } catch (parseError) {
        console.warn("Failed to parse contextual suggestions from Groq");
      }
    }
    
    throw new Error("No valid contextual suggestions received from Groq");
  } catch (error: any) {
    console.error("Error generating contextual suggestions with Groq:", error);
    throw error;
  }
}

export async function generateVocabularySuggestions(): Promise<Array<{
  word: string;
  definition: string;
  example: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}>> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }

    const prompt = `Generate 8 high-quality vocabulary words that would be beneficial for students to learn.
Focus on commonly used academic and everyday words that expand vocabulary effectively.

For each word, provide:
- word: the vocabulary word
- definition: clear, concise definition
- example: example sentence showing usage
- category: one of [Academic, Science, Literature, History, Arts, Daily Life, Technology]
- difficulty: one of [easy, medium, hard]

Respond with valid JSON only in this format:
{
  "words": [
    {
      "word": "example",
      "definition": "definition here",
      "example": "example sentence here",
      "category": "Academic",
      "difficulty": "medium"
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational vocabulary specialist that generates high-quality vocabulary words for students. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.7,
      max_tokens: 1000,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const result = JSON.parse(content);
        if (Array.isArray(result.words)) {
          return result.words;
        }
      } catch (parseError) {
        console.warn("Failed to parse vocabulary suggestions from Groq");
      }
    }
    
    throw new Error("No valid vocabulary suggestions received from Groq");
  } catch (error: any) {
    console.error("Error generating vocabulary suggestions with Groq:", error);
    throw error;
  }
}

export async function generateLearningStrategies(
  words: string[],
  studentPerformance: Record<string, boolean>
): Promise<{
  difficultWords: string[];
  strategies: string[];
  encouragement: string;
}> {
  try {
    if (!groq) {
      throw new Error("Groq API key is not configured");
    }

    const incorrectWords = words.filter(word => studentPerformance[word] === false);
    const correctWords = words.filter(word => studentPerformance[word] === true);
    
    const prompt = `Provide personalized learning strategies for a student based on their vocabulary performance.

Correct words: ${correctWords.join(', ')}
Incorrect words: ${incorrectWords.join(', ')}

Generate specific, actionable learning strategies and encouragement. Respond with valid JSON only:
{
  "difficultWords": ["word1", "word2"],
  "strategies": ["strategy 1", "strategy 2", "strategy 3"],
  "encouragement": "personalized encouraging message"
}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational learning specialist that provides personalized study strategies. Be specific, actionable, and encouraging. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: DEFAULT_MODEL,
      temperature: 0.6,
      max_tokens: 600,
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const result = JSON.parse(content);
        if (Array.isArray(result.difficultWords) && Array.isArray(result.strategies) && typeof result.encouragement === 'string') {
          return result;
        }
      } catch (parseError) {
        console.warn("Failed to parse learning strategies, using fallback");
      }
    }
    
    // Fallback approach
    return {
      difficultWords: incorrectWords,
      strategies: [
        "Review the difficult words daily using flashcards",
        "Try to use these words in your own sentences",
        "Look for these words when reading books or articles"
      ],
      encouragement: `You got ${correctWords.length} out of ${words.length} words correct! Keep practicing and you'll improve even more.`
    };
  } catch (error: any) {
    console.error("Error generating learning strategies:", error);
    
    const incorrectWords = words.filter(word => studentPerformance[word] === false);
    const correctWords = words.filter(word => studentPerformance[word] === true);
    
    return {
      difficultWords: incorrectWords,
      strategies: [
        "Practice with flashcards",
        "Use words in sentences",
        "Read more to see words in context"
      ],
      encouragement: `Good job on getting ${correctWords.length} words correct!`
    };
  }
}