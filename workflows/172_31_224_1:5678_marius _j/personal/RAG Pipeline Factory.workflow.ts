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
            systemMessage: `You are the RAG Pipeline Factory — an AI agent that builds complete RAG (Retrieval-Augmented Generation) pipelines on n8n from natural language descriptions.

When a user describes a RAG pipeline they want, follow these steps:

1. Parse their request to determine:
   - Pipeline name (ask if unclear, default: "My RAG Pipeline")
   - Vector store type: only "inMemory" is supported in v0.1
   - Embedding model: only "openai" is supported in v0.1

2. Call the generate_rag_pipeline tool with a JSON string:
   {"name": "Pipeline Name", "vectorStore": "inMemory", "embeddingModel": "openai"}

3. Parse the returned workflow JSON and call the n8n_api tool to create it:
   {"method": "POST", "path": "/api/v1/workflows", "body": <paste the entire workflow JSON from step 2>}

4. From the API response, extract the workflow ID.

5. Activate the workflow by calling n8n_api:
   {"method": "POST", "path": "/api/v1/workflows/<id>/activate"}

6. Report to the user:
   - Workflow name and ID
   - What the pipeline does (RAG query over documents)
   - How to load data: use the n8n UI to add a data loading trigger
   - How to query: open the chat interface at the workflow URL
   - The in-memory vector store key used (for connecting data loaders)

Current limitations (v0.1):
- Only in-memory vector store (data lost on n8n restart)
- Only OpenAI-compatible embeddings via OpenRouter
- Only Claude Haiku for response generation
- No automatic data ingestion — user loads data separately`,
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
            'Generate a complete n8n workflow JSON for a RAG pipeline. Returns the workflow JSON object ready to be created via the n8n API. Input must be a JSON string with fields: name (string, pipeline display name), vectorStore (string, currently only "inMemory"), embeddingModel (string, currently only "openai").',
        language: 'javaScript',
        jsCode: `try {
  var raw = typeof query === "object" && query.query ? query.query : query;
  var spec = typeof raw === "string" ? JSON.parse(raw) : raw;

  var pipelineName = spec.name || "My RAG Pipeline";
  var vectorStore = spec.vectorStore || "inMemory";
  var embeddingModel = spec.embeddingModel || "openai";

  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  var storeKey = pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

  var nodes = [
    {
      id: uuid(),
      name: "Chat Trigger",
      type: "@n8n/n8n-nodes-langchain.chatTrigger",
      typeVersion: 1.4,
      position: [0, 300],
      parameters: {
        "public": true,
        mode: "hostedChat",
        authentication: "none",
        initialMessages: "Hello! Ask me anything about your documents.\\nI will search through the loaded knowledge base to find answers."
      }
    },
    {
      id: uuid(),
      name: "AI Agent",
      type: "@n8n/n8n-nodes-langchain.agent",
      typeVersion: 3.1,
      position: [400, 300],
      parameters: {
        promptType: "define",
        text: "={{ $json.chatInput }}",
        options: {
          systemMessage: "You are a helpful assistant for the " + pipelineName + " knowledge base. Use the document search tool to find relevant information before answering questions. Always cite which documents your answer is based on. If the vector store returns no results, tell the user that no documents have been loaded yet and suggest they add documents through the n8n workflow editor."
        }
      }
    },
    {
      id: uuid(),
      name: "Haiku via OpenRouter",
      type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
      typeVersion: 1,
      position: [200, 600],
      parameters: {
        model: "anthropic/claude-haiku-4-5",
        options: { temperature: 0.3 }
      },
      credentials: {
        openAiApi: { id: "mOL6UoYXfgKf6RZh", name: "OpenRouter" }
      }
    },
    {
      id: uuid(),
      name: "Document Search",
      type: "@n8n/n8n-nodes-langchain.toolVectorStore",
      typeVersion: 1.1,
      position: [600, 600],
      parameters: {
        name: pipelineName + " documents",
        description: "stored documents and knowledge base content for " + pipelineName,
        topK: 4
      }
    },
    {
      id: uuid(),
      name: "In-Memory Vector Store",
      type: "@n8n/n8n-nodes-langchain.vectorStoreInMemory",
      typeVersion: 1.3,
      position: [800, 600],
      parameters: {
        mode: "retrieve",
        memoryKey: { mode: "list", value: storeKey + "_store" }
      }
    },
    {
      id: uuid(),
      name: "OpenAI Embeddings",
      type: "@n8n/n8n-nodes-langchain.embeddingsOpenAi",
      typeVersion: 1.2,
      position: [1000, 600],
      parameters: {
        model: "text-embedding-3-small",
        options: {}
      },
      credentials: {
        openAiApi: { id: "mOL6UoYXfgKf6RZh", name: "OpenRouter" }
      }
    }
  ];

  var connections = {
    "Chat Trigger": {
      "main": [[{ "node": "AI Agent", "type": "main", "index": 0 }]]
    },
    "Haiku via OpenRouter": {
      "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
    },
    "Document Search": {
      "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
    },
    "In-Memory Vector Store": {
      "ai_vectorStore": [[{ "node": "Document Search", "type": "ai_vectorStore", "index": 0 }]]
    },
    "OpenAI Embeddings": {
      "ai_embedding": [[{ "node": "In-Memory Vector Store", "type": "ai_embedding", "index": 0 }]]
    }
  };

  var workflowJson = {
    name: pipelineName,
    nodes: nodes,
    connections: connections,
    settings: { executionOrder: "v1" }
  };

  return JSON.stringify(workflowJson);
} catch (e) {
  return JSON.stringify({ error: e.message });
}`,
        specifyInputSchema: true,
        schemaType: 'manual',
        inputSchema:
            '{"type":"object","properties":{"query":{"type":"string","description":"JSON string with fields: name (pipeline name), vectorStore (\\"inMemory\\"), embeddingModel (\\"openai\\")"}},"required":["query"]}',
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
