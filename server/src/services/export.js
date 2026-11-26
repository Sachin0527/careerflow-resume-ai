import fs from 'node:fs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import PDFDocument from 'pdfkit';

const LOCALIZED_LABELS = {
  en: {
    summary: 'PROFESSIONAL SUMMARY',
    experience: 'EXPERIENCE',
    projects: 'PROJECTS',
    skills: 'SKILLS',
    education: 'EDUCATION',
    certifications: 'CERTIFICATIONS',
    tech: 'Technologies',
  },
  es: {
    summary: 'RESUMEN PROFESIONAL',
    experience: 'EXPERIENCIA LABORAL',
    projects: 'PROYECTOS',
    skills: 'HABILIDADES',
    education: 'EDUCACIÓN',
    certifications: 'CERTIFICACIONES',
    tech: 'Tecnologías',
  },
  fr: {
    summary: 'PROFIL PROFESSIONNEL',
    experience: 'EXPÉRIENCE PROFESSIONNELLE',
    projects: 'PROJETS',
    skills: 'COMPÉTENCES',
    education: 'FORMATION',
    certifications: 'CERTIFICATIONS',
    tech: 'Technologies',
  },
  de: {
    summary: 'BERUFSPROFIL',
    experience: 'BERUFSERFAHRUNG',
    projects: 'PROJEKTE',
    skills: 'KOMPETENZEN',
    education: 'AUSBILDUNG',
    certifications: 'ZERTIFIZIERUNGEN',
    tech: 'Technologien',
  },
  pt: {
    summary: 'RESUMO PROFISSIONAL',
    experience: 'EXPERIÊNCIA PROFISSIONAL',
    projects: 'PROJETOS',
    skills: 'HABILIDADES',
    education: 'FORMAÇÃO ACADÊMICA',
    certifications: 'CERTIFICAÇÕES',
    tech: 'Tecnologias',
  },
  it: {
    summary: 'PROFILO PROFESSIONALE',
    experience: 'ESPERIENZA LAVORATIVA',
    projects: 'PROGETTI',
    skills: 'COMPETENZE',
    education: 'ISTRUZIONE',
    certifications: 'CERTIFICAZIONI',
    tech: 'Tecnologie',
  },
};

/**
 * Resolve localized section headings using `resume.meta.language` (falling back to English).
 */
export function getLocalizedHeadings(language = 'en') {
  const iso = String(language || 'en')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];
  return LOCALIZED_LABELS[iso] || LOCALIZED_LABELS.en;
}

function buildContactLine(basics = {}) {
  const linkTexts = (basics.links || [])
    .map((l) => (l.url ? l.url.replace(/^https?:\/\//i, '') : l.label))
    .filter(Boolean);
  return [basics.location, basics.email, basics.phone, ...linkTexts].filter(Boolean).join('  |  ');
}

function findUnicodeFonts() {
  const candidates = [
    {
      regular: 'C:\\Windows\\Fonts\\arial.ttf',
      bold: 'C:\\Windows\\Fonts\\arialbd.ttf',
      italic: 'C:\\Windows\\Fonts\\ariali.ttf',
    },
    {
      regular: '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      bold: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      italic: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf',
    },
    {
      regular: '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      bold: '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
      italic: '/usr/share/fonts/truetype/liberation/LiberationSans-Italic.ttf',
    },
  ];

  for (const pair of candidates) {
    if (fs.existsSync(pair.regular) && fs.existsSync(pair.bold)) {
      return pair;
    }
  }
  return null;
}

/**
 * Render canonical resume JSON into a clean single-column ATS-friendly DOCX buffer.
 */
export async function exportResumeToDocx(resume) {
  const labels = getLocalizedHeadings(resume?.meta?.language);
  const basics = resume?.basics || {};
  const children = [];

  if (basics.name) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: basics.name,
            bold: true,
            size: 32,
            font: 'Calibri',
            color: '111827',
          }),
        ],
      })
    );
  }

  const contactLine = buildContactLine(basics);
  if (contactLine) {
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        children: [
          new TextRun({
            text: contactLine,
            size: 20,
            font: 'Calibri',
            color: '374151',
          }),
        ],
      })
    );
  }

  const pushSectionHeading = (title) => {
    children.push(
      new Paragraph({
        spacing: { before: 180, after: 80 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D1D5DB', space: 4 },
        },
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 22,
            font: 'Calibri',
            color: '111827',
          }),
        ],
      })
    );
  };

  if (basics.summary?.trim()) {
    pushSectionHeading(labels.summary);
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: basics.summary.trim(), size: 21, font: 'Calibri' })],
      })
    );
  }

  if ((resume.experience || []).length > 0) {
    pushSectionHeading(labels.experience);
    for (const exp of resume.experience) {
      const header = [exp.title, exp.company].filter(Boolean).join(' — ');
      const metaLine = [
        [exp.startDate, exp.endDate].filter(Boolean).join(' – '),
        exp.location,
      ]
        .filter(Boolean)
        .join('  |  ');

      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [new TextRun({ text: header, bold: true, size: 22, font: 'Calibri' })],
        })
      );
      if (metaLine) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: metaLine,
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '4B5563',
              }),
            ],
          })
        );
      }
      for (const bullet of exp.bullets || []) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 21, font: 'Calibri' })],
          })
        );
      }
    }
  }

  if ((resume.projects || []).length > 0) {
    pushSectionHeading(labels.projects);
    for (const proj of resume.projects) {
      const title = [proj.name, proj.description].filter(Boolean).join(' — ');
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [new TextRun({ text: title, bold: true, size: 21, font: 'Calibri' })],
        })
      );
      if (proj.tech?.length) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({
                text: `${labels.tech}: ${proj.tech.join(', ')}`,
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '4B5563',
              }),
            ],
          })
        );
      }
      for (const bullet of proj.bullets || []) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: bullet, size: 21, font: 'Calibri' })],
          })
        );
      }
    }
  }

  if ((resume.skills || []).length > 0) {
    pushSectionHeading(labels.skills);
    for (const group of resume.skills) {
      if (!group.items?.length) continue;
      children.push(
        new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: `${group.category}: `, bold: true, size: 21, font: 'Calibri' }),
            new TextRun({ text: group.items.join(', '), size: 21, font: 'Calibri' }),
          ],
        })
      );
    }
  }

  if ((resume.education || []).length > 0) {
    pushSectionHeading(labels.education);
    for (const edu of resume.education) {
      const degree = [edu.degree, edu.field].filter(Boolean).join(' in ');
      const line = [degree, edu.institution].filter(Boolean).join(' — ');
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');

      children.push(
        new Paragraph({
          spacing: { before: 60, after: 20 },
          children: [new TextRun({ text: line, bold: true, size: 21, font: 'Calibri' })],
        })
      );
      if (dates) {
        children.push(
          new Paragraph({
            spacing: { after: 30 },
            children: [
              new TextRun({
                text: dates,
                italics: true,
                size: 19,
                font: 'Calibri',
                color: '4B5563',
              }),
            ],
          })
        );
      }
      for (const detail of edu.details || []) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 30 },
            children: [new TextRun({ text: detail, size: 20, font: 'Calibri' })],
          })
        );
      }
    }
  }

  if ((resume.certifications || []).length > 0) {
    pushSectionHeading(labels.certifications);
    for (const cert of resume.certifications) {
      const text = [cert.name, cert.issuer, cert.date ? `(${cert.date})` : '']
        .filter(Boolean)
        .join(' — ');
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text, size: 21, font: 'Calibri' })],
        })
      );
    }
  }

  for (const extra of resume.extraSections || []) {
    if (!extra.title && !extra.items?.length) continue;
    pushSectionHeading(String(extra.title || 'ADDITIONAL').toUpperCase());
    for (const item of extra.items || []) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text: item, size: 21, font: 'Calibri' })],
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

/**
 * Render canonical resume JSON into a clean single-column ATS-friendly PDF buffer.
 */
export async function exportResumeToPdf(resume) {
  const labels = getLocalizedHeadings(resume?.meta?.language);
  const basics = resume?.basics || {};

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const unicodeFonts = findUnicodeFonts();
    let regularFont = 'Helvetica';
    let boldFont = 'Helvetica-Bold';
    let italicFont = 'Helvetica-Oblique';

    if (unicodeFonts) {
      try {
        doc.registerFont('ATSRegular', unicodeFonts.regular);
        doc.registerFont('ATSBold', unicodeFonts.bold);
        regularFont = 'ATSRegular';
        boldFont = 'ATSBold';
        if (unicodeFonts.italic && fs.existsSync(unicodeFonts.italic)) {
          doc.registerFont('ATSItalic', unicodeFonts.italic);
          italicFont = 'ATSItalic';
        } else {
          italicFont = 'ATSRegular';
        }
      } catch {
        regularFont = 'Helvetica';
        boldFont = 'Helvetica-Bold';
        italicFont = 'Helvetica-Oblique';
      }
    }

    const drawHeading = (title) => {
      doc.moveDown(0.7);
      doc.font(boldFont).fontSize(11).fillColor('#111827').text(title);
      const y = doc.y + 2;
      doc
        .moveTo(doc.page.margins.left, y)
        .lineTo(doc.page.width - doc.page.margins.right, y)
        .lineWidth(0.7)
        .strokeColor('#D1D5DB')
        .stroke();
      doc.moveDown(0.35);
    };

    if (basics.name) {
      doc.font(boldFont).fontSize(18).fillColor('#111827').text(basics.name);
    }

    const contactLine = buildContactLine(basics);
    if (contactLine) {
      doc.moveDown(0.15);
      doc.font(regularFont).fontSize(9.5).fillColor('#374151').text(contactLine);
    }

    if (basics.summary?.trim()) {
      drawHeading(labels.summary);
      doc.font(regularFont).fontSize(10).fillColor('#1F2937').text(basics.summary.trim(), {
        lineGap: 2,
      });
    }

    if ((resume.experience || []).length > 0) {
      drawHeading(labels.experience);
      for (const exp of resume.experience) {
        const titleLine = [exp.title, exp.company].filter(Boolean).join(' — ');
        const metaLine = [
          [exp.startDate, exp.endDate].filter(Boolean).join(' – '),
          exp.location,
        ]
          .filter(Boolean)
          .join(' | ');

        doc.font(boldFont).fontSize(10.5).fillColor('#111827').text(titleLine);
        if (metaLine) {
          doc.font(italicFont).fontSize(9).fillColor('#4B5563').text(metaLine);
        }
        doc.moveDown(0.15);
        for (const bullet of exp.bullets || []) {
          doc.font(regularFont).fontSize(10).fillColor('#1F2937').text(`•  ${bullet}`, {
            indent: 10,
            lineGap: 1.5,
          });
        }
        doc.moveDown(0.35);
      }
    }

    if ((resume.projects || []).length > 0) {
      drawHeading(labels.projects);
      for (const proj of resume.projects) {
        const titleLine = [proj.name, proj.description].filter(Boolean).join(' — ');
        doc.font(boldFont).fontSize(10.5).fillColor('#111827').text(titleLine);
        if (proj.tech?.length) {
          doc
            .font(italicFont)
            .fontSize(9)
            .fillColor('#4B5563')
            .text(`${labels.tech}: ${proj.tech.join(', ')}`);
        }
        for (const bullet of proj.bullets || []) {
          doc.font(regularFont).fontSize(10).fillColor('#1F2937').text(`•  ${bullet}`, {
            indent: 10,
            lineGap: 1.5,
          });
        }
        doc.moveDown(0.3);
      }
    }

    if ((resume.skills || []).length > 0) {
      drawHeading(labels.skills);
      for (const group of resume.skills) {
        if (!group.items?.length) continue;
        doc
          .font(boldFont)
          .fontSize(10)
          .fillColor('#111827')
          .text(`${group.category}: `, { continued: true })
          .font(regularFont)
          .fillColor('#1F2937')
          .text(group.items.join(', '));
      }
    }

    if ((resume.education || []).length > 0) {
      drawHeading(labels.education);
      for (const edu of resume.education) {
        const degree = [edu.degree, edu.field].filter(Boolean).join(' in ');
        const line = [degree, edu.institution].filter(Boolean).join(' — ');
        const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' – ');
        doc.font(boldFont).fontSize(10).fillColor('#111827').text(line);
        if (dates) {
          doc.font(italicFont).fontSize(9).fillColor('#4B5563').text(dates);
        }
        for (const detail of edu.details || []) {
          doc.font(regularFont).fontSize(9.5).fillColor('#1F2937').text(`•  ${detail}`, {
            indent: 10,
          });
        }
        doc.moveDown(0.25);
      }
    }

    if ((resume.certifications || []).length > 0) {
      drawHeading(labels.certifications);
      for (const cert of resume.certifications) {
        const line = [cert.name, cert.issuer, cert.date ? `(${cert.date})` : '']
          .filter(Boolean)
          .join(' — ');
        doc.font(regularFont).fontSize(10).fillColor('#1F2937').text(`•  ${line}`, {
          indent: 10,
        });
      }
    }

    for (const extra of resume.extraSections || []) {
      if (!extra.title && !extra.items?.length) continue;
      drawHeading(String(extra.title || 'ADDITIONAL').toUpperCase());
      for (const item of extra.items || []) {
        doc.font(regularFont).fontSize(10).fillColor('#1F2937').text(`•  ${item}`, {
          indent: 10,
        });
      }
    }

    doc.end();
  });
}
