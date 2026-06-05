import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

import * as packageInfo from '../package.json';

const DEFAULT_BASE_URL = 'https://api.calypso.so/v1';

/**
 * Credential configuration for Calypso RAG project API keys.
 */
export class CalypsoApi implements ICredentialType {
	name = 'calypsoApi';
	displayName = 'Calypso API';
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-not-http-url
	documentationUrl = 'httpsDocsCalypsoSo';
	properties: INodeProperties[] = [
		{
			displayName:
				'Create a Calypso project API key in your Calypso workspace. Visit <a href="https://www.calypso.so/" target="_blank">calypso.so</a> to get started.',
			name: 'notice',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {},
			},
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'sk_...',
			description: 'Your project-scoped Calypso API key',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: DEFAULT_BASE_URL,
			required: true,
			placeholder: DEFAULT_BASE_URL,
			description:
				'Calypso RAG OpenAI-compatible API base URL. Keep the default unless you use a dedicated environment.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
				'User-Agent': `${packageInfo.name}/${packageInfo.version} (Node.js)`,
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/connection',
			method: 'GET',
		},
	};
}
