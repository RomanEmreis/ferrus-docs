---
id: agents
title: Supported agents
sidebar_position: 5
slug: /agents
---

# Supported agents

ferrus treats coding agents as **interchangeable workers**. It provides the
runtime, coordination, and on-disk state — the agent itself just reads and
writes files via its own tools and calls ferrus's MCP server to drive
state transitions.

## Backends

| Agent | Status | Config written by `ferrus register` |
|---|---|---|
| **Claude Code** | supported | `.mcp.json` |
| **Codex** | supported | `.codex/config.toml` |
| **Qwen Code** | experimental | agent-specific |

Each backend loads `ferrus serve` as an MCP server so its tool calls
flow back into the ferrus state machine.

## Roles

Each task runs up to three roles. A single backend can play all three, or
you can mix and match:

- **Supervisor** — plans tasks (`/plan`, `/task`), reviews submissions,
  answers consultations, handles approvals and rejections.
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

Model overrides are optional — pass empty strings to use each agent's
default. You can also change them interactively from HQ with `/model`.

## Tools exposed per role

`ferrus serve --role <role>` exposes only the tools that role is allowed
to call:

| `--role` | Tools |
|---|---|
| `supervisor` | `create_task`, `wait_for_review`, `review_pending`, `approve`, `reject`, `respond_consult`, `ask_human`, `answer`, `status`, `reset`, `heartbeat` |
| `executor` | `wait_for_task`, `check`, `consult`, `submit`, `wait_for_consult`, `wait_for_answer`, `ask_human`, `answer`, `status`, `reset`, `heartbeat` |
| *(omitted)* | All tools |

Role-scoped tool surfaces are a hard boundary — an executor process
physically cannot call `approve`, and a supervisor physically cannot call
`submit`. This is what makes the loop safe to drive from "untrusted"
agents.

## Skill files

`ferrus init` creates skill files under your `agents.path`
(default `.agents`):

- `<agents-path>/skills/ferrus/SKILL.md` — general overview
- `<agents-path>/skills/ferrus-supervisor/SKILL.md` + `ROLE.md`
- `<agents-path>/skills/ferrus-executor/SKILL.md` + `ROLE.md`

Agents auto-load these when they see the skill directory, so they know
how to play their role inside ferrus without any special wiring.
