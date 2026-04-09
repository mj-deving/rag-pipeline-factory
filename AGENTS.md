# AI Agents Guidelines
<!-- n8n-as-code-start -->
<!-- n8nac-version: 1.5.5 -->

## Role: Expert n8n Workflow Engineer

You are a specialized AI agent for creating and editing n8n workflows.
You manage n8n workflows as **clean, version-controlled TypeScript files** using decorators.

### Context
- **Source of Truth**: `npx --yes n8nac skills` tools (Deep Search + Technical Schemas)

---

## Workspace Bootstrap (MANDATORY)

Before using any `n8nac` workflow command, check whether the workspace is initialized.

### Initialization Check
- Look for `n8nac-config.json` in the workspace root.
- If `n8nac-config.json` is missing, or it exists but does not yet contain `projectId` and `projectName`, the workspace is not initialized yet.
- **NEVER tell the user to run `npx --yes n8nac init` themselves.** You are the agent — it is YOUR job to run the command.
- `npx --yes n8nac instance add` is the main setup command. It saves a new instance config, selects the active project, and activates that config in one flow. `npx --yes n8nac init` is the ergonomic alias.
- The explicit 2-step flow is still supported when you need to inspect projects before choosing one: first `npx --yes n8nac init-auth --host <url> --api-key <key>`, then `npx --yes n8nac init-project`.
- If the workspace already has saved instance configs, inspect them with `npx --yes n8nac instance list --json` before deciding whether to add a new one or switch the active config.
- Use `npx --yes n8nac instance select --instance-id <id>` or `npx --yes n8nac instance select --instance-name <name>` to switch saved configs non-interactively.
- Use `npx --yes n8nac instance delete --instance-id <id> --yes` or `npx --yes n8nac instance delete --instance-name <name> --yes` to remove stale saved configs non-interactively.
- If the user has already provided the n8n host and API key, prefer `npx --yes n8nac init-auth --host <url> --api-key <key>` when you still need to inspect the project list, or `npx --yes n8nac instance add --yes --host <url> --api-key <key> --project-id <id>|--project-name <name>|--project-index <n>` when the project selector is already known.
- If host or API key are missing, ask the user for them with a single clear question: "To initialize the workspace I need your n8n host URL and API key — what are they?" Then, once you have both values, run the appropriate command yourself.
- Do not run `n8nac list`, `pull`, `push`, or edit workflow files until initialization is complete.
- Never write `n8nac-config.json` by hand. Instance setup and switching must go through the documented `n8nac` commands so credentials, active selection, and AI context stay consistent.
- Do not assume initialization has already happened just because the repository contains workflow files or plugin files.

### Preferred Agent Command
- Single-flow setup: `npx --yes n8nac instance add` (or `npx --yes n8nac init`)
- Step 1 auth: `npx --yes n8nac init-auth --host <url> --api-key <key>`
- Step 2 project selection: `npx --yes n8nac init-project --project-id <id>|--project-name <name>|--project-index <n> [--sync-folder <path>]`
- Saved config management: `npx --yes n8nac instance list --json`, `npx --yes n8nac instance select --instance-id <id>|--instance-name <name>`, `npx --yes n8nac instance delete --instance-id <id>|--instance-name <name> --yes`
- `npx --yes n8nac init-project` can run interactively after `npx --yes n8nac init-auth`, or non-interactively when the project selector is known.

### Required Order
1. Check for `n8nac-config.json`.
2. If saved configs already exist: inspect them with `npx --yes n8nac instance list --json`. Reuse them with `npx --yes n8nac instance select` instead of creating duplicates whenever that satisfies the user request.
3. If initialization is missing and `N8N_HOST` / `N8N_API_KEY` are available: run `npx --yes n8nac init-auth --host <url> --api-key <key>` to discover projects, unless the project selector is already known and you can finish in one command with `npx --yes n8nac instance add --yes ...`.
4. If initialization is missing and credentials are absent: ask the user for the host URL and API key, then run the appropriate `n8nac` command yourself. **Do not ask the user to run the command.**
5. After credentials are saved, inspect the listed projects. If only one project exists, run `npx --yes n8nac init-project --project-index 1 --sync-folder workflows`. If multiple projects exist, ask the user which one to use, then run `npx --yes n8nac init-project --project-id <id> [--sync-folder <path>]`.
6. Only after initialization is complete, continue with workflow discovery, pull, edit, validate, and push steps.

---

## GitOps & Synchronization Protocol (CRITICAL)

n8n-as-code uses a **Git-like sync architecture**. The local code is the source of truth, but the user might have modified the workflow in the n8n UI.

**CRITICAL RULE**: Before modifying ANY existing `.workflow.ts` file, you MUST follow the git-like workflow:

### Git-like Sync Workflow

1. **LIST FIRST**: Check status with `npx --yes n8nac list`
   - `npx --yes n8nac list`: List all workflows with their sync status (lightweight — only reads metadata).
   - `npx --yes n8nac list --local`: List only local `.workflow.ts` files.
   - `npx --yes n8nac list --remote`: List only remote workflows.
   - Identify workflow IDs, filenames, and sync status.
   - Read `n8nac-config.json` to understand the active sync context. The config defines `syncFolder`, `instanceIdentifier`, and `projectName`; `n8nac` builds the full local path under the hood.
   - Always run `npx --yes n8nac` from the workspace root. Never construct sync paths manually.

2. **PULL IF NEEDED**: Download remote changes before editing
   - `npx --yes n8nac pull <id>`: Download workflow from n8n to local.
   - Required if workflow exists remotely but not locally, or if remote has newer changes.

3. **EDIT / CREATE LOCALLY**: Work on the local `.workflow.ts` file inside the active workflow directory.
   - For an existing workflow: edit the pulled local file.
   - For a brand-new workflow: create the file inside the active local workflow directory, never in the workspace root.
   - First try to discover that directory from existing local workflow paths via `npx --yes n8nac list --local`.
   - If there are no local workflows yet, run `npx --yes n8nac list` and use the directory portion of any reported `Local Path` as the active local workflow directory.
   - Do **not** guess the directory from the instance identifier alone. The active directory can include a project subdirectory such as `personal`.
   - Only if no workflow paths are available at all, inspect the directory created by initialization under the configured `syncFolder` and use its active project subdirectory.
   - After writing a new file, confirm it appears in `npx --yes n8nac list --local` before running `npx --yes n8nac push <filename>` with the full filename such as `slack-notification.workflow.ts`.

4. **PUSH**: Upload your changes explicitly
   - `npx --yes n8nac push <filename>`: Upload the local workflow file to n8n. This is the only public push form.
   - `npx --yes n8nac push <filename> --verify`: Push and immediately verify the live workflow against the local schema.

   > **CRITICAL — what `filename` means**:
   > - Use only the full workflow filename including the `.workflow.ts` suffix, for example `slack-notification.workflow.ts`.
   > - Do **not** omit the extension or pass a bare workflow name such as `slack-notification`.
   > - Do **not** pass a path. `n8nac` resolves the real local path from `n8nac-config.json`.
   > - Do **not** use the workflow title from n8n as a CLI argument.
   > - The remote source of truth remains the workflow ID; `push` simply starts from the local filename.

5. **VERIFY (strongly recommended)**: After any push, validate the live workflow
   - `npx --yes n8nac verify <id>`: Fetches the workflow from n8n and checks all nodes against the schema.
   - Detects: invalid `typeVersion`, invalid `operation` values, missing required params, unknown node types.
   - This catches errors n8n would display as "Could not find workflow" **before** the user opens the workflow.

6. **INSPECT TEST PLAN (recommended for webhook/chat/form workflows)**: Determine whether and how the workflow can be tested
   - `npx --yes n8nac test-plan <id>`: Detects the trigger type, decides whether the workflow is HTTP-testable, and returns suggested endpoints plus an inferred payload.
   - Use `--json` when an agent needs structured output.
   - The payload is heuristic: treat it as a starting point, not as a guaranteed contract.

7. **TEST (recommended for webhook/chat/form workflows)**: Execute the workflow
   - **DEFAULT: ALWAYS activate then test with `--prod`.**
   - `npx --yes n8nac workflow activate <id>` then `npx --yes n8nac test <id> --prod`: **This is the standard sequence.**
   - `npx --yes n8nac test <id>` (bare, no `--prod`): Only for workflows NOT activated AND the test URL has been manually armed in the n8n editor.
   - **MANDATORY RULE: ALWAYS run `workflow activate <id>` before testing and ALWAYS pass `--prod`.**

   ### Error Classification

   **Class A — Configuration gap** (exit 0, do NOT iterate):
   - Missing credentials, unset LLM model, missing environment variable.
   - NOT bugs in the workflow code — setup tasks the user must complete in n8n UI.
   - **Do NOT re-push or re-edit the workflow** to try to fix a Class A error.

   **Runtime-state issue** (exit 0, do NOT edit code blindly):
   - Webhook test URL not armed, production webhook not registered.
   - Treat as manual/runtime issue, not code.

   **Class B — Wiring error** (exit 1, fix and re-test):
   - Bad expression, wrong field name, HTTP error caused by workflow logic.
   - Fix the wiring, push, and test again.

8. **RESOLVE CONFLICTS**: If Push or Pull fails due to a conflict
   - `npx --yes n8nac resolve <id> --mode keep-current`: Force-push local version.
   - `npx --yes n8nac resolve <id> --mode keep-incoming`: Force-pull remote version.

### Key Principles
- **Explicit over automatic**: All operations are user-triggered or agent-triggered.
- **Pull before edit**: Always ensure you have latest version before modifying.
- **New workflows must be created in the active local workflow directory**
- **Push always starts from the local filename**
- **Inspect then test after push for webhook/chat/form workflows**

---

## MANDATORY Research Protocol

**CRITICAL**: Before creating or editing ANY node, you MUST follow this protocol:

### Step 0: Pattern Discovery
```bash
npx --yes n8nac skills examples search "telegram chatbot"
```

### Step 1: Search for the Node
```bash
npx --yes n8nac skills search "google sheets"
```

### Step 2: Get Exact Schema
```bash
npx --yes n8nac skills node-info googleSheets
```

### Step 3: Apply Schema as Absolute Truth
- **CRITICAL (TYPE)**: The `type` field MUST EXACTLY match the `type` from schema
- **CRITICAL (VERSION)**: Use HIGHEST `typeVersion` from schema
- **PARAMETER NAMES**: Use exact names from schema
- **NO HALLUCINATIONS**: Do not invent parameter names

### Step 4: Validate Before Finishing
```bash
npx --yes n8nac skills validate workflow.workflow.ts
```

### Step 5: Verify After Push
```bash
npx --yes n8nac verify <workflowId>
```

### Step 6: Inspect Test Plan
```bash
npx --yes n8nac test-plan <workflowId>
```

### Step 7: Test Webhook/Chat/Form Workflows
```bash
npx --yes n8nac workflow activate <workflowId>
npx --yes n8nac test <workflowId> --prod
```

---

## Reading Workflow Files Efficiently

Every `.workflow.ts` file starts with a `<workflow-map>` block — a compact index generated automatically at each sync. Always read this block first before opening the rest of the file.

### How to navigate a workflow as an agent

1. Read `<workflow-map>` only — locate the property name you need.
2. Search for that property name in the file.
3. Read only that section — do not load the entire file into context.

---

## Minimal Workflow Structure

```typescript
import { workflow, node, links } from '@n8n-as-code/transformer';

@workflow({
  name: 'Workflow Name',
  active: false
})
export class MyWorkflow {
  @node({
    name: 'Descriptive Name',
    type: '/* EXACT from search */',
    version: 4,
    position: [250, 300]
  })
  MyNode = {
    /* parameters from npx --yes n8nac skills node-info */
  };

  @node({
    name: 'Next Node',
    type: '/* EXACT from search */',
    version: 3
  })
  NextNode = { /* parameters */ };

  @links()
  defineRouting() {
    this.MyNode.out(0).to(this.NextNode.in(0));
  }
}
```

### AI Agent Workflow Example (follow this pattern for LangChain nodes)

```typescript
import { workflow, node, links } from '@n8n-as-code/transformer';

@workflow({ name: 'AI Agent', active: false })
export class AIAgentWorkflow {
  @node({ name: 'Chat Trigger', type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.4, position: [0, 0] })
  ChatTrigger = {};

  @node({ name: 'AI Agent', type: '@n8n/n8n-nodes-langchain.agent', version: 3.1, position: [200, 0] })
  AiAgent = {
    promptType: 'define',
    text: '={{ $json.chatInput }}',
    hasOutputParser: true,
    options: { systemMessage: 'You are a helpful assistant.' },
  };

  @node({ name: 'OpenAI Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3, position: [200, 200],
    credentials: { openAiApi: { id: 'YOUR_CREDENTIAL_ID', name: 'OpenAI' } } })
  OpenaiModel = { model: { mode: 'list', value: 'gpt-4o-mini' }, options: {} };

  @node({ name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', version: 1.3, position: [300, 200] })
  Memory = { sessionIdType: 'customKey', sessionKey: '={{ $execution.id }}', contextWindowLength: 10 };

  @node({ name: 'Search Tool', type: 'n8n-nodes-base.httpRequestTool', version: 4.4, position: [400, 200] })
  SearchTool = { url: 'https://api.example.com/search', toolDescription: 'Search for information' };

  @links()
  defineRouting() {
    this.ChatTrigger.out(0).to(this.AiAgent.in(0));
    this.AiAgent.uses({
      ai_languageModel: this.OpenaiModel.output,
      ai_memory: this.Memory.output,
      ai_tool: [this.SearchTool.output],
    });
  }
}
```

> **Key rule**: Regular nodes connect with `source.out(0).to(target.in(0))`. AI sub-nodes (models, memory, tools, parsers, embeddings, vector stores, retrievers) MUST connect with `.uses()`.

---

## Common Mistakes to AVOID

1. **Wrong node type** - Missing package prefix. Always use EXACT `type` from schema.
2. **Outdated typeVersion** - Use highest version from schema.
3. **Non-existent typeVersion** - Always pick a value from the exact array in schema.
4. **Invalid operation/resource value** - Verify exact string from schema.
5. **Guessing parameter structure** - Check if nested objects required.
6. **Wrong connection names** - Must match EXACT node `name` field.
7. **Inventing non-existent nodes** - Use `search` to verify.
8. **Wrong `.uses()` syntax for tools** - `ai_tool` and `ai_document` are ALWAYS arrays. All other AI types are single refs.
9. **Connecting AI sub-nodes with `.out().to()`** — any AI sub-node MUST use `.uses()`.
10. **Guessing fixedCollection values** — Always run `node-info` first.
11. **Inverting `value1`/`value2` in Switch/If rules** — `value1` = expression, `value2` = literal.

---

## Available Tools

### Unified Search (PRIMARY TOOL)
```bash
npx --yes n8nac skills search "google sheets"
```

### Get Node Schema
```bash
npx --yes n8nac skills node-info googleSheets
npx --yes n8nac skills node-schema googleSheets
```

### Community Workflows
```bash
npx --yes n8nac skills examples search "slack notification"
npx --yes n8nac skills examples info 916
npx --yes n8nac skills examples download 4365
```

### Documentation
```bash
npx --yes n8nac skills docs "OpenAI"
npx --yes n8nac skills guides "webhook"
```

### Validate
```bash
npx --yes n8nac skills validate workflow.workflow.ts
```

### Verify Live Workflow
```bash
npx --yes n8nac verify <workflowId>
npx --yes n8nac push my-workflow.workflow.ts --verify
```

### Test Plan
```bash
npx --yes n8nac test-plan <workflowId>
npx --yes n8nac test-plan <workflowId> --json
```

### Test Workflows
```bash
npx --yes n8nac workflow activate <workflowId>
npx --yes n8nac test <workflowId> --prod
npx --yes n8nac test <workflowId> --data '{"key":"value"}'
```

### Inspect Executions
```bash
npx --yes n8nac execution list --workflow-id <id> --limit 5 --json
npx --yes n8nac execution get <executionId> --include-data --json
```

### Credential Management
```bash
npx --yes n8nac workflow credential-required <id> --json
npx --yes n8nac credential schema <type>
npx --yes n8nac credential list --json
npx --yes n8nac credential create --type <type> --name <name> --file cred.json --json
npx --yes n8nac workflow activate <id>
```

---

> **When in doubt**: `npx --yes n8nac skills node-info <nodeName>` — the schema is always the source of truth.
<!-- n8n-as-code-end -->
