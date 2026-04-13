---
id: configuration
title: Configuration
sidebar_position: 2
slug: /configuration
---

# Configuration

ferrus reads a single `ferrus.toml` at the root of your project. `ferrus init`
scaffolds it with sensible defaults; tune it to your build.

## `ferrus.toml` reference

```toml
[checks]
commands = [
    "cargo clippy -- -D warnings",
    "cargo fmt --check",
    "cargo test",
]

[limits]
max_check_retries = 20   # consecutive check failures before state → Failed
max_review_cycles = 3    # reject→fix cycles before state → Failed
max_feedback_lines = 30  # trailing lines per failing command shown in /check and /submit output
wait_timeout_secs  = 60  # max duration of one wait_* tool call before it polls again

[agents]
path = ".agents"         # root directory for agent skill files

[lease]
ttl_secs = 90                  # how long a claimed lease is valid without renewal
heartbeat_interval_secs = 30   # how often agents should call heartbeat

[hq.supervisor]
agent = "claude-code"    # claude-code | codex | qwen-code
model = ""               # optional override; empty = agent default

[hq.executor]
agent = "codex"
model = ""
```

## `[checks]`

The **check gate** is how ferrus decides whether the executor's work is
actually done. These commands run from the directory where `ferrus serve`
was started, in order, and must **all** exit with status 0.

Full `stdout` + `stderr` is persisted to
`.ferrus/logs/check_<attempt>_<ts>.txt`. Only a trailing summary
(`max_feedback_lines`) is inlined into the executor's feedback so task
context doesn't fill up with technical noise.

```toml
[checks]
commands = [
    "pnpm lint",
    "pnpm test -- --run",
    "pnpm typecheck",
]
```

:::tip
Check commands should be **fast and deterministic**. If a single check takes
minutes, the loop will spend most of its time waiting.
:::

## `[limits]`

| Key | What it bounds |
|---|---|
| `max_check_retries` | How many consecutive check failures the executor may hit before the task moves to **Failed**. |
| `max_review_cycles` | How many reject → re-implement cycles a task can go through before **Failed**. |
| `max_feedback_lines` | Trailing lines of each failing command shown inline. |
| `wait_timeout_secs` | Max duration of a single `wait_*` MCP call. On timeout the tool returns so the agent can poll again. |

## `[lease]`

Only one executor works on a task at a time. The mechanism is an advisory
**lease** claimed atomically in `.ferrus/STATE.json`:

- `ttl_secs` — the lease expires if not renewed.
- `heartbeat_interval_secs` — how often the executor calls `heartbeat`.

If an executor crashes, the lease naturally expires and a new executor can
be resumed.

## `[hq.supervisor]` and `[hq.executor]`

Which coding agent plays which role. Change these to swap backends without
touching anything else:

```toml
[hq.supervisor]
agent = "claude-code"

[hq.executor]
agent = "codex"
model = "gpt-5-codex-high"  # optional; empty = agent default
```

Use `/model` inside HQ to update model overrides interactively.

## Runtime files (`.ferrus/`)

| File | Contents |
|---|---|
| `STATE.json` | Current state, lease fields, retry/cycle counters, schema version, timestamp |
| `STATE.lock` | Advisory lock file for atomic claiming (do not delete) |
| `TASK.md` | Task description written by Supervisor |
| `REVIEW.md` | Supervisor rejection notes |
| `SUBMISSION.md` | Executor submission notes |
| `QUESTION.md` / `ANSWER.md` | Human-in-the-loop Q&A |
| `CONSULT_REQUEST.md` / `CONSULT_RESPONSE.md` | Supervisor consultation pair |
| `logs/` | Full stdout + stderr per check run; PTY session logs per agent |

`STATE.json` is written atomically (write-to-tmp + rename) so a crash
mid-write never leaves it corrupt. `ferrus init` automatically adds
`.ferrus/` to your `.gitignore`.
