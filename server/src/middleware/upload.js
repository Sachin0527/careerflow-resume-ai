import path from 'node:path';
import multer from 'multer';
import { BadRequestError } from '../utils/errors.js';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);

export const uploadResumeMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isMimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
    const isExtAllowed = ALLOWED_EXTENSIONS.has(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      return cb(new BadRequestError('Only PDF and DOCX files are supported (.pdf, .docx).'));
    }
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new BadRequestError('Invalid file extension. Only .pdf and .docx are allowed.'));
    }
    return cb(null, true);
  },
}).single('file');
