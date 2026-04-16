import { workflow, node, links } from '@n8n-as-code/transformer';

// <workflow-map>
// Workflow : RAG Pipeline Factory
// Nodes   : 5  |  Connections: 1
//
// NODE INDEX
// ──────────────────────────────────────────────────────────────────
// Property name                    Node type (short)         Flags
// ChatTrigger                        chatTrigger
// AiAgent                            agent                      [AI]
// HaikuViaOpenrouter                 lmChatOpenAi               [creds] [ai_languageModel]
// GenerateRagPipeline                toolCode                   [ai_tool]
// N8nApi                             toolCode                   [ai_tool]
//
// ROUTING MAP
// ──────────────────────────────────────────────────────────────────
// ChatTrigger
//    → AiAgent
//
// AI CONNECTIONS
// AiAgent.uses({ ai_languageModel: HaikuViaOpenrouter, ai_tool: [GenerateRagPipeline, N8nApi] })
// </workflow-map>

// =====================================================================
// METADATA DU WORKFLOW
// =====================================================================

@workflow({
    id: 'GAra5MytxjV7BJKW',
    name: 'RAG Pipeline Factory',
    active: true,
    settings: { executionOrder: 'v1', callerPolicy: 'workflowsFromSameOwner', availableInMCP: false },
})
export class RagPipelineFactoryWorkflow {
    // =====================================================================
    // CONFIGURATION DES NOEUDS
    // =====================================================================

    @node({
        id: '286eaf63-71f6-4c65-a0b2-49ff3cc137c5',
        webhookId: 'ca03fc46-0d15-4408-80f4-2e803580b188',
        name: 'Chat Trigger',
        type: '@n8n/n8n-nodes-langchain.chatTrigger',
        version: 1.4,
        position: [0, 300],
    })
    ChatTrigger = {
        public: true,
        mode: 'hostedChat',
        authentication: 'none',
        initialMessages: `Welcome to the RAG Pipeline Factory!
Describe the RAG pipeline you want and I will build it on n8n.
Example: "Build a RAG pipeline called Customer Support KB with in-memory store for answering questions about my documents"`,
    };

    @node({
        id: 'a6557b73-af9a-4e6c-895e-050014651cd7',
        name: 'AI Agent',
        type: '@n8n/n8n-nodes-langchain.agent',
        version: 3.1,
        position: [400, 300],
    })
    AiAgent = {
        promptType: 'define',
        text: '={{ $json.chatInput }}',
        options: {
            systemMessage: `You are the RAG Pipeline Factory v0.2 — an AI agent that builds complete RAG pipelines on n8n.

AVAILABLE OPTIONS:
- Vector stores: "inMemory" (default, no setup), "qdrant" (needs Qdrant credential in n8n), "supabase" (needs Supabase credential in n8n)
- Data sources: "none" (default, query-only), "webUrl" (adds ingestion workflow that fetches URLs)
- Embedding model: "openai" (via OpenRouter, always used)

STEPS:
1. Parse the user request for: pipeline name, vector store type, data source
2. Call generate_rag_pipeline with JSON: {"name":"...", "vectorStore":"inMemory|qdrant|supabase", "dataSource":"none|webUrl"}
3. The tool returns {"workflows":[...], "storeKey":"...", "vectorStore":"..."}
4. For EACH workflow in the array, call n8n_api to create it:
   {"method":"POST", "path":"/api/v1/workflows", "body": <the workflow object>}
5. Activate each created workflow:
   {"method":"POST", "path":"/api/v1/workflows/<id>/activate"}
6. Report to the user: workflow IDs, what each does, how to use them

IMPORTANT NOTES:
- For qdrant/supabase: tell user to configure the credential in n8n UI before using
- For webUrl ingestion: tell user the webhook URL to POST URLs to (POST with {"url":"https://..."})
- In-memory data is lost on n8n restart
- The storeKey links query and ingestion workflows together`,
        },
    };

    @node({
        id: 'ff7248c0-4416-4faa-ab1e-183dde79899e',
        name: 'Haiku via OpenRouter',
        type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
        version: 1,
        position: [200, 600],
        credentials: { openAiApi: { id: 'mOL6UoYXfgKf6RZh', name: 'OpenRouter' } },
    })
    HaikuViaOpenrouter = {
        model: 'anthropic/claude-haiku-4-5',
        options: {
            temperature: 0.1,
        },
    };

    @node({
        id: 'a8e94b93-36fb-43c6-905c-23b8c203c324',
        name: 'Generate RAG Pipeline',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        version: 1.3,
        position: [400, 600],
    })
    GenerateRagPipeline = {
        name: 'generate_rag_pipeline',
        description:
            'Generate n8n workflow JSON(s) for a RAG pipeline. Returns {"workflows":[...], "storeKey":"...", "vectorStore":"..."}. Each workflow in the array has {type, workflow} where type is "query" or "ingestion". Input: JSON string with name (string), vectorStore ("inMemory"|"qdrant"|"supabase"), dataSource ("none"|"webUrl").',
        language: 'javaScript',
        jsCode: `try {
  var raw = typeof query === "object" && query.query ? query.query : query;
  var spec = typeof raw === "string" ? JSON.parse(raw) : raw;
  var name = spec.name || "My RAG Pipeline";
  var vs = spec.vectorStore || "inMemory";
  var ds = spec.dataSource || "none";
  var sk = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function emb(pos) {
    return { id: uuid(), name: "OpenAI Embeddings", type: "@n8n/n8n-nodes-langchain.embeddingsOpenAi", typeVersion: 1.2, position: pos || [1000, 600],
      parameters: { model: "text-embedding-3-small", options: {} }, credentials: { openAiApi: { id: "mOL6UoYXfgKf6RZh", name: "OpenRouter" } } };
  }
  function vsn(mode, pos) {
    var n = { id: uuid(), position: pos || [800, 600], typeVersion: 1.3 };
    if (vs === "qdrant") { n.name = "Qdrant Vector Store"; n.type = "@n8n/n8n-nodes-langchain.vectorStoreQdrant";
      n.parameters = { mode: mode, qdrantCollection: { mode: "list", value: sk + "_collection" } };
    } else if (vs === "supabase") { n.name = "Supabase Vector Store"; n.type = "@n8n/n8n-nodes-langchain.vectorStoreSupabase";
      n.parameters = { mode: mode, tableName: { mode: "list", value: sk + "_documents" } };
    } else { n.name = "In-Memory Vector Store"; n.type = "@n8n/n8n-nodes-langchain.vectorStoreInMemory";
      n.parameters = { mode: mode, memoryKey: { mode: "list", value: sk + "_store" } };
    }
    return n;
  }

  var qVs = vsn("retrieve");
  var qEmb = emb();
  var qNodes = [
    { id: uuid(), name: "Chat Trigger", type: "@n8n/n8n-nodes-langchain.chatTrigger", typeVersion: 1.4, position: [0, 300],
      parameters: { "public": true, mode: "hostedChat", authentication: "none", initialMessages: "Hello! Ask me anything about your documents." } },
    { id: uuid(), name: "AI Agent", type: "@n8n/n8n-nodes-langchain.agent", typeVersion: 3.1, position: [400, 300],
      parameters: { promptType: "define", text: "={{ $json.chatInput }}", options: { systemMessage: "You are a helpful assistant for the " + name + " knowledge base. Use the document search tool to find relevant information. Always cite sources. If no results found, tell the user to load documents first." } } },
    { id: uuid(), name: "Haiku via OpenRouter", type: "@n8n/n8n-nodes-langchain.lmChatOpenAi", typeVersion: 1, position: [200, 600],
      parameters: { model: "anthropic/claude-haiku-4-5", options: { temperature: 0.3 } }, credentials: { openAiApi: { id: "mOL6UoYXfgKf6RZh", name: "OpenRouter" } } },
    { id: uuid(), name: "Document Search", type: "@n8n/n8n-nodes-langchain.toolVectorStore", typeVersion: 1.1, position: [600, 600],
      parameters: { name: name + " documents", description: "knowledge base content for " + name, topK: 4 } },
    qVs, qEmb
  ];
  var vn = qVs.name;
  var qC = { "Chat Trigger": { "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]] },
    "Haiku via OpenRouter": { "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]] },
    "Document Search": { "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]] } };
  qC[vn] = { "ai_vectorStore": [[{ "node": "Document Search", "type": "ai_vectorStore", "index": 0 }]] };
  qC["OpenAI Embeddings"] = { "ai_embedding": [[{ "node": vn, "type": "ai_embedding", "index": 0 }]] };

  var result = { workflows: [], storeKey: sk, vectorStore: vs };
  result.workflows.push({ type: "query", workflow: { name: name, nodes: qNodes, connections: qC, settings: { executionOrder: "v1" } } });

  if (ds === "webUrl") {
    var iVs = vsn("insert", [600, 300]);
    var iEmb = emb([800, 500]);
    var ivn = iVs.name;
    var iNodes = [
      { id: uuid(), name: "Webhook Trigger", type: "n8n-nodes-base.webhook", typeVersion: 2, position: [0, 300],
        parameters: { path: sk + "-ingest", httpMethod: "POST", responseMode: "lastNode" } },
      { id: uuid(), name: "HTTP Request", type: "n8n-nodes-base.httpRequest", typeVersion: 4.2, position: [300, 300],
        parameters: { url: "={{ $json.body.url }}", options: {} } },
      iVs,
      { id: uuid(), name: "Default Data Loader", type: "@n8n/n8n-nodes-langchain.documentDefaultDataLoader", typeVersion: 1.1, position: [400, 500],
        parameters: { dataType: "json", jsonMode: "allInputData", textSplittingMode: "custom" } },
      { id: uuid(), name: "Text Splitter", type: "@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter", typeVersion: 1, position: [600, 500],
        parameters: { chunkSize: 1000, chunkOverlap: 200 } },
      iEmb
    ];
    var iC = { "Webhook Trigger": { "main": [[{ "node": "HTTP Request", "type": "main", "index": 0 }]] },
      "HTTP Request": { "main": [[{ "node": ivn, "type": "main", "index": 0 }]] },
      "Default Data Loader": { "ai_document": [[{ "node": ivn, "type": "ai_document", "index": 0 }]] },
      "Text Splitter": { "ai_textSplitter": [[{ "node": "Default Data Loader", "type": "ai_textSplitter", "index": 0 }]] } };
    iC["OpenAI Embeddings"] = { "ai_embedding": [[{ "node": ivn, "type": "ai_embedding", "index": 0 }]] };
    result.workflows.push({ type: "ingestion", workflow: { name: name + " - Ingestion", nodes: iNodes, connections: iC, settings: { executionOrder: "v1" } } });
  }
  return JSON.stringify(result);
} catch (e) { return JSON.stringify({ error: e.message }); }`,
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{"type":"object","properties":{"query":{"type":"string","description":"JSON: {name, vectorStore: \\"inMemory\\"|\\"qdrant\\"|\\"supabase\\", dataSource: \\"none\\"|\\"webUrl\\"}"}},"required":["query"]}',
    };

    @node({
        id: '3a43128a-3e15-4bee-9839-f9f88bfa96f9',
        name: 'n8n API',
        type: '@n8n/n8n-nodes-langchain.toolCode',
        version: 1.3,
        position: [600, 600],
    })
    N8nApi = {
        name: 'n8n_api',
        description:
            'Call the n8n REST API. Input must be a JSON string with fields: method (GET, POST, PUT, PATCH, DELETE), path (e.g. /api/v1/workflows), body (optional object for POST/PUT/PATCH). Returns the API response as JSON.',
        language: 'javaScript',
        jsCode: `try {
  var raw = typeof query === "object" && query.query ? query.query : query;
  var input = typeof raw === "string" ? JSON.parse(raw) : raw;
  var method = (input.method || "GET").toUpperCase();
  var path = input.path || "/api/v1/workflows";
  var body = input.body || undefined;

  var url = "http://localhost:5678" + path;
  var reqConfig = {
    method: method,
    url: url,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlZjQzNTRkOC03NWRmLTQwNDctOWQ2ZC1kODk3MmMxZWFiNDEiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMjU4Zjc1ZTgtODBmNy00YTZmLWExODctOTBhMDljZDdjNGUyIiwiaWF0IjoxNzc2MDY4Mzc1LCJleHAiOjE3ODEyMzY4MDB9.QNApHWhwxmazsgu9mZyDalrHstCzAq0Zy5B3bqoRPSw"
    }
  };

  if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
    reqConfig.body = typeof body === "string" ? JSON.parse(body) : body;
  }

  var response = await this.helpers.httpRequest(reqConfig);
  var resStr = JSON.stringify(response, null, 2);
  if (resStr.length > 4000) {
    return resStr.substring(0, 4000) + "\\n... truncated (" + resStr.length + " chars total)";
  }
  return resStr;
} catch (e) {
  return JSON.stringify({ error: e.message });
}`,
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{"type":"object","properties":{"query":{"type":"string","description":"JSON string: {method, path, body?}. Example: {\\"method\\":\\"GET\\",\\"path\\":\\"/api/v1/workflows\\"}"}},"required":["query"]}',
    };

    // =====================================================================
    // ROUTAGE ET CONNEXIONS
    // =====================================================================

    @links()
    defineRouting() {
        this.ChatTrigger.out(0).to(this.AiAgent.in(0));

        this.AiAgent.uses({
            ai_languageModel: this.HaikuViaOpenrouter.output,
            ai_tool: [this.GenerateRagPipeline.output, this.N8nApi.output],
        });
    }
}
