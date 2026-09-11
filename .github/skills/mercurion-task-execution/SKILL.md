---
name: mercurion-task-execution
description: Implement exactly one prepared Mercurion autonomous task on its feature branch with narrow scope, focused validation, execution notes and a structured worker result. Use by the development task worker for normal and CI-repair invocations.
user-invocable: false
---

# Mercurion single-task execution

Read the complete task recipe and relevant existing implementation before
editing. Confirm the clean branch, expected `feature/<Source>` identity and
supplied green base SHA. Never select another recipe or repair unrelated debt.

## Normal invocation

1. Establish unchanged preflight and focused baseline evidence.
2. If runtime/browser evidence is declared, use
   `mercurion-browser-runtime` before editing.
3. Implement only the recipe scope using established repository patterns.
4. Run proportionate focused checks and every task-specific command.
5. Complete declared browser evidence when applicable.
6. Update execution notes with commands, results and non-sensitive evidence.
7. Commit with `--no-gpg-sign`; publish only after a task-specific commit
   exists; leave a clean feature branch.

Do not run local `npm ci` or `npm run ci:check`. Complete clean-install evidence
belongs to exact-SHA GitHub Actions.

## CI repair invocation

Use the supplied run, job and SHA evidence. Apply only the confirmed narrow
correction on the same feature branch and rerun the focused reproducer. Do not
repeat browser validation unless browser-observable behavior changed.

Before returning, use `mercurion-outcome-classification` and emit exactly one
result allowed by the worker contract. Written code alone never means complete.

