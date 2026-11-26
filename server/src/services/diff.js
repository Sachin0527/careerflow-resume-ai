import { diffLines } from 'diff';

const SECTION_ORDER = [
  'basics',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
  'extraSections',
  'meta',
];

/**
 * Convert a single resume section into deterministic plain-text lines for accurate diffing.
 */
export function formatResumeSection(resume, section) {
  if (!resume) return '';
  switch (section) {
    case 'basics': {
      const b = resume.basics || {};
      const links = (b.links || []).map((l) => `${l.label}: ${l.url}`).join(' | ');
      return [
        `Name: ${b.name || ''}`,
        `Email: ${b.email || ''}`,
        `Phone: ${b.phone || ''}`,
        `Location: ${b.location || ''}`,
        `Links: ${links}`,
        `Summary: ${b.summary || ''}`,
      ].join('\n');
    }
    case 'experience':
      return (resume.experience || [])
        .map((exp) =>
          [
            `[${exp.id}] ${exp.title} @ ${exp.company} (${exp.startDate} - ${exp.endDate}) | ${exp.location}`,
            ...(exp.bullets || []).map((bullet) => `  - ${bullet}`),
          ].join('\n')
        )
        .join('\n\n');
    case 'education':
      return (resume.education || [])
        .map((edu) =>
          [
            `[${edu.id}] ${edu.degree} in ${edu.field} - ${edu.institution} (${edu.startDate} - ${edu.endDate})`,
            ...(edu.details || []).map((d) => `  - ${d}`),
          ].join('\n')
        )
        .join('\n\n');
    case 'skills':
      return (resume.skills || [])
        .map((group) => `${group.category}: ${(group.items || []).join(', ')}`)
        .join('\n');
    case 'projects':
      return (resume.projects || [])
        .map((proj) =>
          [
            `[${proj.id}] ${proj.name}: ${proj.description}`,
            `  Tech: ${(proj.tech || []).join(', ')}`,
            ...(proj.bullets || []).map((b) => `  - ${b}`),
          ].join('\n')
        )
        .join('\n\n');
    case 'certifications':
      return (resume.certifications || [])
        .map((cert) => `${cert.name} | ${cert.issuer} (${cert.date})`)
        .join('\n');
    case 'extraSections':
      return (resume.extraSections || [])
        .map((sec) => [`${sec.title}:`, ...(sec.items || []).map((i) => `  - ${i}`)].join('\n'))
        .join('\n\n');
    case 'meta': {
      const m = resume.meta || {};
      return [
        `Language: ${m.language || ''}`,
        `Locale: ${m.locale || ''}`,
        `Target Role: ${m.targetRole ?? ''}`,
        `Target Company: ${m.targetCompany ?? ''}`,
      ].join('\n');
    }
    default:
      return '';
  }
}

/**
 * Compute structured per-section diff between two canonical resume JSON objects.
 */
export function compareResumes(fromResume, toResume) {
  const sections = SECTION_ORDER.map((section) => {
    const beforeText = formatResumeSection(fromResume, section);
    const afterText = formatResumeSection(toResume, section);

    const hunks = diffLines(beforeText, afterText).map((part) => ({
      value: part.value,
      added: Boolean(part.added),
      removed: Boolean(part.removed),
      count: part.count ?? 0,
    }));

    const changed = hunks.some((h) => h.added || h.removed);
    const addedLines = hunks.filter((h) => h.added).reduce((sum, h) => sum + h.count, 0);
    const removedLines = hunks.filter((h) => h.removed).reduce((sum, h) => sum + h.count, 0);

    return {
      section,
      changed,
      addedLines,
      removedLines,
      beforeText,
      afterText,
      hunks,
    };
  });

  const changedSections = sections.filter((s) => s.changed).map((s) => s.section);
  const summary =
    changedSections.length === 0
      ? 'No differences detected'
      : `Changed ${changedSections.join(', ')} (${changedSections.length} section${
          changedSections.length === 1 ? '' : 's'
        })`;

  return {
    summary,
    changedSections,
    sections,
  };
}
