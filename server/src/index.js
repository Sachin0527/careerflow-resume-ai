import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';
import { verifyPineconeIndexDimension } from './config/pinecone.js';

const app = createApp();

async function start() {
  try {
    await verifyPineconeIndexDimension();
  } catch (err) {
    logger.warn(
      { err: err.message },
      'Pinecone startup check failed (vector operations may fail until index/key is fixed)'
    );
  }

  app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        clientOrigin: env.CLIENT_ORIGIN,
        fastModel: env.GEMINI_FAST_MODEL,
        proModel: env.GEMINI_PRO_MODEL,
        embedModel: env.GEMINI_EMBED_MODEL,
        pineconeIndex: env.PINECONE_INDEX,
      },
      `Server listening on http://localhost:${env.PORT}`
    );
  });
}

start();
