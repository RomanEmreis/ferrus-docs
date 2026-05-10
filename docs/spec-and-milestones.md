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
```

When you run `/task`, ferrus shows the currently selected milestone and asks
for confirmation before the supervisor starts drafting the task. If you agree,
the full executor → review loop runs against that milestone's context. Once
the task is approved and moves to `Complete`, ferrus silently advances the
selection to the next incomplete milestone — ready for the next `/task`.

You never have to touch `/milestones` in a straight-line run through a spec.

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
            └─ first milestone auto-selected → .ferrus/STATE.json updated
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

`/reset-spec` clears the currently selected spec and milestone from
`.ferrus/STATE.json` — without touching the task state, agent sessions, or
any task files. After running it, ferrus behaves as if no spec has ever been
selected: `/task` will run in manual mode unless you pick a spec again with
`/milestones` or run `/spec`.

Use it when:

- you want to work on an ad-hoc task without a stale spec context bleeding in
- you finished a spec and don't want the old selection to persist into
  unrelated work
- the selection points to a spec file that no longer exists

Unlike `/reset`, which resets the entire task state to `Idle` and clears task
files, `/reset-spec` is a targeted operation that only affects the spec and
milestone fields in state.

:::note
`/reset` intentionally leaves the spec selection intact — it resets the
task loop, not your planning context. Use `/reset-spec` when you
explicitly want to drop the spec selection.
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
| `.ferrus/LAST_SPEC_PATH` | Path of the last spec written by `create_spec` |

The selected spec path and milestone ID are stored in `.ferrus/STATE.json`
alongside the rest of the runtime state.
