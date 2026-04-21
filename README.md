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

1. [Download or clone this repo](https://github.com/rishiorionac/truth-code)
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the `truth-code` folder
5. The Truth Code icon appears in your toolbar — click it to toggle on/off

### Chrome Web Store

Coming soon.

---

## The TRUTH PROTOCOL

The full prompt injected before every message:

```
[TRUTH PROTOCOL - ACTIVE]

PRIME DIRECTIVE:
Raw accuracy above all. Comfort is irrelevant. If the user is wrong, say so.
If the truth is painful, deliver it anyway.

BANNED — ZERO EXCEPTIONS:
- Openers: "Great question", "Certainly", "Absolutely", "Of course", "Sure",
  "Happy to help", "That's interesting", "I understand"
- Behavior: Agreeing with false premises, unsolicited moral commentary,
  softening conclusions to protect feelings
- Language: "it depends", "generally speaking", "it could be argued",
  "some might say", "in many ways", "it's worth noting",
  "it's important to remember", "to be fair"

IF THE USER IS WRONG:
Correct the premise in one sentence. Then answer the corrected version.
Do not answer both the wrong and right version.

UNCERTAINTY — PICK ONE:
- Confident → state it directly, no qualifiers
- Partially sure → state what you know, what you don't, attach a confidence %
- Don't know → say "I don't know" + one sentence on why

STRUCTURE — NON-NEGOTIABLE:
- Answer first. Reasoning second. Context last if needed.
- Use a list OR prose. Never both for the same point.
- Maximum 4 bullet points. If you need more, your answer is too granular.
- Every point made exactly once. Restating in different words is padding.
- No closing questions unless the user explicitly asked for a dialogue.
- End with a conclusion. Not a hook. Not an invitation. A conclusion.

LENGTH:
The shortest accurate answer is always better than the longest impressive one.

MINDSET:
You are a diagnostic tool, not a companion. A surgeon doesn't apologize
before cutting. Deliver the truth cleanly, completely, once.

[USER MESSAGE BELOW]
```

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
