import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/firebase.js', () => ({ db: {} }));
vi.mock('../src/config/pinecone.js', () => ({
  getPineconeIndex: () => ({}),
  verifyPineconeIndexDimension: async () => ({}),
}));
vi.mock('../src/services/conversation.js', () => ({
  createConversation: vi.fn(),
  listConversations: vi.fn(),
  getConversationDetail: vi.fn(async () => ({
    conversation: { id: 'conv-1', currentVersionId: 'ver-1' },
    messages: [],
    currentResume: null,
    currentVersion: { id: 'ver-1', versionNumber: 1 },
    canUndo: false,
    canRedo: false,
  })),
  updateConversation: vi.fn(),
  deleteConversation: vi.fn(),
  addMessage: vi.fn(async (_cid, msg) => ({ id: 'msg-1', ...msg })),
  maybeUpdateRollingSummary: vi.fn(async () => ({ updated: false })),
}));

const { withTimeout, MAX_JD_TEXT_CHARS } = await import('../src/utils/timeout.js');
const { invokeWithSchemaRetry } = await import('../src/utils/retryWithSchema.js');
const { searchTavilyQueries } = await import('../src/utils/tavily.js');
const { parseRouterOutput } = await import('../src/graph/router.js');
const companyAgent = await import('../src/agents/companyAgent.js');
const translationAgent = await import('../src/agents/translationAgent.js');
const { createApp } = await import('../src/app.js');
const { z } = await import('zod');

const baseResume = {
  basics: { name: 'Alex', email: '', phone: '', location: '', links: [], summary: 'Engineer' },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  extraSections: [],
  meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
};

describe('hardening: timeouts, Tavily fallback, JD limits, and friendly SSE errors', () => {
  it('withTimeout rejects slow promises with TimeoutError (504)', async () => {
    await expect(
      withTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 25, 'Test call')
    ).rejects.toMatchObject({
      name: 'TimeoutError',
      statusCode: 504,
    });
  });

  it('invokeWithSchemaRetry does not retry on TimeoutError', async () => {
    const invoke = vi.fn(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 200)));
    const model = { withStructuredOutput: () => ({ invoke }) };

    await expect(
      invokeWithSchemaRetry({
        model,
        schema: z.object({ ok: z.boolean() }),
        systemPrompt: 'sys',
        userPrompt: 'usr',
        maxRetries: 2,
        timeoutMs: 25,
      })
    ).rejects.toMatchObject({ name: 'TimeoutError' });

    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('searchTavilyQueries returns failed=true gracefully when Tavily throws', async () => {
    const result = await searchTavilyQueries(['test query'], {
      tool: {
        invoke: async () => {
          throw new Error('Network error');
        },
      },
    });
    expect(result.failed).toBe(true);
    expect(result.queryResults).toEqual([]);
    expect(result.failureReason).toMatch(/Network error/);
  });

  it('companyAgent & translationAgent continue gracefully with notes when Tavily fails', async () => {
    const saveCache = vi.fn();
    const failedSearch = async () => ({
      queryResults: [],
      sources: [],
      failed: true,
      failureReason: 'Tavily timeout',
    });

    const compResult = await companyAgent.run({
      resume: baseResume,
      entities: { company: 'Stripe' },
      context: {
        deps: {
          getCachedCompanyProfile: async () => null,
          saveCompanyProfile: saveCache,
          searchTavilyQueries: failedSearch,
          fastModel: {
            withStructuredOutput: () => ({
              invoke: async () => ({
                company: 'Stripe',
                values: ['Reliability'],
                keywords: ['payments'],
                tone: 'Clear',
                hiringSignals: ['Ownership'],
                summary: 'Stripe builds economic infrastructure.',
              }),
            }),
          },
          proModel: {
            withStructuredOutput: () => ({
              invoke: async () => ({
                updatedResume: baseResume,
                changes: [],
                reasoning: ['Tailored summary.', 'Preserved all facts.'],
              }),
            }),
          },
        },
      },
    });

    expect(saveCache).not.toHaveBeenCalled();
    expect(compResult.extras.tavilyFallback).toBe(true);
    expect(compResult.reasoning.some((r) => /web search was unavailable/i.test(r))).toBe(true);

    const transResult = await translationAgent.run({
      resume: baseResume,
      entities: { language: 'es', locale: 'es-MX' },
      context: {
        deps: {
          searchTavilyQueries: failedSearch,
          proModel: {
            withStructuredOutput: () => ({
              invoke: async () => ({
                updatedResume: baseResume,
                changes: [],
                reasoning: ['Translated resume.', 'Updated locale.'],
                localizationNotes: ['Keep tech terms in English'],
              }),
            }),
          },
        },
      },
    });

    expect(transResult.extras.tavilyFallback).toBe(true);
    expect(
      transResult.extras.localizationNotes.some((n) => /search was unavailable/i.test(n))
    ).toBe(true);
  });

  it('rejects JD text exceeding MAX_JD_TEXT_CHARS', () => {
    const hugeJd = 'Requirements: Node.js '.repeat(900);
    expect(hugeJd.length).toBeGreaterThan(MAX_JD_TEXT_CHARS);

    expect(() =>
      parseRouterOutput(
        {
          intents: ['jd_match'],
          plan: [],
          needsClarification: false,
          entities: { jdText: hugeJd },
        },
        { resume: baseResume, hasResume: true, userMessage: hugeJd }
      )
    ).toThrow(/character limit/);
  });

  it('emits friendly SSE error event when graphRunner times out or fails unexpectedly', async () => {
    const app = createApp();
    app.locals.graphRunner = async () => {
      throw new Error('Internal secret key stack trace detail');
    };

    const res = await request(app)
      .post('/api/conversations/conv-1/messages')
      .send({ content: 'Optimize my resume for Google' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('event: error');
    expect(res.text).toContain('Something went wrong while optimizing your resume');
    expect(res.text).not.toContain('Internal secret key stack trace detail');
  });
});
