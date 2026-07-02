---
id: state-machine
title: State machine
sidebar_position: 4
slug: /state-machine
---

# State machine

Everything ferrus does is modeled as an explicit state machine. There is
**no hidden context** — the current status of every task lives as a row in
`ferrus.db` (SQLite), and agents are stateless between spawns.

The old single global `.ferrus/STATE.json` is gone. Every SQLite task row
still follows the same Supervisor–Executor lifecycle, just per task instead
of per project — with `max_parallel_tasks = 1` the runtime behaves exactly
like the original single-task workflow, only DB-backed. With a higher
`max_parallel_tasks`, multiple task rows advance through this same machine
independently and concurrently.

## States and transitions

SQLite stores status as a lowercase string (`pending`, `executing`, …); this
guide capitalizes them for readability.

```text
pending
 └─► executing                              ← wait_for_task claim
       ├─► addressing                       ← reject (Supervisor) → work loop
       ├─► consultation                     ← consult (Executor)
       │     └─► (restore paused status)    ← wait_for_consult
       ├─► awaiting_human                   ← ask_human
       │     └─► (restore paused status)    ← wait_for_answer
       ├─► reviewing                        ← submit (final check passed)
       │     ├─► addressing                 ← reject → work loop
       │     └─► complete                   ← approve
       └─► failed                           ← check / submit / reject hits retry or cycle limit
```

Every transition is explicit and gated by a tool call from the right
role — supervisors can't `submit`, executors can't `approve`.

## State catalog

| Status | Meaning |
|---|---|
| `pending` | Task queued (via `enqueue_task` from `/task` or `/run`) but not yet claimed by an executor. |
| `executing` | Executor is implementing the task. |
| `addressing` | Reviewer rejected — executor is fixing. |
| `consultation` | Executor paused to ask the supervisor a question via `consult`. |
| `awaiting_human` | Agent paused to ask a human a question via `ask_human`. |
| `reviewing` | Executor submitted work; supervisor is reading the submission. |
| `complete` | Supervisor approved the submission. Terminal — not resettable. |
| `failed` | Retries, review cycles, or executor-dispatch budget exhausted. `/reset` required to clear. |
| `reset` | Task was force-reset via `/reset`; its scoped artifacts were cleared. |

Consultation and human-answer flows store their paused status and requester
metadata directly in SQLite, with the request/response artifacts scoped
under `.ferrus/runs/<task-id>/`.

## The SQLite scheduler

HQ runs a background scheduler tick (every 2 seconds) that claims `pending`
task rows and dispatches executors for them, bounded by `max_parallel_tasks`
concurrent sessions. `/task` queues one task and lets the scheduler pick it
up; `/run [--limit N]` queues every ready milestone in the selected spec (or
up to `--limit`) in one shot so the scheduler can work through several tasks
in parallel.

## Retry and review budgets

Three counters guard the loop, all configured in `ferrus.toml` under
`[limits]` (see [Configuration](/docs/configuration#limits)):

- **`max_check_retries`** — consecutive check failures. Reset to 0 on each
  successful pass and on each rejected submission. Exhausting this budget
  moves the task to `Failed`.
- **`max_review_cycles`** — number of reject → fix round trips. Exhausting
  this budget also moves the task to `Failed`.
- **`max_executor_dispatches`** — how many times HQ will (re)spawn an
  executor for one task within a single work phase before giving up. Bounds
  the respawn loop when a session hits its turn limit and exits without
  submitting. Resets on each fresh rejection back to `Addressing`.

## Crash safety

Task rows, leases, and counters are written to SQLite transactionally, so a
crash mid-write never leaves runtime state corrupt.

If an agent process dies, the **lease** attached to its task row expires
after `lease.ttl_secs`. On HQ startup — and on demand via `ferrus recover`
— dead running rows whose PIDs are gone are marked `interrupted`, leases
still backed by a live run are preserved, other expired leases are
released, and paused (consultation / human-answer) flows are reconciled.
You can then `/resume` the executor headlessly and the loop picks up
exactly where it left off.

## Leases

Only one executor works on a given task at a time. When an executor claims a
task, it writes its identity (`executor:codex:1`) into the task's
`claimed_by` column and starts calling `heartbeat` every
`heartbeat_interval_secs`. If heartbeats stop for longer than `ttl_secs`,
the claim is considered dead and can be taken by a new process.

This is the mechanism that makes ferrus **restart-safe**: crashes, terminal
closes, or power losses don't leave a task stuck.

## Why a state machine, not a chat?

Chat-based agents are stateful by accident — context accumulates in a
conversation window and any crash or restart loses it. ferrus flips this:

- **State lives in SQLite**, queryable and transactional.
- **Agents are stateless** between runs; each spawn is handed a short
  prompt that points to the runtime context and files it needs.
- **Lifecycle is explicit**: `ferrus tasks list`, `ferrus runs list`, and
  `ferrus events list` (or `/tasks`, `/runs`, `/events` from HQ) show
  exactly what's happening, for every task at once.

This is what "deterministic orchestration" means in practice — not that
the agents are deterministic, but that **ferrus is**.
