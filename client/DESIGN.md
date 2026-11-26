---
name: CareerFlow Resume AI
description: Archival Conservation Desk — an obsidian-grounded conversational resume workbench framing a backlit pure-white ATS proof sheet and hairline revision ledger.
colors:
  primary-cta: "#FFFFFF"
  primary-ink: "#090A0D"
  obsidian-panel: "#0E1015"
  conservation-bench: "#060709"
  surface-card: "#101218"
  ledger-well: "#0B0D11"
  surface-elevated: "#14171F"
  surface-active: "#171A22"
  hairline-dark: "#222631"
  control-border-dark: "#2A303E"
  text-frost: "#F8FAFC"
  text-pewter: "#94A3B8"
  light-canvas: "#F4F5F7"
  light-bench: "#E8EAEF"
  light-hairline: "#D8DDE6"
  proof-ink: "#0F172A"
  proof-ink-secondary: "#475569"
  semantic-emerald: "#059669"
  semantic-rose: "#E11D48"
  semantic-amber: "#D97706"
  callout-amber-bg: "#FEF3C7"
  callout-amber-ink: "#78350F"
typography:
  display:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "0em"
  label:
    fontFamily: "Public Sans, system-ui, -apple-system, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.02em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "0em"
rounded:
  proof: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-cta}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.primary-cta}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  prompt-chip:
    backgroundColor: "#12141B"
    textColor: "#E2E8F0"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 10px"
  segmented-tab-active:
    backgroundColor: "{colors.primary-cta}"
    textColor: "{colors.primary-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.proof}"
    padding: "4px 10px"
  composer-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.primary-cta}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "8px"
  upload-dropzone:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.text-frost}"
    rounded: "{rounded.lg}"
    padding: "32px"
  agent-ledger:
    backgroundColor: "{colors.ledger-well}"
    textColor: "{colors.text-frost}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  match-score-card:
    backgroundColor: "{colors.ledger-well}"
    textColor: "{colors.text-frost}"
    rounded: "{rounded.md}"
    padding: "12px"
  proof-sheet:
    backgroundColor: "{colors.primary-cta}"
    textColor: "{colors.proof-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.proof}"
    padding: "32px 28px"
    width: "660px"
  sidebar-rail:
    backgroundColor: "{colors.obsidian-panel}"
    textColor: "{colors.text-pewter}"
    width: "272px"
---

# Design System: CareerFlow Resume AI

## Overview

**Creative North Star: "The Archival Conservation Desk"**

CareerFlow Resume AI treats career records like fragile archival documents under inspection. An obsidian-black workspace (`#090A0D` / `#0E1015`) recedes behind crisp 1px hairline rules (`#222631`), keeping focus on two primary artifacts: the pure-white canonical ATS proof sheet anchored on a deeper `#060709` conservation bench, and the structured, inspectable agent revision ledger in the chat stream.

Rather than decorating with generic SaaS slate gradients, pastel brand hues, or dark-on-dark resume previews that distort printed legibility, the system enforces strict monochrome restraint. Pure white (`#FFFFFF`) is reserved for primary actions, user prompt bubbles, and the immutable white proof sheet itself, while chromatic color appears strictly as semantic verification evidence—emerald for matched skills and diff additions, rose for missing skills, diff removals, and destructive actions, and amber for `[X%]` metric placeholders.

**Key Characteristics:**
- Dark-first conservation bench (`#090A0D` canvas, `#060709` proof backdrop) paired with a full light-mode counterpart (`#F4F5F7` canvas, `#E8EAEF` bench).
- Pure-white backlit ATS proof sheet (`#FFFFFF`, `4px` corners, `660px` max measure) that remains white paper in both dark and light modes.
- 1px hairline structural dividers (`#222631` dark / `#D8DDE6` & `#E2E8F0` light) replacing stacked drop shadows across the three-pane workspace.
- Functional `Public Sans` interface typography paired with tabular `JetBrains Mono` for version numbers, durations, diff line counts, and `[X%]` metric callouts.

## Colors

The palette is built on high-contrast monochrome obsidian and archival paper tones, supplemented only by disciplined semantic verification hues.

### Primary
- **Pure White CTA & Proof Paper** (`#FFFFFF`): Serves two sacred roles in dark mode—primary high-conviction action fills (`New Session`, `Choose PDF or DOCX`, `DOCX` export, active segmented tabs, user chat bubbles) with `#090A0D` ink, and the pure-white backlit ATS resume sheet. In light mode, primary CTAs invert to `#0F172A` ink fills with `#FFFFFF` text.
- **Obsidian Ink** (`#090A0D`): Dark-mode root canvas (`--bg-canvas`), segmented tab tray well, and primary CTA button label ink.

### Neutral
- **Conservation Bench** (`#060709` dark / `#E8EAEF` light): Deepest backdrop (`--bg-bench`) behind the right-pane `ResumePreview`, `DiffViewer`, and `VersionTimeline`, maximizing contrast around the white sheet.
- **Chrome Panel** (`#0E1015` dark / `#FFFFFF` light): Surface (`--bg-panel`) for the left `Sidebar`, top workspace header, and bottom `ChatInput` dock.
- **Card & Stream Surface** (`#101218` dark / `#FFFFFF` light): Container fill for assistant message cards, `UploadDropzone`, `DiffViewer` cards, and inactive `VersionTimeline` rows.
- **Elevated Control Surface** (`#14171F` dark / `#FFFFFF` light): Secondary interactive controls (`Undo`, `Redo`, `PDF` export, `ThemeToggle`), active version card, and diff section headers.
- **Active Rail Surface** (`#171A22` dark / `#F1F5F9` light): Selected conversation item in `Sidebar`, drag-over `UploadDropzone` state, and icon wells.
- **Structural Hairline** (`#222631` dark / `#D8DDE6` `--border-hairline` & `#E2E8F0` light): 1px rules separating panes, headers, agent timeline steps, and diff columns.
- **Control Stroke** (`#2A303E` dark / `#CBD5E1` light): Interactive borders for secondary buttons, `PromptChips`, `ChatInput`, and version `<select>` controls.
- **Primary & Secondary Ink** (`#F8FAFC` / `#94A3B8` dark; `#0F172A` / `#475569` light): High-legibility frost white (`#F8FAFC`) for primary dark UI text, with muted pewter (`#94A3B8`) enforced as the minimum dark-mode secondary, metadata, section header, timestamp, and placeholder ink (`--text-secondary`). Light mode pairs `#0F172A` primary ink with `#475569` secondary ink.

### Semantic Verification States
- **Matched & Added Emerald** (`#059669` light / `#34D399` dark): Completed steps in `AgentTimeline`, `>= 75%` progress bar fill in `MatchScoreCard`, matched skill pills (with Lucide `Check` icon), and `+N` diff additions.
- **Missing & Removed Rose** (`#E11D48` light / `#FB7185` dark): Error banners, failed agent steps, `< 50%` match bar fill, missing skill pills, `-N` diff removals, and hover-revealed session delete actions.
- **Metric Placeholder Amber** (`#D97706` light / `#FBBF24` dark; `#FEF3C7` pill fill / `#78350F` ink): `50–74%` mid-range match bar fill and inline `[X%]` metric placeholder callouts on the white proof sheet.

### Named Rules
**The Monochrome Authority Rule.** Never introduce decorative brand blues, purples, or gradients. Monochrome white and obsidian carry 95% of every screen so semantic emerald, rose, and amber immediately signal verification state.
**The Immutable White Paper Rule.** The `ResumePreview` proof sheet must always render on `#FFFFFF` paper with `#0F172A` ink regardless of whether the surrounding workspace is in dark or light mode.

## Typography

**Display Font:** `Public Sans` (with `system-ui, -apple-system, sans-serif`)
**Body Font:** `Public Sans` (with `system-ui, -apple-system, sans-serif`)
**Label/Mono Font:** `JetBrains Mono` (with `ui-monospace, SFMono-Regular, monospace`)

**Character:** `Public Sans` gives UI chrome and the printed resume proof sheet clean, government-grade typographic authority without decorative flair, while `JetBrains Mono` grounds every version stamp, duration metric, and diff hunk in tabular precision.

### Hierarchy
- **Display** (`700`, `22px`, `1.25`, `-0.025em`): Candidate name `h2` at the top of the `ResumePreview` proof sheet (`text-[22px] font-bold tracking-tight`).
- **Headline** (`600`, `16px`, `1.375`, `-0.025em`): Empty-state and `UploadDropzone` primary prompt headings (`text-base font-semibold tracking-tight`).
- **Title** (`600`, `14px`, `1.4`, `-0.015em`): Workspace header session title, sidebar brand title, and `ChatPane` ready-state heading (`text-sm font-semibold`).
- **Body** (`400`, `14px` UI / `13px–13.5px` proof sheet, `1.625`, `0em`): Chat messages (capped at `70ch` prose width), `ChatInput` textarea, and proof sheet bullets (`13px`–`13.5px`).
- **Label** (`600`, `12px`, `1.33`, `0.02em`): Toolbar tabs, secondary buttons, `PromptChips`, and `AgentTimeline` headers (`text-xs`); proof sheet section headers use `11px`, `700` bold, uppercase with `0.08em` tracking.
- **Mono** (`500`, `11px`–`12px`, `1.45`, `tabular-nums`): Active version subtitle (`Active: v2`), `AgentTimeline` durations (`1.4s`), `MatchScoreCard` percentage, `PROOF SHEET · v2` header, `[X%]` metric pills, and side-by-side `DiffViewer` hunks.

### Named Rules
**The Tabular Telemetry Rule.** Every numeric indicator that changes across turns—version numbers (`v1`), match percentages (`78%`), step durations (`1.4s`), and diff line deltas (`-3 +5`)—must use `JetBrains Mono` with `tabular-nums` so columns stay aligned.

## Layout

The application uses a fixed dynamic-viewport three-pane workbench (`100vw × 100dvh`, `h-dvh w-screen overflow-hidden`) that prevents outer page scrolling and keeps each operational surface independently scrollable. On `xl` (`1280px+`) viewports, all three columns align along a unified `56px` (`h-14`) top hairline bar; below `1280px`, a single `h-14` top header spans the workspace:

1. **Sessions Rail (`Sidebar`)**: Fixed `272px` (`w-68`) left rail visible at `lg` (`1024px`) and above with an `h-14` brand bar; collapses into a `z-40` left slide-over drawer with a `rgba(0,0,0,0.6)` (`bg-black/60`) backdrop on smaller viewports.
2. **Conversation Stream (`ChatPane`)**: Flexible center pane (`flex-1 min-w-0`) topped by an `h-14` desktop session title/version bar (`hidden xl:flex px-5`), housing the vertically scrolling stream (`px-4 py-5 sm:px-6`, `16px` vertical gap) and a docked bottom composer (`px-4 py-3 sm:px-6`) with horizontally scrollable `PromptChips`.
3. **Conservation Bench (`RightPanel`)**: Fixed `50%` width on `xl` (`1280px`) and above (`xl:w-[50%] xl:flex-none`), housing an `h-14` (`56px`, `px-3`) sticky toolbar (`Preview` | `Changes` | `Versions`, `Undo`/`Redo`, `PDF`/`DOCX`, `ThemeToggle`) and a centered `660px` max-width bench (`p-4 sm:p-6`). Below `1280px`, the unified `h-14` header provides a segmented `Chat | Resume` toggle between center and right panes.

Spacing follows a tight `4px` base grid (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`), keeping top bars unified at `56px` (`h-14`) while giving the `UploadDropzone` (`32px` padding) and proof sheet (`28px × 32px` padding, `min-h-[540px]` empty sheet) generous archival breathing room.

### Named Rules
**The Viewport Lock Rule.** Never let the outer shell scroll; only the sidebar `<nav>`, center chat stream, and right bench scroll independently so the header, composer, and export toolbar remain anchored at all times.

## Elevation & Depth

Surfaces in the workspace are **flat by default**—hierarchy is established through subtle surface-step contrasts (`#060709` → `#090A0D` → `#0E1015` → `#101218` → `#14171F`) and `1px` `#222631` hairline borders rather than drop shadows.

Shadows are reserved exclusively for the **backlit white ATS proof sheet**, physically lifting the document off the dark conservation bench.

### Shadow Vocabulary
- **Proof Sheet Bench Lift** (`box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55)`): Applied to both the active `<article>` and the `bg-white` `min-h-[540px]` awaiting-upload sheet in `ResumePreview` so the crisp white page floats cleanly above the `#060709` bench.

### Named Rules
**The Flat Chrome, Lifted Artifact Rule.** Workspace chrome, chat cards, and timeline drawers carry zero box shadows and rely solely on 1px hairline borders; deep `0 24px 48px` elevation belongs exclusively to the white resume proof sheet.

## Shapes

The geometry uses tight, disciplined rectangular radii that avoid bubbly SaaS roundness:

- **Proof Paper & Tab Pills (`4px` radius)**: `ResumePreview` sheet (`rounded-[4px]`), active segmented tab pills, `[X%]` metric callouts, `PROOF SHEET` meta tags, and diff hunk highlight lines.
- **Interactive Controls & Drawers (`6px` radius)**: Primary/secondary buttons, `PromptChips`, `Sidebar` session rows, `AgentTimeline` ledger, `MatchScoreCard`, `ThemeToggle`, and icon wells (`rounded-md`).
- **Stream Cards & Composer (`8px` radius)**: `UploadDropzone` (with `1px dashed` stroke), chat message bubbles, `ChatInput` frame, `DiffViewer` section cards, and `VersionTimeline` cards (`rounded-lg`).
- **Scrollbars & Progress Track (`9999px` / pill)**: `6px` wide scrollbar thumbs (`rounded-full`) and the `6px`-tall (`h-1.5`) hairline `MatchScoreCard` progress bar track (`rounded-full`).

## Components

Every component uses crisp 1px hairlines, `150ms` color transitions, `text-underline-offset: 3px` for readable links/underlines, and high-contrast monochrome states.

### Buttons
- **Shape:** Gently squared technical corners (`6px` radius).
- **Primary:** High-contrast inverted pill (`#FFFFFF` fill / `#090A0D` text in dark mode; `#0F172A` fill / `#FFFFFF` text in light mode), `600` weight, `8px 16px` (`New Session`, `Choose PDF or DOCX`), `4px 12px` (`Compare`), or `6px 8px` (`DOCX`) padding.
- **Hover / Focus:** Shifts to `#E2E8F0` in dark mode (`#1E293B` in light mode) over `150ms`; keyboard focus uses a `2px solid currentColor` ring with `2px` offset; disabled reduces opacity to `0.35`–`0.45`.
- **Secondary / Ghost:** `1px solid #2A303E` border on `#14171F` fill (`#CBD5E1` on `#FFFFFF` in light mode) with `6px 8px` (`Undo`, `Redo`, `PDF`) or `4px 10px` (`Restore`) padding; ghost icon buttons (`Menu`, `X`, `Trash2`) are transparent at rest and reveal `#171A22` hover fills (or rose hover stroke for delete).

### Chips
- **Style:** `PromptChips` use `1px solid #2A303E` on `#12141B` (`#CBD5E1` on `#FFFFFF` light), `6px` radius, `6px 10px` padding, `12px` `500` text with a trailing `12px` diagonal arrow icon.
- **State:** Hover brightens border to `rgba(255,255,255,0.7)` (`#0F172A` light) and background to `#1A1D26` (`#F8FAFC` light); disabled drops opacity to `0.45`.

### Cards / Containers
- **Corner Style:** `8px` (`rounded-lg`) for primary stream/version cards; `6px` (`rounded-md`) for nested diagnostic blocks (`AgentTimeline`, `MatchScoreCard`); `4px` for the white `ResumePreview` sheet.
- **Background:** `#101218` for cards and assistant bubbles; `#0B0D11` for recessed diagnostic ledgers; `#FFFFFF` for both the active and `min-h-[540px]` awaiting-upload proof sheets.
- **Shadow Strategy:** Flat `1px` borders (`#222631` dark / `#E2E8F0` light) on all workspace cards; `0 24px 48px rgba(0,0,0,0.55)` shadow only on the proof sheet.
- **Internal Padding:** `12px` for `MatchScoreCard` and `AgentTimeline` rows (`8px 12px` header), `12px 16px` for assistant bubbles, `14px` for `VersionTimeline` cards, `32px` for `UploadDropzone`, and `32px 28px` for the active proof sheet (`28px` for the `min-h-[540px]` empty sheet).

### Inputs / Fields
- **Style:** `ChatInput` wraps a multi-line `<textarea>` and `36px × 36px` square-rounded send button inside an `8px` container (`1px solid #2A303E`, `#101218` fill in dark mode; `#CBD5E1`, `#FFFFFF` in light mode) with `8px` padding. Dark-mode `<input>` and `<textarea>` elements set `caret-color: #ffffff`, with `#94A3B8` placeholder ink.
- **Focus:** Container border sharpens to `rgba(255,255,255,0.75)` (`#0F172A` in light mode) via `focus-within`; `<select>` version pickers use `#171A22` fill, `#2A303E` border, `4px` radius, and `12px` `JetBrains Mono`.
- **Disabled:** Input text and send action drop to `0.5` / `0.35` opacity with `not-allowed` cursor while SSE streaming is active.

### Navigation
- **Sidebar & Segmented Tabs:** Left `Sidebar` (`272px`) features an `h-14` (`56px`) brand header with a `32px × 32px` inverted monogram badge, `+ New Session` primary button, uppercase `11px` `Sessions` label, and truncated session buttons (`14px`, `8px 12px` padding) with hover-revealed delete icons. `RightPanel` features a matching `h-14` (`56px`) top bar housing a `2px`-padded segmented control (`Preview` | `Changes` | `Versions`) where the active tab inverts to `#FFFFFF` / `#090A0D` (`4px` radius, `4px 10px` padding). On `xl+` viewports, `ChatPane` also displays an `h-14` session header; below `1280px`, a single `h-14` header exposes the `Chat | Resume` segmented switcher.

### Signature Component: Agent Ledger, Match Score & Canonical Proof Sheet
- **Agent Ledger (`AgentTimeline`):** A collapsible `6px`-radius `#0B0D11` drawer (`1px solid #222631`) embedded above assistant replies. Displays live spinning or completed emerald checkmarks, agent name, `tabular-nums` duration (`1.4s`), bulleted sub-steps, and em-dash reasoning traces.
- **Match Score Card (`MatchScoreCard`):** A `6px`-radius `#0B0D11` card pairing a `Job Description Match Score` header and `tabular-nums` percentage with a `6px`-tall (`h-1.5`) hairline horizontal progress bar (`#222631` track; semantic emerald/amber/rose fill), emerald matched skill pills prefixed by Lucide `Check` icons, and rose `Missing:` skill pills.
- **Canonical Proof Sheet (`ResumePreview`):** A single-column `660px` pure-white ATS sheet (`4px` radius) framed by `PROOF SHEET · vN` monospace telemetry and `locale` / `targetCompany` / `targetRole` hairline pills, highlighting missing metrics in `#FEF3C7` amber pills (`[X%]`). Prior to upload, the empty state renders a `bg-white` `min-h-[540px]` `4px`-radius proof sheet outlining the three-step workflow.

## Do's and Don'ts

### Do:
- **Do** keep workspace chrome flat with `1px` `#222631` (dark) / `#D8DDE6` (light) hairlines and reserve `0 24px 48px` drop shadows strictly for the white `ResumePreview` proof sheet.
- **Do** preserve `#FFFFFF` paper and `#0F172A` ink on the canonical ATS proof sheet in both dark and light themes.
- **Do** use `JetBrains Mono` with `tabular-nums` for version badges (`v1`), step durations (`1.4s`), match percentages, and diff hunks.
- **Do** highlight unverified `[X%]` metric placeholders with `#FEF3C7` background and `#78350F` monospace ink.
- **Do** constrain markdown assistant prose to `70ch` and the proof sheet to `660px` max-width for comfortable scanning.

### Don't:
- **Don't** render the resume preview in dark-on-dark colors or match the workspace panel background.
- **Don't** introduce decorative accent colors (brand blues, purples, or gradients) outside the emerald/rose/amber verification palette.
- **Don't** stack drop shadows on chat bubbles, prompt chips, sidebar items, or agent ledger drawers.
- **Don't** increase button or card radii into pill/heavy-rounded SaaS styles—stay within `4px` (proof/tabs), `6px` (controls), and `8px` (cards/composer).
- **Don't** omit hover, focus-visible (`2px solid currentColor`), or disabled opacity states on interactive controls.
