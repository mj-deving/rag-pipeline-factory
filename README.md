# RAG Pipeline Factory

![n8n](https://img.shields.io/badge/n8n-2.x-orange.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Code-First](https://img.shields.io/badge/code--first-n8nac-blue.svg)

**A meta-workflow that builds RAG pipelines from natural language.** Describe what you want in a chat — the factory generates, deploys, validates, tests, and reports on a complete RAG system running on n8n.

This is **code writing code** — an AI agent that writes n8n workflow definitions, pushes them to a live instance, and verifies they work.

## How It Works

Open the factory's chat interface and describe the pipeline you want:

```
Build a RAG pipeline called Customer Support KB with Qdrant store and web URL ingestion
```

The factory follows a 6-step cycle:

1. **Generate** — Builds workflow JSON from a template library (query + optional ingestion)
2. **Deploy** — Creates workflows on n8n via REST API
3. **Validate** — GETs each workflow back, checks node counts and connections
4. **Activate** — Turns on the workflows so triggers are live
5. **Test** — POSTs a sample URL to the ingestion webhook, sends a test query to the chat
6. **Report** — Returns workflow IDs, webhook URLs, test results, and cost estimates

A single chat message produces a full build report with everything you need to start using the pipeline.

## Supported Options

| Option | Values | Notes |
|---|---|---|
| **Vector Store** | `inMemory` (default) | No setup needed, data lost on restart |
| | `qdrant` | Persistent, scalable. Needs Qdrant credential in n8n |
| | `supabase` | pgvector. Needs Supabase credential in n8n |
| **Data Source** | `none` (default) | Query-only pipeline (load data separately) |
| | `webUrl` | Webhook that fetches a URL, chunks, embeds, and stores |
| | `text` | Webhook that accepts raw text, chunks, embeds, and stores |
| **Embedding** | OpenAI `text-embedding-3-small` | Via OpenRouter |
| **LLM** | Claude Haiku 4.5 | Via OpenRouter, cost-optimized for RAG |

## Usage Examples

**Basic query pipeline:**
```
Build a RAG pipeline called My KB
```
Output: 1 query workflow (6 nodes) with in-memory vector store

**Qdrant with web scraping:**
```
Build a RAG pipeline called Tech Docs with Qdrant and web URL ingestion
```
Output: 1 query workflow + 1 ingestion workflow (12 nodes total)

**Text ingestion:**
```
Build a RAG pipeline called Notes with in-memory store and text data source
```
Output: 1 query workflow + 1 text ingestion workflow

**After creation — load documents:**
```bash
# Web URL ingestion
curl -X POST http://your-n8n:5678/webhook/<store_key>-ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/docs/page"}'

# Raw text ingestion
curl -X POST http://your-n8n:5678/webhook/<store_key>-ingest-text \
  -H "Content-Type: application/json" \
  -d '{"text":"Your document content goes here..."}'
```

## Architecture

```
                    RAG PIPELINE FACTORY (5 nodes)
 ┌──────────────────────────────────────────────────────────┐
 │                                                          │
 │  Chat Trigger ──→ AI Agent (Haiku) ──→ generates spec    │
 │                       │                                  │
 │              ┌────────┴────────┐                         │
 │              │                 │                         │
 │     Generate Pipeline      n8n API                      │
 │     (template builder)     (deploy, validate, test)     │
 │                                                          │
 └──────────────────────────────────────────────────────────┘
                         │
                    creates on n8n
                         │
         ┌───────────────┼───────────────┐
         ▼                               ▼
   QUERY WORKFLOW (6 nodes)     INGESTION WORKFLOW (6 nodes)
 ┌──────────────────────┐    ┌──────────────────────────┐
 │ Chat → Agent → Search│    │ Webhook → HTTP/Set → VS  │
 │          ↑            │    │   ↑ Data Loader          │
 │    LLM (Haiku)       │    │   ↑ Text Splitter        │
 │ Vector Store ← Embed │    │   ↑ Embeddings           │
 └──────────────────────┘    └──────────────────────────┘
```

## Cost Estimates

| Operation | Cost | Details |
|---|---|---|
| Per query | ~$0.002 | Haiku: ~800 input + ~400 output tokens |
| Per document ingestion | ~$0.01 | Embedding ~2000 tokens + chunking overhead |
| Monthly (100 queries + 10 docs/day) | ~$9 | Baseline estimate via OpenRouter |

## Setup

### Prerequisites

- A running [n8n](https://n8n.io) instance (self-hosted or cloud)
- An [OpenRouter](https://openrouter.ai) API key configured as an `openAiApi` credential in n8n
- Node.js 18+

### Install

```bash
git clone https://github.com/mj-deving/rag-pipeline-factory.git
cd rag-pipeline-factory
npm install

# Connect to your n8n instance
export N8N_API_KEY="<your n8n API key>"
npm run setup:n8n -- http://<your-n8n-host>:5678
```

### Deploy the Factory

```bash
# Push the factory workflow to n8n
npx --yes n8nac push "workflows/<your-instance-dir>/RAG Pipeline Factory.workflow.ts"

# Or find the file path after setup
npx --yes n8nac list
```

Activate the workflow in the n8n UI, then open the Chat Trigger node and click **Open Chat**.

### Credential Setup

The factory and all generated pipelines use a single OpenRouter credential for both LLM and embeddings. Create it in n8n:

1. Go to **Credentials** in n8n
2. Add **OpenAI API** credential
3. Set the base URL to `https://openrouter.ai/api/v1`
4. Add your OpenRouter API key
5. Name it `OpenRouter`

For Qdrant or Supabase vector stores, add those credentials separately in n8n before using the generated pipelines.

## Error Handling

The factory validates inputs before generating:

- Invalid `vectorStore` returns: `"Invalid vectorStore: xyz. Valid: inMemory, qdrant, supabase"`
- Invalid `dataSource` returns: `"Invalid dataSource: xyz. Valid: none, webUrl, text"`
- Malformed JSON returns a parse error with the expected format
- Missing pipeline name defaults to "My RAG Pipeline"

## Tech Stack

- **[n8n](https://n8n.io)** — workflow automation engine
- **[n8nac](https://github.com/mj-deving/n8n-autopilot)** — code-first workflow development
- **[Claude Haiku 4.5](https://docs.anthropic.com)** — LLM via OpenRouter
- **[OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)** — `text-embedding-3-small` via OpenRouter
- **[Beads](https://github.com/steveyegge/beads)** — AI-native issue tracker

## Project Structure

```
workflows/                          # n8nac-managed workflow files
  <instance>/personal/
    RAG Pipeline Factory.workflow.ts  # The factory workflow (5 nodes)
docs/
  SESSION-KICKOFF.md                # Original build plan and phased architecture
scripts/
  new-workflow.sh                   # Scaffold helper
  validate-workflows.sh             # Credential-free local validation
  check-secrets.sh                  # Pre-commit secret detection
.beads/                             # Issue tracking database
```

## Build History

| Phase | Deliverable |
|---|---|
| Phase 1 | Core factory: Chat Trigger + AI Agent + Generate Tool + API Tool |
| Phase 2 | Template library: 3 vector stores (inMemory, Qdrant, Supabase) + web URL ingestion |
| Phase 3 | Deploy-validate loop: live webhook testing, cost reporting, webhookId fix |
| Phase 4 | Polish: input validation, text ingestion, documentation |

## License

MIT
