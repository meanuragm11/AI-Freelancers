import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODEL, GEMINI_RETRY } from '../constants';

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls Gemini 2.5 Flash with retry logic and graceful failure handling.
 * Never exposes the API key to the frontend — backend only.
 */
export async function callGeminiModeration(prompt: string): Promise<{
  text: string;
  failed: boolean;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[moderation] GEMINI_API_KEY missing — skipping AI moderation');
    return { text: '', failed: true };
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= GEMINI_RETRY.maxAttempts; attempt++) {
    try {
      const model = getClient().getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return { text, failed: false };
    } catch (error) {
      lastError = error;
      console.error(`[moderation] Gemini attempt ${attempt}/${GEMINI_RETRY.maxAttempts} failed:`, error);
      if (attempt < GEMINI_RETRY.maxAttempts) {
        await sleep(GEMINI_RETRY.baseDelayMs * Math.pow(2, attempt - 1));
      }
    }
  }

  console.error('[moderation] All Gemini attempts exhausted:', lastError);
  return { text: '', failed: true };
}
