---
id: hq
title: HQ commands
sidebar_position: 3
slug: /hq
---

# HQ commands

Running `ferrus` with no arguments drops you into **HQ** — a small
interactive shell that drives the state machine. Type `/` to see an
autocomplete menu; use **Tab** / **Shift+Tab** to navigate and **Enter**
to accept.

A status line at the bottom of the terminal shows the current task state
and retry/cycle counters in real time.

## Cheat sheet

| Command | Description |
|---|---|
| `/plan` | Free-form planning session with the supervisor (no task created). |
| `/spec` | Draft a feature specification with the supervisor and save it as a Markdown artifact you can later feed into `/task`. |
| `/milestones` | Select the current spec and milestone without creating a task. |
| `/task` | Define a task with the supervisor, then run the executor → review loop automatically. Supports `--manual` to skip milestone resolution. |
| `/check` | Run the ferrus check gate from HQ. |
| `/supervisor` | Open an interactive supervisor session (no initial prompt). |
| `/executor` | Open an interactive executor session (no initial prompt). |
| `/resume` | Manually resume the executor headlessly; also recovers consultation by relaunching both supervisor and executor. |
| `/review` | Manually spawn supervisor in review mode (escape hatch when automatic spawning failed). |
| `/status` | Show task state, agent list, and session log paths. |
| `/attach <name>` | Show log path for a running headless agent. |
| `/stop` | Stop all running agent sessions (prompts for confirmation). |
| `/reset` | Reset state to Idle and clear task files (prompts for confirmation). Does **not** clear the selected spec or milestone. |
| `/reset-spec` | Clear the selected spec and milestone without affecting task state. |
| `/init [--agents-path]` | Initialize ferrus in the current directory. |
| `/register` | Register agent configs (same as `ferrus register`). |
| `/model` | Update the supervisor or executor model override. |
| `/help` | List all HQ commands. |
| `/quit` | Exit HQ. |

## The happy path

```text
ferrus> /task
  └─ supervisor spawns → you describe the task → supervisor calls create_task
       └─ executor spawns (headless) → implements → check → submit
            └─ reviewer spawns (headless) → reads submission → approve or reject
                 ├─ approved → Complete
                 └─ rejected → executor re-spawns with feedback
```

- `/task` from `Complete` silently resets to `Idle` and starts the next task
  — no extra step needed.
- `/reset` forces `Idle` from any state; prompts for confirmation if an
  agent is actively working.

## Specifications and milestones (`/spec`, `/milestones`, `/reset-spec`)

`/spec` spawns a supervisor session that drafts a structured feature
specification with you and writes it as a Markdown file under the directory
configured in `[spec]` (default `docs/specs/`). When the supervisor exits,
the first incomplete milestone is automatically selected.

From there, `/task` is all you need — ferrus confirms the current milestone,
drafts the task with milestone context, runs the executor loop, and advances
to the next milestone automatically on `Complete`:

```text
ferrus> /spec       ← draft the spec; first milestone auto-selected
ferrus> /task       ← confirm milestone, run the loop → auto-advance on Complete
ferrus> /task       ← next milestone, repeat
```

`/milestones` is an escape hatch: use it when you need to jump to a specific
milestone, switch specs, or recover after manual edits.

`/reset-spec` clears the selected spec and milestone from state without
touching the task state or task files. Use it when you want to work on an
ad-hoc task with no spec context, or when the selection is stale and you
don't need to pick a new one right away.

See the [Specs & Milestones guide](/docs/spec-and-milestones) for the full
workflow, spec file format, and auto-advance behaviour.

## Consultation (`/consult`)

Any active executor work state (`Executing`, `Addressing`) can
pause into `Consultation`. HQ spawns the configured supervisor in consult
mode, and the executor immediately calls `wait_for_consult` to block until
the supervisor answers via `respond_consult`.

This is how the executor asks the supervisor questions mid-task without
ending the loop.

## Ask a human (`/ask_human`)

Any active state — including `Consultation` — can pause into `AwaitingHuman`.
The agent calls `wait_for_answer` and blocks. You type your answer directly
in the HQ terminal (raw text, no slash prefix), and the previous state is
restored when the answer lands.

## Quit

Press **Ctrl+C** twice within 2 seconds to exit. The first press shows a
yellow "Press Ctrl+C again to exit" prompt in the status line; the second
confirms.
