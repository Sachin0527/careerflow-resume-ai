# CareerFlow Resume AI — 5-Minute Demo Script

**Goal:** Showcase end-to-end conversational resume optimization across all 4 specialized agents, multi-agent chaining, clarification, live SSE agent timelines, side-by-side diffs, undo/compare, and ATS-friendly export.

---

## Pre-Demo Setup (30 seconds before presenting)

1. Ensure `server/.env` and `client/.env` are configured and `npm run dev` is running (`http://localhost:5173` & `http://localhost:3001/api/health`).
2. Keep `sample/sample-resume.pdf` and `sample/sample-jd.txt` open and ready on desktop/editor.
3. Open the app in a browser with a clean session (**New Session** in the left sidebar).

---

## 0:00 – 0:45 | Upload & Canonical Parsing (v1)

- **Action:** Drag and drop `sample/sample-resume.pdf` into the upload dropzone.
- **Narrate:**
  - Server parses PDF in memory (`pdf-parse`), calls Gemini structured output with Zod validation (and 2x retry safety), creates **Version 1** in Firestore, and indexes semantic chunks (summary, experience, projects, skills) into a dedicated Pinecone namespace.
  - Point to the right **Preview** pane: clean single-column resume rendered from canonical JSON—not raw text.

---

## 0:45 – 1:45 | Agent 1 — Company Research & Optimization

- **Action:** Click the suggested chip **"Optimize for Google"** (or type `"Optimize my resume for Google"`).
- **Narrate:**
  - Watch the live **Agent Activity** timeline stream via SSE (`status` -> `route` -> `agent_start` -> `agent_step` -> `agent_end` -> `token` -> `version`).
  - Point out Tavily live searches for Google's engineering values and hiring signals (cached in Firestore for 7 days).
  - Expand the collapsed **Agent Activity** reasoning and switch briefly to the **Changes** tab to show highlighted side-by-side diffs (`v1 -> v2`).

---

## 1:45 – 2:55 | Clarification Flow + Agent 2 — JD Matching & Radial Score

- **Action 1 (Clarification):** Type:
  > `"Update my experience section to better match this job description"`
  *(intentionally omit the JD)*.
- **Narrate:** Router detects missing JD (`needsClarification: true`) and asks one focused question without mutating the resume or burning agent calls.
- **Action 2 (Paste JD):** Paste the contents of `sample/sample-jd.txt` and send.
- **Narrate:**
  - Long JD paste automatically collapses in the chat bubble (`Show full text`).
  - `jdMatchAgent` extracts requirements, queries Pinecone to map JD requirements to Alex's CloudScale & TraceLite chunks, and computes the exact **50/30/20 weighted match score**.
  - Point to the **Match Score Card** (radial percentage + green matched chips + red missing skill chips like `Kubernetes`, `Terraform`, `Apache Kafka`—never fabricated into the resume!).

---

## 2:55 – 3:40 | Agent 4 — Section Enhancement (`[X]` Placeholders)

- **Action:** Type:
  > `"Enhance my projects section with stronger impact statements"`
- **Narrate:**
  - `sectionAgent` runs two passes: XYZ impact enhancement + a whole-document consistency pass (tense, dates, punctuation).
  - Point to the amber-highlighted `[X%]` placeholder in the **Preview** pane—showing how the system flags missing metrics instead of inventing numbers.

---

## 3:40 – 4:25 | Multi-Agent Chain + Agent 3 — Translation & Localization

- **Action:** Type:
  > `"Optimize my resume for Google and translate this to Spanish for the Mexican market"`
- **Narrate:**
  - Router emits a 2-step ordered plan: `companyAgent` -> `translationAgent`.
  - Step 2 receives Step 1's updated JSON resume directly, searches Tavily for `es-MX` CV conventions, translates prose while preserving tech terms (`Node.js`, `Redis`, `OpenTelemetry`), updates `meta.locale` to `es-MX`, and displays **Localization Notes**.
  - Notice that **Preview** headings automatically adapt (`Resumen`, `Experiencia`, `Habilidades`).

---

## 4:25 – 5:00 | Undo, Version Compare & ATS Export

- **Action 1 (Undo):** Click **Undo** in the right-panel header (or type `"undo"` in chat) to revert cleanly back to the English version—zero LLM cost.
- **Action 2 (Compare):** Open the **Versions** tab, select `v1` -> `v3` (or latest), and click **Compare** to view the multi-version side-by-side diff.
- **Action 3 (Export):** Click **PDF** and **DOCX** in the header to download clean single-column ATS-friendly files (noting that exporting the `es-MX` version outputs localized Spanish section headings too).
