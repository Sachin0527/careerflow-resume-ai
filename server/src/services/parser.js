import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { createChatModel } from '../config/llm.js';
import { env } from '../config/env.js';
import { PARSER_SYSTEM_PROMPT } from '../prompts/parser.js';
import { resumeSchema } from '../schemas/resume.js';
import { BadRequestError, UnprocessableEntityError } from '../utils/errors.js';
import { invokeWithSchemaRetry } from '../utils/retryWithSchema.js';

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Extract plain text from a PDF or DOCX buffer.
 */
export async function extractRawText({ buffer, mimeType, originalName = '' }) {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError('Uploaded file is empty.');
  }

  const ext = path.extname(originalName).toLowerCase();
  const isPdf = mimeType === PDF_MIME || ext === '.pdf';
  const isDocx = mimeType === DOCX_MIME || ext === '.docx';

  if (!isPdf && !isDocx) {
    throw new BadRequestError('Unsupported file format. Only PDF and DOCX are allowed.');
  }

  let text;
  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    try {
      const parsed = await parser.getText();
      text = parsed?.text || '';
    } finally {
      await parser.destroy().catch(() => {});
    }
  } else {
    const result = await mammoth.extractRawText({ buffer });
    text = result?.value || '';
  }

  const cleaned = text.replace(/\r\n/g, '\n').trim();
  if (cleaned.length < 30) {
    throw new UnprocessableEntityError(
      'Could not extract readable text from the uploaded resume. Ensure the file is not a scanned image.'
    );
  }

  return cleaned;
}

/**
 * Parse a resume file buffer (PDF or DOCX) into canonical Resume JSON using Gemini structured output
 * with up to 2 schema-validation retries passing validation errors back to the model.
 */
export async function parseResumeBuffer({
  buffer,
  mimeType,
  originalName = '',
  model = createChatModel(env.GEMINI_FAST_MODEL, 0),
}) {
  const rawText = await extractRawText({ buffer, mimeType, originalName });

  return invokeWithSchemaRetry({
    model,
    schema: resumeSchema,
    systemPrompt: PARSER_SYSTEM_PROMPT,
    userPrompt: `Extract the following resume text into the canonical resume JSON schema:\n\n${rawText}`,
    maxRetries: 2,
    context: { stage: 'resume_parser', originalName },
  });
}
