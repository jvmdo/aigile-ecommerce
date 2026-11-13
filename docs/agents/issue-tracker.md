# Issue tracker: Markdown under docs/

Specs and tickets for this repo live as markdown files in `docs/`, committed with the code. The paths are fixed by the course deliverables.

## Conventions

- One feature per directory: `docs/<feature-slug>/` (e.g. `docs/carrinho/`).
- **Spec** (from `/to-spec`): `docs/<feature-slug>/frd-<feature-slug>.md`.
- **Blueprint** (from `/to-tickets`): `docs/<feature-slug>/blueprint-<feature-slug>.md`, an index of the approved breakdown: each ticket's number, title, "Blocked by" and a link to its file.
- **Tickets**: one file per ticket at `docs/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order, never a single combined file.
- **Scaffolding exception**: the spec is `docs/scaffolding-specification.md` and the blueprint is `docs/scaffolding-blueprint.md` (repo `docs/` root); its tickets go in `docs/scaffolding/issues/`.
- Triage state is a `Status:` line near the top of each ticket (see `triage-labels.md`).
- Comments append to the bottom of the file under a `## Comments` heading.

## When a skill says "publish to the issue tracker"

Write the file at the path above, creating the directory if needed. A spec goes to the spec path; tickets go under `issues/`, and the blueprint index is written or updated alongside them.

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the ticket number directly.

## Wayfinding operations

Used by `/wayfinder` (not expected in this project). Map at `docs/<effort>/map.md`; child tickets at `docs/<effort>/issues/NN-<slug>.md` with `Type:`, `Status:` (`claimed`/`resolved`) and `Blocked by:` lines. A ticket is in the frontier when it is open, unblocked and unclaimed; resolve by appending `## Answer`, setting `Status: resolved`, and adding a pointer to the map's Decisions-so-far.
