# Calypso Multimodal RAG for n8n

**The easiest way to add Calypso Multimodal RAG to your n8n workflows.**

Send grounded, multimodal questions to your Calypso workspace directly from n8n. Leverage native Gemini File Search for PDFs, screenshots, charts, diagrams, images, and more. Keep retrieval policy, bucket scoping, and grounding rules inside Calypso while n8n handles orchestration and automation.

[![npm version](https://img.shields.io/npm/v/%40calypsohq%2Fn8n-nodes-calypso.svg)](https://www.npmjs.com/package/@calypsohq/n8n-nodes-calypso)
[![GitHub stars](https://img.shields.io/github/stars/calypso-so/n8n-nodes-calypso?style=social)](https://github.com/calypso-so/n8n-nodes-calypso)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Calypso Multimodal RAG](https://img.shields.io/badge/Calypso_Multimodal_RAG-Gemini-blue)](https://www.calypso.so)

## Quick Start

1. Install the **Calypso RAG** community node
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
- **Easy Agent Calls**: Use the default `calypso-rag-agent` or named profiles (`calypso-rag-agent:support`).
- **Project-scoped Security**: Calypso project API keys keep workspace, buckets, and policies aligned.
- **Rich Outputs**: Answer text + source annotations, metadata, and optional usage stats.
- **n8n AI Agent Ready**: Use as a tool in n8n AI workflows.
- **Reliable**: Standard n8n error handling with structured Continue-on-Fail support.

## Installation

### n8n Cloud

- Go to **Settings → Community nodes**
- Install package: `@calypsohq/n8n-nodes-calypso`
- Or search for "Calypso RAG" / "Calypso Multimodal RAG" in the nodes panel.

### Self-hosted n8n

```bash
npm install @calypsohq/n8n-nodes-calypso
```

Restart n8n, then search for **Calypso RAG**.

## Credentials

Create a **Calypso API** credential:

- **API Key**: Your Calypso project API key (`sk-...`)
- **Base URL**: `https://api.calypso.so/v1` (default — change only for self-hosted Calypso)

## Node Configuration

### Operation

- **Ask Agent** — Send grounded multimodal requests to Calypso.

### Model

- Default: `calypso-rag-agent`
- Named Profile: `support` or full `calypso-rag-agent:support`

### Input

Your question or instruction. Calypso Multimodal RAG shines when querying across text and visual content already indexed in your buckets.

**Multimodal Example Prompts**:

- "Compare this screenshot with the pricing chart in our handbook PDF"
- "Explain the diagram in the attached onboarding document"
- "What does our policy PDF say about this setup error screenshot?"
- "Summarize key changes from the latest report and supporting visuals"
- "Recommend the right plan based on this customer screenshot and our pricing docs"

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
- Use named profiles for specific bucket or policy needs.
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
