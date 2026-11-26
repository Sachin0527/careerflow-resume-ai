# Responsible AI & Verification Log

> **Template Notice**: Sections marked `[TO BE COMPLETED BY AUTHOR]` should be reviewed and filled in with your own project notes and screenshots/logs before submission.

---

## 1. AI Tools Used

- **Development Assistant**: Antigravity IDE agentic coding assistant
- **Coding / Planning Models**: <!-- [TO BE COMPLETED BY AUTHOR] e.g., Gemini 2.5 Pro / Claude Sonnet / etc. -->
- **Runtime Application Models**:
  - `gemini-3-flash-preview` (`GEMINI_FAST_MODEL`): intent routing, resume parsing, JD requirement extraction, ATS scoring, rolling summaries, Q&A
  - `gemini-3-flash-preview` (`GEMINI_PRO_MODEL`): company-tailored rewrites, JD alignment rewrites, translation/localization, section enhancement
  - `gemini-embedding-001` (`GEMINI_EMBED_MODEL`): semantic embeddings for Pinecone chunk retrieval
- **Search Grounding**: Tavily Search (`@langchain/tavily`) for live company culture research and local CV hiring conventions

---

## 2. Authorship: AI-Generated vs. Written / Reviewed by Me

| Component | AI-Generated | Reviewed / Modified by Me | Notes |
|---|---|---|---|
| System specification & constraints | — | `docs/SPEC.md` | `[TO BE COMPLETED BY AUTHOR]` |
| Express API, versioning, diff & export | Scaffolded with AI | Reviewed & verified | `[TO BE COMPLETED BY AUTHOR]` |
| Agent prompts & Zod schemas | Drafted with AI | Reviewed rules & thresholds | `[TO BE COMPLETED BY AUTHOR]` |
| LangGraph StateGraph & SSE stream | Scaffolded with AI | Tested routing & edge cases | `[TO BE COMPLETED BY AUTHOR]` |
| React UI & Tailwind workspace | Scaffolded with AI | Checked UX, diffs & exports | `[TO BE COMPLETED BY AUTHOR]` |

---

## 3. How Outputs Were Verified

- **Automated Checks**:
  - `npm run lint` (ESLint across `/server`, `/client`, and `/sample`)
  - `npm test` (Vitest suite covering router parsing/clarifications, graph orchestration & SSE, all 4 agents, env validation, versioning undo/redo/compare, diffing, export PDF/DOCX, and hardening timeouts/fallbacks)
  - `npm run build --workspace=client` (Vite production bundle check)
- **Manual / End-to-End Verification**:
  - `node server/scripts/try-agents.js` against `sample/sample-resume.pdf` and `sample/sample-jd.txt`
  - `[TO BE COMPLETED BY AUTHOR: Describe live end-to-end tests you ran with your real API keys, e.g., uploading your resume, inspecting v1 -> v2 diffs, exporting PDF/DOCX, and verifying no fabricated dates/employers appeared.]`

---

## 4. Hallucination Guards Built Into the System

1. **Canonical JSON Boundary**: Agents receive and emit a strict Zod schema (`server/src/schemas/resume.js`) rather than unstructured markdown, preventing accidental structural corruption or dropped fields.
2. **Explicit Anti-Fabrication Hard Rules**: Every system prompt (`server/src/prompts/*.js`) explicitly forbids inventing or altering employers, dates, job titles, degrees, institutions, certifications, or metrics.
3. **Metric Placeholder Policy (`[X]` / `[X%]`)**: When an achievement lacks a measurable outcome, `sectionAgent` and other rewrite prompts insert `[X]` or `[X%]` placeholders rather than fabricating numbers, and the UI highlights these placeholders in amber so the user fills them in manually.
4. **Skill Gap Separation**: `jdMatchAgent` reports missing JD qualifications in `extras.missingSkills` rather than injecting unverified skills into the candidate's `skills` array.
5. **Schema Validation Retries**: `invokeWithSchemaRetry` validates every structured LLM output with Zod and feeds exact validation errors back up to 2 times without relaxing rules.
6. **Grounding & Graceful Fallback**: Web research (`companyAgent`, `translationAgent`) uses Tavily citations when available and explicitly discloses in `reasoning` / `localizationNotes` when falling back due to search unavailability (skipping 7-day caching on fallback).
7. **Full Auditability & Reversibility**: Every assistant turn records `agentTrace`, per-change `before`/`after`/`reason`, and section-level diffs, with one-click Undo/Redo/Restore.

---

## 5. Data Privacy & Retention Notes

- **Resume PII**: Uploaded resumes contain personally identifiable information (name, email, phone, location, employment history). Files are parsed in-memory (`multer.memoryStorage()`, 5 MB limit) and never written to server disk.
- **Third-Party Processing**: Extracted resume text/JSON is sent to Google Gemini APIs for parsing and optimization, and chunk embeddings are stored in Pinecone (`namespace = conversationId`). Ensure API accounts used in production are configured under zero-data-retention / no-training API terms.
- **Anonymous Sessions & Deletion**: Conversations use an anonymous `clientId` stored in browser `localStorage` (no passwords or OAuth tokens). Deleting a conversation (`DELETE /api/conversations/:id`) recursively deletes Firestore messages/versions and triggers `deleteConversationNamespace` in Pinecone.
- **Retention**: `[TO BE COMPLETED BY AUTHOR: Specify your deployment's retention policy and whether Firestore TTL / scheduled cleanup is enabled.]`

---

## 6. Prompt & Trace Archive

Exported prompt templates, sample inputs/outputs, and trace logs are stored in:
- [docs/ai-traces/](file:///f:/Sachin/careerflow-resume-ai/docs/ai-traces/README.md) (`docs/ai-traces/`)
