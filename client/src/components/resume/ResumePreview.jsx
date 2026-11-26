import { Fragment } from 'react';

const HEADING_MAP = {
  en: {
    summary: 'Summary',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    education: 'Education',
    certifications: 'Certifications',
  },
  es: {
    summary: 'Resumen',
    experience: 'Experiencia',
    projects: 'Proyectos',
    skills: 'Habilidades',
    education: 'Educación',
    certifications: 'Certificaciones',
  },
  fr: {
    summary: 'Profil',
    experience: 'Expérience',
    projects: 'Projets',
    skills: 'Compétences',
    education: 'Formation',
    certifications: 'Certifications',
  },
  de: {
    summary: 'Profil',
    experience: 'Berufserfahrung',
    projects: 'Projekte',
    skills: 'Kompetenzen',
    education: 'Ausbildung',
    certifications: 'Zertifizierungen',
  },
  pt: {
    summary: 'Resumo',
    experience: 'Experiência',
    projects: 'Projetos',
    skills: 'Habilidades',
    education: 'Formação',
    certifications: 'Certificações',
  },
};

function renderWithPlaceholders(text) {
  const parts = String(text || '').split(/(\[X%?\]|\[[^\]]*X[^\]]*\])/g);
  return parts.map((part, idx) =>
    /^\[.*X.*\]$/.test(part) ? (
      <mark
        key={idx}
        className="rounded bg-amber-100 px-1 font-mono text-xs font-semibold text-amber-900 dark:bg-amber-900/50 dark:text-amber-200"
        title="Fill in this metric before exporting"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={idx}>{part}</Fragment>
    )
  );
}

export function ResumePreview({ resume }) {
  if (!resume) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Upload a PDF or DOCX resume in the chat pane to preview it here.
      </div>
    );
  }

  const lang = (resume.meta?.language || 'en').toLowerCase().split(/[-_]/)[0];
  const labels = HEADING_MAP[lang] || HEADING_MAP.en;
  const basics = resume.basics || {};
  const contactParts = [
    basics.location,
    basics.email,
    basics.phone,
    ...(basics.links || []).map((l) => l.url || l.label),
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-xl font-bold tracking-tight">{basics.name || 'Unnamed Resume'}</h2>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
            {resume.meta?.locale && (
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {resume.meta.locale}
              </span>
            )}
            {resume.meta?.targetCompany && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                {resume.meta.targetCompany}
              </span>
            )}
            {resume.meta?.targetRole && (
              <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                {resume.meta.targetRole}
              </span>
            )}
          </div>
        </div>
        {contactParts.length > 0 && (
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
            {contactParts.join('  •  ')}
          </p>
        )}
      </header>

      {basics.summary && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {labels.summary}
          </h3>
          <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {renderWithPlaceholders(basics.summary)}
          </p>
        </section>
      )}

      {resume.experience?.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {labels.experience}
          </h3>
          {resume.experience.map((exp) => (
            <div key={exp.id} className="space-y-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-semibold">
                  {exp.title} <span className="font-normal text-slate-600 dark:text-slate-400">— {exp.company}</span>
                </div>
                <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {[exp.startDate, exp.endDate].filter(Boolean).join(' – ')}
                </div>
              </div>
              {exp.location && (
                <div className="text-xs text-slate-500 dark:text-slate-400">{exp.location}</div>
              )}
              {exp.bullets?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {exp.bullets.map((b, i) => (
                    <li key={i}>{renderWithPlaceholders(b)}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {resume.projects?.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {labels.projects}
          </h3>
          {resume.projects.map((proj) => (
            <div key={proj.id} className="space-y-1">
              <div className="text-sm font-semibold">
                {proj.name}
                {proj.description && (
                  <span className="font-normal text-slate-600 dark:text-slate-400">
                    {' '}
                    — {proj.description}
                  </span>
                )}
              </div>
              {proj.tech?.length > 0 && (
                <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {proj.tech.join(', ')}
                </div>
              )}
              {proj.bullets?.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {proj.bullets.map((b, i) => (
                    <li key={i}>{renderWithPlaceholders(b)}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {resume.skills?.length > 0 && (
        <section className="space-y-1.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {labels.skills}
          </h3>
          <div className="space-y-1 text-sm">
            {resume.skills.map((group, idx) => (
              <div key={idx}>
                <span className="font-semibold">{group.category}: </span>
                <span className="text-slate-700 dark:text-slate-300">
                  {(group.items || []).join(', ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {resume.education?.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {labels.education}
          </h3>
          {resume.education.map((edu) => (
            <div key={edu.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {[edu.degree, edu.field].filter(Boolean).join(' in ')} — {edu.institution}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                </span>
              </div>
              {edu.details?.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-400">
                  {edu.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {resume.certifications?.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {labels.certifications}
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {resume.certifications.map((cert, i) => (
              <li key={i}>
                {[cert.name, cert.issuer, cert.date ? `(${cert.date})` : '']
                  .filter(Boolean)
                  .join(' — ')}
              </li>
            ))}
          </ul>
        </section>
      )}

      {resume.extraSections?.map((sec, idx) => (
        <section key={idx} className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {sec.title}
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
            {(sec.items || []).map((item, i) => (
              <li key={i}>{renderWithPlaceholders(item)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
