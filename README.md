# CareerFlow Resume AI

A conversational resume optimization system where users upload a resume (PDF or DOCX) and iteratively tailor, match, translate, and enhance it through natural-language chat. Every request is routed by a LangGraph.js `StateGraph` across specialized AI agents operating on a canonical structured JSON resume model, with reversible version history, side-by-side diffs, and ATS-friendly PDF/DOCX export.

---

## Features

- **Structured Resume Parsing**: Extracts text from PDF (`pdf-parse`) and DOCX (`mammoth`) and converts it into a strict Zod-validated canonical JSON resume (`basics`, `experience`, `education`, `skills`, `projects`, `certifications`, `extraSections`, `meta`) with up to 2 validation-error retries.
- **4 Specialized AI Agents**:
  1. **Company Research & Optimization Agent**: Searches Tavily (values, engineering blog, hiring signals, news), caches company profiles in Firestore for 7 days, and tailors summary and experience bullets.
  2. **Job Description Matching Agent**: Extracts requirements, indexes resume & JD chunks into Pinecone (one namespace per conversation), maps requirements to resume bullets, computes a weighted 0–100 score (`required skills 50%`, `responsibilities 30%`, `seniority 20%`), identifies skill gaps, and rewrites target sections.
  3. **Translation & Localization Agent**: Researches local hiring conventions via Tavily, translates and localizes the full resume JSON (e.g., `es-MX`), updates `meta.language`/`meta.locale`, and surfaces `localizationNotes`.
  4. **Section Enhancement Agent**: Upgrades requested sections using strong action verbs, XYZ impact framing, and `[X]` / `[X%]` metric placeholders, followed by a whole-document consistency pass.
- **Multi-Agent Chaining & Clarification**: Sequential multi-step execution (e.g., `"Optimize for Google and translate to Spanish"`), plus clarifying questions when a JD, company, or target locale is missing.
- **Live SSE Streaming**: Streams `status`, `route`, `agent_start`, `agent_step`, `agent_end`, `token`, `version`, `done`, and `error` events over `POST /api/conversations/:id/messages` via `fetch` + `ReadableStream`.
- **Reversible Versioning & Diffing**: Non-destructive version stack with Undo, Redo, Restore, and per-section side-by-side diffs powered by `diff`.
- **ATS-Friendly Export**: Single-column PDF (`pdfkit`) and DOCX (`docx`) export with localized section headings based on `meta.language`.

---

## Screenshots

> Replace the placeholders below with captures from your local run before publishing.

| Workspace (Chat + Live Resume Preview) | Side-by-Side Diff & Match Score |
|---|---|
| ![Workspace Overview](docs/screenshots/workspace-placeholder.png) | ![Diff and Match Score](docs/screenshots/diff-match-placeholder.png) |

---

## Setup

### Prerequisites

- **Node.js 20+** (verified on Node `v26.13.0` / npm `12.0.2`)
- **Google Gemini API Key** (`GOOGLE_API_KEY`)
- **Tavily API Key** (`TAVILY_API_KEY`)
- **Pinecone Index** (`PINECONE_API_KEY`, `PINECONE_INDEX`)
- **Firebase Project with Firestore enabled**

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Firebase Service Account

1. Open the [Firebase Console](https://console.firebase.google.com/) and create/select a project.
2. Enable **Cloud Firestore** in Native mode.
3. Go to **Project Settings -> Service accounts -> Generate new private key** to download the JSON credentials.
4. Copy `project_id` -> `FIREBASE_PROJECT_ID`, `client_email` -> `FIREBASE_CLIENT_EMAIL`, and `private_key` -> `FIREBASE_PRIVATE_KEY` (keep `\n` escaped in a single-line quoted string inside `server/.env`).

### 3. Configure Pinecone Index

1. Create a Serverless index in the [Pinecone Console](https://app.pinecone.io/) (metric: `cosine`).
2. Set the index dimension to match `EMBED_DIMENSION` and `GEMINI_EMBED_MODEL` in `server/.env`:
   - `gemini-embedding-001` supports `outputDimensionality` (e.g., `768`, `1536`, or `3072`). Both your Pinecone index dimension and `EMBED_DIMENSION` **must** match (`server/src/config/pinecone.js` verifies this at startup).

### 4. Configure Environment Files

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Fill in all keys in `server/.env`:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
GOOGLE_API_KEY=...
GEMINI_FAST_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-2.5-pro
GEMINI_EMBED_MODEL=gemini-embedding-001
PINECONE_API_KEY=...
PINECONE_INDEX=careerflow-resumes
EMBED_DIMENSION=3072
TAVILY_API_KEY=...
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Optional hardening timeouts in `server/.env`:
- `LLM_TIMEOUT_MS` (default `45000`)
- `TAVILY_TIMEOUT_MS` (default `12000`)

---

## Run Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts `/server` (`node --watch`) and `/client` (`vite`) concurrently |
| `npm run lint` | Runs ESLint across `server/`, `client/`, and `sample/` |
| `npm test` | Runs Vitest suite in `/server` |
| `npm run build --workspace=client` | Builds production bundle in `/client/dist` |
| `node server/scripts/try-agents.js` | Runs all 4 agents against `sample/sample-resume.pdf` & `sample/sample-jd.txt` (uses live APIs if `server/.env` is configured, or `--mock` dry-run mode otherwise) |

---

## Folder Structure

```text
/
├── package.json                 # npm workspaces root + concurrently dev/lint/test scripts
├── eslint.config.js             # ESLint v10 flat config for server, client, and sample
├── DEMO_SCRIPT.md               # 5-minute walkthrough script
├── sample/
│   ├── generate-sample.js       # Script that generates sample/sample-resume.pdf
│   ├── sample-resume.pdf        # Demo candidate resume fixture
│   └── sample-jd.txt            # Demo job description fixture
├── docs/
│   ├── SPEC.md                  # Fixed stack, schemas, and feature specification
│   ├── ARCHITECTURE.md          # System + LangGraph mermaid diagrams & tradeoffs
│   ├── RESPONSIBLE_AI.md        # AI authorship, verification, privacy & hallucination guards
│   └── ai-traces/               # Exported prompt/agent trace records
├── server/
│   ├── .env.example
│   ├── vitest.config.js
│   ├── scripts/try-agents.js    # CLI runner exercising all 4 agents
│   ├── tests/                   # Vitest tests (router, graph, agents, versioning, diff, export, hardening, parser, env, app)
│   └── src/
│       ├── index.js             # Server entry point + Pinecone dimension verification
│       ├── app.js               # Express app (helmet, cors, rate-limit, pino request logger, errorHandler)
│       ├── config/              # env.js (Zod startup check), firebase.js, llm.js, pinecone.js
│       ├── schemas/             # resume.js, agentOutput.js, router.js, api.js
│       ├── prompts/             # parser.js, router.js, company.js, jdMatch.js, translation.js, section.js
│       ├── agents/              # companyAgent.js, jdMatchAgent.js, translationAgent.js, sectionAgent.js
│       ├── graph/               # state.js, router.js, graph.js, nodes/* (loadContext, clarify, qa, versionAction, executor, commitVersion, respond)
│       ├── services/            # parser.js, conversation.js, versioning.js, diff.js, export.js, vectorStore.js, companyCache.js
│       ├── controllers/         # conversationController.js, resumeController.js, versionController.js, exportController.js, healthController.js
│       ├── routes/              # index.js, healthRoutes.js, conversationRoutes.js
│       ├── middleware/          # errorHandler.js, validateRequest.js, rateLimiter.js, upload.js
│       └── utils/               # errors.js, logger.js, retryWithSchema.js, streamLlm.js, tavily.js, timeout.js, slugify.js
└── client/
    ├── .env.example
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx, main.jsx, index.css
        ├── api/                 # client.js, conversationsApi.js, sseChat.js (fetch + ReadableStream)
        ├── context/             # AppContext.jsx, appReducer.js
        ├── hooks/               # useTheme.js
        ├── lib/                 # constants.js (API URL, suggested prompt chips, agent labels)
        ├── pages/               # WorkspacePage.jsx (responsive 3-pane layout)
        └── components/
            ├── layout/          # Sidebar.jsx
            ├── chat/            # ChatPane.jsx, ChatInput.jsx, MessageBubble.jsx, AgentTimeline.jsx, MatchScoreCard.jsx, JdPasteBlock.jsx, PromptChips.jsx, UploadDropzone.jsx
            ├── resume/          # RightPanel.jsx, ResumePreview.jsx, DiffViewer.jsx, VersionTimeline.jsx, ExportMenu.jsx
            └── common/          # ThemeToggle.jsx
```

---

## REST & SSE API Reference (Prefix `/api`)

| Method & Path | Description |
|---|---|
| `GET /api/health` | Health check (`{ status: "ok", timestamp, uptimeSeconds }`) |
| `POST /api/conversations` | Create conversation (`{ clientId, title? }`) |
| `GET /api/conversations?clientId=` | List conversations for an anonymous `clientId` |
| `GET /api/conversations/:id` | Fetch conversation metadata, messages, current resume & undo/redo flags |
| `PATCH /api/conversations/:id` | Rename conversation (`{ title }`) |
| `DELETE /api/conversations/:id` | Delete conversation from Firestore & clean up Pinecone namespace |
| `POST /api/conversations/:id/resume` | Multipart upload (`field: "file"`, PDF/DOCX, 5 MB max) -> Version 1 + Pinecone indexing |
| `POST /api/conversations/:id/messages` | Body `{ content }` -> SSE stream (`status`, `route`, `agent_start`, `agent_step`, `agent_end`, `token`, `version`, `done`, `error`) |
| `GET /api/conversations/:id/versions` | List version metadata (without full resume JSON) |
| `GET /api/conversations/:id/versions/:vid` | Fetch full version document |
| `POST /api/conversations/:id/versions/:vid/restore` | Restore a previous version non-destructively as a new version |
| `POST /api/conversations/:id/undo` | Move version pointer backward |
| `POST /api/conversations/:id/redo` | Move version pointer forward |
| `GET /api/conversations/:id/compare?from=&to=` | Section-by-section structured diff between two version IDs |
| `GET /api/conversations/:id/export?format=pdf\|docx&versionId=` | Download single-column ATS-friendly PDF or DOCX respecting `meta.language` |

---

## Example Prompts

- `"Optimize my resume for Google"`
- `"Translate this to Spanish for the Mexican market"`
- `"Update my experience section to better match this job description: <paste JD>"`
- `"Make my skills section more relevant for a data scientist role"`
- `"Optimize for Google and translate to Spanish for the Mexican market"` (multi-agent chain)
- `"What changed between v1 and v2?"` / `"undo"` / `"redo"`
