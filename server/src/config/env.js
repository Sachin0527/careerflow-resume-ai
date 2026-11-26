import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(serverRoot, '.env') });

const nonEmpty = (name) =>
  z.string({ required_error: `${name} is required` }).trim().min(1, `${name} must not be empty`);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  CLIENT_ORIGIN: nonEmpty('CLIENT_ORIGIN').default('http://localhost:5173'),
  GOOGLE_API_KEY: nonEmpty('GOOGLE_API_KEY'),
  GEMINI_FAST_MODEL: nonEmpty('GEMINI_FAST_MODEL').default('gemini-3-flash-preview'),
  GEMINI_PRO_MODEL: nonEmpty('GEMINI_PRO_MODEL').default('gemini-3-flash-preview'),
  GEMINI_EMBED_MODEL: nonEmpty('GEMINI_EMBED_MODEL').default('gemini-embedding-001'),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  PINECONE_API_KEY: nonEmpty('PINECONE_API_KEY'),
  PINECONE_INDEX: nonEmpty('PINECONE_INDEX'),
  EMBED_DIMENSION: z.coerce
    .number({ invalid_type_error: 'EMBED_DIMENSION must be a positive integer' })
    .int()
    .positive('EMBED_DIMENSION must be a positive integer'),
  TAVILY_API_KEY: nonEmpty('TAVILY_API_KEY'),
  FIREBASE_PROJECT_ID: nonEmpty('FIREBASE_PROJECT_ID'),
  FIREBASE_CLIENT_EMAIL: nonEmpty('FIREBASE_CLIENT_EMAIL').email(
    'FIREBASE_CLIENT_EMAIL must be a valid service account email'
  ),
  FIREBASE_PRIVATE_KEY: nonEmpty('FIREBASE_PRIVATE_KEY'),
});

/**
 * Validate environment variables against envSchema and throw a formatted error if invalid.
 */
export function validateEnv(rawEnv = process.env) {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    const err = new Error(
      `Invalid or missing environment variables (see server/.env.example):\n${details}`
    );
    err.name = 'EnvValidationError';
    throw err;
  }
  return parsed.data;
}

let cachedEnv = null;

/**
 * Load and validate env on startup (with clear error output).
 */
export function loadEnv() {
  if (cachedEnv) return cachedEnv;
  try {
    cachedEnv = validateEnv(process.env);
    return cachedEnv;
  } catch (err) {
    console.error(`\n[Startup Error] ${err.message}\n`);
    throw err;
  }
}

export const env = loadEnv();
