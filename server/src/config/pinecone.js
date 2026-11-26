import { Pinecone } from '@pinecone-database/pinecone';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const pinecone = new Pinecone({
  apiKey: env.PINECONE_API_KEY,
});

export function getPineconeIndex() {
  return pinecone.index(env.PINECONE_INDEX);
}

/**
 * Verify that the configured Pinecone index exists and matches EMBED_DIMENSION.
 */
export async function verifyPineconeIndexDimension() {
  const description = await pinecone.describeIndex(env.PINECONE_INDEX);
  if (description.dimension && description.dimension !== env.EMBED_DIMENSION) {
    throw new Error(
      `Pinecone index "${env.PINECONE_INDEX}" has dimension ${description.dimension}, ` +
        `but EMBED_DIMENSION is set to ${env.EMBED_DIMENSION}. Both must match.`
    );
  }
  logger.info(
    { index: env.PINECONE_INDEX, dimension: description.dimension },
    'Pinecone index verified'
  );
  return description;
}
