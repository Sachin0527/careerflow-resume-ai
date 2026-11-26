import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, 'sample-resume.pdf');

const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
const stream = fs.createWriteStream(outPath);
doc.pipe(stream);

doc.font('Helvetica-Bold').fontSize(18).text('Alex Rivera');
doc
  .font('Helvetica')
  .fontSize(10)
  .text('San Francisco, CA | alex.rivera@example.com | (415) 555-0192 | github.com/alexrivera | linkedin.com/in/alexrivera');

doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(12).text('SUMMARY');
doc
  .font('Helvetica')
  .fontSize(10)
  .text(
    'Full-stack software engineer with 5 years of experience building distributed backend APIs, cloud-native data pipelines, and responsive React web applications. Passionate about developer tooling, observability, and low-latency systems.'
  );

doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(12).text('EXPERIENCE');

doc.moveDown(0.3);
doc.font('Helvetica-Bold').fontSize(10.5).text('Senior Software Engineer — CloudScale Inc. (San Francisco, CA)');
doc.font('Helvetica-Oblique').fontSize(9.5).text('Mar 2023 – Present');
doc.font('Helvetica').fontSize(10);
doc.text('• Designed Node.js and Go microservices handling 12,000 requests/sec with 99.95% availability.');
doc.text('• Reduced p95 API latency by 38% by introducing Redis read-through caching and query batching.');
doc.text('• Led migration of 14 legacy REST endpoints to typed schemas and automated CI contract tests.');

doc.moveDown(0.5);
doc.font('Helvetica-Bold').fontSize(10.5).text('Software Engineer — FinPulse Technologies (Austin, TX)');
doc.font('Helvetica-Oblique').fontSize(9.5).text('Jul 2021 – Feb 2023');
doc.font('Helvetica').fontSize(10);
doc.text('• Built customer analytics dashboards in React 18, TypeScript, and Tailwind CSS used by 40,000+ monthly users.');
doc.text('• Implemented event-driven webhook ingestion pipelines using PostgreSQL and Google Cloud Pub/Sub.');
doc.text('• Mentored 3 junior engineers through weekly code reviews and architecture design sessions.');

doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(12).text('PROJECTS');
doc.moveDown(0.3);
doc.font('Helvetica-Bold').fontSize(10.5).text('TraceLite — Open-Source Request Profiler');
doc.font('Helvetica').fontSize(10);
doc.text('Tech: Node.js, React, SQLite, OpenTelemetry');
doc.text('• Built a lightweight local trace viewer capturing Express middleware timings and SQL spans.');

doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(12).text('SKILLS');
doc.font('Helvetica').fontSize(10);
doc.text('Languages: JavaScript, TypeScript, Go, Python, SQL');
doc.text('Frameworks & Cloud: Node.js, Express, React, Tailwind CSS, Docker, GCP, PostgreSQL, Redis');

doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(12).text('EDUCATION');
doc.font('Helvetica-Bold').fontSize(10.5).text('B.S. in Computer Science — University of Texas at Austin');
doc.font('Helvetica-Oblique').fontSize(9.5).text('2017 – 2021');
doc.font('Helvetica').fontSize(10).text('• Relevant coursework: Distributed Systems, Algorithms, Database Management');

doc.moveDown(0.8);
doc.font('Helvetica-Bold').fontSize(12).text('CERTIFICATIONS');
doc.font('Helvetica').fontSize(10).text('Google Cloud Professional Cloud Developer — Google Cloud (2024)');

doc.end();

stream.on('finish', () => {
  console.log(`Generated ${outPath}`);
});
