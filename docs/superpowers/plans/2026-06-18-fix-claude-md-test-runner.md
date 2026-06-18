# Fix CLAUDE.md Test Runner Note — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the `CLAUDE.md` `Commands` section which states "No test runner is configured" — Jest is configured, `npm test` runs it, and two test files exist.

**Architecture:** Docs-only fix. No code changes.

**Tech Stack:** Markdown

---

## File Map

| File | Action | Change |
|---|---|---|
| `CLAUDE.md` | Modify | Replace "No test runner" with correct Jest command |

---

## Task 1: Update Commands section in CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Context:** The current `Commands` section contains:
```markdown
No test runner is configured. There is no lint script.
```

`package.json` has `"test": "jest"` and two test files: `tests/core.test.js` and `tests/ModbusService.test.js`.

- [ ] **Step 1: Find and replace the stale note in `CLAUDE.md`**

Locate the line:
```
No test runner is configured. There is no lint script.
```

Replace it with:
```markdown
# Run tests
npm test                        # all tests (Jest)
npm test -- tests/core.test.js  # single file

# No lint script is configured.
```

- [ ] **Step 2: Verify the Commands block renders correctly**

```bash
node -e "require('fs').readFileSync('CLAUDE.md', 'utf8'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Confirm tests actually run**

```bash
npm test
```

Expected: Jest output, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: correct CLAUDE.md — Jest test runner is configured, document npm test command"
```
