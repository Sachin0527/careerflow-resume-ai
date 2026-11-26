import { describe, expect, it } from 'vitest';
import { compareResumes } from '../src/services/diff.js';

const baseResume = {
  basics: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '555-0100',
    location: 'Austin, TX',
    links: [],
    summary: 'Backend engineer.',
  },
  experience: [
    {
      id: 'exp-1',
      company: 'Acme',
      title: 'Engineer',
      location: 'Remote',
      startDate: '2022',
      endDate: '2024',
      bullets: ['Built APIs'],
    },
  ],
  education: [],
  skills: [{ category: 'Languages', items: ['JavaScript', 'Go'] }],
  projects: [],
  certifications: [],
  extraSections: [],
  meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
};

describe('services/diff', () => {
  it('reports no differences for identical resumes', () => {
    const result = compareResumes(baseResume, structuredClone(baseResume));
    expect(result.changedSections).toEqual([]);
    expect(result.summary).toBe('No differences detected');
  });

  it('detects per-section changes accurately', () => {
    const updated = structuredClone(baseResume);
    updated.basics.summary = 'Senior backend engineer specializing in distributed systems.';
    updated.skills[0].items.push('Python');

    const result = compareResumes(baseResume, updated);
    expect(result.changedSections).toEqual(['basics', 'skills']);

    const expSection = result.sections.find((s) => s.section === 'experience');
    expect(expSection.changed).toBe(false);

    const basicsSection = result.sections.find((s) => s.section === 'basics');
    expect(basicsSection.changed).toBe(true);
    expect(basicsSection.addedLines).toBeGreaterThan(0);
  });
});
