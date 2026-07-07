# Project context for Claude Code / Fable

This is StreetVision AI, a tool that generates before/after photorealistic visualizations
of street/infrastructure interventions (bike lanes, sidewalks, trees) for public engagement
materials, using Gemini 3 Pro Image ("Nano Banana Pro", model id gemini-3-pro-image) via a
Supabase Edge Function. Do NOT downgrade to gemini-2.5-flash-image: it corrupted in-scene
text (street names) inconsistently during validation — that is why the Pro model was chosen.

Read PRD.md for product scope and SPEC.md for data model, routes, and business logic
before making changes.

Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres + Auth + Storage).

Reuse patterns already validated in the sibling project (digital fitting room app):
- Supabase Edge Function calling Gemini directly, API key only as a server secret
- Auth gate validating the real user token via supabase.auth.getUser(), never trusting the anon key alone

Visual identity: dark theme, blue accent (#3b82f6), sidebar + split-view + impact panel layout —
see streetvision-mockup.html in this repo for the validated reference layout.

IMPORTANT: the prompt sent to Gemini must explicitly instruct preservation of building facades,
camera angle, and lighting — this is the highest-risk part of the project and must be validated
manually (step 5 of SPEC.md) before building further UI.

The UI is trilingual (EN default / FR / PT) via lib/i18n.tsx — a plain dictionary + React
Context, deliberately no i18n library. Every user-facing string must go through t(); add new
strings to all three languages.

The UI has light/dark themes (lib/theme.tsx, dark default, data-theme attribute, localStorage
key sv-theme). Any new UI color must use an existing semantic CSS variable from globals.css
(--hover-bg, --nav-active-fg, --green-text, --red-text, --amber-text, plus the base palette)
or add a new variable defined in BOTH themes — never a fixed color literal in a component.
Exception: overlays rendered on top of photos (split-view tags, empty-state overlay) use fixed
dark translucent backgrounds by design so they stay readable on bright photos — don't theme them.

All FKs have ON DELETE CASCADE (migration 20260707200000) so test users can be deleted from
the Supabase dashboard; Storage files are NOT cascaded and become orphans.

Impact metrics in the UI are simulated placeholders (lib/mockImpact.ts) badged "SIMULATED
DATA" — never present them as real, and don't implement real calculations without asking.

Do not add features outside PRD.md's MVP scope without asking first.
Daily generation rate limit (5/day) is enforced server-side inside the generate-image Edge
Function — keep it there; the front-end counter is display-only.
