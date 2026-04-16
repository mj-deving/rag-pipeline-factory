---
summary: Benchmark session — measure token savings of RAG Pipeline Factory vs traditional approach
read_when: benchmarking, measuring token savings, proving code-mode value
---

# RAG Pipeline Factory — Benchmark Session

> Measure the actual token savings of the factory workflow vs. what a traditional n8n approach would cost.

---

## Goal

Produce a reproducible benchmark comparing:
- **Traditional approach:** How many n8n nodes and LLM calls would it take to build a RAG pipeline WITHOUT the factory?
- **Factory approach:** How many nodes/calls does our factory use?

This fills the gap in our positioning — we claim "15-25 tool calls consolidated" but haven't measured it.

## Current Factory Architecture

The factory workflow has **5 nodes** (Chat Trigger → AI Agent → toolCode → response nodes). The toolCode contains the factory logic that:
1. Parses the user request
2. Generates workflow JSON from templates  
3. Creates workflows via n8n API (`this.helpers.httpRequest`)
4. Validates by GETting them back
5. Activates workflows
6. Tests ingestion + query
7. Returns a build report

All of this happens in **1 LLM call** — the agent writes one toolCode invocation.

## Benchmark Methodology

Follow the same methodology as [code-first-n8n/playbook/benchmarks.md](https://github.com/mj-deving/code-first-n8n/blob/main/playbook/benchmarks.md).

### Step 1: Count the Traditional Approach

Design (on paper, not built) what a traditional n8n workflow would look like to do the same thing — build a RAG pipeline from a chat request — using only standard n8n nodes:

Estimated traditional flow:
```
Chat Trigger → AI Agent → Tool: Parse Request → Tool: Search Nodes → Tool: Generate Ingestion WF JSON
→ Tool: Create Ingestion WF via API → Tool: Generate Query WF JSON → Tool: Create Query WF via API
→ Tool: Validate Ingestion → Tool: Validate Query → Tool: Activate Ingestion → Tool: Activate Query
→ Tool: Test Ingestion → Tool: Test Query → Tool: Format Report → Response
```

That's **14+ tool calls** the LLM would make sequentially, each one adding to the context.

Count:
- Number of n8n nodes required
- Number of LLM calls (each tool use = 1 LLM round-trip)
- Estimated tokens per call (system prompt + schemas + accumulated context)

### Step 2: Measure the Factory

Run the factory with a standard test prompt and capture:

```bash
# Trigger the factory
curl -X POST http://172.31.224.1:5678/webhook/<factory-chat-webhook-id>/chat \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "Build a RAG pipeline called Benchmark Test with in-memory store and web URL ingestion"}'
```

Then inspect the execution:
```bash
# Get the execution data
npx --yes n8nac execution list --workflow-id <factory-workflow-id> --limit 1 --json
npx --yes n8nac execution get <execution-id> --include-data --json
```

Extract from execution data:
- Number of nodes that fired
- Number of LLM calls (check the AI Agent node's execution data for `messages` array length)
- Token counts (if available in execution metadata)
- Execution time

### Step 3: Calculate Savings

| Metric | Traditional (estimated) | Factory (measured) | Savings |
|---|---|---|---|
| n8n nodes | ? | 5 | ?% |
| LLM calls | ~14 | 1 | ?% |
| Estimated tokens | ? | ? | ?% |
| Execution time | N/A (not built) | ? | N/A |

### Step 4: Document

Write results to `benchmark.md` in the project root with:
- Test date, n8n version, LLM model used
- Exact test prompt used
- Traditional approach design (node list)
- Factory measurements (from execution data)
- Savings table
- Cost projection (e.g., "at 100 pipelines/month, traditional costs $X, factory costs $Y")

## n8n Instance

Read `CLAUDE.md` for host, credentials, and sandbox rules.

## Workflow IDs

Check with `npx --yes n8nac list` — the factory workflow ID should be visible.

## Success Criteria

- [ ] Traditional approach designed with node count and estimated LLM calls
- [ ] Factory execution measured with actual node count and LLM calls
- [ ] Token counts extracted or estimated from execution data
- [ ] Savings table with percentages
- [ ] Results written to `benchmark.md`
- [ ] Cost projection included

## Start

```bash
cd ~/projects/rag-pipeline-factory
npx --yes n8nac list  # find factory workflow ID
```

Read CLAUDE.md, then execute the benchmark.
