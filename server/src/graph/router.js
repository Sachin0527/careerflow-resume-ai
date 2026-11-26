import { createChatModel } from '../config/llm.js';
import { env } from '../config/env.js';
import { ROUTER_SYSTEM_PROMPT } from '../prompts/router.js';
import { AGENT_NAMES, routerOutputSchema } from '../schemas/router.js';
import { BadRequestError } from '../utils/errors.js';
import { invokeWithSchemaRetry } from '../utils/retryWithSchema.js';
import { MAX_JD_TEXT_CHARS } from '../utils/timeout.js';

const INTENT_TO_AGENT = {
  company_optimize: 'companyAgent',
  jd_match: 'jdMatchAgent',
  translate: 'translationAgent',
  enhance_section: 'sectionAgent',
};

const AGENT_ALIASES = {
  companyAgent: 'companyAgent',
  company_agent: 'companyAgent',
  company_optimize: 'companyAgent',
  company: 'companyAgent',
  jdMatchAgent: 'jdMatchAgent',
  jd_match_agent: 'jdMatchAgent',
  jd_match: 'jdMatchAgent',
  jd: 'jdMatchAgent',
  translationAgent: 'translationAgent',
  translation_agent: 'translationAgent',
  translate: 'translationAgent',
  translation: 'translationAgent',
  sectionAgent: 'sectionAgent',
  section_agent: 'sectionAgent',
  enhance_section: 'sectionAgent',
  enhance: 'sectionAgent',
  section: 'sectionAgent',
};

const MUTATING_INTENTS = new Set(Object.keys(INTENT_TO_AGENT));

function normalizeAgentName(name) {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (AGENT_ALIASES[trimmed]) return AGENT_ALIASES[trimmed];
  return AGENT_NAMES.includes(trimmed) ? trimmed : null;
}

function looksLikePastedJd(text) {
  const trimmed = String(text || '').trim();
  if (trimmed.length < 100) return false;
  const lines = trimmed.split(/\n+/).filter((l) => l.trim().length > 0);
  const hasJdKeywords =
    /\b(responsibilities|requirements|qualifications|skills|experience|about the role|what you'll do|we are looking for)\b/i.test(
      trimmed
    );
  return (lines.length >= 3 && hasJdKeywords) || (trimmed.length >= 220 && hasJdKeywords);
}

function previousAssistantAskedForJd(recentMessages = []) {
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    if (msg?.role === 'assistant') {
      return /job description|\bjd\b/i.test(String(msg.content || '')) &&
        /\b(paste|share|provide|send)\b/i.test(String(msg.content || ''));
    }
  }
  return false;
}

/**
 * Normalize, schema-validate, and apply deterministic clarification/context guards to router output.
 */
export function parseRouterOutput(rawOutput, context = {}) {
  const raw = rawOutput && typeof rawOutput === 'object' ? { ...rawOutput } : {};

  if (Array.isArray(raw.plan)) {
    raw.plan = raw.plan
      .map((step) => {
        const mappedAgent = normalizeAgentName(step?.agent);
        if (!mappedAgent) return null;
        return {
          agent: mappedAgent,
          instructions: typeof step?.instructions === 'string' ? step.instructions : '',
          targetSections: Array.isArray(step?.targetSections) ? step.targetSections : [],
        };
      })
      .filter(Boolean);
  }

  const parsed = routerOutputSchema.parse(raw);

  const entities = {
    company: parsed.entities?.company?.trim() || null,
    targetRole: parsed.entities?.targetRole?.trim() || null,
    language: parsed.entities?.language?.trim() || null,
    locale: parsed.entities?.locale?.trim() || null,
    sections: Array.isArray(parsed.entities?.sections) ? parsed.entities.sections : [],
    jdText: parsed.entities?.jdText?.trim() || null,
  };

  let needsClarification = Boolean(parsed.needsClarification);
  let clarificationQuestion = parsed.clarificationQuestion?.trim() || null;
  let plan = [...parsed.plan];
  const intents = [...parsed.intents];

  const hasResume = context.hasResume ?? Boolean(context.resume);
  const activeJd = context.activeJd?.trim() || null;
  const activeCompany = context.activeCompany?.trim() || null;
  const resumeTargetCompany = context.resume?.meta?.targetCompany?.trim() || null;
  const userMessage = String(context.userMessage || '').trim();

  const needsResume = intents.some((intent) => intent !== 'smalltalk');
  if (!hasResume && needsResume) {
    return {
      intents,
      plan: [],
      needsClarification: true,
      clarificationQuestion:
        'Please upload your resume (PDF or DOCX) first so I can review and optimize it.',
      entities,
    };
  }

  // Handle JD text extraction fallback + clarification guard
  if (intents.includes('jd_match')) {
    const askedForJd = previousAssistantAskedForJd(context.recentMessages);
    if (!entities.jdText && !activeJd) {
      if ((askedForJd && userMessage.length >= 60) || looksLikePastedJd(userMessage)) {
        entities.jdText = userMessage;
      }
    }

    if (entities.jdText && entities.jdText.length > MAX_JD_TEXT_CHARS) {
      throw new BadRequestError(
        `Job description exceeds the ${MAX_JD_TEXT_CHARS.toLocaleString()} character limit (${entities.jdText.length.toLocaleString()} provided). Please shorten it to the core requirements and responsibilities.`
      );
    }

    if (!entities.jdText && !activeJd) {
      needsClarification = true;
      clarificationQuestion =
        clarificationQuestion ||
        'Please paste the job description you would like me to match your resume against.';
      plan = [];
    } else if (needsClarification && (entities.jdText || activeJd) && /job description|\bjd\b/i.test(clarificationQuestion || '')) {
      needsClarification = false;
      clarificationQuestion = null;
    }
  }

  // Handle missing company guard
  if (
    !needsClarification &&
    intents.includes('company_optimize') &&
    !entities.company &&
    !activeCompany &&
    !resumeTargetCompany
  ) {
    needsClarification = true;
    clarificationQuestion =
      clarificationQuestion || 'Which company would you like me to optimize your resume for?';
    plan = [];
  }

  // Handle missing translation language/locale guard
  if (
    !needsClarification &&
    intents.includes('translate') &&
    !entities.language &&
    !entities.locale
  ) {
    needsClarification = true;
    clarificationQuestion =
      clarificationQuestion ||
      'Which language and target country/locale would you like me to translate and localize your resume to?';
    plan = [];
  }

  // Ensure mutating intents have a valid ordered plan when no clarification is needed
  if (!needsClarification && plan.length === 0) {
    for (const intent of intents) {
      const agent = INTENT_TO_AGENT[intent];
      if (agent) {
        plan.push({
          agent,
          instructions: userMessage || `Execute ${intent}`,
          targetSections: entities.sections,
        });
      }
    }
  }

  // Non-mutating intents shouldn't execute agents unless paired with mutating intents
  if (needsClarification || !intents.some((i) => MUTATING_INTENTS.has(i))) {
    plan = [];
  }

  return {
    intents,
    plan,
    needsClarification,
    clarificationQuestion: needsClarification ? clarificationQuestion : null,
    entities,
  };
}

/**
 * Invoke fastModel (temperature 0) with structured output to route the user message.
 */
export async function routeMessage({
  userMessage,
  summary = '',
  recentMessages = [],
  resume = null,
  activeJd = null,
  activeCompany = null,
  deps = {},
}) {
  const fastModel = deps.fastModel || createChatModel(env.GEMINI_FAST_MODEL, 0);

  const formattedHistory = recentMessages.map((m) => ({
    role: m.role,
    content: String(m.content || '').slice(0, 800),
  }));

  const userPrompt = JSON.stringify(
    {
      userMessage,
      context: {
        hasResume: Boolean(resume),
        activeJdPresent: Boolean(activeJd && activeJd.trim()),
        activeJdPreview: activeJd ? activeJd.slice(0, 300) : null,
        activeCompany: activeCompany || resume?.meta?.targetCompany || null,
        rollingSummary: summary || '',
        recentMessages: formattedHistory,
        resumeMeta: resume?.meta || null,
        resumeSectionsPresent: resume
          ? Object.keys(resume).filter((k) => {
              const v = resume[k];
              return Array.isArray(v) ? v.length > 0 : Boolean(v);
            })
          : [],
      },
    },
    null,
    2
  );

  const rawResult = await invokeWithSchemaRetry({
    model: fastModel,
    schema: routerOutputSchema,
    systemPrompt: ROUTER_SYSTEM_PROMPT,
    userPrompt,
    maxRetries: 2,
    context: { node: 'router' },
  });

  return parseRouterOutput(rawResult, {
    userMessage,
    recentMessages,
    resume,
    hasResume: Boolean(resume),
    activeJd,
    activeCompany,
  });
}

/**
 * LangGraph router node: classifies intents, builds plan, and emits `route` SSE event.
 */
export async function routerNode(state) {
  state.emit?.('status', {
    phase: 'routing',
    message: 'Analyzing request and planning agent steps...',
  });

  const routeResult = await routeMessage({
    userMessage: state.userMessage,
    summary: state.summary,
    recentMessages: state.history,
    resume: state.resume,
    activeJd: state.activeJd,
    activeCompany: state.activeCompany,
    deps: state.deps,
  });

  state.emit?.('route', {
    intents: routeResult.intents,
    plan: routeResult.plan,
    needsClarification: routeResult.needsClarification,
    entities: routeResult.entities,
  });

  return {
    intents: routeResult.intents,
    plan: routeResult.plan,
    entities: routeResult.entities,
    needsClarification: routeResult.needsClarification,
    pendingClarification: routeResult.clarificationQuestion,
    activeJd: routeResult.entities.jdText || state.activeJd,
    activeCompany: routeResult.entities.company || state.activeCompany,
  };
}
