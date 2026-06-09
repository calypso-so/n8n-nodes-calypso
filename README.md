# Calypso Multimodal RAG for n8n

**The easiest way to add Calypso Multimodal RAG to your n8n workflows.**

Send grounded, multimodal questions to your Calypso workspace directly from n8n. Leverage native Gemini File Search for PDFs, screenshots, charts, diagrams, images, and more. Keep retrieval policy, bucket scoping, and grounding rules inside Calypso while n8n handles orchestration and automation.

[![npm version](https://img.shields.io/npm/v/%40calypsohq%2Fn8n-nodes-calypso.svg)](https://www.npmjs.com/package/@calypsohq/n8n-nodes-calypso)
[![GitHub stars](https://img.shields.io/github/stars/calypso-so/n8n-nodes-calypso?style=social)](https://github.com/calypso-so/n8n-nodes-calypso)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Calypso Multimodal RAG](https://img.shields.io/badge/Calypso_Multimodal_RAG-Gemini-blue)](https://www.calypso.so)

## Quick Start

1. Install the **Calypso** community node
2. Add **Calypso API** credentials (your project API key)
3. Drop the node into your workflow and start sending multimodal grounded queries

**Example Input:**

```json
{
	"model": "calypso-rag-agent",
	"input": "Explain this setup screenshot together with the attached policy PDF. What should the support rep do next?"
}
```

## Features

- **True Multimodal RAG**: Powered by Calypso’s Gemini File Search — handles text + visuals (PDFs, screenshots, charts, diagrams, images) natively.
- **Easy Agent Calls**: Use the default `calypso-rag-agent` or pick a named profile loaded from your API key, such as `calypso-rag-agent:support`.
- **Native File Uploads**: Upload one binary file or a batch of incoming binary files into a selected Calypso knowledge bucket through Calypso upload sessions.
- **Authenticated Bucket Picker**: Upload operations load active bucket options from the connected Calypso project API key.
- **Project-scoped Security**: Calypso project API keys keep workspace, buckets, and policies aligned.
- **Rich Outputs**: Answer text + source annotations, metadata, and optional usage stats.
- **n8n AI Agent Ready**: Use as a tool in n8n AI workflows.
- **Reliable**: Standard n8n error handling with structured Continue-on-Fail support.

## Installation

### n8n Cloud

- Go to **Settings → Community nodes**
- Install package: `@calypsohq/n8n-nodes-calypso`
- Or search for "Calypso" / "Calypso Multimodal RAG" in the nodes panel.

### Self-hosted n8n

```bash
npm install @calypsohq/n8n-nodes-calypso
```

Restart n8n, then search for **Calypso**.

## Credentials

Create a **Calypso API** credential:

- **API Key**: Your Calypso project API key (`sk-...`)
- **Base URL**: `https://api.calypso.so/v1` (default — change only for self-hosted Calypso)

## Node Configuration

### Operation

- **Ask Agent** — Send grounded multimodal requests to Calypso.
- **Upload File** — Create an upload session, send one binary file from each incoming n8n item directly to storage, and finalize it into a selected Calypso bucket.
- **Upload Batch** — Create a durable batch upload session, upload all incoming binary files directly to storage, and finalize the batch.

### Model

- Default: `calypso-rag-agent`
- Named Profile: choose a full model ID from the dropdown, such as `calypso-rag-agent:support`. The list is loaded from the Calypso profiles available to your project API key.

### Input

Your question or instruction. Calypso Multimodal RAG shines when querying across text and visual content already indexed in your buckets.

**Multimodal Example Prompts**:

- "Compare this screenshot with the pricing chart in our handbook PDF"
- "Explain the diagram in the attached onboarding document"
- "What does our policy PDF say about this setup error screenshot?"
- "Summarize key changes from the latest report and supporting visuals"
- "Recommend the right plan based on this customer screenshot and our pricing docs"

### Uploads

For **Upload File** and **Upload Batch**, choose **Bucket Name or ID** from the dynamic bucket dropdown. The list is loaded from the active buckets available to the connected Calypso project API key and shows bucket names with file counts.

Set **Binary Property Name** to the n8n binary field that contains the file, usually `data`. Optional upload fields include tags, metadata, single-file title, single-file idempotency key, and batch idempotency key.

Upload operations create a small JSON session, upload bytes directly to the returned storage URL, and finalize the session with Calypso. Upload responses confirm durable acceptance by Calypso. Newly uploaded files may still need indexing time before they are query-ready for agent answers.

### Additional Options

- **Include Token Usage**
- **Include Raw Response** (useful for debugging)

## Output Format

```json
{
	"answer": "Based on the policy PDF and screenshot...",
	"sources": [
		{
			"name": "Support Handbook.pdf",
			"url": "https://..."
		}
	],
	"metadata": {
		"timestamp": "2026-06-05T...",
		"calypso": {}
	},
	"usage": {}
}
```

## How It Works

The node calls Calypso’s OpenAI-compatible `/v1/responses` endpoint. All multimodal retrieval, grounding, and policy enforcement happens inside Calypso Multimodal RAG. n8n stays lean — focused on workflow logic, triggers, and actions.

This creates a consistent knowledge layer across your tools (Claude, Cursor, n8n, etc.).

## Best Practices

- Test prompts in the Calypso Playground first.
- Use named profiles for specific bucket or policy needs. n8n only shows profiles your Calypso project API key can access.
- Use **Upload Batch** when multiple incoming items should be accepted as one retryable Calypso batch.
- Ensure new uploads are fully indexed before querying.
- Rotate project API keys regularly from the Calypso dashboard.

## Companion Tool

Pair this node with the **[Calypso Multimodal RAG MCP Server](https://github.com/calypso-so/calypso-mcp-server)** for seamless integration across desktop agents and n8n automations.

## Support & Links

- **Website**: [calypso.so](https://www.calypso.so)
- **GitHub**: [calypso-so/n8n-nodes-calypso](https://github.com/calypso-so/n8n-nodes-calypso)
- **Issues**: [GitHub Issues](https://github.com/calypso-so/n8n-nodes-calypso/issues)

## License

MIT License. See [LICENSE](LICENSE).
