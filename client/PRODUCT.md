# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are active job seekers tailoring their resumes for specific companies, job descriptions, and target markets/locales (including engineering, data, and multilingual/international applicants).

## Product Purpose

CareerFlow Resume AI is a conversational resume optimization web application. A user uploads an existing resume (PDF or DOCX) and iteratively improves it through natural-language chat routed to specialized AI agents, with every modification recorded as a version that can be undone, redone, and compared.

## Positioning

Unlike static resume builders or single-prompt wrappers, CareerFlow Resume AI orchestrates four specialized agents—Company Research & Optimization, Job Description Matching (with semantic vector retrieval and weighted 0–100 scoring), Translation & Localization (adapting to local hiring conventions), and Section Enhancement—over a canonical structured resume JSON model with inspectable agent traces, side-by-side diffs, and reversible version history.

## Operating Context

- Core workflow (per `docs/SPEC.md`): upload a PDF/DOCX resume -> parse into canonical JSON -> send requests via chat, suggested prompt chips, or pasted job descriptions -> watch live streamed SSE agent steps and reasoning -> inspect rendered resume preview, side-by-side diffs, match score/skill gaps, and version timeline -> undo, redo, or restore versions -> export to PDF or DOCX.
- Planned workspace layout: three-pane web app with a left conversations sidebar, center chat stream, and right resume/diff/versions panel (`client/` is currently a Phase 1 placeholder scaffold awaiting full Phase 4 UI).

## Capabilities and Constraints

- Fixed stack (per `docs/SPEC.md`): React 18 + Vite + Tailwind CSS (`client`), Node.js/Express + LangChain/LangGraph + Google Gemini + Pinecone + Firebase Firestore + Tavily (`server`).
- State & transport: React Context + `useReducer` (no Redux); SSE streaming via `fetch` + `ReadableStream`.
- Canonical resume data model (`basics`, `experience`, `education`, `skills`, `projects`, `certifications`, `extraSections`, `meta`) shared across all agents.
- Spec-defined constraints (`docs/SPEC.md`, recorded as project spec rather than separately re-voted policy): strict no-fabrication rule (never invent employers, dates, degrees, or metrics; use `[X%]` placeholders for missing metrics) and anonymous session persistence via a `clientId` in `localStorage` with no login flow.

## Brand Commitments

- Confirmed product name: **CareerFlow Resume AI**.
- No binding visual system, color palette, typography, or aesthetic constraints have been established yet.

## Evidence on Hand

- `docs/SPEC.md` — full functional, agent, API, and UI specification.
- `sample/sample-resume.pdf` and `sample/generate-sample.js` — sample resume fixture for demonstrations and testing.
- `server/` — backend scaffold and services (parsing, versioning, diffing, vector store, schemas).
- No live customer testimonials, usage benchmarks, or press assets exist; future work must not fabricate them.

## Product Principles

1. **Preserve candidate truth**: Ground every optimization in the user's real resume data and explicit inputs; flag missing metrics rather than inventing them.
2. **Make AI edits inspectable**: Surface router plans, per-agent reasoning, and section-level diffs so users understand what changed and why.
3. **Keep every iteration reversible**: Treat every agent action as a non-destructive version with effortless undo, redo, restore, and comparison.
4. **Tailor to real hiring context**: Adapt tone, keywords, skill emphasis, and localization conventions to the specific company, job description, and locale.

## Accessibility & Inclusion

- Open decision: No specific WCAG conformance level was locked during init; standard web accessibility practices (keyboard navigation, readable contrast, dark/light theme support per `docs/SPEC.md`) apply unless a stricter target is chosen later.
