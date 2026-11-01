import { gemini, GEMINI_MODEL } from "./gemini.js";
import OpenAI from "openai";

interface QuestionGenerationData {
  word: string;
  definition?: string;
}

interface GeneratedQuestion {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: "A" | "B" | "C" | "D";
}

export async function generateMultipleChoiceQuestion(data: QuestionGenerationData): Promise<GeneratedQuestion> {
  const { word, definition } = data;
  
  const prompt = `Create a multiple choice question to test understanding of the vocabulary word "${word}".
${definition ? `The word's definition is: ${definition}` : ""}

Generate a question that tests comprehension of this word's meaning. Include 4 answer options (A, B, C, D) where one is clearly correct and the others are plausible but incorrect.

Respond in this exact JSON format:
{
  "question": "What does the word '${word}' mean?",
  "optionA": "first option",
  "optionB": "second option", 
  "optionC": "third option",
  "optionD": "fourth option",
  "correctAnswer": "A"
}

Make sure the question is clear, educational, and appropriate for vocabulary learning.`;

  try {
    // Try Gemini first
    if (gemini) {
      try {
        const response = await gemini.chat.completions.create({
          model: GEMINI_MODEL,
          reasoning_effort: "low",
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 8192,
        });

        const content = response.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            question: parsed.question,
            optionA: parsed.optionA,
            optionB: parsed.optionB,
            optionC: parsed.optionC,
            optionD: parsed.optionD,
            correctAnswer: parsed.correctAnswer,
          };
        }
      } catch (error) {
        console.warn("Gemini question generation failed, falling back to OpenAI:", error);
      }
    }

    // Fallback to OpenAI if available
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          question: parsed.question,
          optionA: parsed.optionA,
          optionB: parsed.optionB,
          optionC: parsed.optionC,
          optionD: parsed.optionD,
          correctAnswer: parsed.correctAnswer,
        };
      }
    }

    throw new Error("No AI service available");
  } catch (error) {
    console.error("Error generating question:", error);
    throw new Error("Failed to generate question with AI");
  }
}
