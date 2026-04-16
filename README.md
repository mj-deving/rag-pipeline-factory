# RAG Pipeline Factory

![n8n](https://img.shields.io/badge/n8n-2.x-orange.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Code-First](https://img.shields.io/badge/code--first-n8nac-blue.svg)

**A meta-workflow that builds RAG pipelines from natural language.** Describe what you want — the factory generates, deploys, validates, and tests a complete RAG system on n8n.

## How It Works

Chat with the factory and describe the pipeline you want:

```
"Build a RAG pipeline called Customer Support KB with Qdrant store and web URL ingestion"
```

The factory:
1. Parses your request into a structured spec
2. Generates workflow JSON for query + ingestion pipelines
3. Pushes both to n8n via REST API
4. Validates node counts and connections
5. Tests the ingestion webhook with a sample URL
6. Reports results with workflow IDs, webhook URLs, and cost estimates

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              RAG PIPELINE FACTORY                    │
│                                                     │
│  Chat Trigger → AI Agent (Haiku) → Code Tools       │
│                    │                                │
│          ┌────────┴────────┐                        │
│          │                 │                        │
│  Generate RAG Pipeline   n8n API                    │
│  (template builder)      (deploy + test)            │
│                                                     │
│  Output: 1-2 workflows per request                  │
│  - Query workflow (chat + vector store + LLM)       │
│  - Ingestion workflow (webhook + loader + embedder) │
└─────────────────────────────────────────────────────┘
```

## Supported Options

| Option | Values | Notes |
|---|---|---|
| **Vector Store** | `inMemory` (default) | No setup needed, data lost on restart |
| | `qdrant` | Persistent, needs Qdrant credential in n8n |
| | `supabase` | pgvector, needs Supabase credential in n8n |
| **Data Source** | `none` (default) | Query-only pipeline |
| | `webUrl` | Webhook that fetches + embeds URL content |
| | `text` | Webhook that accepts raw text POST |
| **Embedding** | OpenAI `text-embedding-3-small` | Via OpenRouter credential |
| **LLM** | Claude Haiku 4.5 | Via OpenRouter, cost-optimized |

## Usage Examples

### Basic in-memory pipeline
```
Build a RAG pipeline called My KB
```
Creates: 1 query workflow (6 nodes)

### Qdrant with web scraping
```
Build a RAG pipeline called Tech Docs with Qdrant and web URL ingestion
```
Creates: 1 query workflow + 1 ingestion workflow (12 nodes total)

### Text ingestion pipeline
```
Build a RAG pipeline called Notes with in-memory store and text data source
```
Creates: 1 query workflow + 1 text ingestion workflow

### After creation — load documents
```bash
# Web URL ingestion
curl -X POST http://your-n8n:5678/webhook/<store_key>-ingest \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/docs/page"}'

# Text ingestion
curl -X POST http://your-n8n:5678/webhook/<store_key>-ingest-text \
  -H "Content-Type: application/json" \
  -d '{"text":"Your document content goes here..."}'
```

## Cost Estimates

| Operation | Cost | Details |
|---|---|---|
| Per query | ~$0.002 | Haiku: ~800 input + ~400 output tokens |
| Per document | ~$0.01 | Embedding ~2000 tokens + chunking |
| Monthly (100q + 10d/day) | ~$9 | Baseline estimate via OpenRouter |

## Setup

```bash
# 1. Clone
git clone https://github.com/mj-deving/rag-pipeline-factory.git
cd rag-pipeline-factory
npm install

# 2. Connect to n8n
export N8N_API_KEY="<your n8n API key>"
npm run setup:n8n -- http://<your-n8n-host>:5678

# 3. Push the factory workflow
npx --yes n8nac push "workflows/172_31_224_1:5678_marius _j/personal/RAG Pipeline Factory.workflow.ts"

# 4. Activate it
# Use the n8n UI or API to activate the RAG Pipeline Factory workflow

# 5. Chat with the factory
# Open the Chat Trigger in n8n → "Open in new window"
```

## Tech Stack

- **n8n** — workflow automation engine
- **n8nac** — code-first workflow development (`.workflow.ts`)
- **Claude Haiku 4.5** — LLM via OpenRouter (factory agent + generated pipelines)
- **OpenAI Embeddings** — `text-embedding-3-small` via OpenRouter
- **Beads** (`bd`) — AI-native issue tracker

## Project Structure

```
workflows/                    # n8nac-managed workflow files
  172_.../personal/
    RAG Pipeline Factory.workflow.ts  # The factory (5 nodes)
docs/
  SESSION-KICKOFF.md          # Build plan and architecture
scripts/                      # Scaffold and validation helpers
.beads/                       # Issue tracking
```

## Generated Pipeline Architecture

### Query Workflow (6 nodes)
```
Chat Trigger → AI Agent → [Document Search Tool] → Vector Store (retrieve) + Embeddings
                  ↑
            LLM (Haiku)
```

### Ingestion Workflow — Web URL (6 nodes)
```
Webhook → HTTP Request → Vector Store (insert) ← Data Loader ← Text Splitter ← Embeddings
```

### Ingestion Workflow — Text (6 nodes)
```
Webhook → Set Text → Vector Store (insert) ← Data Loader ← Text Splitter ← Embeddings
```

## Factory Workflow ID

`GAra5MytxjV7BJKW` — active on n8n, 5 nodes (Chat Trigger, AI Agent, Haiku Model, Generate Tool, API Tool)

## License

MIT
