import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env.js';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3001',
  CLIENT_ORIGIN: 'http://localhost:5173',
  GOOGLE_API_KEY: 'g-key',
  GEMINI_FAST_MODEL: 'gemini-2.5-flash',
  GEMINI_PRO_MODEL: 'gemini-2.5-pro',
  GEMINI_EMBED_MODEL: 'gemini-embedding-001',
  PINECONE_API_KEY: 'p-key',
  PINECONE_INDEX: 'resumes',
  EMBED_DIMENSION: '768',
  TAVILY_API_KEY: 't-key',
  FIREBASE_PROJECT_ID: 'proj',
  FIREBASE_CLIENT_EMAIL: 'svc@proj.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: 'key',
};

describe('config/env', () => {
  it('parses valid env configuration', () => {
    const parsed = validateEnv(validEnv);
    expect(parsed.PORT).toBe(3001);
    expect(parsed.EMBED_DIMENSION).toBe(768);
  });

  it('throws clear error listing missing required vars', () => {
    expect(() => validateEnv({ PORT: '3001' })).toThrow(/GOOGLE_API_KEY/);
    expect(() => validateEnv({ PORT: '3001' })).toThrow(/PINECONE_API_KEY/);
    expect(() => validateEnv({ PORT: '3001' })).toThrow(/FIREBASE_PROJECT_ID/);
  });

  it('rejects non-positive EMBED_DIMENSION', () => {
    expect(() => validateEnv({ ...validEnv, EMBED_DIMENSION: '0' })).toThrow(/EMBED_DIMENSION/);
  });
});
