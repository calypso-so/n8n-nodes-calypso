# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.0

### Fixed

- **Named Agent mode was sending a malformed model id.** The dropdown is populated from
  `GET /v1/rag-agent/models`, which now returns canonical `calypso-agent:{agent_id}` ids,
  but `resolveModel()` only recognized the legacy `calypso-rag-agent:` prefix and prefixed
  the value a second time — producing `calypso-rag-agent:calypso-agent:{id}`, which the API
  answers with HTTP 500 `Unknown RAG profile`. Full model ids in either family now pass
  through untouched.
- `getProfileSuffix()` and the node subtitle repeated the same single-family assumption and
  are fixed alongside, so bucket summaries and the displayed id match what is sent.

### Changed

- The default model is `calypso-agent`; `calypso-rag-agent[:{agent_id}]` remains accepted
  everywhere the node parses a model id.
- Node, operation, and credential descriptions now say "Calypso agent".
- `npm test` runs a real suite (was a placeholder echo) covering model-id resolution.

## [1.0.0] - 2026-06-05

### Initial Build

- First public build of the Calypso community node for n8n.
- Includes `Calypso API` credentials with project API key authentication and configurable base URL.
- Includes the `Calypso` node for OpenAI-compatible Responses API calls using `calypso-rag-agent` or optional named profile model IDs.
- Includes response parsing for answer text, annotations, metadata, optional usage, and optional raw responses.
