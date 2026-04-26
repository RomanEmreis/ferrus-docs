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
| `/task` | Define a task with the supervisor, then run the executor → review loop automatically. |
| `/check` | Run the ferrus check gate from HQ. |
| `/supervisor` | Open an interactive supervisor session (no initial prompt). |
| `/executor` | Open an interactive executor session (no initial prompt). |
| `/resume` | Manually resume the executor headlessly; also recovers consultation by relaunching both supervisor and executor. |
| `/review` | Manually spawn supervisor in review mode (escape hatch when automatic spawning failed). |
| `/status` | Show task state, agent list, and session log paths. |
| `/attach <name>` | Show log path for a running headless agent. |
| `/stop` | Stop all running agent sessions (prompts for confirmation). |
| `/reset` | Reset state to Idle and clear task files (prompts for confirmation). |
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

## Specifications (`/spec`)

`/spec` spawns a supervisor session whose only job is to draft a feature
specification with you and persist it. You describe what you want built; the
supervisor pulls in the `ferrus://spec_template` resource, asks clarifying
questions, and once you both agree, calls `create_spec` to write a Markdown
file under the directory configured in `[spec]` (default
`docs/specs/`).

The path of the most recently approved spec is recorded in
`.ferrus/LAST_SPEC_PATH` so HQ can hand it back to you. Point the next
`/task` at that file and the executor implements the spec end to end.

```text
ferrus> /spec
  └─ supervisor → you describe the feature → create_spec
       └─ docs/specs/<name>.md written → LAST_SPEC_PATH updated
            └─ ferrus> /task → reference the spec file → normal loop
```

`/spec` does **not** create a task or change the state machine — it's a
pure planning artifact step. You can rerun it as many times as you want
between tasks, and the saved Markdown is plain text you can edit or commit
to source control.

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
