---
id: spec-and-milestones
title: Specs & Milestones
sidebar_position: 4
slug: /spec-and-milestones
---

# Specs & Milestones

Ferrus treats feature specifications as first-class artifacts. A spec is a
Markdown file that lives in your repository, describes a feature in structured
prose, and breaks it down into ordered, trackable **milestones**. HQ uses that
structure to run the executor against one milestone at a time instead of
dumping the entire feature on it at once.

## The happy path

After `/spec` finishes, ferrus automatically selects the first incomplete
milestone. From that point, the only command you need to repeat is `/task`:

```text
ferrus> /spec              ← draft the spec; first milestone auto-selected
ferrus> /task              ← confirm the milestone, draft the task, run the loop
  └─ Complete              ← next milestone auto-selected
ferrus> /task              ← confirm the next milestone, run the loop
  └─ Complete              ← next milestone auto-selected
…
ferrus> /archive-spec      ← all milestones done: write ## Outcome, archive artifacts
```

When you run `/task`, ferrus shows the currently selected milestone and asks
for confirmation before the supervisor starts drafting the task. If you agree,
the full executor → review loop runs against that milestone's context. Once
the task is approved and moves to `Complete`, ferrus silently advances the
selection to the next incomplete milestone — ready for the next `/task`.

You never have to touch `/milestones` in a straight-line run through a spec.
When the last milestone lands, `/archive-spec` closes the spec out — see
[Closing out a spec](#closing-out-a-spec-archive-spec).

## Writing a spec (`/spec`)

```
ferrus> /spec
```

`/spec` spawns a supervisor session whose only job is to draft a specification
with you. You describe the feature in plain language; the supervisor pulls in
the built-in `ferrus://spec_template` resource, asks clarifying questions, and
when you both agree on the shape of the work it calls `create_spec` to write a
Markdown file under the directory configured in `[spec]` (default
`docs/specs/`).

```text
ferrus> /spec
  └─ supervisor → you describe the feature → create_spec
       └─ docs/specs/YYYY-MM-DD-<name>.md written
            └─ first milestone auto-selected → project runtime state updated in ferrus.db
```

The supervisor exits once the file is written. Nothing in the state machine
changes — `/spec` is a pure planning step you can rerun as many times as you
want.

:::tip
The generated file is plain Markdown. You can edit it directly between
sessions, commit it to source control, or share it with the team before any
code is written.
:::

## Spec file format

A spec follows a structured template. The milestones section is the part ferrus
actively parses and tracks:

```markdown
## Milestones

- [ ] #1.0 Set up the data model
  - ID: m1.0
  - Depends on: none

- [ ] #1.1 Implement the API layer
  - ID: m1.1
  - Depends on: #1.0

- [ ] #1.2 Add the UI component
  - ID: m1.2
  - Depends on: #1.1

- [ ] #2.0 Write integration tests
  - ID: m2.0
  - Depends on: #1.0, #1.1, #1.2
```

Rules ferrus enforces:

| Rule | Detail |
|---|---|
| Checkbox syntax | `- [ ]` for pending, `- [x]` for complete |
| Header number | `#1.0`, `#1.1`, … — controls display order |
| `ID:` field | Required; must be unique within the spec (`m1.0`, `m1.1`, …) |
| `Depends on:` field | `none` or a comma-separated list of header numbers |

Milestones without an `ID:` field are ignored by ferrus.

The ordering recommendation from the spec template: **prerequisites first,
simpler enabling work before dependent work**. Independent milestones can be
listed in parallel by omitting shared dependencies.

## Running a task against a milestone (`/task`)

### Auto-selection (default)

```
ferrus> /task
```

When you run `/task`, ferrus resolves the currently selected milestone
and asks for confirmation before starting. If you confirm, the supervisor
drafts the task with full milestone context and the executor → review loop
runs. The milestone selection feeds directly into the supervisor prompt, so
the executor knows exactly what it is implementing.

If the selected milestone is already marked complete, ferrus asks whether you
want to continue with it anyway before proceeding.

### Manual mode

```
ferrus> /task --manual
```

`--manual` skips milestone resolution entirely. The supervisor receives a
generic task-definition prompt and you describe the task from scratch. Use this
for ad-hoc work that isn't tied to a spec.

## Auto-advance

When a task that originated from a milestone is approved and moves to
`Complete`, ferrus automatically advances the selection to the next incomplete
milestone — as long as you haven't manually overridden the selection since the
task started. If you used `/milestones` to point at a different milestone
mid-flight, auto-advance is suppressed and your manual choice is respected.

## Closing out a spec (`/archive-spec`)

Once every milestone in a spec is complete, the spec has served its purpose as
a plan. `/archive-spec` turns it into durable **project memory** and clears its
working artifacts out of the way in one guided step:

```
ferrus> /archive-spec
```

It spawns a supervisor session in archive mode. The supervisor reads the spec
and its linked task and run history, drafts a concise `## Outcome` section —
what actually shipped, notable deviations from the plan, validation evidence,
and any follow-up work — and presents it to you. **Nothing is written or moved
until you approve the outcome text.** After you approve, the supervisor calls
the `archive_spec` tool, which:

1. appends (or replaces) the spec's `## Outcome` section in place;
2. moves the spec's linked task artifacts (`.ferrus/tasks/<task-id>.md`) and
   run artifacts (`.ferrus/runs/<task-id>/`) into a machine-local archive; and
3. records the archive — spec path, close timestamp, task/run counts, and the
   approved outcome — in `ferrus.db`.

The spec file itself stays in your repository, now carrying its `## Outcome`
summary; only the machine-local task/run scratch artifacts are relocated, so
`.ferrus/tasks/` and `.ferrus/runs/` stay focused on active work.

That approved `## Outcome` is also the one thing
[project memory](/docs/project-memory) indexes verbatim. If the optional index
is enabled, ferrus refreshes it right after the archive transaction commits —
outside the archive's critical path, so a refresh failure can never undo a
successful archive — and future agents can then query the decision with
`ferrus graph search ... --domain memory` instead of re-reading raw task
artifacts that no longer exist in the checkout.

### Preconditions

`/archive-spec` refuses to run — with a specific message — unless all of these
hold, so you never archive a spec that is still in flight:

| Requirement | Detail |
|---|---|
| A spec is selected | Run `/milestones` first if nothing is selected; the selected spec file must still exist. |
| All milestones complete | Every milestone must be `- [x]`; any incomplete milestone is listed and blocks archival. |
| No live tasks | Every task linked to the spec must be in a terminal state (e.g. `Complete`); non-terminal tasks block archival. |
| Artifacts to archive | At least one linked task or run artifact must remain to move. |

### Where archives go

Archives live under the machine-local project directory, not in your
repository:

```text
~/.ferrus/projects/<project-id>/archive/specs/<spec-slug>-<closed-at>/
├─ manifest.toml   ← spec path, archive timestamp, and per-task metadata
├─ spec.md         ← copy of the spec as archived (with its ## Outcome)
├─ tasks/          ← archived task artifacts, one <task-id>.md per task
└─ runs/           ← archived run artifacts, one <task-id>/ directory per run
```

The `spec_archives` row in `ferrus.db` remains the queryable source of truth,
and `ferrus doctor` still accounts for the relocated run artifacts. See
[Runtime files](/docs/configuration#runtime-files).

### Archiving from `/spec`

You don't have to run `/archive-spec` explicitly. When you start `/spec` while
the currently selected spec is already complete, ferrus offers to archive it
first — running the same flow — before drafting the new specification. Decline
and the old spec is left untouched; the new one is drafted alongside it.

:::tip
Treat `## Outcome` as compact memory for future agents. When a later `/spec`
or `/plan` session builds on finished work, the supervisor reads the outcome
instead of re-deriving context from raw task and run artifacts.
:::

## Manual milestone selection (`/milestones`)

```
ferrus> /milestones
```

`/milestones` is an escape hatch for situations where the automatic flow
isn't what you want:

- you edited the spec file by hand and need ferrus to re-read it
- you want to skip ahead or go back to a specific milestone
- you're switching to a different spec entirely
- the selection got out of sync after a reset or failed task

It presents an interactive menu:

1. Lists all specs found under `[spec].directory`.
2. After you choose a spec, shows each milestone with its completion status,
   title, ID, and declared dependencies.
3. Persists your selection to state.
4. Optionally offers to launch `/task` immediately.

In a normal run through a spec you shouldn't need it.

## Resetting the spec selection (`/reset-spec`)

```
ferrus> /reset-spec
```

`/reset-spec` clears the currently selected spec and milestone from the
project's runtime state in `ferrus.db` — without touching task state, agent
sessions, or any task files. After running it, ferrus behaves as if no spec
has ever been selected: `/task` will run in manual mode unless you pick a
spec again with `/milestones` or run `/spec`.

Use it when:

- you want to work on an ad-hoc task without a stale spec context bleeding in
- you finished a spec and don't want the old selection to persist into
  unrelated work
- the selection points to a spec file that no longer exists

Unlike `/reset`, which force-resets resettable tasks and clears their scoped
artifacts, `/reset-spec` is a targeted operation that only affects the
selected-spec and selected-milestone fields in the project's runtime state.

:::note
`/reset` intentionally leaves the spec selection intact — it resets tasks,
not your planning context. Use `/reset-spec` when you explicitly want to
drop the spec selection.
:::

## Configuration

The `[spec]` block in `ferrus.toml` controls where specs are stored:

```toml
[spec]
directory = "docs/specs"  # any path inside the project; created on first write
```

## Runtime files

| File | Contents |
|---|---|
| `.ferrus/SPEC_TEMPLATE.md` | Read-only template the supervisor loads during `/spec` |
| `~/.ferrus/projects/<project-id>/archive/specs/<spec-slug>-<closed-at>/` | Machine-local archive written by `/archive-spec`: `manifest.toml`, a copy of `spec.md`, and the relocated `tasks/` and `runs/` artifacts |

The selected spec path and milestone ID are stored as project runtime state
in `ferrus.db`, alongside the rest of the SQLite-backed runtime state — see
[Runtime files](/docs/configuration#runtime-files).
