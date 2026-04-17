---
id: state-machine
title: State machine
sidebar_position: 4
slug: /state-machine
---

# State machine

Everything ferrus does is modeled as an explicit state machine. There is
**no hidden context** — the current state lives in `.ferrus/STATE.json` on
disk and agents are stateless between spawns.

## States and transitions

```text
Idle
 └─► Executing                              ← create_task
       ├─► Consultation                     ← consult
       │     └─► Executing                  ← wait_for_consult
       ├─► Executing                        ← check / submit (final check failed, retries < max)
       ├─► Failed                           ← check / submit (final check failed, retries ≥ max)
       └─► Reviewing                        ← submit (final check passed)
             ├─► Complete                   ← approve
             ├─► Failed                     ← reject (cycles ≥ max)
             └─► Addressing                 ← reject (cycles < max)
                   ├─► Consultation         ← consult
                   │     └─► Addressing     ← wait_for_consult
                   ├─► Addressing           ← check / submit (final check failed, retries < max)
                   ├─► Failed               ← check / submit (final check failed, retries ≥ max)
                   └─► Reviewing            ← submit (final check passed)
```

Every transition is explicit and gated by a tool call from the right
role — supervisors can't `submit`, executors can't `approve`.

## State catalog

| State | Meaning |
|---|---|
| `Idle` | No active task. `STATE.json` exists with state = Idle. |
| `Executing` | Executor is implementing the task described in `TASK.md`. |
| `Addressing` | Reviewer rejected — executor is fixing. |
| `Consultation` | Executor paused to ask the supervisor a question via `consult`. |
| `AwaitingHuman` | Agent paused to ask a human a question via `ask_human`. |
| `Reviewing` | Executor submitted work; supervisor is reading `SUBMISSION.md`. |
| `Complete` | Supervisor approved the submission. Next `/task` starts cleanly. |
| `Failed` | Retries or review cycles exhausted. `/reset` required to clear. |

## Retry and review budgets

Two counters guard the loop:

- **`check_retries`** — consecutive check failures. Reset to 0 on each
  successful pass and on each rejected submission. Exhausting this budget
  moves the task to `Failed`.
- **`review_cycles`** — number of reject → fix round trips. Exhausting this
  budget also moves the task to `Failed`.

Both limits live in `ferrus.toml` under `[limits]`. See
[Configuration](/docs/configuration#limits).

## Crash safety

`STATE.json` is always written atomically — ferrus writes to
`STATE.json.tmp` and then renames. A crash mid-write leaves the previous
valid state in place.

If an agent process dies, the **lease** attached to its state entry
expires after `lease.ttl_secs`. You can then `/resume` the executor
headlessly and the loop picks up exactly where it left off.

## Leases

Only one executor works on a task at a time. When an executor claims a
state, it writes its identity (`executor:codex:1`) into `claimed_by` and
starts calling `heartbeat` every `heartbeat_interval_secs`. If heartbeats
stop for longer than `ttl_secs`, the claim is considered dead and can be
taken by a new process.

This is the mechanism that makes ferrus **restart-safe**: crashes,
terminal closes, or power losses don't leave the state machine stuck.

## Why a state machine, not a chat?

Chat-based agents are stateful by accident — context accumulates in a
conversation window and any crash or restart loses it. ferrus flips this:

- **State lives on disk**, in plain text.
- **Agents are stateless** between runs; each spawn is handed a short
  prompt that points to the files it needs.
- **Lifecycle is explicit**: you can look at `STATE.json` and know
  exactly what's happening.

This is what "deterministic orchestration" means in practice — not that
the agents are deterministic, but that **ferrus is**.
