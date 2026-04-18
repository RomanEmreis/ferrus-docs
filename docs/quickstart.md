---
id: quickstart
title: Quickstart
sidebar_position: 1
slug: /quickstart
---

# Quickstart

Get ferrus running against a project in under a minute.

## 1. Install

Currently supports Linux (x86_64, aarch64). Other platforms are not yet supported.

```bash
curl -fsSL https://github.com/RomanEmreis/ferrus/releases/latest/download/install.sh | sh
```

From [crates.io](https://crates.io/crates/ferrus):

```bash
cargo install ferrus
```

Or build from source:

```bash
git clone https://github.com/RomanEmreis/ferrus
cd ferrus
cargo install --path .
```

Requires **Rust 1.93+**. ferrus is currently **alpha** — expect rough edges.

## 2. Scaffold

Inside any project directory:

```bash
ferrus init
```

This creates:

- `ferrus.toml` — project config (check commands, limits, agent roles)
- `.ferrus/` — runtime directory for state and logs (gitignored)
- `.agents/skills/ferrus*/` — skill files your coding agents will load to
  understand their role

## 3. Register your agents

Tell ferrus which coding agent plays each role. Supported today:
`claude-code`, `codex`, and experimental `qwen-code`.

```bash
ferrus register --supervisor claude-code --executor codex
```

This writes the right MCP server config (`.mcp.json` for Claude Code,
`.codex/config.toml` for Codex) so agents automatically pick up
`ferrus serve` as a tool server.

## 4. Drop into HQ

Run `ferrus` with no arguments:

```bash
ferrus
```

You're now in **HQ** — a small interactive shell. Type `/` to see the
available slash commands, or jump straight in:

```
ferrus> /task
```

A supervisor spawns, you describe what you want, and the full
Executor → Reviewer loop runs automatically.

:::tip
Press **Ctrl+C** twice within 2 seconds to exit HQ.
:::

## What happens next

```text
ferrus> /task
  └─ supervisor → you describe the task → create_task
       └─ executor (headless) → implements → check → submit
            └─ reviewer (headless) → reads submission → approve or reject
                 ├─ approved → Complete
                 └─ rejected → executor re-spawns with feedback
```

Next, read about the [state machine](/docs/state-machine) and the
[available HQ commands](/docs/hq).
