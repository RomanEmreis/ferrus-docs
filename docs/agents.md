---
id: agents
title: Supported agents
sidebar_position: 5
slug: /agents
---

# Supported agents

ferrus treats coding agents as **interchangeable workers**. It provides the
runtime, coordination, and SQLite-backed state — the agent itself just reads
and writes files via its own tools and calls ferrus's MCP server to drive
task transitions. Backend-specific behavior lives in `src/agents/{claude,
codex, qwen, opencode, goose}` and is normalized behind shared Supervisor/
Executor contracts.

## Backends

| Agent | Status | Config written by `ferrus register` |
|---|---|---|
| **Claude Code** | supported | `.claude/mcp-supervisor.json` / `.claude/mcp-executor.json` + `.claude/settings.local.json` permissions |
| **Codex** | supported | `.codex/config.toml` |
| **Qwen Code** | experimental | `.qwen/settings.json` |
| **goose** | experimental | none — attached at launch via `--with-extension` |
| **opencode** | experimental | `opencode.json` |

Each backend loads `ferrus serve` as an MCP server so its tool calls flow
back into the ferrus task state machine.

### goose

MCP-native and convenient for local models. Ferrus attaches its role-scoped
MCP server at launch via goose's `--with-extension`, so no config file is
written. Model selection uses goose's `GOOSE_MODEL` environment variable
(goose has no universal `--model` flag across `run` and `session`); set the
provider — e.g. a local LM Studio or Ollama endpoint — with
`goose configure`. Headless runs set `GOOSE_MODE=auto` so tool calls are
auto-approved and the run never blocks on confirmation.

goose honors the per-task worktree, so the **executor** role is fully
usable. Headless runs are bounded by loop guards (`--max-turns`,
`--max-tool-repetitions`) so a weak local model that thrashes on compile
errors fails cleanly instead of looping forever — raise the turn budget by
exporting `GOOSE_MAX_TURNS` before launching Ferrus. Tool-calling
reliability depends heavily on the local model; see the
[local model tuning guide](/docs/local-models) for sampling and
quantization advice.

### opencode

Convenient for running local models, but the **executor** layer is
currently **unstable**: opencode identifies a project by its git
root-commit and binds it to a single working directory in its own global
store, so it does not stay confined to the isolated per-task worktree HQ
provisions — it may operate on the canonical checkout instead. Use opencode
for the **supervisor/reviewer** role for now; treat the executor role as
not yet supported.

## Roles

Each task runs up to three roles. A single backend can play all three, or
you can mix and match:

- **Supervisor** — plans tasks (`/plan`, `/task`, `/run`), reviews
  submissions, answers consultations, handles approvals and rejections.
- **Executor** — implements, runs checks, submits.
- **Reviewer** — spawned automatically on submission; runs headlessly and
  exits after approve/reject. In practice, the Reviewer is the Supervisor
  backend relaunched in review mode.

## Register

```bash
ferrus register \
  --supervisor claude-code \
  --executor codex \
  --supervisor-model claude-sonnet-4-6 \
  --executor-model gpt-5-codex-high
```

Model overrides are optional — omit them to use each agent's default. You
can also change them interactively from HQ with `/model`, or leave a model
unset and target a local backend (goose/opencode) for cost-free iteration.

## Tools exposed per role

`ferrus serve --role <role>` exposes only the tools that role is allowed
to call:

| `--role` | Tools |
|---|---|
| `supervisor` | Definition sessions: `enqueue_task`, `create_spec`; task sessions: `wait_for_review`, `review_pending`, `approve`, `reject`, `wait_for_consultation`, `respond_consult`, `ask_human`, `wait_for_answer`, `heartbeat` |
| `executor` | `wait_for_task`, `check`, `consult`, `submit`, `wait_for_consult`, `ask_human`, `wait_for_answer`, `status`, `reset`, `heartbeat` |
| *(omitted)* | All tools, plus compatibility aliases `create_task` and `answer` |

Role-scoped tool surfaces are a hard boundary — an executor process
physically cannot call `approve`, and a supervisor physically cannot call
`submit`. This is what makes the loop safe to drive from "untrusted"
agents.

## Skill files

`ferrus init` creates skill files under your `--agents-path`
(default `.agents`):

- `<agents-path>/skills/ferrus/SKILL.md` — general overview: CLI, MCP
  tools, resources, per-task state machine, and artifact layout
- `<agents-path>/skills/ferrus-supervisor/SKILL.md` + `ROLE.md`
- `<agents-path>/skills/ferrus-executor/SKILL.md` + `ROLE.md`

Agents auto-load these when they see the skill directory, so they know how
to play their role inside ferrus without any special wiring.
