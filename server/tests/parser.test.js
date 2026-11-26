import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { extractRawText, parseResumeBuffer } from '../src/services/parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const samplePdfPath = path.resolve(__dirname, '../../sample/sample-resume.pdf');

describe('services/parser', () => {
  it('extracts readable text from sample/sample-resume.pdf', async () => {
    const buffer = await fs.readFile(samplePdfPath);
    const text = await extractRawText({
      buffer,
      mimeType: 'application/pdf',
      originalName: 'sample-resume.pdf',
    });

    expect(text).toContain('Alex Rivera');
    expect(text).toContain('CloudScale Inc.');
  });

  it('retries up to 2 times on schema validation failure and passes error back', async () => {
    const buffer = await fs.readFile(samplePdfPath);
    const invokeMock = vi
      .fn()
      .mockResolvedValueOnce({ basics: { name: 'Alex' }, experience: [{ company: 'Bad' }] }) // missing required id
      .mockResolvedValueOnce({ basics: { name: 'Alex' }, experience: [{ id: '' }] }) // empty id
      .mockResolvedValueOnce({
        basics: { name: 'Alex Rivera', email: '', phone: '', location: '', links: [], summary: '' },
        experience: [
          {
            id: 'exp-1',
            company: 'CloudScale Inc.',
            title: 'Senior Software Engineer',
            location: 'San Francisco, CA',
            startDate: 'Mar 2023',
            endDate: 'Present',
            bullets: [],
          },
        ],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        extraSections: [],
        meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
      });

    const mockModel = {
      withStructuredOutput: () => ({ invoke: invokeMock }),
    };

    const parsed = await parseResumeBuffer({
      buffer,
      mimeType: 'application/pdf',
      originalName: 'sample-resume.pdf',
      model: mockModel,
    });

    expect(invokeMock).toHaveBeenCalledTimes(3);
    const secondCallMessages = invokeMock.mock.calls[1][0];
    expect(secondCallMessages[secondCallMessages.length - 1].content).toContain('schema validation');
    expect(parsed.basics.name).toBe('Alex Rivera');
  });
});
