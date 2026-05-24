// Truth Code — content script
// Intercepts Enter submissions on ChatGPT and Gemini, prepends the TRUTH
// PROTOCOL system prompt, then scrubs it from the rendered chat bubble.

const TRUTH_PROMPT =
`[TRUTH PROTOCOL - ACTIVE]

PRIME DIRECTIVE:
Raw accuracy above all. Comfort is irrelevant. If the user is wrong, say so. If the truth is painful, deliver it anyway.

BANNED — ZERO EXCEPTIONS:
- Openers: "Great question", "Certainly", "Absolutely", "Of course", "Sure", "Happy to help", "That's interesting", "I understand"
- Behavior: Agreeing with false premises, unsolicited moral commentary, softening conclusions to protect feelings
- Language: "it depends", "generally speaking", "it could be argued", "some might say", "in many ways", "it's worth noting", "it's important to remember", "to be fair"

IF THE USER IS WRONG:
Correct the premise in one sentence. Then answer the corrected version. Do not answer both the wrong and right version.

UNCERTAINTY — PICK ONE:
- Confident → state it directly, no qualifiers
- Partially sure → state what you know, what you don't, attach a confidence % (e.g. ~75%)
- Don't know → say "I don't know" + one sentence on why

STRUCTURE — NON-NEGOTIABLE:
- Answer first. Reasoning second. Context last if needed.
- Use a list OR prose. Never both for the same point.
- Maximum 4 bullet points. If you need more, your answer is too granular.
- Every point made exactly once. Restating in different words is padding, not emphasis.
- No closing questions unless the user explicitly asked for a dialogue.
- End with a conclusion. Not a hook. Not an invitation. A conclusion.

LENGTH:
The shortest accurate answer is always better than the longest impressive one. If your response exceeds what the truth requires, cut it.

MINDSET:
You are a diagnostic tool, not a companion. A surgeon doesn't apologize before cutting. Deliver the truth cleanly, completely, once.

[USER MESSAGE BELOW]

`;

const PROTOCOL_START   = '[TRUTH PROTOCOL - ACTIVE]';
const PROTOCOL_DIVIDER = '[USER MESSAGE BELOW]';

// ── Storage cache ─────────────────────────────────────────────────────────────

let guardrailEnabled = true;

chrome.storage.sync.get('enabled', (data) => {
  guardrailEnabled = data.enabled !== false;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled !== undefined) guardrailEnabled = changes.enabled.newValue;
});

// ── Input selectors ───────────────────────────────────────────────────────────

const INPUT_SELECTORS = [
  '#prompt-textarea',                              // ChatGPT (current)
  'textarea[data-id="root"]',                      // ChatGPT (legacy)
  'div[contenteditable="true"][data-placeholder]', // Gemini
  'rich-textarea div[contenteditable="true"]',     // Gemini alt
  'div[contenteditable="true"][aria-label]',       // generic labelled CE
  'textarea',                                      // generic textarea
];

// ── Provider abstractions (minimal) ─────────────────────────────────────────
const PROVIDERS = {
  claude: {
    host: 'claude.ai',
    selectors: [
      '[data-testid="chat-input"]',
      '.ProseMirror',
      '[data-chat-input-container="true"] div[contenteditable="true"]'
    ],
    containerSelector: '[data-chat-input-container="true"]',
  }
};

function isClaudeHost() {
  try { return window.location.hostname === PROVIDERS.claude.host; } catch (_) { return false; }
}

// Claude editors are matched only through provider selectors so generic
// contenteditable detection stays narrow and does not bind to Claude nodes.
function isClaudeEditor(el) {
  if (!isClaudeHost()) return false;
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  try {
    for (const sel of PROVIDERS.claude.selectors) {
      if (el.matches && el.matches(sel)) return true;
    }
  } catch (_) {}
  return false;
}

const attachedGeneric = new WeakSet();
const attachedClaude = new WeakSet();
const scrubbed  = new WeakSet();

// ── Value helpers ─────────────────────────────────────────────────────────────

function getValue(el) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value;
  return el.innerText || el.textContent || '';
}

function setTextareaValue(el, text) {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
  nativeSetter.call(el, text);
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function setContentEditableValue(el, text) {
  el.focus();
  // selectAllChildren scopes the selection to this element only, preventing
  // execCommand('selectAll') from bleeding outside the editor's DOM subtree.
  window.getSelection().selectAllChildren(el);
  const ok = document.execCommand('insertText', false, text);
  if (!ok) {
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertReplacementText',
      data: text,
    }));
  }
}

function setValue(el, text) {
  if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') setTextareaValue(el, text);
  else setContentEditableValue(el, text);
}

// ── Bubble scrubber ───────────────────────────────────────────────────────────

function findAndScrub(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  if (attachedGeneric.has(el) || attachedClaude.has(el)) return false;
  if (el.tagName === 'TEXTAREA' || el.getAttribute('contenteditable') === 'true') return false;
  if (scrubbed.has(el)) return false;

  const text = el.textContent || '';
  if (!text.includes(PROTOCOL_START))   return false;
  if (!text.includes(PROTOCOL_DIVIDER)) return false;

  // Descend to the deepest subtree that still contains both markers.
  for (const child of el.children) {
    const ct = child.textContent || '';
    if (ct.includes(PROTOCOL_START) && ct.includes(PROTOCOL_DIVIDER)) {
      if (findAndScrub(child)) return true;
    }
  }

  scrubbed.add(el); // mark before mutating to block observer re-entry

  const childNodes    = Array.from(el.childNodes);
  let dividerNodeIdx  = -1;

  for (let i = 0; i < childNodes.length; i++) {
    if ((childNodes[i].textContent || '').includes(PROTOCOL_DIVIDER)) {
      dividerNodeIdx = i;
      break;
    }
  }

  if (dividerNodeIdx !== -1) {
    const divNode    = childNodes[dividerNodeIdx];
    const divText    = divNode.textContent || '';
    const afterDiv   = divText
      .slice(divText.indexOf(PROTOCOL_DIVIDER) + PROTOCOL_DIVIDER.length)
      .replace(/^\n+/, '');

    for (let i = 0; i <= dividerNodeIdx; i++) {
      if (childNodes[i].parentNode === el) el.removeChild(childNodes[i]);
    }
    if (afterDiv.length > 0) {
      el.insertBefore(document.createTextNode(afterDiv), el.firstChild);
    }
    trimLeadingBlanks(el);
  } else {
    const divIdx = text.indexOf(PROTOCOL_DIVIDER);
    el.innerText = text.slice(divIdx + PROTOCOL_DIVIDER.length).replace(/^\n+/, '');
  }

  return true;
}

function trimLeadingBlanks(el) {
  while (el.firstChild && (el.firstChild.textContent || '').trim() === '') {
    el.removeChild(el.firstChild);
  }
}

function scanAndScrub() {
  if (!document.body) return false;
  let found = false;
  for (const el of document.body.querySelectorAll('*')) {
    if (scrubbed.has(el) || attachedGeneric.has(el) || attachedClaude.has(el)) continue;
    if (el.getAttribute('contenteditable') === 'true') continue;
    const text = el.textContent || '';
    if (text.includes(PROTOCOL_START) && text.includes(PROTOCOL_DIVIDER)) {
      if (findAndScrub(el)) found = true;
    }
  }
  return found;
}

function scheduleScrubRetry(maxMs = 2000, intervalMs = 100) {
  const deadline = Date.now() + maxMs;
  const id = setInterval(() => {
    const bodyHasMarker = (document.body?.textContent || '').includes(PROTOCOL_START);
    if (!bodyHasMarker || scanAndScrub() || Date.now() >= deadline) clearInterval(id);
  }, intervalMs);
}

// ── Listener attachment ───────────────────────────────────────────────────────

function attachListener(el) {
  if (attachedGeneric.has(el)) return;
  attachedGeneric.add(el);

  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (!guardrailEnabled) return;

    const original = getValue(el).trim();
    if (!original) return;
    if (original.startsWith('[TRUTH PROTOCOL')) return;

    setValue(el, TRUTH_PROMPT + original);

    // Restore the original text if submission did not consume the protocol.
    setTimeout(() => {
      if (getValue(el).startsWith('[TRUTH PROTOCOL')) setValue(el, original);
    }, 200);

    scheduleScrubRetry();
  }, true);
}

// ── Claude provider attachment (isolated) -------------------------------
function attachClaude(el) {
  if (!isClaudeHost()) return;
  if (attachedClaude.has(el)) return;
  if (!el.isConnected) return;
  const container = el.closest(PROVIDERS.claude.containerSelector);
  if (!container) return;
  attachedClaude.add(el);

  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (!guardrailEnabled) return;

    // Prevent double-injection
    const original = getValue(el).trim();
    if (!original) return;
    if (original.startsWith(PROTOCOL_START)) return;

    setValue(el, TRUTH_PROMPT + original);

    // Restore the original text if submission did not consume the protocol.
    setTimeout(() => {
      if (getValue(el).startsWith(PROTOCOL_START)) setValue(el, original);
    }, 200);

    scheduleScrubRetry();
  }, true);
}

// ── DOM scanning ──────────────────────────────────────────────────────────────

function scanAndAttach(root) {
  for (const sel of INPUT_SELECTORS) {
    try {
      root.querySelectorAll(sel).forEach((el) => {
        try {
          if (isClaudeEditor(el)) return;
        } catch (_) {}
        attachListener(el);
      });
    } catch (_) {}
  }
}

function scanAndAttachClaude(root) {
  if (!isClaudeHost()) return;
  for (const sel of PROVIDERS.claude.selectors) {
    try { root.querySelectorAll(sel).forEach(attachClaude); } catch (_) {}
  }
}

function checkAndAttachNode(node) {
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  // If this node is a Claude editor, let Claude-specific attachment handle it
  if (isClaudeEditor(node)) {
    attachClaude(node);
    return;
  }

  for (const sel of INPUT_SELECTORS) {
    try {
      if (node.matches(sel)) attachListener(node);
      node.querySelectorAll(sel).forEach((child) => {
        try {
          if (!isClaudeEditor(child)) attachListener(child);
        } catch (_) {}
      });
    } catch (_) {}
  }
}

scanAndAttach(document);
scanAndAttachClaude(document);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        checkAndAttachNode(node);
        if (node.nodeType === Node.ELEMENT_NODE) {
          findAndScrub(node);
          // Claude stays on provider-specific attachment to avoid generic binding.
          scanAndAttachClaude(node);
        }
      }
    } else if (mutation.type === 'attributes') {
      checkAndAttachNode(mutation.target);
    } else if (mutation.type === 'characterData') {
      const parent = mutation.target.parentElement;
      if (parent) findAndScrub(parent);
    }
  }
});

observer.observe(document.documentElement, {
  childList:     true,
  subtree:       true,
  attributes:    true,
  attributeFilter: ['contenteditable'],
  characterData: true,
});
