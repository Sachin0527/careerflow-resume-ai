import { z } from 'zod';

const linkSchema = z.object({
  label: z.string().default(''),
  url: z.string().default(''),
});

const basicsSchema = z.object({
  name: z.string().default(''),
  email: z.string().default(''),
  phone: z.string().default(''),
  location: z.string().default(''),
  links: z.array(linkSchema).default([]),
  summary: z.string().default(''),
});

const experienceItemSchema = z.object({
  id: z.string().min(1),
  company: z.string().default(''),
  title: z.string().default(''),
  location: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  bullets: z.array(z.string()).default([]),
});

const educationItemSchema = z.object({
  id: z.string().min(1),
  institution: z.string().default(''),
  degree: z.string().default(''),
  field: z.string().default(''),
  startDate: z.string().default(''),
  endDate: z.string().default(''),
  details: z.array(z.string()).default([]),
});

const skillGroupSchema = z.object({
  category: z.string().default('General'),
  items: z.array(z.string()).default([]),
});

const projectItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().default(''),
  description: z.string().default(''),
  tech: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
});

const certificationItemSchema = z.object({
  name: z.string().default(''),
  issuer: z.string().default(''),
  date: z.string().default(''),
});

const extraSectionSchema = z.object({
  title: z.string().default(''),
  items: z.array(z.string()).default([]),
});

const metaSchema = z.object({
  language: z.string().default('en'),
  locale: z.string().default('en-US'),
  targetRole: z.string().nullable().default(null),
  targetCompany: z.string().nullable().default(null),
});

/**
 * Canonical Resume JSON schema shared across parser, agents, versioning, diffing, and export.
 */
export const resumeSchema = z.object({
  basics: basicsSchema,
  experience: z.array(experienceItemSchema).default([]),
  education: z.array(educationItemSchema).default([]),
  skills: z.array(skillGroupSchema).default([]),
  projects: z.array(projectItemSchema).default([]),
  certifications: z.array(certificationItemSchema).default([]),
  extraSections: z.array(extraSectionSchema).default([]),
  meta: metaSchema.default({
    language: 'en',
    locale: 'en-US',
    targetRole: null,
    targetCompany: null,
  }),
});
