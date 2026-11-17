# Issue tracker: Markdown under docs/

Specs and tickets for this repo live as markdown files in `docs/`, committed with the code. The paths are fixed by the course deliverables.

## Conventions

- One feature per directory: `docs/<feature-slug>/` (e.g. `docs/carrinho/`).
- **Spec** (from `/to-spec`): `docs/<feature-slug>/frd-<feature-slug>.md`.
- **Blueprint** (from `/to-tickets`): `docs/<feature-slug>/blueprint-<feature-slug>.md`, an index of the approved breakdown: each ticket's number, title, "Blocked by" and a link to its file.
- **Tickets**: one file per ticket at `docs/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, never a single combined file. The `**Spec:**` line links the spec and names the spec sections the ticket depends on (`**Spec:** [FRD do Carrinho](../frd-carrinho.md): Order; Contrato da API`), so the implementer reads those sections instead of the whole spec.
- **Scaffolding exception**: the spec is `docs/scaffolding-specification.md` and the blueprint is `docs/scaffolding-blueprint.md` (repo `docs/` root); its tickets go in `docs/scaffolding/issues/`.
- State is a bold status line near the top of each ticket, written exactly `**Status:** <value>` (e.g. `**Status:** ready-for-agent`). Open tickets carry a triage role from `triage-labels.md`; a closed ticket has `**Status:** resolved`. To find open tickets, grep for `**Status:**` lines whose value is not `resolved`.
- Comments append to the bottom of the file under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Write the file at the path above, creating the directory if needed. A spec goes to the spec path; tickets go under `issues/`, and the blueprint index is written or updated alongside them.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.

## When a skill says "close" or "resolve" a ticket

Nothing closes a ticket automatically: a `Closes <path>` line in a commit message is only a pointer, so the ticket file must be edited by hand. Whoever finishes a ticket does this, whether by hand or through a skill (`/implement`, `/implement-spec` and `/tdd` from the mattpocock-skills plugin):

1. Tick every acceptance criterion that was met (`- [ ]` → `- [x]`).
2. Change the status line to `**Status:** resolved`.
3. Commit these edits **in the same commit** as the implementation, the one whose message ends with `Closes docs/<feature-slug>/issues/<NN>-<slug>.md`.

If a criterion was deliberately changed or deferred, leave it unticked and explain why under `## Comments`. If it was met with an accepted divergence, or a deferral was later covered elsewhere, it may stay ticked, but say so under `## Comments` with a pointer to the commit or test.

If a later `/code-review` finds that a resolved ticket is incomplete, set it back to `**Status:** ready-for-agent` and add the finding under `## Comments`. The follow-up commit that fixes it closes the ticket again with the steps above. A ticket stays `resolved` with a known gap only when the gap is accepted: untick the criterion and record the decision under `## Comments`.

**Backfill exception:** the scaffolding tickets (`docs/scaffolding/issues/01`–`05`) were implemented before this rule existed and were closed retroactively in a separate docs commit (`d8f4095`). From the Cart feature on, closing happens in the implementation commit.

## Wayfinding operations

Used by `/wayfinder` (not expected in this project). Map at `docs/<effort>/map.md`; child tickets at `docs/<effort>/issues/NN-<slug>.md` with `Type:`, `Status:` (`claimed`/`resolved`) and `Blocked by:` lines. A ticket is in the frontier when it is open, unblocked and unclaimed; resolve by appending `## Answer`, setting `Status: resolved`, and adding a pointer to the map's Decisions-so-far.
