import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(serverRoot, '..');

dotenv.config({ path: path.join(serverRoot, '.env') });

const REQUIRED_ENV_KEYS = [
  'GOOGLE_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_INDEX',
  'EMBED_DIMENSION',
  'TAVILY_API_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

const forceMock = process.argv.includes('--mock');
const hasLiveEnv = !forceMock && REQUIRED_ENV_KEYS.every((k) => Boolean(process.env[k]?.trim()));

if (!hasLiveEnv) {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const dummyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).replace(/\n/g, '\\n');

  Object.assign(process.env, {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || '3001',
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'mock-google-key',
    GEMINI_FAST_MODEL: process.env.GEMINI_FAST_MODEL || 'gemini-3-flash-preview',
    GEMINI_PRO_MODEL: process.env.GEMINI_PRO_MODEL || 'gemini-3-flash-preview',
    GEMINI_EMBED_MODEL: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
    PINECONE_API_KEY: process.env.PINECONE_API_KEY || 'mock-pinecone-key',
    PINECONE_INDEX: process.env.PINECONE_INDEX || 'mock-index',
    EMBED_DIMENSION: process.env.EMBED_DIMENSION || '768',
    TAVILY_API_KEY: process.env.TAVILY_API_KEY || 'mock-tavily-key',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'mock-project',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || 'mock@mock.iam.gserviceaccount.com',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || dummyPem,
  });
}

const { extractRawText, parseResumeBuffer } = await import('../src/services/parser.js');
const { compareResumes } = await import('../src/services/diff.js');
const { buildResumeChunks } = await import('../src/services/vectorStore.js');
const companyAgent = await import('../src/agents/companyAgent.js');
const jdMatchAgent = await import('../src/agents/jdMatchAgent.js');
const translationAgent = await import('../src/agents/translationAgent.js');
const sectionAgent = await import('../src/agents/sectionAgent.js');

function buildBaselineSampleResume() {
  return {
    basics: {
      name: 'Alex Rivera',
      email: 'alex.rivera@example.com',
      phone: '(415) 555-0192',
      location: 'San Francisco, CA',
      links: [
        { label: 'GitHub', url: 'https://github.com/alexrivera' },
        { label: 'LinkedIn', url: 'https://linkedin.com/in/alexrivera' },
      ],
      summary:
        'Full-stack software engineer with 5 years of experience building distributed backend APIs, cloud-native data pipelines, and responsive React web applications.',
    },
    experience: [
      {
        id: 'exp-1',
        company: 'CloudScale Inc.',
        title: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: 'Mar 2023',
        endDate: 'Present',
        bullets: [
          'Designed Node.js and Go microservices handling 12,000 requests/sec with 99.95% availability.',
          'Reduced p95 API latency by 38% by introducing Redis read-through caching and query batching.',
          'Led migration of 14 legacy REST endpoints to typed schemas and automated CI contract tests.',
        ],
      },
      {
        id: 'exp-2',
        company: 'FinPulse Technologies',
        title: 'Software Engineer',
        location: 'Austin, TX',
        startDate: 'Jul 2021',
        endDate: 'Feb 2023',
        bullets: [
          'Built customer analytics dashboards in React 18, TypeScript, and Tailwind CSS used by 40,000+ monthly users.',
          'Implemented event-driven webhook ingestion pipelines using PostgreSQL and Google Cloud Pub/Sub.',
          'Mentored 3 junior engineers through weekly code reviews and architecture design sessions.',
        ],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'University of Texas at Austin',
        degree: 'B.S.',
        field: 'Computer Science',
        startDate: '2017',
        endDate: '2021',
        details: ['Relevant coursework: Distributed Systems, Algorithms, Database Management'],
      },
    ],
    skills: [
      { category: 'Languages', items: ['JavaScript', 'TypeScript', 'Go', 'Python', 'SQL'] },
      {
        category: 'Frameworks & Cloud',
        items: ['Node.js', 'Express', 'React', 'Tailwind CSS', 'Docker', 'GCP', 'PostgreSQL', 'Redis'],
      },
    ],
    projects: [
      {
        id: 'proj-1',
        name: 'TraceLite',
        description: 'Open-Source Request Profiler',
        tech: ['Node.js', 'React', 'SQLite', 'OpenTelemetry'],
        bullets: [
          'Built a lightweight local trace viewer capturing Express middleware timings and SQL spans.',
        ],
      },
    ],
    certifications: [
      {
        name: 'Google Cloud Professional Cloud Developer',
        issuer: 'Google Cloud',
        date: '2024',
      },
    ],
    extraSections: [],
    meta: {
      language: 'en',
      locale: 'en-US',
      targetRole: null,
      targetCompany: null,
    },
  };
}

function createDryRunDeps(baseResume) {
  const memoryCache = new Map();
  let indexedChunks = [];

  const mockModel = (responder) => ({
    withStructuredOutput: () => ({
      invoke: async (messages) => responder(messages),
    }),
  });

  return {
    fastModel: mockModel((messages) => {
      const sys = String(messages[0]?.content || '');
      if (sys.includes('Company Research Analyst')) {
        return {
          company: 'Google',
          values: ['User focus', 'Engineering excellence', 'Scale & reliability', 'Data-driven rigor'],
          keywords: ['distributed systems', 'latency', 'observability', 'scale', 'open standards'],
          tone: 'Concise, impact-oriented, engineering-rigorous',
          hiringSignals: ['Systems thinking', 'Measurable SLOs', 'Cross-team collaboration'],
          summary: 'Google values scalable distributed engineering, measurable reliability, and crisp XYZ impact.',
        };
      }
      if (sys.includes('Job Description Analyst')) {
        return {
          roleTitle: 'Senior Backend & Platform Engineer',
          seniority: 'Senior (4+ years)',
          requiredSkills: ['Go', 'Node.js', 'TypeScript', 'Redis', 'PostgreSQL', 'OpenTelemetry', 'GCP'],
          preferredSkills: ['Kubernetes', 'Terraform', 'Kafka', 'Mentorship'],
          responsibilities: [
            'Scale backend APIs handling high request throughput with strict SLOs',
            'Optimize query latency using distributed caching and SQL tuning',
            'Improve quality via schema validation, CI tests, and mentoring',
          ],
          experienceExpectations: '4+ years building distributed backend microservices',
        };
      }
      if (sys.includes('ATS & Hiring Evaluator')) {
        return {
          requiredSkillsScore: 92,
          responsibilitiesScore: 88,
          seniorityScore: 90,
          matchedSkills: ['Go', 'Node.js', 'TypeScript', 'Redis', 'PostgreSQL', 'OpenTelemetry', 'GCP'],
          missingSkills: ['Kubernetes', 'Terraform', 'Apache Kafka'],
          suggestions: [
            'Highlight OpenTelemetry profiler work alongside CloudScale SLO metrics',
            'Explicitly quantify TraceLite adoption or latency overhead if available',
          ],
        };
      }
      return {};
    }),
    proModel: mockModel((messages) => {
      const sys = String(messages[0]?.content || '');
      if (sys.includes('Company Research & Optimization Agent')) {
        const next = structuredClone(baseResume);
        next.basics.summary =
          'Distributed systems and full-stack engineer with 5 years of experience architecting low-latency Node.js/Go services, cloud telemetry pipelines, and high-reliability web platforms at scale.';
        next.experience[0].bullets[1] =
          'Cut p95 API latency by 38% across high-throughput services by engineering Redis read-through caching and query batching.';
        return {
          updatedResume: next,
          changes: [
            {
              section: 'basics.summary',
              before: baseResume.basics.summary,
              after: next.basics.summary,
              reason: 'Emphasizes distributed scale, low-latency reliability, and telemetry alignment for Google.',
            },
            {
              section: 'experience[exp-1].bullets[1]',
              before: baseResume.experience[0].bullets[1],
              after: next.experience[0].bullets[1],
              reason: 'Highlights high-throughput engineering rigor while preserving verified 38% metric.',
            },
          ],
          reasoning: [
            'Aligned summary with Google engineering priorities around scale, reliability, and low-latency systems.',
            'Preserved all verified employers, dates, and metrics verbatim with zero fabrication.',
          ],
        };
      }
      if (sys.includes('Job Description Matching Agent')) {
        const next = structuredClone(baseResume);
        next.basics.summary =
          'Senior Backend & Platform Engineer with 5 years of production experience in Go, Node.js/TypeScript, Redis, PostgreSQL, GCP, and OpenTelemetry observability tooling.';
        return {
          updatedResume: next,
          changes: [
            {
              section: 'basics.summary',
              before: baseResume.basics.summary,
              after: next.basics.summary,
              reason: 'Surfaces matched required JD stack (Go, Node.js, TypeScript, Redis, PostgreSQL, OpenTelemetry, GCP) upfront.',
            },
          ],
          reasoning: [
            'Mapped Pinecone-retrieved CloudScale and TraceLite chunks directly to the JD observability requirements.',
            'Kept missing skills (Kubernetes, Terraform, Apache Kafka) out of the resume and listed them as skill gaps.',
          ],
        };
      }
      if (sys.includes('Translation & Localization Agent')) {
        const next = structuredClone(baseResume);
        next.basics.summary =
          'Ingeniero de software full-stack con 5 años de experiencia diseñando APIs backend distribuidas, pipelines de datos en la nube y aplicaciones web responsivas en React.';
        next.experience[0].title = 'Ingeniero de Software Senior';
        next.experience[0].endDate = 'Actualidad';
        next.experience[0].bullets = [
          'Diseñó microservicios en Node.js y Go procesando 12,000 solicitudes/seg con 99.95% de disponibilidad.',
          'Redujo la latencia p95 de la API en 38% implementando caché de lectura en Redis y agrupación de consultas.',
          'Lideró la migración de 14 endpoints REST heredados hacia esquemas tipados y pruebas de contrato en CI.',
        ];
        return {
          updatedResume: next,
          changes: [
            {
              section: 'basics.summary',
              before: baseResume.basics.summary,
              after: next.basics.summary,
              reason: 'Translated summary into natural Mexican Spanish (es-MX) while keeping technical nouns untranslated.',
            },
            {
              section: 'experience[exp-1]',
              before: baseResume.experience[0].title,
              after: next.experience[0].title,
              reason: 'Localized role title and current-date indicator ("Actualidad") for es-MX conventions.',
            },
          ],
          reasoning: [
            'Translated resume prose into es-MX while preserving proper nouns (CloudScale Inc., GCP) and tech terms (Node.js, Redis).',
            'Applied Mexican CV conventions surfaced via Tavily search (concise 1–2 page CV, optional photo note).',
          ],
          localizationNotes: [
            'In Mexico (es-MX), a professional headshot is often included on CVs though increasingly optional in international tech companies.',
            'Use DD/MM/AAAA or Month YYYY in Spanish ("Mar 2023 – Actualidad") consistently.',
            'Standard tech terms (Node.js, React, PostgreSQL, Redis, CI) should remain in English.',
          ],
        };
      }
      // Section Enhancement pass
      const next = structuredClone(baseResume);
      next.projects[0].bullets = [
        'Engineered a lightweight local trace viewer capturing Express middleware timings and SQL spans, cutting local debugging time by [X%].',
      ];
      return {
        updatedResume: next,
        changes: [
          {
            section: 'projects[proj-1].bullets[0]',
            before: baseResume.projects[0].bullets[0],
            after: next.projects[0].bullets[0],
            reason: 'Applied XYZ impact framing with a [X%] placeholder for the unmeasured debugging improvement.',
          },
        ],
        reasoning: [
          'Strengthened action verbs and added an explicit [X%] metric placeholder where quantitative impact was absent.',
          'Preserved all factual dates, employers, and verified metrics.',
        ],
      };
    }),
    consistencyModel: mockModel((messages) => {
      const payload = JSON.parse(String(messages[1]?.content || '{}'));
      const current = structuredClone(payload.resume || baseResume);
      const beforeBullet = current.experience[0].bullets[0];
      // Ensure uniform trailing periods and consistent dash formatting
      current.experience = current.experience.map((exp) => ({
        ...exp,
        bullets: exp.bullets.map((b) => (b.endsWith('.') ? b : `${b}.`)),
      }));
      return {
        updatedResume: current,
        changes:
          beforeBullet === current.experience[0].bullets[0]
            ? []
            : [
                {
                  section: 'experience',
                  before: beforeBullet,
                  after: current.experience[0].bullets[0],
                  reason: 'Standardized bullet punctuation across all sections.',
                },
              ],
        reasoning: [
          'Verified consistent past/present verb tense and Mon YYYY date formatting across all sections.',
          'Confirmed uniform trailing period punctuation and balanced bullet length.',
        ],
      };
    }),
    getCachedCompanyProfile: async (company) => memoryCache.get(company.toLowerCase()) || null,
    saveCompanyProfile: async (company, data) => {
      memoryCache.set(company.toLowerCase(), { ...data, fetchedAt: new Date().toISOString() });
    },
    searchTavilyQueries: async (queries) => ({
      queryResults: queries.map((query) => ({
        query,
        results: [
          {
            title: `Research result for ${query}`,
            url: 'https://example.com/research',
            content: `Verified public summary for query: ${query}`,
          },
        ],
      })),
      sources: ['https://example.com/research'],
    }),
    indexResumeChunks: async ({ versionId, resume }) => {
      indexedChunks = buildResumeChunks(resume, versionId);
      return indexedChunks.length;
    },
    indexJdChunks: async () => 6,
    queryMatchingResumeChunks: async ({ queries }) =>
      queries.slice(0, 4).map((requirement) => ({
        requirement,
        matches: indexedChunks.slice(0, 2).map((c) => ({
          section: c.doc.metadata.section,
          itemId: c.doc.metadata.itemId,
          score: 0.89,
          content: c.doc.pageContent,
        })),
      })),
  };
}

function printAgentReport(title, baseResume, result) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(`AGENT: ${title}`);
  console.log(`${'='.repeat(72)}`);
  console.log('Reasoning:');
  for (const r of result.reasoning) {
    console.log(`  - ${r}`);
  }
  console.log(`Changes (${result.changes.length}):`);
  for (const ch of result.changes) {
    console.log(`  [${ch.section}]`);
    console.log(`    before: ${ch.before}`);
    console.log(`    after : ${ch.after}`);
    console.log(`    reason: ${ch.reason}`);
  }
  const diff = compareResumes(baseResume, result.updatedResume);
  console.log(`Diff Summary: ${diff.summary}`);
  console.log('Extras:', JSON.stringify(result.extras, null, 2));
}

async function main() {
  const pdfPath = path.join(repoRoot, 'sample', 'sample-resume.pdf');
  const jdPath = path.join(repoRoot, 'sample', 'sample-jd.txt');

  const [pdfBuffer, jdText] = await Promise.all([
    fs.readFile(pdfPath),
    fs.readFile(jdPath, 'utf8'),
  ]);

  const rawText = await extractRawText({
    buffer: pdfBuffer,
    mimeType: 'application/pdf',
    originalName: 'sample-resume.pdf',
  });
  console.log(`Loaded sample/sample-resume.pdf (${rawText.length} chars extracted)`);

  let baseResume;
  let sharedContext;

  if (hasLiveEnv) {
    console.log('[MODE: LIVE] Running against Gemini, Tavily, Pinecone, and Firestore...');
    baseResume = await parseResumeBuffer({
      buffer: pdfBuffer,
      mimeType: 'application/pdf',
      originalName: 'sample-resume.pdf',
    });
    sharedContext = {
      conversationId: `try-agents-${Date.now()}`,
      currentVersionId: 'v1',
      indexedVersionId: null,
    };
  } else {
    console.log(
      '[MODE: DRY-RUN / MOCKED EXTERNAL APIS] server/.env not configured; running all 4 agents with injected mock LLM/Tavily/Pinecone/Firestore deps.'
    );
    baseResume = buildBaselineSampleResume();
    sharedContext = {
      conversationId: 'try-agents-dry-run',
      currentVersionId: 'v1',
      indexedVersionId: null,
      deps: createDryRunDeps(baseResume),
    };
  }

  const onStep = (agentName) => (text) => console.log(`  [${agentName}] ${text}`);

  const companyResult = await companyAgent.run({
    resume: baseResume,
    instructions: 'Optimize my resume for Google',
    targetSections: ['basics.summary', 'experience'],
    entities: { company: 'Google' },
    context: sharedContext,
    onStep: onStep('companyAgent'),
  });
  printAgentReport('1. Company Research & Optimization Agent (Google)', baseResume, companyResult);

  const jdResult = await jdMatchAgent.run({
    resume: baseResume,
    instructions: 'Match my experience and summary against this Google Cloud Observability JD',
    targetSections: ['basics.summary', 'experience', 'skills'],
    entities: { jdText },
    context: sharedContext,
    onStep: onStep('jdMatchAgent'),
  });
  printAgentReport('2. Job Description Matching Agent', baseResume, jdResult);

  const translationResult = await translationAgent.run({
    resume: baseResume,
    instructions: 'Translate this to Spanish for the Mexican market',
    targetSections: [],
    entities: { language: 'es', locale: 'es-MX' },
    context: sharedContext,
    onStep: onStep('translationAgent'),
  });
  printAgentReport('3. Translation & Localization Agent (es-MX)', baseResume, translationResult);

  const sectionResult = await sectionAgent.run({
    resume: baseResume,
    instructions: 'Enhance my projects and experience sections with strong action verbs and [X] placeholders',
    targetSections: ['projects', 'experience'],
    entities: { sections: ['projects', 'experience'] },
    context: sharedContext,
    onStep: onStep('sectionAgent'),
  });
  printAgentReport('4. Section Enhancement Agent', baseResume, sectionResult);
}

main().catch((err) => {
  console.error('try-agents failed:', err);
  process.exit(1);
});
