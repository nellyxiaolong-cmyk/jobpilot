# Design System: JobPilot

Design source: [Professional Job Tracker Platform](https://stitch.withgoogle.com/projects/15039744886570869229). The project contains several screens for the same job-search workspace. Keep the existing page structure, data, and interactions while applying these rules to visual changes.

## 1. Visual Theme & Atmosphere

A calm, precise job-search workspace: light, compact, and confident, with clear information hierarchy and restrained decoration. Use a balanced dashboard density. Make the active task easy to scan across the overview, application pipeline, interview calendar, and insights pages. Keep motion subtle and purposeful.

## 2. Color Palette & Roles

- **Indigo Primary** (`#4F46E5`) — primary actions, selected navigation, links, progress, and focus indicators.
- **Ink** (`#09090B`) — headings and primary text.
- **Emerald** (`#10B981`) — success and positive progress states.
- **Muted Neutral** (`#71717A`) — secondary text, labels, and metadata.
- **Soft Lavender Canvas** (`#FBF8FF`) — application background, as used by the current theme.
- **Pale Lavender Surface** (`#F4F2FD`) — quiet secondary surfaces and empty-state panels.
- **White** (`#FFFFFF`) — sidebar, cards, tables, and form surfaces.
- **Soft Outline** (`#C7C4D8`) — borders and separators.

Keep indigo as the single brand accent. Use semantic colors only for statuses that need them; avoid adding decorative accent colors, neon, or glowing gradients.

## 3. Typography Rules

- **Headings and key numbers:** Space Grotesk with Noto Sans SC fallback; controlled scale and tight, readable hierarchy.
- **Body and controls:** Plus Jakarta Sans with Noto Sans SC fallback; relaxed line height and consistent weights.
- **Chinese text:** Noto Sans SC fallback throughout.
- Use monospace only for technical identifiers or timestamps when needed. Do not introduce serif typography or oversized display text into dashboard screens.

## 4. Component Styling

- **Buttons:** Indigo fill for the primary action; restrained neutral or outlined treatment for secondary actions. Keep hover and pressed states clear without glow.
- **Navigation:** Compact left rail with a quiet surface, visible icons, and a pale indigo active state. Preserve the collapsed state, tooltips, résumé update action, profile entry, and settings control.
- **Cards and panels:** White surfaces, thin soft outlines, and compact rounded corners. Use elevation only when it clarifies grouping.
- **Tables and pipeline stages:** Align labels and values consistently; use subtle separators and indigo for selected or active stages.
- **Inputs:** Label above the field, visible focus outline, and validation text directly below.
- **Empty and loading states:** Explain what belongs in the area and how to add it. Keep the message within the existing layout.
- **Status colors:** Emerald for positive outcomes; muted neutral for inactive states; reserve warning colors for genuine caution.

## 5. Layout Principles

- Keep the desktop sidebar compact (220px in the current expanded layout) and align the main content to the existing page container (1180px maximum).
- Use consistent spacing and a clear heading-to-content rhythm. Keep overview metrics, pipeline progress, and upcoming interviews easy to compare.
- Keep the interview calendar and selected-day details stacked as they are in the current implementation.
- Collapse multi-column content cleanly on narrow screens; prevent horizontal page overflow.
- Preserve existing IDs, data attributes, navigation targets, and content containers when changing markup.

## 6. Motion & Interaction

Use short, restrained transitions for hover, focus, selection, and navigation states. Preserve tactile button feedback and keyboard-visible focus. Avoid continuous animation, parallax, and layout-shifting motion in this productivity interface.

## 7. Anti-Patterns

- Do not replace the existing product screens with a generic dashboard template.
- Do not change data sources, calculations, navigation, form behavior, or persistence as part of a visual-only change.
- Do not add a second brand accent, neon glows, oversized headings, decorative gradients, or excessive shadows.
- Do not remove the résumé update action, profile entry, settings control, collapsed navigation behavior, or responsive layouts.
- Do not rename or remove DOM hooks used by `app.js` without updating and checking every dependent interaction.
