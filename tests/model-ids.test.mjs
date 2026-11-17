import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	getProfileSuffix,
	isAgentModelId,
	resolveModel,
} from '../dist/nodes/Calypso/Calypso.node.js';

test('default mode resolves to the canonical default model', () => {
	assert.equal(resolveModel('default', ''), 'elephant-agent');
	assert.equal(resolveModel('default', 'ignored'), 'elephant-agent');
});

test('a full model id from the dropdown passes through untouched', () => {
	// Regression: the named-agent dropdown supplies `descriptor.id` from the
	// discovery response, which is already a complete model id. Re-prefixing it
	// produced `elephant-agent:elephant-agent:spacex`, answered with a 500
	// (`Unknown RAG profile`). An earlier-family id saved in a workflow passes
	// through too — the API still resolves it.
	assert.equal(resolveModel('namedProfile', 'elephant-agent:spacex'), 'elephant-agent:spacex');
	assert.equal(resolveModel('namedProfile', 'elephant-agent'), 'elephant-agent');
	assert.equal(resolveModel('namedProfile', 'calypso-agent:spacex'), 'calypso-agent:spacex');
	assert.equal(resolveModel('namedProfile', 'calypso-agent'), 'calypso-agent');
});

test('a bare agent id is prefixed with the canonical family', () => {
	assert.equal(resolveModel('namedProfile', 'support'), 'elephant-agent:support');
	assert.equal(resolveModel('namedProfile', '  support  '), 'elephant-agent:support');
});

test('isAgentModelId recognizes the canonical and earlier families and rejects everything else', () => {
	for (const id of [
		'elephant-agent',
		'elephant-agent:support',
		'calypso-agent',
		'calypso-agent:support',
	]) {
		assert.equal(isAgentModelId(id), true, id);
	}
	// `calypso-rag-agent` was the legacy family and is no longer recognized.
	for (const id of [
		'support',
		'',
		'gpt-4o',
		'calypso-agentx',
		'calypso-rag-agent',
		'calypso-rag-agent:support',
	]) {
		assert.equal(isAgentModelId(id), false, id);
	}
});

test('getProfileSuffix strips an accepted family prefix only', () => {
	assert.equal(getProfileSuffix('elephant-agent:spacex'), 'spacex');
	assert.equal(getProfileSuffix('elephant-agent'), '');
	assert.equal(getProfileSuffix('calypso-agent:spacex'), 'spacex');
	assert.equal(getProfileSuffix('calypso-agent'), '');
	assert.equal(getProfileSuffix('calypso-rag-agent:support'), '');
	assert.equal(getProfileSuffix('gpt-4o'), '');
});
