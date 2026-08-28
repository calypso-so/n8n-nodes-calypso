import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	getProfileSuffix,
	isAgentModelId,
	resolveModel,
} from '../dist/nodes/Calypso/Calypso.node.js';

test('default mode resolves to the canonical default model', () => {
	assert.equal(resolveModel('default', ''), 'calypso-agent');
	assert.equal(resolveModel('default', 'ignored'), 'calypso-agent');
});

test('a full model id from the dropdown passes through untouched', () => {
	// Regression: the named-agent dropdown supplies `descriptor.id` from the
	// discovery response. Re-prefixing it produced
	// `calypso-rag-agent:calypso-agent:spacex`, which the API answered with a 500
	// (`Unknown RAG profile`). Both families must pass through.
	assert.equal(resolveModel('namedProfile', 'calypso-agent:spacex'), 'calypso-agent:spacex');
	assert.equal(
		resolveModel('namedProfile', 'calypso-rag-agent:support'),
		'calypso-rag-agent:support',
	);
});

test('a bare agent id is prefixed with the canonical family', () => {
	assert.equal(resolveModel('namedProfile', 'support'), 'calypso-agent:support');
	assert.equal(resolveModel('namedProfile', '  support  '), 'calypso-agent:support');
});

test('isAgentModelId recognizes both families and rejects bare ids', () => {
	for (const id of [
		'calypso-agent',
		'calypso-agent:support',
		'calypso-rag-agent',
		'calypso-rag-agent:support',
	]) {
		assert.equal(isAgentModelId(id), true, id);
	}
	for (const id of ['support', '', 'gpt-4o', 'calypso-agentx']) {
		assert.equal(isAgentModelId(id), false, id);
	}
});

test('getProfileSuffix strips either family prefix', () => {
	assert.equal(getProfileSuffix('calypso-agent:spacex'), 'spacex');
	assert.equal(getProfileSuffix('calypso-rag-agent:support'), 'support');
	assert.equal(getProfileSuffix('calypso-agent'), '');
	assert.equal(getProfileSuffix('gpt-4o'), '');
});
