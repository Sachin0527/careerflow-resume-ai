import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/firebase.js', () => ({ db: {} }));

const mockConversationDetail = {
  conversation: { id: 'conv-1', title: 'New Resume Session', clientId: 'anon-1' },
  messages: [],
  currentResume: null,
  currentVersion: null,
  canUndo: false,
  canRedo: false,
};

vi.mock('../src/services/conversation.js', () => ({
  createConversation: vi.fn(async ({ clientId, title }) => ({
    id: 'conv-1',
    clientId,
    title: title || 'New Resume Session',
  })),
  listConversations: vi.fn(async () => [mockConversationDetail.conversation]),
  getConversationDetail: vi.fn(async () => mockConversationDetail),
  updateConversation: vi.fn(async (_id, updates) => ({
    ...mockConversationDetail.conversation,
    ...updates,
  })),
  deleteConversation: vi.fn(async (id) => ({ deleted: true, id })),
}));

vi.mock('../src/services/parser.js', () => ({
  parseResumeBuffer: vi.fn(async () => ({
    basics: {
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      phone: '',
      location: 'San Francisco, CA',
      links: [],
      summary: 'Full-stack engineer',
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    extraSections: [],
    meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
  })),
}));

vi.mock('../src/services/versioning.js', () => ({
  createVersion: vi.fn(async ({ resume, createdBy }) => ({
    id: 'ver-1',
    versionNumber: 1,
    resume,
    createdBy,
    canUndo: false,
    canRedo: false,
  })),
  list: vi.fn(async () => []),
  getVersion: vi.fn(async () => ({ id: 'ver-1', versionNumber: 1 })),
  undo: vi.fn(async () => ({})),
  redo: vi.fn(async () => ({})),
  compare: vi.fn(async () => ({ changedSections: [] })),
}));

vi.mock('../src/services/vectorStore.js', () => ({
  indexResumeChunks: vi.fn(async () => 4),
  deleteConversationNamespace: vi.fn(async () => {}),
}));

const { createApp } = await import('../src/app.js');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePdfPath = path.resolve(__dirname, '../../sample/sample-resume.pdf');

describe('Express API routes', () => {
  const app = createApp();

  it('GET /api/health returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('POST /api/conversations validates request body with zod', async () => {
    const res = await request(app).post('/api/conversations').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('POST /api/conversations creates a conversation', async () => {
    const res = await request(app)
      .post('/api/conversations')
      .send({ clientId: 'anon-123' });
    expect(res.status).toBe(201);
    expect(res.body.conversation.id).toBe('conv-1');
  });

  it('POST /api/conversations/:id/resume rejects unsupported file types', async () => {
    const res = await request(app)
      .post('/api/conversations/conv-1/resume')
      .attach('file', Buffer.from('hello'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Only PDF and DOCX/);
  });

  it('POST /api/conversations/:id/resume uploads PDF, parses, stores version 1, and indexes chunks', async () => {
    const pdfBuffer = await fs.readFile(samplePdfPath);
    const res = await request(app)
      .post('/api/conversations/conv-1/resume')
      .attach('file', pdfBuffer, {
        filename: 'sample-resume.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.version.versionNumber).toBe(1);
    expect(res.body.version.createdBy).toBe('upload');
    expect(res.body.resume.basics.name).toBe('Alex Rivera');
    expect(res.body.indexedChunks).toBe(4);
  });
});
