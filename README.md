# Calypso Multimodal RAG for n8n

**The easiest way to add Calypso Multimodal RAG to your n8n workflows.**

Send grounded, multimodal questions to your Calypso workspace directly from n8n. Leverage native Gemini File Search for PDFs, screenshots, charts, diagrams, images, and more. Keep retrieval policy, bucket scoping, and grounding rules inside Calypso while n8n handles orchestration and automation.

[![npm version](https://img.shields.io/npm/v/n8n-nodes-calypso.svg)](https://www.npmjs.com/package/n8n-nodes-calypso)
[![GitHub stars](https://img.shields.io/github/stars/calypso-so/n8n-nodes-calypso?style=social)](https://github.com/calypso-so/n8n-nodes-calypso)
[![License](https://img.shields.io/github/license/calypso-so/n8n-nodes-calypso)](LICENSE)
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
- Install package: `n8n-nodes-calypso`
- Or search for "Calypso RAG" / "Calypso Multimodal RAG" in the nodes panel.

### Self-hosted n8n

```bash
npm install n8n-nodes-calypso
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

# Calypso RAG for n8n

An n8n community node for calling Calypso RAG agents from workflow automations. Use it to send grounded questions to your Calypso workspace through the OpenAI-compatible Responses API while keeping retrieval policy, bucket scope, and presentation rules inside Calypso.

## Features

- **Grounded Agent Calls**: Ask the default `calypso-rag-agent` from n8n workflows.
- **Named Profiles**: Optionally target `calypso-rag-agent:{profile_id}` when a workflow needs a saved profile.
- **Project API Keys**: Use Calypso project-scoped API keys so workspace, buckets, and agent policy stay aligned.
- **Source-Aware Output**: Returns answer text, source annotations when available, metadata, and optional usage data.
- **n8n-Native Errors**: Uses standard n8n API and operation errors, with structured rows when Continue On Fail is enabled.
- **AI Tool Ready**: The node can be used as a tool in n8n AI workflows.

## How It Works

Calypso RAG keeps the agent policy in Calypso. n8n should orchestrate when to call the agent, not duplicate retrieval settings in a workflow.

The node sends:

```json
{
	"model": "calypso-rag-agent",
	"input": "Summarize the grounded knowledge available in this workspace."
}
```

to:

```text
https://api.calypso.so/v1/responses
```

For named profiles, the node sends model IDs such as:

```text
calypso-rag-agent:support
```

## Prerequisites

1. A Calypso RAG workspace.
2. At least one active project API key from your Calypso workspace.
3. Knowledge sources indexed in the buckets your default agent or named profile can access.
4. An n8n instance that supports community nodes.

Validate the agent in Calypso Playground before wiring it into n8n. This keeps n8n focused on orchestration and makes source, policy, and grounding issues easier to debug.

## Installation

### n8n Cloud

Only the n8n instance owner can install community nodes.

1. Open the nodes panel in the workflow canvas.
2. Search for `Calypso RAG`.
3. If available from the community section, select and install it.
4. If it does not appear in search, go to **Settings → Community nodes**.
5. Install package name:

```text
n8n-nodes-calypso
```

### Self-Hosted n8n

Install the package in your n8n environment using your standard community-node workflow:

```bash
npm install n8n-nodes-calypso
```

Then restart n8n and search for `Calypso RAG`.

## Credentials

Create a `Calypso API` credential:

- **API Key**: Your Calypso project API key.
- **Base URL**: Defaults to `https://api.calypso.so/v1`.

Keep the default base URL unless you are using a dedicated Calypso environment.

## Node Configuration

### Operation

- **Ask Agent**: Sends one grounded request to the selected Calypso RAG agent.

### Model

- **Default Agent**: Uses `calypso-rag-agent`.
- **Named Profile**: Uses `calypso-rag-agent:{profile_id}`.

For named profiles, enter either the short profile ID:

```text
support
```

or the full model ID:

```text
calypso-rag-agent:support
```

The node normalizes both forms to the correct model ID.

### Input

The grounded question or instruction to send to Calypso.

Examples:

```text
Summarize the grounded knowledge available in this workspace.
```

```text
Answer this using our uploaded policy docs: what is the refund escalation path?
```

```text
Based on the product handbook, draft a short internal summary for the support team.
```

### Additional Options

- **Include Token Usage**: Adds `usage` from the API response when available.
- **Include Raw Response**: Adds the full API response for debugging or downstream parsing.

## Output Format

The node returns one item per input item:

```json
{
	"model": "calypso-rag-agent",
	"input": "Summarize the grounded knowledge available in this workspace.",
	"answer": "The workspace contains...",
	"sources": [
		{
			"name": "Support Handbook",
			"url": "https://..."
		}
	],
	"metadata": {
		"apiType": "responses",
		"timestamp": "2026-06-05T18:00:00.000Z",
		"calypso": {
			"trace_id": "..."
		}
	},
	"usage": {
		"prompt_tokens": 120,
		"completion_tokens": 340,
		"total_tokens": 460
	}
}
```

## Error Handling

By default, failed requests throw standard n8n errors.

When Continue On Fail is enabled, failed items return a structured row:

```json
{
	"error": true,
	"message": "Input is required and cannot be empty",
	"input": "",
	"model": "calypso-rag-agent",
	"timestamp": "2026-06-05T18:00:00.000Z"
}
```

## Best Practices

1. Validate the default agent in Calypso Playground before automating it.
2. Prefer `calypso-rag-agent` for stable, team-level grounded behavior.
3. Use named profiles only when a workflow needs a specific saved retrieval scope or presentation.
4. Wait for uploads and bucket sync to finish before expecting new knowledge in answers.
5. Keep API keys in n8n credentials and rotate them from Calypso Project → API Keys.

## Release Process

Verified n8n community-node releases should be published from GitHub Actions with npm provenance.

To publish a new version:

1. Merge release changes to `main`.
2. Ensure npm Trusted Publisher is configured for `calypso-so/n8n-nodes-calypso` and workflow filename `publish.yml`.
3. Bump the package version.
4. Push the matching version tag.
5. Let `.github/workflows/publish.yml` publish the package with provenance.

Do not publish verified releases with a local `npm publish` command.

## Support

- **Website**: [calypso.so](https://www.calypso.so/)
- **GitHub**: [calypso-so/n8n-nodes-calypso](https://github.com/calypso-so/n8n-nodes-calypso)
- **Issues**: [GitHub Issues](https://github.com/calypso-so/n8n-nodes-calypso/issues)
- **Email**: info@calypso.so

## License

MIT License. See [LICENSE](LICENSE).
