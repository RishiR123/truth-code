# Contributing to Truth Code

## Philosophy

Truth Code exists to strip sycophancy from AI responses. Every contribution should serve that purpose — nothing more.

## How to contribute

1. **Fork** the repo and create a branch: `git checkout -b feat/your-feature`
2. **Make your change** — keep it minimal and focused
3. **Test manually** by loading the unpacked extension in Chrome (see README)
4. **Open a PR** with a clear title and one-paragraph description of what changed and why

## Adding a new site

1. Add the URL pattern to `manifest.json` under `content_scripts.matches`
2. Add a specific input selector to `INPUT_SELECTORS` in `content.js` — place it above the generic fallbacks
3. Test injection (message should be sent with the protocol prepended) and scrubbing (protocol text should not appear in the chat bubble)
4. Update the site chips in `popup.html` and the supported sites table in `README.md`

## What we won't merge

- External library dependencies — vanilla JS only
- New features unrelated to prompt injection or bubble scrubbing
- Changes to the TRUTH PROTOCOL text without a strong, evidence-backed rationale
- Obfuscated or minified source

## Code style

- No comments that explain *what* the code does — only *why* when it's non-obvious
- No trailing console.log calls
- Prefer `const` over `let`; avoid `var`

## Reporting bugs

Open a GitHub Issue with:
- The affected site (ChatGPT / Gemini)
- Chrome version
- What you expected vs. what happened
- Steps to reproduce
