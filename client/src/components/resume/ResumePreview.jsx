import { Fragment } from 'react';

const HEADING_MAP = {
  en: {
    summary: 'Professional Summary',
    experience: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    education: 'Education',
    certifications: 'Certifications',
  },
  es: {
    summary: 'Resumen Profesional',
    experience: 'Experiencia Laboral',
    projects: 'Proyectos',
    skills: 'Habilidades',
    education: 'Educación',
    certifications: 'Certificaciones',
  },
  fr: {
    summary: 'Profil Professionnel',
    experience: 'Expérience Professionnelle',
    projects: 'Projets',
    skills: 'Compétences',
    education: 'Formation',
    certifications: 'Certifications',
  },
  de: {
    summary: 'Berufsprofil',
    experience: 'Berufserfahrung',
    projects: 'Projekte',
    skills: 'Kompetenzen',
    education: 'Ausbildung',
    certifications: 'Zertifizierungen',
  },
  pt: {
    summary: 'Resumo Profissional',
    experience: 'Experiência Profissional',
    projects: 'Projetos',
    skills: 'Habilidades',
    education: 'Formação Acadêmica',
    certifications: 'Certificações',
  },
};

function renderWithPlaceholders(text) {
  const parts = String(text || '').split(/(\[X%?\]|\[[^\]]*X[^\]]*\])/g);
  return parts.map((part, idx) =>
    /^\[.*X.*\]$/.test(part) ? (
      <mark
        key={idx}
        className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px] font-semibold text-amber-900"
        title="Fill in this metric before exporting"
      >
        {part}
      </mark>
    ) : (
      <Fragment key={idx}>{part}</Fragment>
    )
  );
}

export function ResumePreview({ resume, versionNumber }) {
  if (!resume) {
    return (
      <div className="mx-auto max-w-[660px] space-y-4">
        <div className="flex items-center justify-between px-1 font-mono text-[11px] text-slate-500 dark:text-[#94A3B8]">
          <span>PROOF SHEET · AWAITING UPLOAD</span>
          <span>ATS SINGLE-COLUMN</span>
        </div>
        <div className="flex min-h-[540px] flex-col justify-between space-y-6 rounded-[4px] border border-slate-200 bg-white p-7 text-slate-900 shadow-[0_24px_48px_rgba(0,0,0,0.55)] dark:border-white/10">
          <div className="space-y-5">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-[20px] font-bold tracking-tight text-slate-950">
                Canonical Resume Proof Sheet
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Upload a PDF or DOCX in the chat pane to render your verified resume here.
              </p>
            </div>
            <ol className="space-y-4 text-xs leading-relaxed text-slate-700">
              <li className="border-b border-slate-100 pb-3">
                <strong className="block text-slate-950">1. Structured extraction</strong>
                Facts, dates, and employers are parsed verbatim into canonical JSON as Version 1.
              </li>
              <li className="border-b border-slate-100 pb-3">
                <strong className="block text-slate-950">2. Agent optimization</strong>
                Tailor for a target company, score against a job description, localize to another
                market, or sharpen impact with{' '}
                <span className="rounded bg-amber-100 px-1 font-mono text-[11px] font-semibold text-amber-900">
                  [X%]
                </span>{' '}
                placeholders.
              </li>
              <li>
                <strong className="block text-slate-950">3. Reversible diffs &amp; export</strong>
                Compare any two versions side-by-side, undo/redo instantly, and export clean PDF or
                DOCX.
              </li>
            </ol>
          </div>
          <div className="border-t border-slate-200 pt-3 font-mono text-[11px] text-slate-500">
            NO FABRICATION · SINGLE-COLUMN ATS LAYOUT
          </div>
        </div>
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
    <div className="mx-auto max-w-[660px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[11px] text-slate-500 dark:text-[#94A3B8]">
        <span>
          PROOF SHEET {versionNumber ? `· v${versionNumber}` : ''}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {resume.meta?.locale && (
            <span className="rounded border border-slate-300 px-1.5 py-0.5 text-slate-700 dark:border-[#2A303E] dark:text-slate-200">
              {resume.meta.locale}
            </span>
          )}
          {resume.meta?.targetCompany && (
            <span className="rounded border border-slate-300 px-1.5 py-0.5 text-slate-700 dark:border-[#2A303E] dark:text-white">
              {resume.meta.targetCompany}
            </span>
          )}
          {resume.meta?.targetRole && (
            <span className="rounded border border-slate-300 px-1.5 py-0.5 text-slate-700 dark:border-[#2A303E] dark:text-slate-200">
              {resume.meta.targetRole}
            </span>
          )}
        </div>
      </div>

      {/* Crisp pure-white ATS Proof Sheet anchored on the dark conservation bench */}
      <article className="space-y-5 rounded-[4px] border border-slate-200 bg-white px-7 py-8 text-slate-900 shadow-[0_24px_48px_rgba(0,0,0,0.55)] dark:border-white/10">
        <header className="border-b border-slate-200 pb-4">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-950">
            {basics.name || 'Unnamed Resume'}
          </h2>
          {contactParts.length > 0 && (
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              {contactParts.join('  •  ')}
            </p>
          )}
        </header>

        {basics.summary && (
          <section>
            <h3 className="mb-1.5 border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {labels.summary}
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-800">
              {renderWithPlaceholders(basics.summary)}
            </p>
          </section>
        )}

        {resume.experience?.length > 0 && (
          <section className="space-y-3">
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {labels.experience}
            </h3>
            {resume.experience.map((exp) => (
              <div key={exp.id} className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-[13.5px] font-semibold text-slate-950">
                    {exp.title}{' '}
                    <span className="font-normal text-slate-600">— {exp.company}</span>
                  </div>
                  <div className="font-mono text-[11.5px] tabular-nums text-slate-500">
                    {[exp.startDate, exp.endDate].filter(Boolean).join(' – ')}
                  </div>
                </div>
                {exp.location && <div className="text-xs text-slate-500">{exp.location}</div>}
                {exp.bullets?.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-800">
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
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {labels.projects}
            </h3>
            {resume.projects.map((proj) => (
              <div key={proj.id} className="space-y-1">
                <div className="text-[13.5px] font-semibold text-slate-950">
                  {proj.name}
                  {proj.description && (
                    <span className="font-normal text-slate-600"> — {proj.description}</span>
                  )}
                </div>
                {proj.tech?.length > 0 && (
                  <div className="font-mono text-[11.5px] text-slate-500">
                    {proj.tech.join(', ')}
                  </div>
                )}
                {proj.bullets?.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-800">
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
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {labels.skills}
            </h3>
            <div className="space-y-1 pt-0.5 text-[13px] text-slate-800">
              {resume.skills.map((group, idx) => (
                <div key={idx}>
                  <span className="font-semibold text-slate-950">{group.category}: </span>
                  <span>{(group.items || []).join(', ')}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {resume.education?.length > 0 && (
          <section className="space-y-2">
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {labels.education}
            </h3>
            {resume.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-slate-950">
                    {[edu.degree, edu.field].filter(Boolean).join(' in ')} — {edu.institution}
                  </span>
                  <span className="font-mono text-[11.5px] tabular-nums text-slate-500">
                    {[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}
                  </span>
                </div>
                {edu.details?.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
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
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {labels.certifications}
            </h3>
            <ul className="list-disc space-y-1 pl-5 pt-0.5 text-[13px] text-slate-800">
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
            <h3 className="border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-700">
              {sec.title}
            </h3>
            <ul className="list-disc space-y-1 pl-5 pt-0.5 text-[13px] text-slate-800">
              {(sec.items || []).map((item, i) => (
                <li key={i}>{renderWithPlaceholders(item)}</li>
              ))}
            </ul>
          </section>
        ))}
      </article>
    </div>
  );
}
