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
max_check_retries = 20          # consecutive check failures before state → Failed
max_review_cycles = 3           # reject→fix cycles before state → Failed
max_feedback_lines = 30         # trailing lines per failing command shown in /check and /submit output
wait_timeout_secs = 60          # max duration of one wait_* tool call before it returns timeout so the agent can poll again
max_parallel_tasks = 1          # maximum number of concurrent executor sessions
max_executor_dispatches = 6     # executor (re)spawns per work phase before state → Failed

[lease]
ttl_secs = 90                   # how long a claimed lease is valid without renewal
heartbeat_interval_secs = 30    # how often agents should call heartbeat

[spec]
directory = "docs/specs"        # where /create_spec writes approved specs

[hq.supervisor]
agent = "claude-code"    # agent for supervisor/reviewer role: claude-code | codex | qwen-code | goose | opencode
model = ""                # optional override; empty = agent default

[hq.executor]
agent = "codex"           # agent for executor role: claude-code | codex | qwen-code | goose (experimental); opencode executor is experimental/unstable
model = ""
```

`--agents-path` (default `.agents`) is a one-time flag to `ferrus init` that
picks where skill files are written — it is not persisted in `ferrus.toml`.

## `[checks]`

The **check gate** is how ferrus decides whether the executor's work is
actually done. These commands run in the active task workspace, in order,
and must **all** exit with status 0.

Full `stdout` + `stderr` is persisted to
`.ferrus/logs/check_<attempt>_<scope>_<ts>.txt`, where the task/run scope
prevents parallel checks from overwriting each other. Only a trailing
summary (`max_feedback_lines`) is inlined into the executor's feedback so
task context doesn't fill up with technical noise.

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
| `max_parallel_tasks` | How many tasks may have an executor running at the same time. Each task still advances through its own independent state. |
| `max_executor_dispatches` | How many times HQ will (re)spawn an executor for a single task within one work phase before giving up and marking it **Failed**. Bounds the respawn loop when a session hits its turn limit and exits without submitting; the counter resets on each fresh rejection back to Addressing. |

## `[lease]`

Only one executor works on a given task at a time. The mechanism is an
advisory **lease** claimed atomically in SQLite (`ferrus.db`):

- `ttl_secs` — the lease expires if not renewed.
- `heartbeat_interval_secs` — how often the executor calls `heartbeat`.

If an executor crashes, the lease naturally expires and a new executor can
be resumed with `/resume` or `ferrus recover`.

## `[spec]`

Where the [`/spec`](/docs/hq#specifications-and-milestones-spec-milestones-reset-spec) HQ command writes
approved feature specifications. The supervisor drafts the spec
interactively and calls `create_spec` to persist it as a Markdown file
under this directory. The selected spec and milestone are tracked per task
in `ferrus.db`.

```toml
[spec]
directory = "docs/specs"  # any path inside the project; created on first write
```

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

Use `/model` inside HQ to update model overrides interactively. See
[Supported agents](/docs/agents) for the full backend list, including the
experimental `goose` and `opencode` adapters.

## Runtime files

Ferrus separates human-readable project artifacts from machine-local runtime
state. SQLite is the runtime source of truth; Markdown files are scoped task
intent and run artifacts, not a mirrored state machine.

| Path | Contents |
|---|---|
| `.ferrus/` | Project-local templates, task/run artifacts, agent registry, and logs |
| `~/.ferrus/projects/<project-id>/` | Machine-local project metadata, the `ferrus.db` SQLite database, and global logs |

### `.ferrus/`

| File | Contents |
|---|---|
| `project.toml` | Local pointer to `~/.ferrus/projects/<project-id>/` |
| `agents.json` | Runtime registry for agent sessions, statuses, PIDs, and log ownership |
| `TASK.md` | Task drafting template |
| `CONSULT_TEMPLATE.md` | Read-only consultation request template |
| `SPEC_TEMPLATE.md` | Read-only feature specification template |
| `tasks/<task-id>.md` | Numbered task intent artifact |
| `runs/<task-id>/SUBMISSION.md` | Executor submission notes |
| `runs/<task-id>/REVIEW.md` | Supervisor review or rejection notes |
| `runs/<task-id>/QUESTION.md` / `ANSWER.md` | Human-in-the-loop Q&A |
| `runs/<task-id>/CONSULT_REQUEST.md` / `CONSULT_RESPONSE.md` | Supervisor consultation pair |
| `runs/<task-id>/PATCH.diff` | Patch produced from an isolated executor workspace |
| `runs/<task-id>/INTEGRATION_ERROR.md` | Recoverable patch or integration-check failure context |
| `logs/` | Scoped check output and PTY session logs per agent |

### `~/.ferrus/projects/<project-id>/`

| File | Contents |
|---|---|
| `project.toml` | Project id, name, workspace path, `.ferrus` path, git metadata, timestamps, schema version |
| `ferrus.db` | SQLite source of truth for tasks, runs, events, leases, counters, and project runtime state |
| `logs/` | Reserved for machine-local logs that should not be committed |

`ferrus init` automatically adds `.ferrus/` to your `.gitignore`. On HQ
startup, ferrus marks dead active runs as `interrupted`, preserves leases
backed by live runs, releases other expired leases, and resumes recoverable
task flows — the same recovery `ferrus recover` runs on demand. Migrating an
existing pre-0.3 project (`STATE.json`-based) is a one-time `ferrus migrate`
— see the [migration guide](/docs/migration).
