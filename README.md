# Calypso for n8n

**Grounded, multimodal answers from your Calypso knowledge — inside any n8n workflow.**

Ask a Calypso agent questions that span PDFs, screenshots, charts, and diagrams, and upload new source files into your knowledge buckets. Retrieval policy, bucket scoping, and grounding stay inside Calypso; n8n handles orchestration.

[![npm version](https://img.shields.io/npm/v/%40calypsohq%2Fn8n-nodes-calypso.svg)](https://www.npmjs.com/package/@calypsohq/n8n-nodes-calypso)
[![CI](https://github.com/calypso-so/n8n-nodes-calypso/actions/workflows/ci.yml/badge.svg)](https://github.com/calypso-so/n8n-nodes-calypso/actions/workflows/ci.yml)
[![GitHub stars](https://img.shields.io/github/stars/calypso-so/n8n-nodes-calypso?style=social)](https://github.com/calypso-so/n8n-nodes-calypso)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> This node is a **Calypso Context** surface — the same knowledge layer that backs Calypso on WhatsApp, reachable from your automations. [How the pieces fit →](https://www.calypso.so/#learn)

## Quick Start

1. Install the **Calypso** community node
2. Add **Calypso API** credentials (your project API key)
3. Drop the node into your workflow and start asking grounded questions

**Example input:**

```json
{
	"model": "calypso-agent",
	"input": "Explain this setup screenshot together with the attached policy PDF. What should the support rep do next?"
}
```

## Features

- **Multimodal retrieval**: text and visuals — PDFs, screenshots, charts, diagrams — in one query.
- **Named agents**: use the default `calypso-agent`, or pick a named profile loaded from your API key.
- **Bucket scoping**: narrow a single request to specific buckets within a profile.
- **File uploads**: send one binary file or a batch of incoming items into a knowledge bucket through Calypso upload sessions.
- **Authenticated pickers**: bucket and profile dropdowns load from the connected project API key.
- **Traceable answers**: every response carries its source annotations, so your workflow decides what reaches the customer.
- **AI Agent tool**: usable as a tool inside n8n AI Agent workflows.
- **Continue-on-Fail**: failed items return a structured `error` object instead of halting the run.

## Installation

### n8n Cloud

- Go to **Settings → Community nodes**
- Install package: `@calypsohq/n8n-nodes-calypso`
- Or search for "Calypso" in the nodes panel

### Self-hosted n8n

```bash
npm install @calypsohq/n8n-nodes-calypso
```

Restart n8n, then search for **Calypso**.

## Operations

### Ask Agent

Send a grounded request to a Calypso agent.

#### Model

- **Default** — uses `calypso-agent`, the canonical grounded agent for the project.
- **Named Profile** — choose a profile from the dropdown, which loads the profiles your API key can reach. The dropdown supplies a complete model ID such as `calypso-agent:support`; pass it through unchanged rather than hand-editing it.

#### Agent Bucket Context

Available when **Operation = Ask Agent** and **Model = Named Profile**.

By default a named profile searches every bucket assigned to it. Use **Agent Bucket Context** to narrow a single request to a subset — for example, answering a billing question from the billing bucket alone, so an unrelated handbook cannot influence the answer.

The list loads from the buckets attached to the profile you selected, so choose **Named Profile** first. Leave it empty to use the profile's full bucket set.

#### Input

Your question or instruction. Calypso is strongest when a question spans text and visual content already indexed in your buckets:

- "Compare this screenshot with the pricing chart in our handbook PDF"
- "What does our policy PDF say about this setup error screenshot?"
- "Recommend the right plan based on this customer screenshot and our pricing docs"

#### Additional Options

- **Include Token Usage** — adds a `usage` object to the output.
- **Include Raw Response** — adds the unprocessed API response as `rawResponse`. Useful for debugging.

### Upload File / Upload Batch

**Upload File** creates an upload session, sends one binary file from each incoming item to storage, and finalizes it into a bucket. **Upload Batch** does the same for all incoming binary files as one retryable batch.

Choose **Bucket Name or ID** from the dropdown, which lists active buckets with their file counts.

**File Source** decides where the bytes come from:

- **Binary Property** — the file is already attached to the incoming item. Set **Binary Property Name** to the binary field, usually `data`. This is the only option that works on n8n Cloud.
- **Local File Path** — the n8n worker reads the file from disk. Self-hosted only. For batches, use an expression such as `{{ $json.filePath }}` so each item can point at a different file. MIME type is inferred from the extension; **Local File MIME Type** overrides it.

Optional **Upload Options**: `Title` (single file), `Tags`, `Metadata`, `Idempotency Key` (single file), and `Batch Idempotency Key`.

Uploads create a small JSON session, send bytes directly to the returned storage URL, and finalize with Calypso. A successful response confirms durable acceptance — **not** that the file is queryable yet. See [Troubleshooting](#troubleshooting).

## Use as an AI Agent tool

The node sets `usableAsTool`, so an **AI Agent** node can call Calypso directly as a tool. Connect it to the agent's tool port and the model decides when to ask your knowledge base.

This is the fastest way to give an existing n8n agent grounded, source-backed answers without building retrieval yourself. Use a named profile to keep the tool scoped to the right knowledge, and give the tool a description that says what those buckets contain.

## Example workflow

Accept a document over a webhook, index it, then answer a question about it:

```
Webhook  →  Calypso (Upload File)  →  Wait  →  Calypso (Ask Agent)  →  Respond to Webhook
```

1. **Webhook** — receives the file as binary data.
2. **Calypso · Upload File** — Bucket = your target bucket, File Source = Binary Property, Binary Property Name = `data`.
3. **Wait** — give indexing time to finish. Uploads are accepted before they are queryable.
4. **Calypso · Ask Agent** — Model = Named Profile scoped to that bucket, Input = your question.
5. **Respond to Webhook** — return `answer`, and decide whether to include `sources`.

## Output format

Every **Ask Agent** item returns:

```json
{
	"model": "calypso-agent:support",
	"input": "What is our refund window for annual plans?",
	"answer": "Annual plans can be refunded within 30 days of renewal...",
	"sources": [
		{
			"type": "file_citation",
			"filename": "Support Handbook.pdf"
		}
	],
	"metadata": {
		"apiType": "responses",
		"timestamp": "2026-08-28T09:14:22.031Z",
		"calypso": {}
	}
}
```

`usage` and `rawResponse` appear only when their Additional Options are enabled. `sources` contains the annotation objects from the Calypso response passed through unchanged, so treat their exact fields as provider-defined rather than a stable contract.

With **Continue-on-Fail** enabled, a failed item returns `{ "error": true, "message", "input", "model", "timestamp" }` instead of stopping the workflow.

### Sources and what you show customers

`sources` is an internal evidence trail. It tells you which of your documents produced an answer — exactly what you need to audit or debug a reply.

That is not the same as something to forward verbatim. A source list can name internal pricing sheets, staff procedures, or customer records. **Your workflow decides what reaches the end user.** A common pattern is to log the full `sources` array and send the customer only `answer`, or to map annotations onto a curated set of public document titles.

## Credentials

Create a **Calypso API** credential:

- **API Key** — your Calypso project API key (`sk-...`)
- **Base URL** — `https://api.calypso.so/v1` (default; change only for a dedicated environment)

The project API key determines the workspace, buckets, default policy, and named profiles this node can reach.

## Compatibility

- **n8n nodes API**: version 1
- **Node.js**: >= 20.15 · **npm**: >= 9.5.1
- Works on n8n Cloud and self-hosted n8n.
- **Local File Path** uploads need filesystem access from the n8n worker, so they are self-hosted only. On n8n Cloud, use **Binary Property**.

## Troubleshooting

**`HTTP 500 — Unknown RAG profile` when using Named Profile**
The model ID is malformed, almost always from hand-editing. Pass the dropdown value through unchanged — it is already a complete `calypso-agent:{id}`, so adding a prefix yields `calypso-agent:calypso-agent:{id}`, which the API rejects. Re-select the profile from the dropdown to repair it.

**A freshly uploaded file is not reflected in the answer**
Upload responses confirm durable acceptance, not index readiness. Indexing runs after finalize. Add a **Wait** node, or poll until the file reports ready, before the Ask Agent step.

**`401`, or empty bucket and profile dropdowns**
The project API key is wrong, revoked, or scoped to a different workspace. Both dropdowns are populated by authenticated calls, so empty lists are an authentication symptom rather than a "no buckets" one. Confirm the Base URL is `https://api.calypso.so/v1`.

**Agent Bucket Context is empty or missing**
It appears only for **Ask Agent** with **Named Profile**, and it loads the buckets of the currently selected profile. Choose the profile first, then reopen the field.

## Best Practices

- Validate prompts in the Calypso Playground before automating them.
- Use named profiles to scope knowledge; use Agent Bucket Context to scope a single request further.
- Use **Upload Batch** when several incoming items should be accepted as one retryable batch.
- Let uploads finish indexing before querying them.
- Rotate project API keys regularly from the Calypso dashboard.

## Version history

| Version   | Notes                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.2.0** | Removed the legacy `calypso-rag-agent` model family; `calypso-agent` is the only accepted family. README rewritten with Agent Bucket Context, Compatibility, and Troubleshooting. |
| **1.1.0** | Fixed named-agent model IDs and adopted the canonical `calypso-agent` family. Added the model-id test suite.                                                                      |
| **1.0.x** | Initial release: Ask Agent, Upload File, Upload Batch, upload sessions, local file paths.                                                                                         |

See [CHANGELOG.md](CHANGELOG.md) for detail.

## Resources

- **Website**: [calypso.so](https://www.calypso.so)
- **Docs**: [docs.calypso.so](https://docs.calypso.so)
- **MCP server**: [Calypso MCP Server](https://github.com/calypso-so/calypso-mcp-server) — the same knowledge layer for Claude, Cursor, and desktop agents
- **Issues**: [GitHub Issues](https://github.com/calypso-so/n8n-nodes-calypso/issues)
- **n8n community nodes**: [documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

MIT License. See [LICENSE](LICENSE).
