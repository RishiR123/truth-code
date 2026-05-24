# PR Notes

## Problem Addressed
Claude support needed to work reliably without weakening the existing ChatGPT and Gemini flows.

## Architectural Approach
Claude was isolated into a provider-specific path so generic attachment logic does not control Claude editors.

## Claude-Specific Handling
- Claude is detected only on `claude.ai`.
- Claude uses provider-specific selectors rather than broad `contenteditable` matching.
- Claude listeners are attached through `attachClaude()` only.
- Claude injection still prepends `TRUTH_PROMPT`, restores the original value if submit does not consume it, and relies on the existing scrub path.

## Safeguards Added
- Separate attachment tracking with `attachedGeneric` and `attachedClaude`.
- `isClaudeEditor(el)` centralizes provider checks for generic skip logic.
- Claude editors must be connected and inside the expected chat-input container.
- Duplicate listener attachment is prevented.
- Double protocol injection is blocked by marker checks.

## Testing Performed
- Static validation with no reported errors in `content.js` or `convo.md`.
- Manual code review confirmed no duplicate input selectors and no obvious unreachable branches in the attachment flow.

## Known Limitations
- Claude DOM structure may change and require selector updates.
- Injection remains submit-time only; non-Enter submission paths are not handled.
- The implementation assumes Claude continues to expose a stable chat input container.
