# Agent instructions

## Project

JobPilot is a local-first job-search and interview tracking demo. It uses plain HTML, CSS, browser JavaScript, and a small Node.js server. There is no build step or third-party dependency installation.

## Start and inspect

- Start the local app with `node server.js` from the project root.
- Open `http://127.0.0.1:4174/`.
- Node.js 18 or later is recommended because the server uses built-in `fetch` and `AbortSignal.timeout`.
- PDF/Word parsing and local OCR use macOS command-line tools and Swift sources; those features may not work unchanged on non-macOS hosts.

## Data safety requirements

- Existing user data is stored in the user's browser, not in this source package: `localStorage` key `jobpilot-user-v1`, IndexedDB database `offerly-files` / object store `files`.
- Never clear browser storage, reset the profile, replace IndexedDB contents, or change the app origin without the user's explicit authorization and a verified migration/backup plan.
- `file://`, `http://127.0.0.1:4174`, and other origins have separate browser storage. Do not tell the user that changing the URL preserves their data.
- `.jobpilot-api-config.json` contains a local model API credential. It is intentionally excluded from the handoff archive. Never print, copy, commit, or package its contents. Configure credentials separately in the target environment.
- Do not expose this server to the public internet as-is. The API configuration endpoint has no authentication and can change the local model configuration.
- Résumé, application and interview feedback are sensitive. Keep local behavior by default, follow the visible consent scope, and do not send data to a new provider without explicit authorization.

## Change discipline

- Preserve existing product behavior and visual conventions; make focused changes only for the requested task.
- Before changing data flows, inspect `app.js` and `server.js` and explain any impact on browser-stored data.
- Do not invent résumé facts or overwrite user-entered profile fields with empty/unsupported extraction results.
- Do not add a frontend framework or dependencies unless the user asks for that migration.
- Verify JavaScript syntax with `node --check app.js` and `node --check server.js` after edits. Do not claim browser or model verification unless actually performed.

For the current source map and known limitations, read `DEEPSEEK_HANDOFF.md`.
