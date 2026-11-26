import { z } from 'zod';

export const createConversationBodySchema = z.object({
  clientId: z.string().trim().min(1, 'clientId is required'),
  title: z.string().trim().min(1).max(160).optional(),
});

export const updateConversationBodySchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(160),
});

export const listConversationsQuerySchema = z.object({
  clientId: z.string().trim().min(1, 'clientId query parameter is required'),
});

export const conversationIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'conversation id is required'),
});

export const versionIdParamsSchema = z.object({
  id: z.string().trim().min(1, 'conversation id is required'),
  vid: z.string().trim().min(1, 'version id is required'),
});

export const compareVersionsQuerySchema = z.object({
  from: z.string().trim().min(1, 'from version id is required'),
  to: z.string().trim().min(1, 'to version id is required'),
});

export const exportResumeQuerySchema = z.object({
  format: z.enum(['pdf', 'docx']).default('pdf'),
  versionId: z.string().trim().min(1).optional(),
});

export const sendMessageBodySchema = z.object({
  content: z
    .string({ required_error: 'Message content is required' })
    .trim()
    .min(1, 'Message content must not be empty')
    .max(32000, 'Message content is too long (maximum 32,000 characters)'),
});
