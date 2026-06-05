import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IHttpRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import * as packageInfo from '../../package.json';

const DEFAULT_MODEL = 'calypso-rag-agent';
const MODEL_PREFIX = `${DEFAULT_MODEL}:`;

type Operation = 'askAgent' | 'uploadFile' | 'uploadBatch';
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

type RagAgentModelDescriptor = {
	id?: string;
	profile_id?: string | null;
	source?: string;
	buckets?: Array<{
		id?: string;
		name?: string;
		slug?: string;
		status?: string;
		member_count?: number;
	}>;
};

type RagAgentModelsResponse = {
	data?: RagAgentModelDescriptor[];
};

type KnowledgeBucket = {
	id?: string;
	slug?: string;
	name?: string;
	status?: string;
	fileCount?: number;
	filesCount?: number;
	memberCount?: number;
	counts?: {
		files?: number;
		file_count?: number;
	};
	bucketStore?: {
		file_count?: number;
		member_count?: number;
	};
};

type KnowledgeBucketsResponse = {
	buckets?: KnowledgeBucket[];
};

type UploadAdditionalFields = {
	title?: string;
	tags?: string;
	metadata?: string;
	idempotencyKey?: string;
	batchIdempotencyKey?: string;
	dryRun?: boolean;
};

type BinaryFilePayload = {
	buffer: Buffer;
	fileName: string;
	mimeType: string;
};

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.replace(/\/+$/, '');
}

async function fetchRagAgentModels(
	this: ILoadOptionsFunctions,
): Promise<RagAgentModelDescriptor[]> {
	const credentials = await this.getCredentials('calypsoApi');
	const baseUrl = normalizeBaseUrl((credentials.baseUrl as string) || 'https://api.calypso.so/v1');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'calypsoApi', {
		url: `${baseUrl}/rag-agent/models`,
		method: 'GET',
		json: true,
		headers: {
			'User-Agent': `${packageInfo.name}/${packageInfo.version}`,
		},
	})) as RagAgentModelsResponse;

	return response.data ?? [];
}

async function fetchKnowledgeBuckets(this: ILoadOptionsFunctions): Promise<KnowledgeBucket[]> {
	const credentials = await this.getCredentials('calypsoApi');
	const baseUrl = normalizeBaseUrl((credentials.baseUrl as string) || 'https://api.calypso.so/v1');

	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'calypsoApi', {
		url: `${baseUrl}/knowledge/buckets`,
		method: 'GET',
		json: true,
		headers: {
			'User-Agent': `${packageInfo.name}/${packageInfo.version}`,
		},
	})) as KnowledgeBucketsResponse;

	return response.buckets ?? [];
}

function isNamedProfileDescriptor(descriptor: RagAgentModelDescriptor): boolean {
	const profileId = `${descriptor.profile_id ?? ''}`.trim();

	return descriptor.source === 'named_profile' && profileId.length > 0;
}

function formatBucketFileCount(count: number | undefined): string {
	const fileCount = Math.max(0, Number.isFinite(count) ? Number(count) : 0);

	return `${fileCount} ${fileCount === 1 ? 'file' : 'files'}`;
}

function getKnowledgeBucketFileCount(bucket: KnowledgeBucket): number {
	const candidates = [
		bucket.fileCount,
		bucket.filesCount,
		bucket.memberCount,
		bucket.counts?.files,
		bucket.counts?.file_count,
		bucket.bucketStore?.file_count,
		bucket.bucketStore?.member_count,
	];

	for (const candidate of candidates) {
		if (Number.isFinite(candidate)) {
			return Math.max(0, Number(candidate));
		}
	}

	return 0;
}

function parseTags(tags: string | undefined): string[] {
	const rawTags = `${tags ?? ''}`.trim();

	if (!rawTags) {
		return [];
	}

	try {
		const parsed = JSON.parse(rawTags);

		if (Array.isArray(parsed)) {
			return parsed.map((tag) => `${tag}`.trim()).filter((tag) => tag.length > 0);
		}
	} catch {
		// Fall back to comma-separated tags for n8n form input.
	}

	return rawTags
		.split(',')
		.map((tag) => tag.trim())
		.filter((tag) => tag.length > 0);
}

function parseMetadata(
	metadata: string | undefined,
	executeFunctions: IExecuteFunctions,
	itemIndex?: number,
): IDataObject | undefined {
	const rawMetadata = `${metadata ?? ''}`.trim();

	if (!rawMetadata) {
		return undefined;
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(rawMetadata);
	} catch (error) {
		throw new NodeOperationError(executeFunctions.getNode(), error as Error, {
			description: 'Metadata must be valid JSON.',
			itemIndex,
		});
	}

	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Metadata must be a JSON object', {
			itemIndex,
		});
	}

	return parsed as IDataObject;
}

function safeClientFileId(fileName: string, itemIndex: number, usedIds: Set<string>): string {
	const baseName = fileName
		.replace(/\.[^/.]+$/, '')
		.replace(/[^A-Za-z0-9_.-]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 80);
	const fallback = `item_${itemIndex + 1}`;
	let candidate = `${baseName || fallback}_${itemIndex + 1}`.slice(0, 120);

	if (candidate.startsWith('__')) {
		candidate = `file_${candidate.replace(/^_+/, '')}`;
	}

	let suffix = 2;
	const original = candidate;

	while (usedIds.has(candidate)) {
		candidate = `${original}_${suffix}`.slice(0, 128);
		suffix++;
	}

	usedIds.add(candidate);

	return candidate;
}

async function getBinaryFilePayload(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	binaryPropertyName: string,
): Promise<BinaryFilePayload> {
	const binaryData = executeFunctions.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await executeFunctions.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);

	return {
		buffer,
		fileName: binaryData.fileName || `item-${itemIndex + 1}`,
		mimeType: binaryData.mimeType || 'application/octet-stream',
	};
}

function buildFilePart(file: BinaryFilePayload): IDataObject {
	return {
		value: file.buffer,
		options: {
			filename: file.fileName,
			contentType: file.mimeType,
		},
	};
}

function buildUploadMetadata(
	additionalFields: UploadAdditionalFields,
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
): string | undefined {
	const metadata = parseMetadata(additionalFields.metadata, executeFunctions, itemIndex);

	return metadata ? JSON.stringify(metadata) : undefined;
}

async function executeUploadFile(
	executeFunctions: IExecuteFunctions,
	itemIndex: number,
	baseUrl: string,
): Promise<INodeExecutionData> {
	const bucketId = `${executeFunctions.getNodeParameter('bucketId', itemIndex)}`.trim();
	const binaryPropertyName = `${executeFunctions.getNodeParameter(
		'binaryPropertyName',
		itemIndex,
		'data',
	)}`.trim();
	const additionalFields = executeFunctions.getNodeParameter(
		'uploadAdditionalFields',
		itemIndex,
		{},
	) as UploadAdditionalFields;

	if (!bucketId) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Bucket is required', {
			itemIndex,
		});
	}

	if (!binaryPropertyName) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Binary Property Name is required', {
			itemIndex,
		});
	}

	const file = await getBinaryFilePayload(executeFunctions, itemIndex, binaryPropertyName);
	const tags = parseTags(additionalFields.tags);
	const formData: IDataObject = {
		file: buildFilePart(file),
		bucket_ids: bucketId,
	};
	const title = `${additionalFields.title ?? ''}`.trim();
	const metadata = buildUploadMetadata(additionalFields, executeFunctions, itemIndex);
	const idempotencyKey = `${additionalFields.idempotencyKey ?? ''}`.trim();

	if (title) {
		formData.title = title;
	}

	if (tags.length > 0) {
		formData.tags = JSON.stringify(tags);
	}

	if (metadata) {
		formData.metadata = metadata;
	}

	const requestOptions = {
		url: `${baseUrl}/knowledge/files`,
		method: 'POST',
		formData,
		json: true,
		headers: {
			'User-Agent': `${packageInfo.name}/${packageInfo.version}`,
			...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
		},
	} as IHttpRequestOptions;

	let response: IDataObject;
	try {
		response = (await executeFunctions.helpers.httpRequestWithAuthentication.call(
			executeFunctions,
			'calypsoApi',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(executeFunctions.getNode(), error as JsonObject, {
			itemIndex,
		});
	}

	return {
		json: {
			...response,
			metadata: {
				...((response.metadata as IDataObject | undefined) ?? {}),
				calypsoUpload: {
					operation: 'uploadFile',
					bucketId,
					binaryPropertyName,
					filename: file.fileName,
				},
			},
		},
		pairedItem: {
			item: itemIndex,
		},
	};
}

async function executeUploadBatch(
	executeFunctions: IExecuteFunctions,
	items: INodeExecutionData[],
	baseUrl: string,
): Promise<INodeExecutionData> {
	if (items.length === 0) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Upload Batch requires input items');
	}

	const bucketId = `${executeFunctions.getNodeParameter('bucketId', 0)}`.trim();
	const binaryPropertyName = `${executeFunctions.getNodeParameter(
		'binaryPropertyName',
		0,
		'data',
	)}`.trim();
	const additionalFields = executeFunctions.getNodeParameter(
		'uploadAdditionalFields',
		0,
		{},
	) as UploadAdditionalFields;
	const batchIdempotencyKey = `${additionalFields.batchIdempotencyKey ?? ''}`.trim();

	if (!bucketId) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Bucket is required');
	}

	if (!binaryPropertyName) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Binary Property Name is required');
	}

	if (!batchIdempotencyKey) {
		throw new NodeOperationError(executeFunctions.getNode(), 'Batch Idempotency Key is required');
	}

	const tags = parseTags(additionalFields.tags);
	const metadata = parseMetadata(additionalFields.metadata, executeFunctions);
	const formData: IDataObject = {};
	const usedClientFileIds = new Set<string>();
	const manifestItems: IDataObject[] = [];

	for (let i = 0; i < items.length; i++) {
		const file = await getBinaryFilePayload(executeFunctions, i, binaryPropertyName);
		const clientFileId = safeClientFileId(file.fileName, i, usedClientFileIds);
		const itemManifest: IDataObject = {
			client_file_id: clientFileId,
			filename: file.fileName,
			title: file.fileName,
		};

		if (tags.length > 0) {
			itemManifest.tags = tags;
		}

		if (metadata) {
			itemManifest.metadata = metadata;
		}

		manifestItems.push(itemManifest);
		formData[clientFileId] = buildFilePart(file);
	}

	formData.manifest = JSON.stringify({
		version: 1,
		batch_idempotency_key: batchIdempotencyKey,
		bucket_ids: [bucketId],
		items: manifestItems,
	});

	const dryRun = Boolean(additionalFields.dryRun);
	const requestOptions = {
		url: `${baseUrl}/knowledge/files:batch${dryRun ? '?dry_run=true' : ''}`,
		method: 'POST',
		formData,
		json: true,
		headers: {
			'User-Agent': `${packageInfo.name}/${packageInfo.version}`,
		},
	} as IHttpRequestOptions;

	let response: IDataObject;
	try {
		response = (await executeFunctions.helpers.httpRequestWithAuthentication.call(
			executeFunctions,
			'calypsoApi',
			requestOptions,
		)) as IDataObject;
	} catch (error) {
		throw new NodeApiError(executeFunctions.getNode(), error as JsonObject);
	}

	return {
		json: {
			...response,
			metadata: {
				...((response.metadata as IDataObject | undefined) ?? {}),
				calypsoUpload: {
					operation: 'uploadBatch',
					bucketId,
					binaryPropertyName,
					inputItems: items.length,
					dryRun,
				},
			},
		},
		pairedItem: items.map((_item, item) => ({ item })),
	};
}

function resolveSelectedProfileId(value: unknown): string {
	const selectedValue = `${value ?? ''}`.trim();

	if (!selectedValue) {
		return '';
	}

	return selectedValue.startsWith(MODEL_PREFIX) ? selectedValue : `${MODEL_PREFIX}${selectedValue}`;
}

function getModelIdOptionDescription(descriptor: RagAgentModelDescriptor): string {
	const profileId = `${descriptor.profile_id ?? ''}`.trim();
	const bucketNames =
		descriptor.buckets
			?.map((bucket) => bucket.name || bucket.slug || bucket.id || '')
			.map((bucketName) => bucketName.trim())
			.filter((bucketName) => bucketName.length > 0) ?? [];

	if (bucketNames.length > 0) {
		return `Named profile ${profileId}. Buckets: ${bucketNames.join(', ')}`;
	}

	return `Named profile ${profileId}`;
}

function getProfileBucketSummary(descriptor: RagAgentModelDescriptor): string {
	const buckets = descriptor.buckets ?? [];
	const bucketCount = buckets.length;
	const fileCount = buckets.reduce(
		(total, bucket) => total + Math.max(0, bucket.member_count ?? 0),
		0,
	);

	return `${bucketCount} ${bucketCount === 1 ? 'bucket' : 'buckets'}, ${formatBucketFileCount(fileCount)}`;
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
export class Calypso implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Calypso',
		name: 'calypso',
		icon: 'file:calypso.svg',
		group: ['input'],
		version: 1,
		documentationUrl: 'https://docs.calypso.so/integrations/n8n',
		subtitle:
			'={{$parameter["modelMode"] === "default" ? "calypso-rag-agent" : String($parameter["profileId"]).startsWith("calypso-rag-agent:") ? $parameter["profileId"] : "calypso-rag-agent:" + $parameter["profileId"]}}',
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
					{
						name: 'Upload Batch',
						value: 'uploadBatch',
						description: 'Upload multiple binary files to a Calypso knowledge bucket',
						action: 'Upload batch',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload one binary file to a Calypso knowledge bucket',
						action: 'Upload file',
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
						description: 'Choose from named profiles available to this API key',
					},
				],
				default: 'default',
				description: 'Choose the Calypso RAG model to call',
				displayOptions: {
					show: {
						operation: ['askAgent'],
					},
				},
			},
			{
				displayName: 'Named Profile Name or ID',
				name: 'profileId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getNamedProfiles',
				},
				displayOptions: {
					show: {
						operation: ['askAgent'],
						modelMode: ['namedProfile'],
					},
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				required: true,
			},
			{
				displayName: 'Agent Bucket Context',
				name: 'agentBucketContext',
				type: 'multiOptions',
				typeOptions: {
					loadOptionsMethod: 'getSelectedProfileBuckets',
					loadOptionsDependsOn: ['profileId'],
				},
				displayOptions: {
					show: {
						operation: ['askAgent'],
						modelMode: ['namedProfile'],
					},
				},
				default: [],
				description:
					'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'Informational only. Bucket context is ignored during execution.',
				noDataExpression: true,
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
				displayOptions: {
					show: {
						operation: ['askAgent'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['askAgent'],
					},
				},
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
			{
				displayName: 'Bucket Name or ID',
				name: 'bucketId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getKnowledgeBuckets',
				},
				displayOptions: {
					show: {
						operation: ['uploadFile', 'uploadBatch'],
					},
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				required: true,
			},
			{
				displayName: 'Binary Property Name',
				name: 'binaryPropertyName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['uploadFile', 'uploadBatch'],
					},
				},
				default: 'data',
				description: 'Name of the binary property containing the file to upload',
				required: true,
			},
			{
				displayName: 'Upload Options',
				name: 'uploadAdditionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['uploadFile', 'uploadBatch'],
					},
				},
				options: [
					{
						displayName: 'Batch Idempotency Key',
						name: 'batchIdempotencyKey',
						type: 'string',
						default: '={{"calypso-batch-" + $now.toMillis()}}',
						description: 'Stable key used by Calypso to make batch retries idempotent',
						displayOptions: {
							show: {
								'/operation': ['uploadBatch'],
							},
						},
					},
					{
						displayName: 'Dry Run',
						name: 'dryRun',
						type: 'boolean',
						default: false,
						description: 'Whether to validate the batch without writing files',
						displayOptions: {
							show: {
								'/operation': ['uploadBatch'],
							},
						},
					},
					{
						displayName: 'Idempotency Key',
						name: 'idempotencyKey',
						type: 'string',
						default: '',
						description: 'Stable key used by Calypso to make single-file retries idempotent',
						displayOptions: {
							show: {
								'/operation': ['uploadFile'],
							},
						},
					},
					{
						displayName: 'Metadata',
						name: 'metadata',
						type: 'json',
						default: '{}',
						description: 'Optional JSON object stored with the uploaded file or batch files',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'support,handbook',
						description: 'Comma-separated tags, or a JSON array of strings',
					},
					{
						displayName: 'Title',
						name: 'title',
						type: 'string',
						default: '',
						description: 'Optional title for a single-file upload',
						displayOptions: {
							show: {
								'/operation': ['uploadFile'],
							},
						},
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getKnowledgeBuckets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return (await fetchKnowledgeBuckets.call(this))
					.filter((bucket) => `${bucket.status || 'active'}`.trim().toLowerCase() === 'active')
					.map((bucket) => {
						const bucketId = `${bucket.id || ''}`.trim();
						const bucketName = `${bucket.name || bucket.slug || bucketId}`.trim();
						const bucketSlug = `${bucket.slug || ''}`.trim();
						const bucketStatus = `${bucket.status || 'active'}`.trim();

						return {
							name: `${bucketName} (${formatBucketFileCount(getKnowledgeBucketFileCount(bucket))})`,
							value: bucketId,
							description: [
								bucketSlug ? `Slug: ${bucketSlug}` : undefined,
								`Status: ${bucketStatus}`,
								`ID: ${bucketId}`,
							]
								.filter(Boolean)
								.join(' | '),
						};
					});
			},
			async getNamedProfiles(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return (await fetchRagAgentModels.call(this))
					.filter(isNamedProfileDescriptor)
					.map((descriptor) => {
						const profileId = `${descriptor.profile_id ?? ''}`.trim();
						const modelId = `${descriptor.id || `${MODEL_PREFIX}${profileId}`}`.trim();

						return {
							name: modelId,
							value: modelId,
							description: `${getModelIdOptionDescription(descriptor)}. ${getProfileBucketSummary(
								descriptor,
							)}.`,
						};
					});
			},
			async getSelectedProfileBuckets(
				this: ILoadOptionsFunctions,
			): Promise<INodePropertyOptions[]> {
				const selectedModelId = resolveSelectedProfileId(this.getCurrentNodeParameter('profileId'));

				if (!selectedModelId) {
					return [
						{
							name: 'Select a Named Profile First',
							value: '__select_profile_first__',
						},
					];
				}

				const selectedDescriptor = (await fetchRagAgentModels.call(this))
					.filter(isNamedProfileDescriptor)
					.find((descriptor) => {
						const profileId = `${descriptor.profile_id ?? ''}`.trim();
						const descriptorModelId = `${descriptor.id || `${MODEL_PREFIX}${profileId}`}`.trim();

						return descriptorModelId === selectedModelId || profileId === selectedModelId;
					});

				if (!selectedDescriptor || (selectedDescriptor.buckets ?? []).length === 0) {
					return [
						{
							name: 'No Buckets Connected',
							value: '__no_buckets_connected__',
							description: `No active buckets are connected to ${selectedModelId}`,
						},
					];
				}

				return (selectedDescriptor.buckets ?? []).map((bucket) => {
					const bucketName =
						`${bucket.name || bucket.slug || bucket.id || 'Unnamed bucket'}`.trim();
					const bucketId = `${bucket.id || bucketName}`.trim();
					const status = `${bucket.status || 'active'}`.trim();
					const slug = `${bucket.slug || ''}`.trim();
					const descriptionParts = [`Status: ${status}`];

					if (slug) {
						descriptionParts.push(`Slug: ${slug}`);
					}

					descriptionParts.push(`ID: ${bucketId}`);

					return {
						name: `${bucketName} - ${formatBucketFileCount(bucket.member_count)}`,
						value: bucketId,
						description: descriptionParts.join(' | '),
					};
				});
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const credentials = await this.getCredentials('calypsoApi');
		const baseUrl = normalizeBaseUrl(
			(credentials.baseUrl as string) || 'https://api.calypso.so/v1',
		);
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as Operation;

		if (operation === 'uploadBatch') {
			try {
				return this.prepareOutputData([await executeUploadBatch(this, items, baseUrl)]);
			} catch (error) {
				if (error instanceof NodeApiError || error instanceof NodeOperationError) {
					throw error;
				}

				throw new NodeOperationError(this.getNode(), error as Error);
			}
		}

		for (let i = 0; i < items.length; i++) {
			let input = '';
			let model = '';

			try {
				const itemOperation = this.getNodeParameter('operation', i) as Operation;

				if (itemOperation === 'uploadFile') {
					returnData.push(await executeUploadFile(this, i, baseUrl));
					continue;
				}

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
