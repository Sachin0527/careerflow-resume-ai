import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      PORT: '3001',
      CLIENT_ORIGIN: 'http://localhost:5173',
      GOOGLE_API_KEY: 'test-google-key',
      GEMINI_FAST_MODEL: 'gemini-3-flash-preview',
      GEMINI_PRO_MODEL: 'gemini-3-flash-preview',
      GEMINI_EMBED_MODEL: 'gemini-embedding-001',
      PINECONE_API_KEY: 'test-pinecone-key',
      PINECONE_INDEX: 'test-index',
      EMBED_DIMENSION: '768',
      TAVILY_API_KEY: 'test-tavily-key',
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nTEST\\n-----END PRIVATE KEY-----\\n',
    },
  },
});
