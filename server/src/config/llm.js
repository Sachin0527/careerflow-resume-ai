import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { env } from './env.js';

/**
 * Create a Gemini chat model instance with explicit model name and temperature.
 */
export function createChatModel(model, temperature = 0, options = {}) {
  return new ChatGoogleGenerativeAI({
    apiKey: env.GOOGLE_API_KEY,
    model,
    temperature,
    maxRetries: 2,
    ...options,
  });
}

export const fastModel = createChatModel(env.GEMINI_FAST_MODEL, 0);

export const proModel = createChatModel(env.GEMINI_PRO_MODEL, 0.4);

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: env.GOOGLE_API_KEY,
  model: env.GEMINI_EMBED_MODEL,
  outputDimensionality: env.EMBED_DIMENSION,
});
