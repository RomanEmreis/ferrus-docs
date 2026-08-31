---
id: repository-graph
title: Repository graph
sidebar_position: 6
slug: /repository-graph
---

# Repository graph

Every time an agent spawns, it starts blind. It greps, it reads directory
listings, it opens the same five files it opened on the last run — and it pays
tokens for all of it. The **repository graph** is ferrus's answer: an optional,
machine-local structural index that agents can query instead of rediscovering
your codebase from scratch.

It is a **rebuildable materialized view of one explicitly identified source
state**. Your source and Git remain authoritative. The graph may be missing,
stale, incompatible, or deleted at any moment without changing task state — an
absent index never blocks the Supervisor → Executor → Reviewer loop.

:::info[Two sidecars, one feature]
The repository graph indexes **current structure**. Its sibling,
[project memory](/docs/project-memory), indexes **curated history** — approved
outcomes, decisions, milestones. They live in separate SQLite files, advance on
independent revisions, and are queried through the same commands and tools.
:::

## Enable it

The graph is **opt-in and not scaffolded** by `ferrus init`. Add the namespace
to `ferrus.toml` yourself:

```toml
[repository_graph]
enabled = true
```

That single line is enough — every other setting has a default. See
[Configuration](/docs/configuration#repository_graph) for the full surface.

## Build the index

```bash
ferrus graph index
```

```text
Indexed repository graph
Snapshot: snapshot:7b39a63599ec38388b417269b82f330051507ca17b71ae25af95787b64130791
Freshness: fresh
Files: 265 discovered, 0 reused, 265 parsed, 0 skipped, 0 failed
Facts: 6913 nodes, 8200 edges, 700 diagnostics
Work: 2054529 bytes in 880 ms
```

Re-running it is **incremental**: unchanged files are reused rather than
re-parsed, and a no-op build publishes the same snapshot identity.

```bash
ferrus graph index          # incremental — reuses unchanged fragments
ferrus graph index --full   # ignore the fragment cache and re-run every extractor
```

Facts land in `repo-graph.db` next to `ferrus.db`:

| Path | Contents |
|---|---|
| `~/.ferrus/projects/<project-id>/ferrus.db` | Runtime source of truth (tasks, runs, leases) |
| `~/.ferrus/projects/<project-id>/repo-graph.db` | Derived structural facts — **safe to delete** |
| `~/.ferrus/projects/<project-id>/project-memory.db` | Derived curated history — **safe to delete** |

Deleting a sidecar loses nothing but build time. `ferrus graph index` rebuilds
it.

:::tip[Git is not required]
Indexing reads the filesystem through a confined source adapter. A clean Git
tree lets ferrus reuse Git content identities, but a non-Git directory indexes
fine — it just gets content digests instead.
:::

## What gets indexed

Three built-in extractors run today:

| Extractor | Covers | Emits |
|---|---|---|
| `builtin.generic-structure` | Every included file, any language | `repository`, `directory`, `file`, `document`, `manifest`, `configuration`, `entry_point` |
| `builtin.rust-syntax` | Rust sources, via tree-sitter | `module`, `mod_declaration`, `struct`, `enum`, `trait`, `function`, `impl`, `constant`, `type_alias`, `import`, `re_export` |
| `builtin.cargo-manifest` | `Cargo.toml` | `cargo_workspace`, `cargo_package`, `cargo_target`, `declared_dependency` |

Relationships between them:

| Edge | Meaning |
|---|---|
| `contains` | Structural containment (directory → file, module → symbol) |
| `classified_as` | A file's inferred role (document, manifest, configuration, entry point) |
| `declares_module` | A `mod x;` declaration pointing at its module |
| `imports` / `re_exports` | `use` declarations, split by visibility |
| `declares_target` | A Cargo package declaring a lib/bin/bench/test target |
| `depends_on` | A declared Cargo dependency, classified internal / workspace / external |

So a Rust project gets real symbol-level navigation, and **any** project gets
structure, documentation, configuration, and entry-point mapping. Additional
languages are extractor work, not architecture work — the identity, snapshot,
and query contracts are language-neutral.

### Semantic keys

Beyond opaque node IDs, most facts carry a human-typeable **semantic key**:

```text
rust:struct:src/project.rs:project::RuntimeTaskContext
rust:file-module:src/project.rs
cargo:package:Cargo.toml:ferrus
cargo:target:Cargo.toml:bin:ferrus
file:README.md
configuration:11:ferrus.toml:toml
```

A semantic key is a best-effort lookup convenience, **not** a stable primary
key. Renames, refactors, and parser changes may change it; opaque node IDs are
scoped to one snapshot and are not promised to survive the next one either.

## Query it from the CLI

### Status first

```bash
ferrus graph status
```

```text
Repository graph: Available
Snapshot: snapshot:7b39a63599ec38388b417269b82f330051507ca17b71ae25af95787b64130791
Freshness: Stale
Facts: 265 files, 6913 nodes, 8200 edges
Diagnostics: 0 info, 700 warnings, 0 errors
```

`status` is the only graph command that works while the graph is disabled or
unbuilt — everything else requires `enabled = true`. When there is nothing to
query it tells you what to run next (`Next: ferrus graph index`).

### Search

```bash
ferrus graph search RuntimeTaskContext --limit 5
```

```text
Snapshot: snapshot:7b39a635...
Freshness: Stale
Diagnostics: 0 info, 700 warnings, 0 errors
Truncated: no
0.98 struct rust:struct:src/project.rs:project::RuntimeTaskContext
  id=node:df6810fd... evidence=src/project.rs:361:1 resolution=Resolved confidence=Exact
```

Matching is ranked deterministically, best class first: exact semantic key →
exact path → exact name → name prefix → name substring → semantic-key substring
→ path substring. Filters narrow it further:

```bash
ferrus graph search Task --kind struct --kind enum --path src --limit 20
```

### Show

Look up everything evidenced by one node, symbol, or path:

```bash
ferrus graph show --node node:df6810fd...
ferrus graph show --symbol "rust:struct:src/project.rs:project::RuntimeTaskContext"
ferrus graph show --path src/project.rs
```

### Context

Assemble a bounded, evidence-backed context packet around one or more seeds:

```bash
ferrus graph context --symbol "rust:struct:src/project.rs:project::RuntimeTaskContext" --depth 1
```

```text
Snapshot: snapshot:7b39a635...
Freshness: Stale
Diagnostics: 0 info, 700 warnings, 0 errors
Truncated: Depth (2 results, 1974 bytes, depth 1)
struct rust:struct:src/project.rs:project::RuntimeTaskContext src/project.rs:361:1
  selected=ExactSeed resolution=Resolved confidence=Exact extractor=builtin.rust-syntax@1.0.0+tree-sitter-0.26.11.rust-0.24.2
module rust:file-module:src/project.rs src/project.rs:1:1
  selected=Containment resolution=Resolved confidence=Exact extractor=builtin.rust-syntax@1.0.0+tree-sitter-0.26.11.rust-0.24.2
```

Every item states **why it was selected** (`ExactSeed`, `Containment`,
`Declaration`, resolved dependency, documentation, configuration, …) and which
extractor produced it. Ranking is deterministic: selection reason, then depth,
then evidence location, then kind, then key, then node ID. The same request
against the same snapshot returns the same ordered results.

### Neighbors

Walk a bounded neighborhood around one node:

```bash
ferrus graph neighbors node:599f0a1f... --direction both --depth 2 --limit 50
```

```text
Nodes:
  module node:599f0a1f... evidence=src/project.rs:1:1 resolution=Resolved confidence=Exact
  struct node:df6810fd... evidence=src/project.rs:361:1 resolution=Resolved confidence=Exact
Edges:
  contains node:599f0a1f... -> node:df6810fd... resolution=Resolved confidence=Exact
```

### Machine-readable output

Every graph command accepts `--json` and emits one document containing the wire
version, repository and snapshot identities, freshness, diagnostics,
pagination/truncation state, and the operation payload.

```bash
ferrus graph status --json
ferrus graph search RuntimeTaskContext --json
```

## Snapshots, builds, and freshness

The single most important thing to understand about the graph is that **three
states are orthogonal** and never collapse into one "is it OK?" flag:

| Axis | Values | Question it answers |
|---|---|---|
| Availability | `not_built`, `available`, `incompatible` | Is there a published snapshot I can read? |
| Build | `building`, `complete`, `published`, `failed`, `superseded` | What happened to the most recent attempt? |
| Freshness | `fresh`, `stale`, `unknown`, `not_applicable` | Does the published snapshot still match the source? |

This is why status can report *"an available snapshot, plus a newer refresh
that failed"* without either fact erasing the other. A failed build never
replaces the last published view, and partial facts are never visible to
ordinary queries — publication is a compare-and-set against the expected
current pointer, so an older build cannot overwrite a newer one.

Status also emits a machine-readable recommended action: `index`,
`wait_for_build`, `retry_index`, `refresh_index`, or `rebuild`.

Freshness is computed by **actually comparing the current source manifest**
against the snapshot's identity inputs — not inferred from events. Edit a file
outside ferrus entirely and the next `ferrus graph status` still reports
`Stale`.

A snapshot's identity is derived from the repository, its source manifest
digest, the graph model version, the effective semantic configuration digest,
and the extractor-set digest. Operational settings — query budgets, retention,
telemetry, endpoints, credentials — deliberately **do not** participate. Two
configurations that mean the same thing produce the same snapshot; changing a
timeout does not invalidate your index.

## Task views: what the executor sees

Executors work in isolated Git worktrees, so pointing them at a canonical
`latest` index would be wrong. Instead, each task gets its own **task
repository view**:

```text
pinned baseline snapshot   (the task's Ferrus baseline Git tree)
        + overlay          (that worktree's changed / added / deleted files)
        = task view
```

- A newer canonical snapshot **does not** make a pinned baseline stale — other
  tasks advancing does not disturb this one.
- Worktree edits make only *that* task's overlay stale.
- Overlay deletions hide baseline nodes, edges, snippets, and search hits for
  the deleted path.
- On submission, the view is **frozen** together with its Git tree, and review
  reopens it by identity. The reviewer reads exactly what was submitted.
- If a task view is unavailable, the tool says so (`not_built`, `stale`,
  `unavailable`, `failed`) and directs the agent to inspect source directly. It
  **never silently falls back** to canonical data.

Canonical integration after approval marks the canonical snapshot stale and
refreshes it best-effort. Graph refresh failure can never undo or fail a
successful approval.

## What agents actually get

When the graph is configured, `ferrus serve` exposes three **read-only** tools
to Supervisor, Executor, and unfiltered servers alike:

| Tool | Purpose |
|---|---|
| `repository_graph_status` | Availability, build state, freshness, task-view status, recommended action |
| `repository_search` | Bounded ranked search — `query`, `kinds`, `paths`, budget caps, `cursor` |
| `repository_context` | Bounded context assembly — `seeds`, `direction`, `edge_kinds`, `include_unresolved`, `include_external`, `include_snippets` |

None of them resolves, claims, renews, or mutates a task lease. Graph output is
**never injected into task or review prompts** — an agent must ask for it, and
tool descriptions steer it to check status first and keep requests bounded.

### Verified snippets

Structural results never embed file bodies. Source text is opt-in per request
via `include_snippets`, and every excerpt is resolved through `SnapshotContent`:
the reader holds a canonical source-root handle, rejects symlink traversal,
reapplies the sensitive-path policy, and verifies size, mode, and SHA-256
**before** slicing the recorded byte span. An independent aggregate snippet-byte
cap applies on top.

Content that changed, became unavailable, was excluded, or is not UTF-8 is
omitted and reported as a bounded diagnostic (`content.changed`,
`content.unavailable`, `content.non_utf8`). Unverified bytes are never
returned.

## Absence is not proof

The contract every consumer must respect: **a missing node or edge means "not
known by this snapshot and its capabilities" — not "does not exist."**

Every fact carries its extractor ID and version, evidence path and span,
resolution state (`resolved` / `unresolved` / `external`), and a confidence
classification. Paths that cannot be represented as valid UTF-8 are skipped
with a bounded diagnostic — an explicit capability limitation, not evidence
that the file has no relationships.

That's also what the diagnostic counts in every response are for. The ferrus
dogfood snapshot above carries 700 bounded warnings: places the extractors
declined to guess.

## Privacy and safety

The graph treats your repository as untrusted input:

- Indexing **never executes** repository code, hooks, build scripts, compilers,
  or macros. It parses.
- Source adapters confine paths to the selected root and do not follow symlinks
  outside it.
- Sensitive-path policy is applied **before** extraction. The default excluded
  set covers `**/.env`, `**/.env.*`, `**/*.key`, `**/*.pem`, `**/*.p12`,
  `**/*.pfx`, `**/id_rsa`, `**/id_ed25519`.
- Full source bodies are **not stored** in the sidecar — only identities,
  spans, and structure.
- Logs, events, metrics, errors, and diagnostics carry IDs, counts, timings,
  and bounded codes — never source bodies, secrets, or absolute workspace
  paths.
- Credentials, tokens, and endpoints never participate in snapshot identity and
  never appear in diagnostics.
- Everything is local. Indexing and retrieval make no network call, load no
  model, and contact no service.

## Budgets

Every query is bounded, and the **configured service cap always wins** over a
client's request. When a budget runs out you get the deterministic prefix that
fits plus an explicit truncation reason (`Results`, `Bytes`, `Depth`,
`Duration`, `Capability`) — never a silent drop and never a generic backend
error. A continuation cursor is issued only after at least one result was
returned, and it is bound to the exact operation, snapshot, and normalized
request shape.

Defaults, all tunable under `[repository_graph.query_limits]`:

| Key | Default |
|---|---|
| `max_results` | `100` |
| `max_bytes` | `262144` (256 KiB) |
| `max_snippet_bytes` | `32768` (32 KiB) |
| `max_depth` | `3` |
| `max_duration_ms` | `2000` |
| `max_diagnostics` | `50` |

## Measured behaviour

From the Criterion benchmark over a generated 300-module Rust fixture
(`cargo bench --bench repository_graph`, macOS arm64, release profile):

| Operation | Time | Parsed | Reused |
|---|---:|---:|---:|
| Cold build (302 files) | 97.0 ms | 302 | 0 |
| No-op build | 49.1 ms | 0 | 302 |
| One-file change | 84.0 ms | 1 | 301 |
| Indexed symbol search | 238 µs | — | — |

These are development baselines for catching accidental full re-extraction or
unbounded queries — not release performance guarantees. Compare relative
behaviour and fact counts before comparing wall-clock across machines.

A 26-case deterministic navigation evaluation gates retrieval quality on every
change:

| Gate | Threshold | Observed |
|---|---:|---:|
| Exact path Recall@1 | 100% | 100% |
| Exact unique-symbol Recall@1 | 100% | 100% |
| Supported discovery Recall@10 | ≥ 90% | 93.75% |
| Repeated same-snapshot determinism | 100% | 100% |
| No regression vs. navigation baseline | 100% | 100% |
| Median files-read **or** context-byte reduction | ≥ 20% | 100% files-read reduction |

The honest caveat: on that same corpus, broad `direction=both` expansion
currently returns *more* serialized graph evidence than a baseline source scan
(median context-byte change ≈ `-772%`), even though it eliminates source-file
reads entirely. That is a real limitation and it is why the graph stays a
**query tool** rather than something ferrus injects into prompts for you.

## Deliberately not here yet

- **Automatic context injection.** Agents ask; ferrus does not push. Context-byte
  volume needs to come down first.
- **Embeddings and semantic search.** Structural retrieval already covers the
  high-confidence paths, and a mandatory model runtime or vector extension is
  not worth adding before a measured recall gap exists. The architecture
  reserves a separate semantic revision so an embedding model change can never
  rebuild or rename a structural snapshot.
- **Remote / distributed indexing.** The identity, snapshot, evidence, and
  bounded-query contracts are deliberately backend-neutral so a future service
  can partition storage and workers by tenant — but local ferrus never
  initializes a network client, and remote indexing would be strictly opt-in.

## See also

- [Project memory](/docs/project-memory) — curated history and cross-domain queries
- [Configuration](/docs/configuration#repository_graph) — the full `[repository_graph]` surface
- [Supported agents](/docs/agents#tools-exposed-per-role) — which roles see the retrieval tools
