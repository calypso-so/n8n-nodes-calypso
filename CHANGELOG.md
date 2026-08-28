# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.2.0

### Removed

- **The legacy `calypso-rag-agent` model family.** `calypso-agent` is now the only family
  the node recognizes. `LEGACY_FAMILY` and `AGENT_FAMILIES` are gone, and `isAgentModelId()`
  and `getProfileSuffix()` parse a single prefix. Discovery has returned canonical
  `calypso-agent:{agent_id}` ids since 1.1.0, so the dual-family parser had no remaining
  consumer. A hand-written `calypso-rag-agent:{id}` is no longer treated as a complete model
  id and will be rejected by the API — select the profile from the dropdown instead.
- ` README_TEMPLATE.md`, an unmodified copy of the n8n community-node boilerplate.

  Strictly this is a breaking change and would argue for 2.0.0. The package has no
  production consumers, so a major would signal turbulence that does not exist; it ships as
  a minor with this note instead.

### Changed

- README rewritten: documents the previously undocumented **Agent Bucket Context** field,
  adds **Compatibility**, **Troubleshooting**, **Version history**, an AI-Agent-tool section,
  and a worked example workflow. The output example now shows the full response envelope
  (`model`, `input`, `answer`, `sources`, `metadata`) rather than a stub.
- README titled "Calypso for n8n" and names the node as a **Calypso Context** surface, in
  line with how Calypso is described elsewhere. Removed unprovable superlatives.

### Note

- The pass-through guard in `resolveModel()` is retained. It is not legacy handling: the
  dropdown supplies an already-complete model id, so without it the node re-prefixes into
  `calypso-agent:calypso-agent:{id}` — the same doubled-prefix 500 fixed in 1.1.0, within a
  single family. Its regression test is retained with the legacy assertions dropped.

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
