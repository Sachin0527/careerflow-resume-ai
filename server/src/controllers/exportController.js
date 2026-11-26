import * as versioningService from '../services/versioning.js';
import { exportResumeToDocx, exportResumeToPdf } from '../services/export.js';
import { BadRequestError } from '../utils/errors.js';
import { slugify } from '../utils/slugify.js';

export async function exportResume(req, res, next) {
  try {
    const { id } = req.params;
    const { format, versionId } = req.query;

    let version;
    let resume;
    if (versionId) {
      version = await versioningService.getVersion(id, versionId);
      resume = version.resume;
    } else {
      const current = await versioningService.getCurrent(id);
      version = current.version;
      resume = current.resume;
    }

    if (!resume || !version) {
      throw new BadRequestError('No resume version found to export. Upload a resume first.');
    }

    const baseName = slugify(resume?.basics?.name || 'resume') || 'resume';
    const fileName = `${baseName}-v${version.versionNumber || 1}.${format}`;

    if (format === 'docx') {
      const buffer = await exportResumeToDocx(resume);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(buffer);
    }

    const buffer = await exportResumeToPdf(resume);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  } catch (err) {
    return next(err);
  }
}
