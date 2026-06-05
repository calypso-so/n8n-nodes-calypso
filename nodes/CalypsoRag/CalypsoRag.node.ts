import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import * as packageInfo from '../../package.json';

const DEFAULT_MODEL = 'calypso-rag-agent';
const MODEL_PREFIX = `${DEFAULT_MODEL}:`;

type ModelMode = 'default' | 'namedProfile';

type ResponseContentItem = {
	text?: string;
	annotations?: IDataObject[];
};

type ResponseOutputItem = {
	content?: ResponseContentItem[];
};

type CalypsoResponse = {
	output_text?: string;
	output?: ResponseOutputItem[];
	metadata?: IDataObject;
	usage?: IDataObject;
};

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
}

function resolveModel(modelMode: ModelMode, profileId: string): string {
	if (modelMode === 'default') {
		return DEFAULT_MODEL;
	}

	const normalizedProfileId = profileId.trim();

	if (normalizedProfileId.startsWith(MODEL_PREFIX)) {
		return normalizedProfileId;
	}

	return `${MODEL_PREFIX}${normalizedProfileId}`;
}

function getProfileSuffix(model: string): string {
	return model.startsWith(MODEL_PREFIX) ? model.slice(MODEL_PREFIX.length).trim() : '';
}

function extractResponseText(response: CalypsoResponse): string {
	if (response.output_text) {
		return response.output_text;
	}

	const textParts: string[] = [];

	for (const outputItem of response.output ?? []) {
		for (const contentItem of outputItem.content ?? []) {
			if (contentItem.text) {
				textParts.push(contentItem.text);
			}
		}
	}

	return textParts.join('\n');
}

function extractAnnotations(response: CalypsoResponse): IDataObject[] {
	const annotations: IDataObject[] = [];

	for (const outputItem of response.output ?? []) {
		for (const contentItem of outputItem.content ?? []) {
			if (contentItem.annotations) {
				annotations.push(...contentItem.annotations);
			}
		}
	}

	return annotations;
}

/**
 * n8n node for calling Calypso RAG agents through the OpenAI-compatible Responses API.
 */
export class CalypsoRag implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calypso',
		name: 'calypsoRag',
		icon: 'file:calypso.svg',
		group: ['input'],
		version: 1,
		subtitle:
			'={{$parameter["modelMode"] === "default" ? "calypso-rag-agent" : "calypso-rag-agent:" + $parameter["profileId"]}}',
		description: 'Ask a grounded Calypso RAG agent',
		defaults: {
			name: 'Calypso',
		},
		usableAsTool: true,
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'calypsoApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Validate your Calypso RAG agent in Playground before automating it in n8n. The project API key determines the workspace, buckets, default policy, and named profiles available to this node.',
				name: 'setupNotice',
				type: 'notice',
				default: '',
				displayOptions: {
					show: {},
				},
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Ask Agent',
						value: 'askAgent',
						description: 'Send a grounded request to a Calypso RAG agent',
						action: 'Ask agent',
					},
				],
				default: 'askAgent',
			},
			{
				displayName: 'Model',
				name: 'modelMode',
				type: 'options',
				options: [
					{
						name: 'Default Agent',
						value: 'default',
						description: 'Use calypso-rag-agent, the canonical grounded agent for this project',
					},
					{
						name: 'Named Profile',
						value: 'namedProfile',
						description: 'Use a named profile in the form calypso-rag-agent:{profile_id}',
					},
				],
				default: 'default',
				description: 'Choose the Calypso RAG model to call',
			},
			{
				displayName: 'Profile ID',
				name: 'profileId',
				type: 'string',
				displayOptions: {
					show: {
						modelMode: ['namedProfile'],
					},
				},
				default: '',
				placeholder: 'support',
				description:
					'Named profile ID. Enter either support or the full model ID calypso-rag-agent:support.',
				required: true,
			},
			{
				displayName: 'Input',
				name: 'input',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'Summarize the grounded knowledge available in this workspace.',
				description: 'Question or instruction to send to the Calypso RAG agent',
				required: true,
			},
			{
				displayName: 'Additional Options',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Include Raw Response',
						name: 'includeRawResponse',
						type: 'boolean',
						default: false,
						description: 'Whether to include the full API response in the output',
					},
					{
						displayName: 'Include Token Usage',
						name: 'includeUsage',
						type: 'boolean',
						default: false,
						description: 'Whether to include token usage information in the response',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const credentials = await this.getCredentials('calypsoApi');
		const baseUrl = normalizeBaseUrl(
			(credentials.baseUrl as string) || 'https://api.calypso.so/v1',
		);
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			let input = '';
			let model = '';

			try {
				const modelMode = this.getNodeParameter('modelMode', i) as ModelMode;
				const profileId = this.getNodeParameter('profileId', i, '') as string;
				input = this.getNodeParameter('input', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i, {}) as {
					includeRawResponse?: boolean;
					includeUsage?: boolean;
				};

				if (!input || input.trim().length === 0) {
					throw new NodeOperationError(this.getNode(), 'Input is required and cannot be empty', {
						itemIndex: i,
					});
				}

				if (modelMode === 'namedProfile' && profileId.trim().length === 0) {
					throw new NodeOperationError(this.getNode(), 'Profile ID is required', {
						itemIndex: i,
					});
				}

				model = resolveModel(modelMode, profileId);
				const profileSuffix = getProfileSuffix(model);

				if (modelMode === 'namedProfile' && profileSuffix.length === 0) {
					throw new NodeOperationError(
						this.getNode(),
						'Named Profile must include a profile ID after calypso-rag-agent:',
						{
							itemIndex: i,
						},
					);
				}

				if (modelMode === 'namedProfile' && profileSuffix.includes(MODEL_PREFIX)) {
					throw new NodeOperationError(
						this.getNode(),
						'Profile ID must not include calypso-rag-agent: more than once',
						{
							itemIndex: i,
						},
					);
				}

				const requestOptions: IHttpRequestOptions = {
					url: `${baseUrl}/responses`,
					method: 'POST',
					body: {
						model,
						input,
					},
					json: true,
					headers: {
						'Content-Type': 'application/json',
						'User-Agent': `${packageInfo.name}/${packageInfo.version}`,
					},
				};

				let response: CalypsoResponse;
				try {
					response = (await this.helpers.httpRequestWithAuthentication.call(
						this,
						'calypsoApi',
						requestOptions,
					)) as CalypsoResponse;
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject, {
						itemIndex: i,
					});
				}

				const metadata: IDataObject = {
					apiType: 'responses',
					timestamp: new Date().toISOString(),
				};

				if (response.metadata) {
					metadata.calypso = response.metadata;
				}

				const outputData: IDataObject = {
					model,
					input,
					answer: extractResponseText(response),
					sources: extractAnnotations(response),
					metadata,
				};

				if (additionalFields.includeUsage === true && response.usage) {
					outputData.usage = response.usage;
				}

				if (additionalFields.includeRawResponse === true) {
					outputData.rawResponse = response as IDataObject;
				}

				returnData.push({
					json: outputData,
				});
			} catch (error) {
				if (this.continueOnFail()) {
					const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

					returnData.push({
						json: {
							error: true,
							message: errorMessage,
							input,
							model,
							timestamp: new Date().toISOString(),
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}

				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return this.prepareOutputData(returnData);
	}
}
