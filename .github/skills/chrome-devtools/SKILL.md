---
name: chrome-devtools
description: Use Chrome DevTools MCP efficiently for Mercurion browser automation, snapshots, console and network inspection. Apply only when a task requires browser-observable evidence; it does not own runtime startup, authentication policy, or task outcomes.
license: Apache-2.0
user-invocable: false
---

# Chrome DevTools MCP for Mercurion

Adapted from the upstream `chrome-devtools` skill shipped with
`ChromeDevTools/chrome-devtools-mcp` tag `chrome-devtools-mcp-v1.8.0`.

The repository launcher owns browser lifecycle and the persistent profile.
Never bypass `.github/scripts/start-chrome-devtools-mcp.ps1`, request an
isolated or personal profile, or operate outside the origin authorized by the
active Mercurion runtime policy.

## Efficient interaction

1. Use `list_pages` to identify current page IDs.
2. Navigate or create the required page, then wait for a known observable
   state.
3. Prefer `take_snapshot` for structure and interaction UIDs.
4. Use `take_screenshot` only when visual evidence is material.
5. Refresh the snapshot after navigation or DOM replacement before reusing a
   UID.
6. Use pagination and filters for console and network output.
7. Disable automatic follow-up snapshots on input actions unless needed.

Maintain causal order: navigate, wait, snapshot, interact, verify. Parallelize
only independent reads after the page is stable.

`evaluate_script` may inspect state that is absent from the accessibility tree,
but it must never read, inject, transfer, or expose credentials, cookies,
tokens, backup codes, or session secrets. Credential entry follows the
Mercurion browser-runtime skill and uses `fill_form`, with `fill` only as its
fallback.

On launch, profile-lock, transport, or timeout errors, preserve the exact
non-sensitive diagnostic and follow Mercurion outcome classification. Do not
repair browser ownership by changing MCP configuration during a numbered task.

