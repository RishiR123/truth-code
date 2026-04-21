# Truth Code

**A Chrome extension that silently injects a truth-first system prompt before every message you send on ChatGPT and Gemini.**

No fluff. No sycophancy. No "Great question!" Raw, accurate answers — or nothing.

---

## What it does

Every time you press Enter on a supported AI chat site, Truth Code prepends a structured system prompt that instructs the model to:

- Answer first, reason second
- Correct wrong premises instead of indulging them
- Express uncertainty with a confidence percentage instead of hedging language
- Never use banned sycophantic openers or filler phrases
- End with a conclusion — not an invitation

The injected prompt is invisible in the chat UI. You see only your original message in the bubble.

---

## Supported sites

| Site | Status |
|------|--------|
| [ChatGPT](https://chatgpt.com) | ✅ Working |
| [Gemini](https://gemini.google.com) | ✅ Working |

---

## Installation

### Developer mode (current)

1. [Download or clone this repo](https://github.com/RishiR123/truth-code)
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `truth-code` folder
5. The Truth Code icon appears in your toolbar — click it to toggle on/off

### Chrome Web Store

Coming soon.

---

---

## How it works

1. **Injection** — A `keydown` capture-phase listener fires before the site's own handler. The message value is replaced with `[TRUTH PROTOCOL] + original message` using the native property setter (for React-controlled textareas) or `selectAllChildren` + `execCommand('insertText')` (for contenteditable editors). The site's handler then submits the modified value.

2. **Restore** — 200 ms later, if the input box was not cleared by the site (submission failed), the original text is restored.

3. **Scrub** — A `MutationObserver` watches for new chat bubble nodes. When a bubble containing `[TRUTH PROTOCOL - ACTIVE]` appears, it is surgically cleaned: child nodes up to and including the `[USER MESSAGE BELOW]` marker are removed. A 100 ms retry loop runs for up to 2 seconds to catch late-rendered bubbles.

---

## Project structure

```
truth-code/
├── manifest.json      Manifest V3 extension config
├── content.js         Injection + scrubbing logic
├── popup.html         Toggle UI
├── popup.js           Toggle state (chrome.storage.sync)
├── CONTRIBUTING.md    How to contribute
└── LICENSE            MIT
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

To add a new site: add the URL pattern to `manifest.json`, add a specific input selector to `INPUT_SELECTORS` in `content.js`, test injection and scrubbing, then open a PR.

---

## License

[MIT](LICENSE) — use it, fork it, ship it.
