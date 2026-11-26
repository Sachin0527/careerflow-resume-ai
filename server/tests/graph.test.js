import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

/**
 * In-memory Firestore mock supporting conversations, messages, versions, and transactions.
 */
function createInMemoryFirestore() {
  const store = new Map();
  let autoId = 0;
  let seq = 0;

  function resolveValue(v) {
    if (v && typeof v === 'object' && v.constructor?.name === 'FieldValue') {
      return new Date(Date.UTC(2026, 0, 1, 0, 0, ++seq)).toISOString();
    }
    if (v && typeof v === 'object' && typeof v.isEqual === 'function') {
      return new Date(Date.UTC(2026, 0, 1, 0, 0, ++seq)).toISOString();
    }
    return v;
  }

  function normalizeRecord(obj) {
    const out = {};
    for (const [k, val] of Object.entries(obj || {})) {
      out[k] = resolveValue(val);
    }
    return out;
  }

  function makeDocRef(docPath) {
    return {
      id: docPath.split('/').pop(),
      path: docPath,
      collection(sub) {
        return makeCollectionRef(`${docPath}/${sub}`);
      },
      async get() {
        const val = store.get(docPath);
        return {
          id: docPath.split('/').pop(),
          exists: val !== undefined,
          data: () => (val ? structuredClone(val) : undefined),
        };
      },
      async set(data) {
        store.set(docPath, structuredClone(normalizeRecord(data)));
      },
      async update(updates) {
        const existing = store.get(docPath) || {};
        store.set(docPath, structuredClone({ ...existing, ...normalizeRecord(updates) }));
      },
    };
  }

  function makeCollectionRef(colPath) {
    return {
      doc(id) {
        const docId = id || `doc-${++autoId}`;
        return makeDocRef(`${colPath}/${docId}`);
      },
      where(field, _op, value) {
        return {
          async get() {
            const prefix = `${colPath}/`;
            const docs = [];
            for (const [key, val] of store.entries()) {
              if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/') && val[field] === value) {
                docs.push({ id: key.slice(prefix.length), data: () => structuredClone(val) });
              }
            }
            return { docs };
          },
        };
      },
      orderBy(field, dir = 'asc') {
        return {
          async get() {
            const prefix = `${colPath}/`;
            const docs = [];
            for (const [key, val] of store.entries()) {
              if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
                docs.push({ id: key.slice(prefix.length), data: () => structuredClone(val) });
              }
            }
            docs.sort((a, b) => {
              const av = a.data()[field];
              const bv = b.data()[field];
              if (typeof av === 'number' && typeof bv === 'number') {
                return dir === 'desc' ? bv - av : av - bv;
              }
              return dir === 'desc'
                ? String(bv || '').localeCompare(String(av || ''))
                : String(av || '').localeCompare(String(bv || ''));
            });
            return { docs };
          },
        };
      },
    };
  }

  return {
    store,
    collection: (name) => makeCollectionRef(name),
    async runTransaction(fn) {
      const tx = {
        get: (ref) => ref.get(),
        set: (ref, data) => ref.set(data),
        update: (ref, data) => ref.update(data),
      };
      return fn(tx);
    },
  };
}

const mockDb = createInMemoryFirestore();

vi.mock('../src/config/firebase.js', () => ({ db: mockDb }));
vi.mock('../src/config/pinecone.js', () => ({
  getPineconeIndex: () => ({}),
  verifyPineconeIndexDimension: async () => ({}),
}));
vi.mock('../src/services/vectorStore.js', () => ({
  indexResumeChunks: vi.fn(async () => 3),
  indexJdChunks: vi.fn(async () => 2),
  queryMatchingResumeChunks: vi.fn(async () => []),
  deleteConversationNamespace: vi.fn(async () => {}),
}));

const { createResumeGraph } = await import('../src/graph/graph.js');
const conversationService = await import('../src/services/conversation.js');
const versioningService = await import('../src/services/versioning.js');
const { createApp } = await import('../src/app.js');

const baseResume = {
  basics: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '555-0100',
    location: 'San Francisco, CA',
    links: [],
    summary: 'Software engineer building web services.',
  },
  experience: [
    {
      id: 'exp-1',
      company: 'Acme Corp',
      title: 'Software Engineer',
      location: 'SF',
      startDate: '2022',
      endDate: 'Present',
      bullets: ['Built REST APIs in Node.js.'],
    },
  ],
  education: [],
  skills: [{ category: 'Backend', items: ['Node.js', 'SQL'] }],
  projects: [],
  certifications: [],
  extraSections: [],
  meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
};

function parseSsePayloads(rawText) {
  return rawText
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const event = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
      const dataLine = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
      return { event, data: dataLine ? JSON.parse(dataLine) : null };
    });
}

describe('graph orchestration, context engineering, and SSE streaming', () => {
  it('runs multi-step plan sequentially, passes updatedResume, commits version, and supports undo without LLM', async () => {
    const conv = await conversationService.createConversation(
      { clientId: 'test-client', title: 'Graph Test' },
      mockDb
    );
    await versioningService.createVersion(
      { conversationId: conv.id, resume: baseResume, createdBy: 'upload', changeSummary: 'Initial upload' },
      mockDb
    );

    const events = [];
    const graph = createResumeGraph();

    const makeModel = (routeJson, summaryText) => ({
      withStructuredOutput: () => ({
        invoke: vi.fn(async () => routeJson),
      }),
      invoke: vi.fn(async () => ({ content: summaryText })),
    });

    const sectionAgentMock = vi.fn(async ({ resume, onStep }) => {
      onStep('Enhancing skills for Data Scientist role...');
      return {
        updatedResume: {
          ...resume,
          skills: [{ category: 'Data Science', items: ['Python', 'SQL', 'PyTorch'] }],
        },
        changes: [
          {
            section: 'skills',
            before: 'Node.js, SQL',
            after: 'Python, SQL, PyTorch',
            reason: 'Tailored skills for Data Scientist.',
          },
        ],
        reasoning: ['Prioritized data science skills.'],
        extras: { enhancedSections: ['skills'] },
      };
    });

    const translationAgentMock = vi.fn(async ({ resume, onStep }) => {
      // Must receive the updatedResume produced by sectionAgent!
      expect(resume.skills[0].items).toContain('PyTorch');
      onStep('Translating resume to es-MX...');
      return {
        updatedResume: {
          ...resume,
          basics: { ...resume.basics, summary: 'Ingeniero de software construyendo servicios web.' },
          meta: { ...resume.meta, language: 'es', locale: 'es-MX' },
        },
        changes: [
          {
            section: 'basics.summary',
            before: resume.basics.summary,
            after: 'Ingeniero de software construyendo servicios web.',
            reason: 'Translated to Spanish (Mexico).',
          },
        ],
        reasoning: ['Localized full resume to es-MX.'],
        extras: { language: 'es', locale: 'es-MX', localizationNotes: ['Use DD/MM/YYYY dates'] },
      };
    });

    const result = await graph.invoke({
      conversationId: conv.id,
      userMessage: 'Make skills relevant for data scientist and translate to Spanish for Mexico',
      emit: (event, data) => events.push({ event, data }),
      deps: {
        firestore: mockDb,
        fastModel: makeModel(
          {
            intents: ['enhance_section', 'translate'],
            plan: [
              { agent: 'sectionAgent', instructions: 'Tailor skills', targetSections: ['skills'] },
              { agent: 'translationAgent', instructions: 'Translate to es-MX', targetSections: [] },
            ],
            needsClarification: false,
            entities: { targetRole: 'Data Scientist', language: 'es', locale: 'es-MX', sections: ['skills'] },
          },
          'Updated skills for Data Scientist and translated to es-MX in v2.'
        ),
        agents: {
          sectionAgent: sectionAgentMock,
          translationAgent: translationAgentMock,
        },
      },
    });

    expect(sectionAgentMock).toHaveBeenCalledTimes(1);
    expect(translationAgentMock).toHaveBeenCalledTimes(1);
    expect(result.committedVersion.versionNumber).toBe(2);
    expect(result.resume.meta.locale).toBe('es-MX');
    expect(result.agentTrace).toHaveLength(2);
    expect(events.map((e) => e.event)).toEqual(
      expect.arrayContaining(['status', 'route', 'agent_start', 'agent_step', 'agent_end', 'version', 'token'])
    );

    // Now test "undo" without invoking agents
    const undoEvents = [];
    const undoResult = await graph.invoke({
      conversationId: conv.id,
      userMessage: 'undo',
      emit: (event, data) => undoEvents.push({ event, data }),
      deps: {
        firestore: mockDb,
        fastModel: makeModel(
          {
            intents: ['undo'],
            plan: [],
            needsClarification: false,
            entities: {},
          },
          ''
        ),
      },
    });

    expect(undoResult.resume.meta.locale).toBe('en-US');
    expect(undoResult.versionActionResult.action).toBe('undo');
    expect(undoEvents.some((e) => e.event === 'version' && e.data.action === 'undo')).toBe(true);
  });

  it('asks clarification when JD is missing, then stores and reuses activeJd once provided', async () => {
    const conv = await conversationService.createConversation(
      { clientId: 'test-client', title: 'JD Reuse Test' },
      mockDb
    );
    await versioningService.createVersion(
      { conversationId: conv.id, resume: baseResume, createdBy: 'upload' },
      mockDb
    );

    const graph = createResumeGraph();

    // Turn 1: No JD in message or activeJd -> must clarify
    const clarifyResult = await graph.invoke({
      conversationId: conv.id,
      userMessage: 'Update my experience section to match this job description',
      deps: {
        firestore: mockDb,
        fastModel: {
          withStructuredOutput: () => ({
            invoke: vi.fn(async () => ({
              intents: ['jd_match'],
              plan: [],
              needsClarification: false,
              entities: { sections: ['experience'], jdText: null },
            })),
          }),
        },
      },
    });

    expect(clarifyResult.needsClarification).toBe(true);
    expect(clarifyResult.finalResponse).toMatch(/paste the job description/i);

    // Turn 2: Paste JD -> runs jdMatchAgent and stores activeJd on conversation
    const jdText = 'Senior Node.js Engineer\nResponsibilities: Build scalable APIs\nRequirements: Node.js, Redis';
    const jdAgentMock = vi.fn(async ({ resume, entities }) => {
      expect(entities.jdText).toBe(jdText);
      return {
        updatedResume: { ...resume, meta: { ...resume.meta, targetRole: 'Senior Node.js Engineer' } },
        changes: [],
        reasoning: ['Aligned experience with pasted JD.'],
        extras: { matchScore: 84, matchedSkills: ['Node.js'], missingSkills: ['Redis'] },
      };
    });

    await graph.invoke({
      conversationId: conv.id,
      userMessage: jdText,
      deps: {
        firestore: mockDb,
        fastModel: {
          withStructuredOutput: () => ({
            invoke: vi.fn(async () => ({
              intents: ['jd_match'],
              plan: [{ agent: 'jdMatchAgent', instructions: 'Match experience', targetSections: ['experience'] }],
              needsClarification: false,
              entities: { sections: ['experience'], jdText },
            })),
          }),
          invoke: vi.fn(async () => ({ content: 'Matched JD with score 84/100.' })),
        },
        agents: { jdMatchAgent: jdAgentMock },
      },
    });

    const updatedDetail = await conversationService.getConversationDetail(conv.id, mockDb);
    expect(updatedDetail.conversation.activeJd).toBe(jdText);

    // Turn 3: Refer to JD again without pasting -> reuses activeJd
    const reuseResult = await graph.invoke({
      conversationId: conv.id,
      userMessage: 'Now update my summary to match that JD too',
      deps: {
        firestore: mockDb,
        fastModel: {
          withStructuredOutput: () => ({
            invoke: vi.fn(async () => ({
              intents: ['jd_match'],
              plan: [{ agent: 'jdMatchAgent', instructions: 'Match summary', targetSections: ['basics.summary'] }],
              needsClarification: false,
              entities: { sections: ['basics.summary'], jdText: null },
            })),
          }),
          invoke: vi.fn(async () => ({ content: 'Updated summary using stored JD.' })),
        },
        agents: {
          jdMatchAgent: vi.fn(async ({ resume, context }) => {
            expect(context.activeJd).toBe(jdText);
            return {
              updatedResume: resume,
              changes: [],
              reasoning: ['Reused activeJd from conversation.'],
              extras: { matchScore: 88 },
            };
          }),
        },
      },
    });

    expect(reuseResult.needsClarification).toBe(false);
    expect(reuseResult.committedVersion.versionNumber).toBe(3);
  });

  it('updates rolling summary every 6 messages and loads only last 8 messages', async () => {
    const conv = await conversationService.createConversation(
      { clientId: 'test-client', title: 'Summary Test' },
      mockDb
    );

    const summaryModel = {
      invoke: vi.fn(async () => ({ content: '- Tailoring resume for Google backend role.' })),
    };

    for (let i = 1; i <= 5; i++) {
      await conversationService.addMessage(conv.id, { role: 'user', content: `msg ${i}` }, mockDb);
      const res = await conversationService.maybeUpdateRollingSummary(conv.id, {
        fastModel: summaryModel,
        firestore: mockDb,
      });
      expect(res.updated).toBe(false);
    }

    // 6th message triggers rolling summary
    await conversationService.addMessage(conv.id, { role: 'assistant', content: 'msg 6' }, mockDb);
    const res6 = await conversationService.maybeUpdateRollingSummary(conv.id, {
      fastModel: summaryModel,
      firestore: mockDb,
    });
    expect(res6.updated).toBe(true);
    expect(summaryModel.invoke).toHaveBeenCalledTimes(1);

    // Add 4 more messages (total 10) -> loadContext keeps only last 8
    for (let i = 7; i <= 10; i++) {
      await conversationService.addMessage(conv.id, { role: 'user', content: `msg ${i}` }, mockDb);
    }

    const graph = createResumeGraph();
    const out = await graph.invoke({
      conversationId: conv.id,
      userMessage: 'hi',
      deps: {
        firestore: mockDb,
        fastModel: {
          withStructuredOutput: () => ({
            invoke: vi.fn(async () => ({
              intents: ['smalltalk'],
              plan: [],
              needsClarification: false,
              entities: {},
            })),
          }),
          invoke: vi.fn(async () => ({ content: 'Hello! Upload your resume to get started.' })),
        },
      },
    });

    expect(out.summary).toBe('- Tailoring resume for Google backend role.');
    expect(out.history).toHaveLength(8);
    expect(out.history[0].content).toBe('msg 3');
  });

  it('POST /api/conversations/:id/messages streams SSE events and persists user + assistant messages with agentTrace', async () => {
    const conv = await conversationService.createConversation(
      { clientId: 'sse-client', title: 'SSE Test' },
      mockDb
    );
    await versioningService.createVersion(
      { conversationId: conv.id, resume: baseResume, createdBy: 'upload' },
      mockDb
    );

    const app = createApp();
    app.locals.graphRunner = async ({ conversationId, emit }) => {
      emit('status', { phase: 'routing', message: 'Routing...' });
      emit('route', { intents: ['company_optimize'], plan: [{ agent: 'companyAgent' }] });
      emit('agent_start', { agent: 'companyAgent', stepIndex: 0, totalSteps: 1 });
      emit('agent_step', { agent: 'companyAgent', stepIndex: 0, message: 'Searching Tavily...' });
      emit('agent_end', { agent: 'companyAgent', stepIndex: 0, status: 'completed', durationMs: 42 });
      emit('token', { text: 'Optimized for Google.' });
      emit('version', { action: 'commit', version: { id: 'ver-2', versionNumber: 2 }, canUndo: true, canRedo: false });

      return {
        conversationId,
        finalResponse: 'Optimized for Google.',
        currentVersionId: 'ver-2',
        committedVersion: { id: 'ver-2', versionNumber: 2, canUndo: true, canRedo: false },
        agentTrace: [{ agent: 'companyAgent', status: 'completed', reasoning: ['Aligned with Google'], durationMs: 42 }],
      };
    };

    const res = await request(app)
      .post(`/api/conversations/${conv.id}/messages`)
      .send({ content: 'Optimize my resume for Google' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const events = parseSsePayloads(res.text);
    expect(events.map((e) => e.event)).toEqual([
      'status',
      'route',
      'agent_start',
      'agent_step',
      'agent_end',
      'token',
      'version',
      'done',
    ]);

    const donePayload = events.find((e) => e.event === 'done').data;
    expect(donePayload.content).toBe('Optimized for Google.');
    expect(donePayload.agentTrace).toHaveLength(1);

    const messages = await conversationService.getMessages(conv.id, mockDb);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Optimize my resume for Google');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].agentTrace).toHaveLength(1);
    expect(messages[1].versionId).toBe('ver-2');
  });
});
