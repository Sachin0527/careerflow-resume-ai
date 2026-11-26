import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/firebase.js', () => ({ db: {} }));
vi.mock('../src/config/pinecone.js', () => ({
  getPineconeIndex: () => ({}),
  verifyPineconeIndexDimension: async () => ({}),
}));

const companyAgent = await import('../src/agents/companyAgent.js');
const jdMatchAgent = await import('../src/agents/jdMatchAgent.js');
const translationAgent = await import('../src/agents/translationAgent.js');
const sectionAgent = await import('../src/agents/sectionAgent.js');

const sampleResume = {
  basics: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '555-0100',
    location: 'San Francisco, CA',
    links: [],
    summary: 'Backend software engineer with 5 years of experience.',
  },
  experience: [
    {
      id: 'exp-1',
      company: 'CloudScale Inc.',
      title: 'Senior Software Engineer',
      location: 'San Francisco, CA',
      startDate: 'Mar 2023',
      endDate: 'Present',
      bullets: ['Built Node.js microservices with Redis caching.'],
    },
  ],
  education: [],
  skills: [{ category: 'Backend', items: ['Node.js', 'Redis', 'PostgreSQL'] }],
  projects: [
    {
      id: 'proj-1',
      name: 'TraceLite',
      description: 'Request profiler',
      tech: ['Node.js', 'OpenTelemetry'],
      bullets: ['Built local request profiler for Express'],
    },
  ],
  certifications: [],
  extraSections: [],
  meta: { language: 'en', locale: 'en-US', targetRole: null, targetCompany: null },
};

const makeMockModel = (handler) => ({
  withStructuredOutput: () => ({ invoke: handler }),
});

describe('agents', () => {
  it('companyAgent uses 7-day cache when hit and skips Tavily search', async () => {
    const steps = [];
    const searchMock = vi.fn();
    const cachedProfile = {
      company: 'Google',
      values: ['User focus'],
      keywords: ['scale'],
      tone: 'Crisp',
      hiringSignals: ['Impact'],
      summary: 'Values scale.',
    };

    const result = await companyAgent.run({
      resume: sampleResume,
      entities: { company: 'Google' },
      onStep: (s) => steps.push(s),
      context: {
        deps: {
          getCachedCompanyProfile: vi.fn(async () => ({
            profile: cachedProfile,
            sources: ['https://about.google'],
            fetchedAt: new Date().toISOString(),
          })),
          saveCompanyProfile: vi.fn(),
          searchTavilyQueries: searchMock,
          fastModel: makeMockModel(vi.fn()),
          proModel: makeMockModel(async () => ({
            updatedResume: sampleResume,
            changes: [
              {
                section: 'basics.summary',
                before: sampleResume.basics.summary,
                after: 'Scale-focused backend engineer.',
                reason: 'Aligned with Google.',
              },
            ],
            reasoning: ['Used cached company profile.', 'Tailored summary.'],
          })),
        },
      },
    });

    expect(searchMock).not.toHaveBeenCalled();
    expect(result.extras.fromCache).toBe(true);
    expect(result.updatedResume.meta.targetCompany).toBe('Google');
    expect(steps.some((s) => s.includes('cached'))).toBe(true);
  });

  it('companyAgent runs Tavily search on cache miss and saves to cache', async () => {
    const saveMock = vi.fn();
    const searchMock = vi.fn(async (queries) => ({
      queryResults: queries.map((query) => ({ query, results: [{ title: 'T', url: 'https://g.co', content: 'scale' }] })),
      sources: ['https://g.co'],
    }));

    const result = await companyAgent.run({
      resume: sampleResume,
      entities: { company: 'Google' },
      context: {
        deps: {
          getCachedCompanyProfile: vi.fn(async () => null),
          saveCompanyProfile: saveMock,
          searchTavilyQueries: searchMock,
          fastModel: makeMockModel(async () => ({
            company: 'Google',
            values: ['Excellence'],
            keywords: ['distributed'],
            tone: 'Direct',
            hiringSignals: ['Ownership'],
            summary: 'Engineering excellence.',
          })),
          proModel: makeMockModel(async () => ({
            updatedResume: sampleResume,
            changes: [],
            reasoning: ['Researched Google.', 'Rewrote summary.'],
          })),
        },
      },
    });

    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0][0].length).toBeGreaterThanOrEqual(3);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(result.extras.fromCache).toBe(false);
  });

  it('jdMatchAgent computes exact 50/30/20 weighted matchScore and maps Pinecone chunks', async () => {
    expect(
      jdMatchAgent.computeWeightedMatchScore({
        requiredSkillsScore: 80,
        responsibilitiesScore: 70,
        seniorityScore: 100,
      })
    ).toBe(81); // 40 + 21 + 20 = 81

    const queryChunksMock = vi.fn(async () => [
      { requirement: 'Node.js', matches: [{ section: 'experience', itemId: 'exp-1', score: 0.91, content: '...' }] },
    ]);

    const result = await jdMatchAgent.run({
      resume: sampleResume,
      entities: { jdText: 'Looking for Senior Node.js & Kubernetes engineer.' },
      context: {
        conversationId: 'conv-1',
        currentVersionId: 'v1',
        indexedVersionId: 'v0',
        deps: {
          indexResumeChunks: vi.fn(async () => 3),
          indexJdChunks: vi.fn(async () => 2),
          queryMatchingResumeChunks: queryChunksMock,
          fastModel: makeMockModel(async (msgs) => {
            const sys = String(msgs[0]?.content || '');
            if (sys.includes('Job Description Analyst')) {
              return {
                roleTitle: 'Senior Backend Engineer',
                seniority: 'Senior',
                requiredSkills: ['Node.js', 'Kubernetes'],
                preferredSkills: [],
                responsibilities: ['Scale APIs'],
                experienceExpectations: '5 years',
              };
            }
            return {
              requiredSkillsScore: 80,
              responsibilitiesScore: 70,
              seniorityScore: 100,
              matchedSkills: ['Node.js'],
              missingSkills: ['Kubernetes'],
              suggestions: ['Highlight distributed caching'],
            };
          }),
          proModel: makeMockModel(async () => ({
            updatedResume: sampleResume,
            changes: [],
            reasoning: ['Matched JD skills.', 'Preserved facts.'],
          })),
        },
      },
    });

    expect(queryChunksMock).toHaveBeenCalledTimes(1);
    expect(result.extras.matchScore).toBe(81);
    expect(result.extras.matchedSkills).toEqual(['Node.js']);
    expect(result.extras.missingSkills).toEqual(['Kubernetes']);
    expect(result.updatedResume.meta.targetRole).toBe('Senior Backend Engineer');
  });

  it('translationAgent updates meta.language/locale and returns localizationNotes', async () => {
    const result = await translationAgent.run({
      resume: sampleResume,
      entities: { language: 'es', locale: 'es-MX' },
      context: {
        deps: {
          searchTavilyQueries: vi.fn(async () => ({
            queryResults: [{ query: 'es-MX CV', results: [] }],
            sources: ['https://example.mx'],
          })),
          proModel: makeMockModel(async () => ({
            updatedResume: sampleResume,
            changes: [
              {
                section: 'basics.summary',
                before: sampleResume.basics.summary,
                after: 'Ingeniero de software backend con 5 años de experiencia.',
                reason: 'Translated to es-MX',
              },
            ],
            reasoning: ['Translated full JSON.', 'Applied es-MX conventions.'],
            localizationNotes: ['Use DD/MM/YYYY format'],
          })),
        },
      },
    });

    expect(result.updatedResume.meta.language).toBe('es');
    expect(result.updatedResume.meta.locale).toBe('es-MX');
    expect(result.extras.localizationNotes).toEqual(['Use DD/MM/YYYY format']);
  });

  it('sectionAgent runs enhancement pass followed by whole-document consistency pass', async () => {
    const enhanceInvoke = vi.fn(async () => ({
      updatedResume: sampleResume,
      changes: [
        {
          section: 'projects[proj-1].bullets[0]',
          before: 'Built local request profiler for Express',
          after: 'Engineered local Express request profiler reducing trace lookup by [X%]',
          reason: 'Added XYZ framing and [X%] placeholder',
        },
      ],
      reasoning: ['Enhanced project impact.', 'Added [X%] placeholder.'],
    }));
    const consistencyInvoke = vi.fn(async () => ({
      updatedResume: sampleResume,
      changes: [],
      reasoning: [
        'Confirmed uniform trailing punctuation across bullets.',
        'Verified consistent verb tense and date formatting.',
      ],
    }));

    const result = await sectionAgent.run({
      resume: sampleResume,
      targetSections: ['projects'],
      context: {
        deps: {
          proModel: makeMockModel(enhanceInvoke),
          consistencyModel: makeMockModel(consistencyInvoke),
        },
      },
    });

    expect(enhanceInvoke).toHaveBeenCalledTimes(1);
    expect(consistencyInvoke).toHaveBeenCalledTimes(1);
    expect(result.extras.consistencyPassApplied).toBe(true);
    expect(result.changes).toHaveLength(1);
  });
});
