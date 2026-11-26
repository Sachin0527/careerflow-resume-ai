import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

const sampleResume = {
  basics: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '(415) 555-0192',
    location: 'San Francisco, CA',
    links: [{ label: 'GitHub', url: 'https://github.com/alexrivera' }],
    summary: 'Ingeniero de software con 5 años de experiencia.',
  },
  experience: [
    {
      id: 'exp-1',
      company: 'CloudScale Inc.',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: 'Mar 2023',
      endDate: 'Actualidad',
      bullets: ['Diseñó microservicios en Node.js y Go.'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'UT Austin',
      degree: 'B.S.',
      field: 'Computer Science',
      startDate: '2017',
      endDate: '2021',
      details: [],
    },
  ],
  skills: [{ category: 'Backend', items: ['Node.js', 'Go', 'Redis'] }],
  projects: [
    {
      id: 'proj-1',
      name: 'TraceLite',
      description: 'Request Profiler',
      tech: ['Node.js', 'OpenTelemetry'],
      bullets: ['Built local trace viewer.'],
    },
  ],
  certifications: [{ name: 'GCP Developer', issuer: 'Google Cloud', date: '2024' }],
  extraSections: [],
  meta: { language: 'es', locale: 'es-MX', targetRole: null, targetCompany: null },
};

vi.mock('../src/config/firebase.js', () => ({ db: {} }));
vi.mock('../src/config/pinecone.js', () => ({
  getPineconeIndex: () => ({}),
  verifyPineconeIndexDimension: async () => ({}),
}));
vi.mock('../src/services/versioning.js', () => ({
  createVersion: vi.fn(),
  getCurrent: vi.fn(async () => ({
    version: { id: 'ver-2', versionNumber: 2 },
    resume: sampleResume,
    canUndo: true,
    canRedo: false,
  })),
  getVersion: vi.fn(async (_cid, vid) => ({
    id: vid,
    versionNumber: 1,
    resume: sampleResume,
  })),
  list: vi.fn(async () => []),
  undo: vi.fn(),
  redo: vi.fn(),
  compare: vi.fn(),
  restoreVersion: vi.fn(),
}));

const { exportResumeToDocx, exportResumeToPdf, getLocalizedHeadings } = await import(
  '../src/services/export.js'
);
const { createApp } = await import('../src/app.js');

describe('services/export & GET /export', () => {
  it('localizes ATS headings according to meta.language', () => {
    expect(getLocalizedHeadings('es').experience).toBe('EXPERIENCIA LABORAL');
    expect(getLocalizedHeadings('fr').skills).toBe('COMPÉTENCES');
    expect(getLocalizedHeadings('en').summary).toBe('PROFESSIONAL SUMMARY');
  });

  it('generates valid DOCX and PDF buffers', async () => {
    const docxBuf = await exportResumeToDocx(sampleResume);
    expect(Buffer.isBuffer(docxBuf)).toBe(true);
    expect(docxBuf.subarray(0, 2).toString('utf8')).toBe('PK'); // DOCX is a ZIP archive

    const pdfBuf = await exportResumeToPdf(sampleResume);
    expect(Buffer.isBuffer(pdfBuf)).toBe(true);
    expect(pdfBuf.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });

  it('serves DOCX and PDF via GET /api/conversations/:id/export', async () => {
    const app = createApp();

    const docxRes = await request(app).get('/api/conversations/conv-1/export?format=docx');
    expect(docxRes.status).toBe(200);
    expect(docxRes.headers['content-type']).toMatch(/wordprocessingml/);
    expect(docxRes.headers['content-disposition']).toMatch(/alex-rivera-v2\.docx/);

    const pdfRes = await request(app).get('/api/conversations/conv-1/export?format=pdf&versionId=ver-1');
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);
    expect(pdfRes.headers['content-disposition']).toMatch(/alex-rivera-v1\.pdf/);
  });
});
