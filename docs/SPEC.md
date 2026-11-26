# Conversational Resume Optimization System — Build Spec

## Goal

A chat app where a user uploads a resume (PDF/DOCX) and improves it by chatting, e.g.:

- "Optimize my resume for Google"
- "Translate this to Spanish for the Mexican market"
- "Update my experience section to better match this job description: <JD>"
- "Make my skills section more relevant for a data scientist role"
  A router sends each message to specialized agents. Multi-step requests run several agents in order.
  Every change creates a resume version that can be undone, redone, and compared.

## Stack (fixed — do not substitute)

- Monorepo: `/server` (Node.js 20+, Express, JavaScript, ES modules) and `/client` (React 18 + Vite, JavaScript, Tailwind CSS)
- Agent orchestration: LangChain.js + LangGraph.js (`@langchain/langgraph`, `@langchain/core`)
- LLM: Google Gemini via `@langchain/google-genai`
  - `gemini-2.5-flash` for routing, classification, summaries
  - `gemini-2.5-pro` for rewriting/translation/analysis
  - Model names come from env vars so they can be changed without code edits
- Embeddings: Gemini embedding model via `GoogleGenerativeAIEmbeddings`; Pinecone index dimension must match the embedding size (set both from env)
- Vector DB: Pinecone (`@pinecone-database/pinecone`, `@langchain/pinecone`), one namespace per conversation
- Database: Firebase Firestore via `firebase-admin` (conversations, messages, resume versions)
- Web search: Tavily (`@langchain/tavily`) for company research and local hiring conventions
- File parsing: `multer` (memory storage, 5 MB limit), `pdf-parse` for PDF, `mammoth` for DOCX
- Validation: `zod` for all LLM structured outputs and request bodies
- Streaming: Server-Sent Events (SSE) for typing indicator, agent steps, and tokens
- Export: `docx` package for DOCX download, `pdfkit` (or HTML -> print) for PDF
- Diffing: `diff` package (server computes change summary; client renders side-by-side diff)

## Resume data model (canonical JSON — all agents read/write this, never raw text)

{
basics: { name, email, phone, location, links: [ { label, url } ], summary },
experience: [ { id, company, title, location, startDate, endDate, bullets: [string] } ],
education: [ { id, institution, degree, field, startDate, endDate, details: [string] } ],
skills: [ { category, items: [string] } ],
projects: [ { id, name, description, tech: [string], bullets: [string] } ],
certifications: [ { name, issuer, date } ],
extraSections: [ { title, items: [string] } ],
meta: { language: "en", locale: "en-US", targetRole: null, targetCompany: null }
}
Parsing flow: extract raw text -> Gemini structured output (zod schema) -> canonical JSON.
Agents must never invent employers, dates, degrees, or metrics. If a metric is missing, use a placeholder like "[X%]" and tell the user to fill it.

## Agents (all 4 implemented)

1. Company Research & Optimization Agent
   - Tavily search: company values, culture, engineering blog, recent news, hiring signals
   - Builds a short "company profile" (values, keywords, tone), cached in Firestore per company for 7 days
   - Rewrites summary + bullets to reflect those values; adjusts tone and emphasis
2. Job Description Matching Agent
   - Input: JD text from the message, or a previously shared JD stored in the conversation
   - Extracts required/preferred skills, responsibilities, seniority
   - Embeds resume chunks + JD into Pinecone; retrieves best-matching bullets per requirement
   - Outputs: match score 0-100 (weighted: required skills 50, responsibilities 30, seniority/experience 20), matched skills, missing skills (skill gaps), suggestions
   - Restructures/rewrites the requested section(s) to highlight relevant experience
3. Translation & Localization Agent
   - Translates the full resume JSON into the target language and locale (e.g., es-MX)
   - Tavily search for local hiring conventions (photo, personal data, length, date formats, "CV" vs "resume")
   - Adapts headings, date formats, section order; returns a list of localization notes
   - Keeps proper nouns, company names, tech terms untranslated where conventional
4. Section Enhancement Agent
   - Improves a specific section (or all) on request
   - Strong action verbs, quantification placeholders, impact statements (XYZ formula)
   - Consistency pass: tense, date format, punctuation, bullet length across the whole document

## Orchestration (LangGraph StateGraph)

State: { conversationId, userMessage, history, summary, resume (current JSON), currentVersionId,
plan: [ { agent, instructions } ], stepResults: [], pendingClarification, finalResponse }

Nodes:

- loadContext: fetch conversation, rolling summary, last 8 messages, current resume version, stored JD/company
- router (gemini-2.5-flash, structured output):
  { intents: [ "company_optimize" | "jd_match" | "translate" | "enhance_section" | "question" | "undo" | "redo" | "compare" | "smalltalk" ],
  plan: ordered steps with agent + instructions + targetSections,
  needsClarification: boolean, clarificationQuestion: string | null,
  entities: { company, targetRole, language, locale, sections, jdText } }
- clarify: if needsClarification (e.g., "match this JD" but no JD given, ambiguous company), ask one question and stop
- executor: runs plan steps in order; each step receives the resume output of the previous step
  (e.g., "Optimize for Google and translate to Spanish" = company_optimize -> translate)
- qa: answers questions about the resume or past changes without modifying it
- commitVersion: save new resume version + change summary + diff + agent reasoning to Firestore
- respond: final chat reply = what changed, why (short reasoning), match score / gaps / localization notes if any, and a follow-up suggestion
  Undo/redo/compare are handled directly (no LLM) by moving the version pointer.

## Context engineering

- Never send the whole chat history. Send: rolling summary (updated every 6 messages by flash model) + last 8 messages + current resume JSON + only the retrieved Pinecone chunks needed
- Each agent has its own system prompt in `/server/src/prompts/*.js`, with: role, hard rules (no fabrication), input format, output zod schema
- Each agent returns { updatedResume, changes: [ { section, before, after, reason } ], reasoning (2-4 bullets, user-facing), extras }
- Temperature: 0 for router/scoring, 0.4 for rewriting
- Retries: 2 retries on schema validation failure, with the validation error fed back to the model

## Firestore data model

conversations/{conversationId}
{ title, createdAt, updatedAt, currentVersionId, versionStack: [versionIds], redoStack: [versionIds], summary, activeJd, activeCompany }
conversations/{id}/messages/{messageId}
{ role: "user" | "assistant" | "system", content, agentTrace: [ { agent, status, reasoning, durationMs } ], versionId, createdAt }
conversations/{id}/versions/{versionId}
{ versionNumber, resume (JSON), createdBy: "upload" | agent name, changeSummary, changes[], parentVersionId, createdAt }
companyProfiles/{companySlug}
{ profile, sources: [urls], fetchedAt }
No auth required; use an anonymous `clientId` stored in localStorage and saved on each conversation.

## REST + SSE API (prefix /api)

- POST /conversations -> create conversation
- GET /conversations?clientId= -> list
- GET /conversations/:id -> conversation + messages + current resume
- POST /conversations/:id/resume -> multipart upload (field "file"), parse, create version 1
- POST /conversations/:id/messages -> body { content }; responds as SSE stream
  events: `status` (typing/thinking), `route` (plan), `agent_start`, `agent_step`, `agent_end`, `token`, `version`, `done`, `error`
- GET /conversations/:id/versions -> list versions (no full resume body)
- GET /conversations/:id/versions/:vid -> full version
- POST /conversations/:id/undo | /redo -> move pointer, return current version
- GET /conversations/:id/compare?from=&to= -> structured diff per section
- GET /conversations/:id/export?format=pdf|docx&versionId=
- GET /health
  Central error handler, request validation with zod, rate limit (express-rate-limit), helmet, cors (client origin from env).

## Frontend (React + Vite + Tailwind)

Layout: left sidebar (conversations), center chat, right panel (resume preview).

- Upload dropzone (PDF/DOCX) when conversation has no resume
- Chat: markdown messages, typing indicator, live "agent activity" timeline per assistant message (router plan -> each agent start/finish with reasoning, collapsible)
- Suggested prompt chips (the 4 example prompts)
- JD input: user can paste JD in chat; long pastes shown collapsed
- Right panel tabs: Preview (rendered resume), Changes (side-by-side diff of last change, highlighted), Versions (timeline with Compare any two, Restore)
- Undo / Redo buttons in panel header
- Match score card (radial score, matched vs missing skills chips) when JD agent runs
- Export buttons (PDF / DOCX)
- SSE via fetch + ReadableStream (POST body), not EventSource
- State: React Context + useReducer (no Redux)
- Clean, minimal UI, responsive, dark/light toggle

## Folder structure

/server
src/
index.js, app.js
config/ (env.js, firebase.js, llm.js, pinecone.js)
routes/ controllers/ services/ (parser, versioning, diff, export, vectorStore, companyCache)
agents/ (companyAgent.js, jdMatchAgent.js, translationAgent.js, sectionAgent.js)
graph/ (state.js, router.js, nodes/\*.js, graph.js)
prompts/ schemas/ (zod) middleware/ utils/
.env.example
/client
src/ (api/, components/, context/, hooks/, pages/, lib/)
.env.example
/docs
SPEC.md, ARCHITECTURE.md (with mermaid diagram), RESPONSIBLE_AI.md
README.md (root)
sample/ (sample resume PDF + sample JD for the demo)

## Env vars

server: PORT, CLIENT_ORIGIN, GOOGLE_API_KEY, GEMINI_FAST_MODEL, GEMINI_PRO_MODEL, GEMINI_EMBED_MODEL,
PINECONE_API_KEY, PINECONE_INDEX, EMBED_DIMENSION, TAVILY_API_KEY,
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
client: VITE_API_BASE_URL

## Quality bar

- Runs with `npm install` + `npm run dev` from root (use npm workspaces + concurrently)
- No hardcoded keys; clear errors if an env var is missing
- Structured logs (pino) including per-agent timings
- Basic tests (vitest) for router parsing, versioning (undo/redo), diff service
