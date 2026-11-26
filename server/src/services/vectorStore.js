import { Document } from '@langchain/core/documents';
import { PineconeStore } from '@langchain/pinecone';
import { embeddings } from '../config/llm.js';
import { getPineconeIndex } from '../config/pinecone.js';
import { logger } from '../utils/logger.js';

/**
 * Build semantic chunks from canonical Resume JSON:
 * one chunk per summary, experience item, project, and skills group.
 */
export function buildResumeChunks(resume, versionId) {
  const chunks = [];

  if (resume.basics?.summary?.trim()) {
    chunks.push({
      id: `resume:summary`,
      doc: new Document({
        pageContent: `Professional Summary: ${resume.basics.summary.trim()}`,
        metadata: {
          docType: 'resume',
          section: 'summary',
          itemId: 'summary',
          versionId,
        },
      }),
    });
  }

  (resume.experience || []).forEach((exp, idx) => {
    const itemId = exp.id || `exp-${idx + 1}`;
    const lines = [
      `Role: ${exp.title} at ${exp.company}`,
      exp.location ? `Location: ${exp.location}` : '',
      exp.startDate || exp.endDate ? `Dates: ${exp.startDate} - ${exp.endDate}` : '',
      ...(exp.bullets || []).map((b) => `- ${b}`),
    ].filter(Boolean);

    if (lines.length > 0) {
      chunks.push({
        id: `resume:experience:${itemId}`,
        doc: new Document({
          pageContent: lines.join('\n'),
          metadata: {
            docType: 'resume',
            section: 'experience',
            itemId,
            company: exp.company || '',
            title: exp.title || '',
            versionId,
          },
        }),
      });
    }
  });

  (resume.projects || []).forEach((proj, idx) => {
    const itemId = proj.id || `proj-${idx + 1}`;
    const lines = [
      `Project: ${proj.name}`,
      proj.description ? `Description: ${proj.description}` : '',
      proj.tech?.length ? `Tech: ${proj.tech.join(', ')}` : '',
      ...(proj.bullets || []).map((b) => `- ${b}`),
    ].filter(Boolean);

    if (lines.length > 0) {
      chunks.push({
        id: `resume:projects:${itemId}`,
        doc: new Document({
          pageContent: lines.join('\n'),
          metadata: {
            docType: 'resume',
            section: 'projects',
            itemId,
            name: proj.name || '',
            versionId,
          },
        }),
      });
    }
  });

  (resume.skills || []).forEach((group, idx) => {
    const category = group.category || `Group ${idx + 1}`;
    const items = (group.items || []).filter(Boolean);
    if (items.length > 0) {
      chunks.push({
        id: `resume:skills:${idx}`,
        doc: new Document({
          pageContent: `Skills (${category}): ${items.join(', ')}`,
          metadata: {
            docType: 'resume',
            section: 'skills',
            itemId: `skills-${idx}`,
            category,
            versionId,
          },
        }),
      });
    }
  });

  return chunks;
}

/**
 * Split a Job Description into concise semantic chunks for Pinecone indexing.
 */
export function buildJdChunks(jdText) {
  const lines = String(jdText || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 15);

  return lines.slice(0, 40).map((line, idx) => ({
    id: `jd:line:${idx}`,
    doc: new Document({
      pageContent: line,
      metadata: {
        docType: 'jd',
        section: 'jd',
        itemId: `jd-${idx}`,
      },
    }),
  }));
}

async function clearVectorsByPrefix(namespaceIndex, prefix) {
  try {
    const listed = await namespaceIndex.listPaginated({ prefix });
    const ids = (listed?.vectors || []).map((v) => v.id).filter(Boolean);
    if (ids.length > 0) {
      await namespaceIndex.deleteMany(ids);
    }
  } catch (err) {
    logger.debug({ prefix, err: err.message }, 'Prefix list cleanup skipped/unavailable; falling back to upsert');
  }
}

/**
 * Index canonical resume chunks into Pinecone under namespace = conversationId.
 */
export async function indexResumeChunks({ conversationId, versionId, resume }) {
  const chunks = buildResumeChunks(resume, versionId);
  if (chunks.length === 0) return 0;

  const pineconeIndex = getPineconeIndex();
  const nsIndex = pineconeIndex.namespace(conversationId);
  await clearVectorsByPrefix(nsIndex, 'resume:');

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace: conversationId,
  });

  await vectorStore.addDocuments(
    chunks.map((c) => c.doc),
    { ids: chunks.map((c) => c.id) }
  );

  return chunks.length;
}

/**
 * Index JD chunks into Pinecone under namespace = conversationId.
 */
export async function indexJdChunks({ conversationId, jdText }) {
  const chunks = buildJdChunks(jdText);
  if (chunks.length === 0) return 0;

  const pineconeIndex = getPineconeIndex();
  const nsIndex = pineconeIndex.namespace(conversationId);
  await clearVectorsByPrefix(nsIndex, 'jd:');

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace: conversationId,
  });

  await vectorStore.addDocuments(
    chunks.map((c) => c.doc),
    { ids: chunks.map((c) => c.id) }
  );

  return chunks.length;
}

/**
 * Retrieve the best-matching resume chunks for each JD requirement query.
 */
export async function queryMatchingResumeChunks({ conversationId, queries, topK = 3 }) {
  if (!conversationId || !queries?.length) return [];

  const pineconeIndex = getPineconeIndex();
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex,
    namespace: conversationId,
  });

  const mappings = [];
  for (const query of queries.slice(0, 12)) {
    const results = await vectorStore.similaritySearchWithScore(query, topK, {
      docType: 'resume',
    });
    mappings.push({
      requirement: query,
      matches: results.map(([doc, score]) => ({
        section: doc.metadata?.section || 'unknown',
        itemId: doc.metadata?.itemId || '',
        score: Number(score.toFixed(4)),
        content: doc.pageContent,
      })),
    });
  }

  return mappings;
}

/**
 * Delete the entire conversation namespace from Pinecone (best-effort on conversation deletion).
 */
export async function deleteConversationNamespace(conversationId) {
  const pineconeIndex = getPineconeIndex();
  await pineconeIndex.namespace(conversationId).deleteAll();
}
