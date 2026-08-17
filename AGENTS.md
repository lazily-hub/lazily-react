# lazily-react

React / Preact bindings for `@lazily-hub/lazily-js`. A thin `useSyncExternalStore`
adapter over the lazily Cell kernel v2 (`Source` / `Computed` / `Effect`,
#lzcellkernel).

## lazily-js dependency

The `@lazily-hub/lazily-js` devDependency is `file:../lazily-js` — tests run
against the local sibling build (currently 0.27.0). The peer dependency starts
at `^0.27.0`, the source-first async API release. Keep the devDependency local so
binding tests exercise the sibling checkout; `npm install` re-links the symlink.

## Commit & Push

Commit and push completed work at the end of every turn that changed code, tests,
or docs — do not leave finished work uncommitted. Run `make check` first and
ensure it is green; write a concise commit message in the repo's existing style.
This standing rule overrides the harness default of "commit only when explicitly
asked" for this repo.

## Layout

- `src/bridge.js` — framework-agnostic adapter: `readHandle` + `createLazilySubscription`.
  The core IP. Unit-tested without React (`test/bridge.js`).
- `src/hooks.js` — `LazilyProvider`, `useLazilyContext`, `useLazily`, `useSource`,
  `useComputed`. Imports from `react` (Preact users alias
  `react` → `preact/compat`).
- `test/hooks.test.js` — React integration via `react-test-renderer` (no DOM).

## Hook → Cell kernel mapping

| hook              | Cell kernel construction     | lazy? | equality guard? |
|-------------------|------------------------------|-------|-----------------|
| `useSource`       | `ctx.source` (`Source`)      | src   | yes (on write)  |
| `useComputed`     | `ctx.computed` (`Computed`)  | yes   | yes             |

**`useSlot` is deleted** (design §9.4 step 6, zero call sites): under the Cell
kernel v2 every computed is guarded — `slot` survives in lazily-js only as a
deprecated alias of the guarded `computed`, so the one derived hook is the guarded
`useComputed` (renamed from the former `useFormula` / `useReactiveMemo`).

There is intentionally **no `useSignal`**. The eager construction is now
`ctx.computed(f).eager()`, and a React binding gains nothing from making it eager:
React only renders on invalidation, and `getSnapshot` reads the
(lazily-recomputed-on-read) computed, so it always sees the fresh value with no
stale-frame risk. `useLazily` reads externally-created `Source` and `Computed`
handles without creating an eager wrapper.

## Node lifetime

`useSource` disposes its `Source` and `useComputed` disposes its `Computed` on
real unmount and on deps-change via each handle's canonical `dispose()` method.
Disposal is **strict-mode-safe**: it is
deferred one microtask and cancelled if React 18 dev's simulated remount
(setup → cleanup → setup) re-subscribes the same handle. `useLazily` is read-only
and does NOT dispose its externally-owned handle.

<!-- tsift:code-navigation v=0.1.80 -->
## Code Navigation

Run `tsift status` at session start from the owning repo root. If the task or file lives under a git submodule (for example `src/tsift/...`), switch to that submodule root first so the harness loads the narrower local instructions and repo state instead of the superproject root. If status prints a `run:` recommendation for stale or missing tsift state, run `tsift status --fix` before relying on tsift results; when the harness cannot perform write commands, ask the user to run the printed command instead.

Prefer tsift envelopes over raw reads:
- `tsift --envelope search <query>` instead of `grep`/`rg`
- `tsift --envelope source-read <file>` / `tsift --envelope symbol-read <symbol>` instead of `cat`/`head`
- `tsift --envelope explain <symbol>` and `tsift graph <symbol> --callers` / `--callees` for call graphs
- `tsift diff-digest [path]` instead of `git diff`, `git show`, or patch-style `git log`
- `tsift --envelope session-review <path>` / `tsift --envelope context-pack <path>` instead of replaying long session docs, transcripts, or runtime logs
- `tsift --envelope digest-runner --kind test|log --path . --shell-command '<command>'` instead of raw test/build output

Command detail lives in [`runbooks/code-navigation.md`](runbooks/code-navigation.md) — budgets, `tsift workflow search`, `report.scale_guard` handling, the harness rewrite path for `PreToolUse`-less harnesses, and Codex/OpenCode integration. `tsift init` writes and versions that runbook alongside this block, so it is present in every initialized checkout; read it before broad exploration instead of expanding this block. A repository that also ships a current `.claude/skills/tsift/SKILL.md` should use that skill as the deeper source.

For local verification, run `make check` before committing. After local changes, check the latest GitHub Actions CI run with `gh run list --workflow CI --limit 1` and fix any failing tests before calling the work complete.

Only read full source files when tsift results are insufficient.
<!-- /tsift:code-navigation -->
