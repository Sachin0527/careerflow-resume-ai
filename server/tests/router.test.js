import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/firebase.js', () => ({ db: {} }));
vi.mock('../src/config/pinecone.js', () => ({
  getPineconeIndex: () => ({}),
  verifyPineconeIndexDimension: async () => ({}),
}));

const { parseRouterOutput, routeMessage } = await import('../src/graph/router.js');

const sampleResume = {
  basics: { name: 'Alex Rivera', summary: 'Software Engineer' },
  experience: [{ id: 'exp-1', company: 'Acme', title: 'Engineer', bullets: ['Built APIs'] }],
  education: [],
  skills: [{ category: 'Languages', items: ['JavaScript', 'Python'] }],
  projects: [],
  certifications: [],
  extraSections: [],
  meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
};

describe('graph/router parsing and routing', () => {
  it('parses multi-intent plan in exact order: company_optimize -> translate', async () => {
    const mockFastModel = {
      withStructuredOutput: () => ({
        invoke: vi.fn(async () => ({
          intents: ['company_optimize', 'translate'],
          plan: [
            {
              agent: 'companyAgent',
              instructions: 'Optimize resume for Google.',
              targetSections: ['basics.summary', 'experience'],
            },
            {
              agent: 'translationAgent',
              instructions: 'Translate resume to Spanish.',
              targetSections: [],
            },
          ],
          needsClarification: false,
          clarificationQuestion: null,
          entities: {
            company: 'Google',
            targetRole: null,
            language: 'es',
            locale: 'es-ES',
            sections: [],
            jdText: null,
          },
        })),
      }),
    };

    const result = await routeMessage({
      userMessage: 'Optimize for Google then translate to Spanish',
      resume: sampleResume,
      deps: { fastModel: mockFastModel },
    });

    expect(result.intents).toEqual(['company_optimize', 'translate']);
    expect(result.plan.map((s) => s.agent)).toEqual(['companyAgent', 'translationAgent']);
    expect(result.entities.company).toBe('Google');
    expect(result.entities.language).toBe('es');
    expect(result.needsClarification).toBe(false);
  });

  it('normalizes agent aliases and falls back to ordered plan when plan is omitted', () => {
    const parsed = parseRouterOutput(
      {
        intents: ['enhance_section', 'translate'],
        plan: [
          { agent: 'enhance_section', instructions: 'Tailor skills', targetSections: ['skills'] },
          { agent: 'translate', instructions: 'Translate to es-MX', targetSections: [] },
        ],
        entities: {
          targetRole: 'Data Scientist',
          language: 'es',
          locale: 'es-MX',
          sections: ['skills'],
        },
      },
      { resume: sampleResume, hasResume: true, userMessage: 'Enhance skills and translate' }
    );

    expect(parsed.plan).toHaveLength(2);
    expect(parsed.plan[0].agent).toBe('sectionAgent');
    expect(parsed.plan[1].agent).toBe('translationAgent');
    expect(parsed.entities.locale).toBe('es-MX');
  });

  it('forces clarification when jd_match has no JD in message and no activeJd', () => {
    const parsed = parseRouterOutput(
      {
        intents: ['jd_match'],
        plan: [{ agent: 'jdMatchAgent', instructions: 'Match JD', targetSections: ['experience'] }],
        needsClarification: false,
        entities: { sections: ['experience'], jdText: null },
      },
      {
        resume: sampleResume,
        hasResume: true,
        activeJd: null,
        userMessage: 'Update my experience section to match this job description',
      }
    );

    expect(parsed.needsClarification).toBe(true);
    expect(parsed.clarificationQuestion).toMatch(/paste the job description/i);
    expect(parsed.plan).toEqual([]);
  });

  it('reuses stored activeJd without asking for clarification', () => {
    const parsed = parseRouterOutput(
      {
        intents: ['jd_match'],
        plan: [{ agent: 'jdMatchAgent', instructions: 'Match stored JD', targetSections: ['skills'] }],
        needsClarification: true,
        clarificationQuestion: 'Please paste the job description.',
        entities: { sections: ['skills'], jdText: null },
      },
      {
        resume: sampleResume,
        hasResume: true,
        activeJd: 'Senior Data Scientist requiring Python, SQL, and PyTorch.',
        userMessage: 'Update my skills to match the JD',
      }
    );

    expect(parsed.needsClarification).toBe(false);
    expect(parsed.clarificationQuestion).toBeNull();
    expect(parsed.plan).toHaveLength(1);
    expect(parsed.plan[0].agent).toBe('jdMatchAgent');
  });

  it('extracts pasted JD on clarification follow-up even if model left jdText null', () => {
    const pastedJd =
      'Senior Backend Engineer\nResponsibilities:\n- Design distributed APIs\nRequirements:\n- 5+ years Node.js and PostgreSQL';
    const parsed = parseRouterOutput(
      {
        intents: ['jd_match'],
        plan: [],
        needsClarification: false,
        entities: { sections: ['experience'], jdText: null },
      },
      {
        resume: sampleResume,
        hasResume: true,
        activeJd: null,
        recentMessages: [
          { role: 'user', content: 'Update my experience section to match this job description' },
          { role: 'assistant', content: 'Please paste the job description you want to match against.' },
        ],
        userMessage: pastedJd,
      }
    );

    expect(parsed.needsClarification).toBe(false);
    expect(parsed.entities.jdText).toBe(pastedJd);
    expect(parsed.plan).toHaveLength(1);
    expect(parsed.plan[0].agent).toBe('jdMatchAgent');
  });

  it('keeps undo/redo/compare plans empty and retries on zod schema failure', async () => {
    let calls = 0;
    const mockFastModel = {
      withStructuredOutput: () => ({
        invoke: vi.fn(async () => {
          calls += 1;
          if (calls === 1) {
            return { intents: ['not_a_real_intent'] }; // Triggers retry
          }
          return {
            intents: ['undo'],
            plan: [],
            needsClarification: false,
            clarificationQuestion: null,
            entities: {},
          };
        }),
      }),
    };

    const result = await routeMessage({
      userMessage: 'undo',
      resume: sampleResume,
      deps: { fastModel: mockFastModel },
    });

    expect(calls).toBe(2);
    expect(result.intents).toEqual(['undo']);
    expect(result.plan).toEqual([]);
  });
});
