---
id: project-memory
title: Project memory
sidebar_position: 7
slug: /project-memory
---

# Project memory

The [repository graph](/docs/repository-graph) knows what your code looks like
**now**. Project memory knows what your project **decided** — approved
outcomes, milestones, deviations, validation evidence, follow-up work — so a
fresh agent doesn't re-litigate a question that was settled three specs ago.

It is a second derived, rebuildable index in its own SQLite sidecar
(`project-memory.db`). It is not orchestration state: deleting it removes no
tasks, runs, archives, specifications, or graph snapshots. Like the graph, it
works entirely offline — no network call, no LLM, no embedding model.

## Enable and build

Project memory shares the repository graph's configuration namespace, so enable
the graph first:

```toml
[repository_graph]
enabled = true
```

Then:

```bash
ferrus graph memory index          # incremental
ferrus graph memory index --full   # bypass fragment reuse; also replaces incompatible storage
ferrus graph memory status
ferrus graph memory status --json
```

```text
Project memory: NotBuilt
Revision: none
Freshness: Unknown
Next: ferrus graph memory index
```

Indexing is incremental — unchanged authorized sources reuse cached fragments,
and a no-change run does not advance the published generation. Publication is
atomic: a failed or interrupted build leaves the previous revision readable.

## What gets indexed — and what never does

This is the part worth reading twice. Memory ingestion runs on an **explicit
allowlist**, and the presence of a file under `.ferrus/` or in an archive is
*not* permission to read it.

Enabled by default:

| Source category | Content boundary | Sensitivity |
|---|---|---|
| Specification structure | Tracked headings and milestone metadata | Curated |
| Approved outcome | The approved `## Outcome` section | Curated |
| Archive manifest | Archive identity and counts | Operational metadata |
| Runtime provenance | Terminal task, run, milestone, status, and check **identities** | Operational metadata |

Disabled and treated as sensitive — raw task descriptions, submissions,
reviews, patches, check logs, questions, answers, consultations, and
integration-error bodies. Runtime provenance opens `ferrus.db` read-only and
keeps only IDs and statuses; raw payloads, task paths, agent names, PIDs,
workspace paths, and failure reasons do not cross the adapter.

Use JSON status to audit every category and its effective policy:

```bash
ferrus graph memory status --json
```

:::warning[Curated does not mean public]
Approved `## Outcome` sections are the one thing ferrus copies verbatim into
memory. Keep them concise and free of secrets.
:::

## Entities and relationships

Memory covers specifications, milestones, outcomes, decisions, deviations,
validation evidence, follow-up work, and task/run references, related through
typed edges: `contains`, `implements`, `validates`, `supersedes`, `concerns`,
`touches`, `follows_up`. These are history semantics and are deliberately
independent of repository dependency edges.

Every entity and relationship carries project scope, memory revision, source
category, a portable locator, source fingerprint, extractor identity and
version, evidence span or record ID, resolution state, confidence, and
timestamps.

## Querying

Repository-only is the default — nothing changes unless you ask for it:

```bash
ferrus graph search RuntimeTaskContext                     # repository only
ferrus graph search "bounded retrieval" --domain memory    # memory only
ferrus graph context --milestone rg4.6 --domain memory
ferrus graph context --milestone rg4.6 --domain all        # federated
```

Memory context accepts several seed types:

```bash
ferrus graph context --domain memory --memory-entity <id>
ferrus graph context --domain memory --milestone rg4.6
ferrus graph context --domain memory --task <task-id>
ferrus graph context --domain memory --run <run-id>
```

Federated responses report both identities independently:

```text
Repository: snapshot=snapshot:7b39a635... freshness=Stale
Memory: revision=revision:... freshness=Fresh
```

### What `--domain all` does *not* do

It does not merge the two stores, and it does not turn history into a claim
about current code. It resolves the repository snapshot and memory revision
separately, loads only the exact link set for those two revisions, and crosses
domains **only** through evidence-backed links. Current repository evidence
wins equal-rank tie-breaking, so historical context supplements source rather
than displacing it. `Fresh` in one domain says nothing about the other.

## Repository links: resolved, stale, unresolved

A memory fact can point at code, but only on explicit evidence — the tracked
specification path, the repository-relative spec path in an approved archive
manifest, curated inline references written as `` `path:src/lib.rs` `` or
`` `symbol:rust:function:src/lib.rs:run` ``, or baseline/materialized snapshot
IDs attached to terminal task and run metadata. Changed-path evidence is
computed from file identities in two authorized snapshots — raw patches and
artifact bodies are never read.

| State | Meaning |
|---|---|
| `resolved` | Exact path or unique semantic-key match in the selected snapshot |
| `stale` | Resolved in an earlier revision, no longer matching the selected snapshot; retains the historical target |
| `unresolved` | Never matched, origin unavailable, or ambiguous semantic key |

Stale and unresolved links stay labelled and are presented as historical
evidence only. Links are **never** promoted through text similarity or LLM
inference, and link sets are stored separately from semantic memory revisions —
so reindexing unchanged memory against a new repository snapshot does not
rewrite memory facts or change the revision ID.

## Freshness and the archive lifecycle

`/archive-spec` is the only workflow that writes approved `## Outcome` content.
After the archive transaction commits, ferrus attempts an incremental memory
refresh — deliberately **outside** the archive's critical path, so a refresh
failure can never undo or fail a successful archive.

Repository and memory freshness are independent. When an authorized source
changes, queries keep the last published revision readable, report memory as
stale, and recommend:

```bash
ferrus graph memory index
```

CLI status compares the current authorized source manifest exactly.
Latency-bounded MCP retrieval may report freshness as `unknown` when it cannot
perform that comparison safely — `unknown` is not a claim that the revision is
fresh.

## What agents get

Supervisor and Executor see the same read-only surface:

| Tool | Purpose |
|---|---|
| `project_memory_status` | Availability, revision, freshness, source policy, counts |
| `project_context_search` | Bounded ranked search across the selected domain |
| `project_context` | Bounded evidence-backed context assembly |

Every MCP request must state its domain — `repository`, `memory`, or `all` —
explicitly. The tagged shape makes it impossible to silently broaden a
repository-only request. None of these tools builds an index, authors an
`## Outcome`, or touches task lifecycle state.

## Operational notes

- Treat stale or unresolved repository links as historical evidence, never as a
  current-code relationship.
- Do **not** use `project-memory.db` as a backup. Rebuild it from tracked specs
  and registered runtime metadata.
- Status reports retention diagnostics (total and historical revisions,
  terminal builds not backing the current publication, link-set counts). They
  are diagnostics only — ferrus does not silently delete history. If the
  sidecar grows unexpectedly, `--full` is the explicit cleanup path.

## See also

- [Repository graph](/docs/repository-graph) — structural indexing and retrieval
- [Specs & Milestones](/docs/spec-and-milestones#closing-out-a-spec-archive-spec) — where `## Outcome` comes from
- [Configuration](/docs/configuration#repository_graph)
