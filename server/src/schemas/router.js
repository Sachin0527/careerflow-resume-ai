import { z } from 'zod';

export const ROUTER_INTENTS = [
  'company_optimize',
  'jd_match',
  'translate',
  'enhance_section',
  'question',
  'undo',
  'redo',
  'compare',
  'smalltalk',
];

export const AGENT_NAMES = [
  'companyAgent',
  'jdMatchAgent',
  'translationAgent',
  'sectionAgent',
];

export const routerIntentSchema = z.enum(ROUTER_INTENTS);

export const agentNameSchema = z.enum(AGENT_NAMES);

export const planStepSchema = z.object({
  agent: agentNameSchema,
  instructions: z.string().default(''),
  targetSections: z.array(z.string()).default([]),
});

export const routerEntitiesSchema = z.object({
  company: z.string().nullable().default(null),
  targetRole: z.string().nullable().default(null),
  language: z.string().nullable().default(null),
  locale: z.string().nullable().default(null),
  sections: z.array(z.string()).default([]),
  jdText: z.string().nullable().default(null),
});

export const routerOutputSchema = z.object({
  intents: z.array(routerIntentSchema).min(1),
  plan: z.array(planStepSchema).default([]),
  needsClarification: z.boolean().default(false),
  clarificationQuestion: z.string().nullable().default(null),
  entities: routerEntitiesSchema.default({
    company: null,
    targetRole: null,
    language: null,
    locale: null,
    sections: [],
    jdText: null,
  }),
});
