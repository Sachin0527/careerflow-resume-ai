import { z } from 'zod';
import { resumeSchema } from './resume.js';

export const changeItemSchema = z.object({
  section: z.string().min(1),
  before: z.string(),
  after: z.string(),
  reason: z.string().min(1),
});

export const agentOutputSchema = z.object({
  updatedResume: resumeSchema,
  changes: z.array(changeItemSchema).default([]),
  reasoning: z.array(z.string().min(1)).min(1).max(6),
  extras: z.record(z.any()).default({}),
});

export const companyProfileSchema = z.object({
  company: z.string().min(1),
  values: z.array(z.string()).min(1),
  keywords: z.array(z.string()).min(1),
  tone: z.string().min(1),
  hiringSignals: z.array(z.string()).default([]),
  summary: z.string().min(1),
});

export const companyRewriteOutputSchema = z.object({
  updatedResume: resumeSchema,
  changes: z.array(changeItemSchema).default([]),
  reasoning: z.array(z.string().min(1)).min(2).max(4),
});

export const jdExtractionSchema = z.object({
  roleTitle: z.string().catch(null),
  seniority: z.string().default(''),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  experienceExpectations: z.string().default(''),
});

export const jdScoringSchema = z.object({
  requiredSkillsScore: z.number().min(0).max(100),
  responsibilitiesScore: z.number().min(0).max(100),
  seniorityScore: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
});

export const jdRewriteOutputSchema = z.object({
  updatedResume: resumeSchema,
  changes: z.array(changeItemSchema).default([]),
  reasoning: z.array(z.string().min(1)).min(2).max(4),
});

export const translationOutputSchema = z.object({
  updatedResume: resumeSchema,
  changes: z.array(changeItemSchema).default([]),
  reasoning: z.array(z.string().min(1)).min(2).max(4),
  localizationNotes: z.array(z.string()).default([]),
});

export const sectionRewriteOutputSchema = z.object({
  updatedResume: resumeSchema,
  changes: z.array(changeItemSchema).default([]),
  reasoning: z.array(z.string().min(1)).min(2).max(4),
});
