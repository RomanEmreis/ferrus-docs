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

The full planning-to-execution flow looks like this:

```text
/spec    →    /milestones    →    /task
 draft         pick what's         run the loop
 the spec      next               for that milestone
```

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
            └─ .ferrus/LAST_SPEC_PATH updated
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
declared in parallel by omitting shared dependencies.

## Selecting a spec and milestone (`/milestones`)

```
ferrus> /milestones
```

`/milestones` lets you pick which spec and which milestone to work on next
without starting a task. It presents an interactive menu:

1. Lists all specs found under `[spec].directory`.
2. After you choose a spec, shows each milestone with its completion status,
   title, ID, and declared dependencies.
3. Persists your selection to state — the chosen spec path and milestone ID
   are stored so `/task` can read them automatically.
4. Optionally offers to launch `/task` immediately.

Use `/milestones` when you want to jump to a specific point in a spec,
re-select after completing a milestone, or switch between specs mid-project.

## Running a task against a milestone (`/task`)

### Auto-selection (default)

```
ferrus> /task
```

When you run `/task` with no flags, ferrus resolves the currently selected
milestone automatically:

- If a milestone was previously chosen via `/milestones` or auto-advanced from
  a completed task, that selection is used.
- If the selected milestone is already marked complete, ferrus asks whether you
  want to continue with it anyway.
- The supervisor receives the spec context alongside the task description, so
  the executor knows exactly what it is implementing.

### Manual mode

```
ferrus> /task --manual
```

`--manual` skips milestone resolution entirely. The supervisor receives a
generic task-definition prompt and you describe the task from scratch. Use this
when you want ad-hoc work that isn't tied to a spec.

## Auto-advance after task completion

When a task that originated from a milestone is approved and moves to
`Complete`, ferrus automatically advances the selection to the next
incomplete milestone **as long as you haven't manually changed the selection
since the task started**. If you used `/milestones` to point at a different
milestone mid-flight, auto-advance is suppressed and your manual choice is
respected.

The typical cadence for a multi-milestone spec then becomes:

```text
/spec                        ← draft once
/milestones                  ← pick starting milestone (or skip; auto picks first)
/task  → Complete            ← milestone #1.0 done, selection advances to #1.1
/task  → Complete            ← milestone #1.1 done, selection advances to #1.2
…
```

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
