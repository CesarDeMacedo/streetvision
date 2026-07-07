# Project context for Claude Code / Fable

This is StreetVision AI, a tool that generates before/after photorealistic visualizations
of street/infrastructure interventions (bike lanes, sidewalks, trees) for public engagement
materials, using Gemini 2.5 Flash Image ("Nano Banana") via a Supabase Edge Function.

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

Do not add features outside PRD.md's MVP scope without asking first.
Daily generation rate limit must be implemented and tested before any other feature ships.
