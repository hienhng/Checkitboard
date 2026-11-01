import OpenAI from "openai";

// Check if API key is available
const apiKey = process.env.GEMINI_API_KEY?.trim();

// Initialize the Gemini client only if API key is available
let gemini: OpenAI | null = null;

try {
  if (apiKey) {
    gemini = new OpenAI({
      apiKey,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      timeout: 45_000,
      maxRetries: 1,
    });
    console.log("Gemini client initialized successfully");
  } else {
    console.warn("GEMINI_API_KEY is not set. AI features will use fallback providers if configured.");
  }
} catch (error) {
  console.error("Error initializing Gemini client:", error);
}

// Override the model without changing code when Google updates availability.
// Gemini output limits include thinking tokens; allow room for reasoning and JSON.
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/**
 * Check if the Gemini API key is configured
 */
export function isGeminiConfigured(): boolean {
  return !!gemini;
}

/**
 * Generate definitions for words using Gemini
 */
export async function generateDefinitions(words: string[]): Promise<Record<string, string>> {
  try {
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
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

      const completion = await gemini.chat.completions.create({
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
        model: GEMINI_MODEL,
        reasoning_effort: "low",
        temperature: 0.3,
        max_tokens: 8192,
        response_format: { type: "json_object" },
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
    
    console.log(`Generated definitions for ${Object.keys(definitions).length} words using Gemini`);
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
 * Analyze a passage and extract potential vocabulary words using Gemini
 */
export async function analyzePassage(passage: string, count: number = 10): Promise<string[]> {
  try {
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
    }
    
    const prompt = `Analyze the following passage and identify the ${count} most challenging vocabulary words that would be appropriate for students to learn. Focus on words that are:
1. Not too common or basic
2. Important for reading comprehension
3. Would benefit from definition practice

Passage:
"${passage}"

Return only a JSON object containing the words:
{"words": ["word1", "word2", "word3"]}`;

    const completion = await gemini.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an educational assistant that identifies vocabulary words from passages. Always respond with valid JSON format only - an object with a words array of strings."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: GEMINI_MODEL,
      reasoning_effort: "low",
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const { words } = JSON.parse(content);
        if (Array.isArray(words) && words.every((word: unknown) => typeof word === "string")) {
          console.log(`Extracted ${words.length} vocabulary words from passage using Gemini`);
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

// Export the gemini client
export { gemini };

/**
 * Generate a passage that includes all the provided vocabulary words using Gemini
 */
export async function generatePassageFromWords(
  words: string[],
  options: { topic?: string; gradeLevel?: string; paragraphCount?: number; style?: string } = {}
): Promise<string> {
  try {
    
    if (!gemini) {
      console.error("Gemini client is null - API key not configured properly");
      throw new Error("Gemini API key is not configured");
    }

    const gradeLevel = options.gradeLevel || "middle school";
    const paragraphCount = options.paragraphCount || 1;
    const style = options.style || "educational";
    const topic = options.topic || "general knowledge";
    
    const prompt = `Create a ${style} passage about ${topic} at a ${gradeLevel} reading level that naturally incorporates all of these vocabulary words: ${words.join(', ')}.

Requirements:
- Use each vocabulary word in its exact form at least once in a natural, contextually appropriate way
- Make the passage engaging and educational
- Length should be 200-400 words
- Write exactly ${paragraphCount} paragraph(s), separated by a blank line

Words to include: ${words.join(', ')}

Write only the passage, no additional text or explanations:`;

    console.log("Calling Gemini API to generate passage...");
    console.log("Using model:", GEMINI_MODEL);
    console.log("Prompt length:", prompt.length);
    
    const completion = await gemini.chat.completions.create({
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
      model: GEMINI_MODEL,
      reasoning_effort: "low",
      temperature: 0.7,
      max_tokens: 8192,
    });
    
    console.log("Gemini API response received");
    console.log("Response choices length:", completion.choices?.length || 0);

    const passage = completion.choices[0]?.message?.content?.trim();
    
    if (passage) {
      console.log(`Generated passage with ${words.length} vocabulary words using Gemini`);
      return passage;
    } else {
      throw new Error("No passage content received from Gemini API");
    }
  } catch (error: any) {
    console.error("Error generating passage with Gemini:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.status,
      code: error.code,
      name: error.name
    });
    
    if (error.status === 429) {
      throw new Error("Gemini API rate limit exceeded. Please try again later.");
    } else if (error.status === 401 || error.status === 403) {
      throw new Error("Gemini API key authentication failed. Please check your GEMINI_API_KEY.");
    } else if (error.status === 404) {
      throw new Error("The configured Gemini model is unavailable. Please check GEMINI_MODEL.");
    } else if (error.status >= 500) {
      throw new Error("Gemini is temporarily unavailable. Please try generating again shortly.");
    } else if (error instanceof OpenAI.APIConnectionError) {
      throw new Error("Could not connect to Gemini. Please try generating again shortly.");
    } else {
      throw new Error("Gemini could not generate a passage. Please try again or check the server's AI configuration.");
    }
  }
}

/**
 * Grade a student's definition against the correct definition using Gemini
 */
export async function gradeDefinition(
  word: string,
  studentDefinition: string,
  correctDefinition: string
): Promise<{ isCorrect: boolean; feedback: string }> {
  try {
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
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

    const completion = await gemini.chat.completions.create({
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
      model: GEMINI_MODEL,
      reasoning_effort: "low",
      temperature: 0.2,
      max_tokens: 8192,
      response_format: { type: "json_object" },
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
 * Generate example sentences for vocabulary words using Gemini
 */
export async function generateExampleSentences(words: string[], count: number = 1): Promise<Record<string, string[]>> {
  try {
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
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

      const completion = await gemini.chat.completions.create({
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
        model: GEMINI_MODEL,
        reasoning_effort: "low",
        temperature: 0.5,
        max_tokens: 8192,
        response_format: { type: "json_object" },
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
    
    console.log(`Generated example sentences for ${Object.keys(examples).length} words using Gemini`);
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
 * Generate personalized learning strategies based on student performance using Gemini
 */
export async function generateContextualSuggestions(wrongWords: string[]): Promise<Array<{
  word: string;
  definition: string;
  example: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}>> {
  try {
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
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

    const completion = await gemini.chat.completions.create({
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
      model: GEMINI_MODEL,
      reasoning_effort: "low",
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        // Try parsing the content directly first
        let result = JSON.parse(content);
        if (Array.isArray(result.words) && result.words.length > 0) {
          return result.words;
        } else if (Array.isArray(result) && result.length > 0) {
          return result;
        }
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from the content
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0]);
            if (Array.isArray(result.words) && result.words.length > 0) {
              return result.words;
            } else if (Array.isArray(result) && result.length > 0) {
              return result;
            }
          }
        } catch (secondParseError) {
          console.warn("Failed to parse contextual suggestions from Gemini after JSON extraction, content:", content);
        }
      }
    }
    
    // Return empty array instead of throwing error to allow fallback to work
    return [];
  } catch (error: any) {
    console.error("Error generating contextual suggestions with Gemini:", error);
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
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
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

    const completion = await gemini.chat.completions.create({
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
      model: GEMINI_MODEL,
      reasoning_effort: "low",
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      try {
        const result = JSON.parse(content);
        if (Array.isArray(result.words)) {
          return result.words;
        }
      } catch (parseError) {
        console.warn("Failed to parse vocabulary suggestions from Gemini");
      }
    }
    
    throw new Error("No valid vocabulary suggestions received from Gemini");
  } catch (error: any) {
    console.error("Error generating vocabulary suggestions with Gemini:", error);
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
    if (!gemini) {
      throw new Error("Gemini API key is not configured");
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

    const completion = await gemini.chat.completions.create({
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
      model: GEMINI_MODEL,
      reasoning_effort: "low",
      temperature: 0.6,
      max_tokens: 8192,
      response_format: { type: "json_object" },
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
