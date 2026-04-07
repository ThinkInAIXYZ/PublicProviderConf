import { createHash, createHmac } from 'crypto';
import { fetch, ProxyAgent, type Dispatcher } from 'undici';
import { Provider } from './Provider';
import { cloneExtraCapabilities, cloneLegacyInterleaved } from '../models/extra-capabilities';
import { createModelInfo, ModelInfo, ModelModalities, ModelType } from '../models/model-info';

export const DEFAULT_VOLCENGINE_ARK_CONTROL_API_URL = 'https://ark.cn-beijing.volcengineapi.com/';
export const VOLCENGINE_ARK_CONTROL_DOC_URL =
  'https://www.volcengine.com/docs/82379/1262849?lang=zh';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_PAGE_SIZE = 100;

type MaybeString = string | null | undefined;

export interface VolcengineArkCredentials {
  accessKeyId: string;
  secretKey: string;
  sessionToken?: string;
}

interface OpenApiError {
  Code?: string;
  Message: string;
}

interface OpenApiResponseMetadata {
  Error?: OpenApiError;
}

interface OpenApiResponse<T> {
  ResponseMetadata?: OpenApiResponseMetadata;
  Result?: T;
}

interface SignedRequest {
  region: string;
  method: string;
  pathname?: string;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: string;
}

interface FoundationModelSummary {
  Name?: string;
  DisplayName?: string;
  Description?: string;
  Introduction?: string;
  VendorName?: string;
  PrimaryVersion?: string;
  AccessType?: string;
  CreateTime?: string;
  UpdateTime?: string;
}

interface ListFoundationModelsResult {
  TotalCount?: number;
  PageNumber?: number;
  PageSize?: number;
  Items?: FoundationModelSummary[];
}

interface FoundationModelVersionConfiguration {
  AppSettings?: {
    MaxInputTokenLength?: number | string | null;
    SystemPrompt?: {
      MaxInputTokenLength?: number | string | null;
    } | null;
  } | null;
}

interface FoundationModelVersionDetail {
  FoundationModelName?: string;
  ModelVersion?: string;
  Description?: string;
  ActiveConfigurationId?: string;
  Configuration?: FoundationModelVersionConfiguration | null;
  Status?: string;
  PublishTime?: string;
  CreateTime?: string;
  UpdateTime?: string;
}

interface ListFoundationModelVersionsResult {
  TotalCount?: number;
  PageNumber?: number;
  PageSize?: number;
  Items?: FoundationModelVersionDetail[];
}

const SIGNING_ALGORITHM = 'HMAC-SHA256';
const SIGNING_SERVICE = 'ark';
const SIGNING_TERMINATOR = 'request';
const UNSIGNABLE_HEADERS = new Set([
  'authorization',
  'content-type',
  'content-length',
  'user-agent',
  'presigned-expires',
  'expect',
]);

function uriEscape(value: string): string {
  return encodeURIComponent(value)
    .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
    .replace(/\*/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function queryParamsToString(params: Record<string, unknown>): string {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== null)
    .sort()
    .map(key => {
      const value = params[key];
      const escapedKey = uriEscape(key);

      if (Array.isArray(value)) {
        return `${escapedKey}=${value.map(entry => uriEscape(String(entry))).sort().join(`&${escapedKey}=`)}`;
      }

      return `${escapedKey}=${uriEscape(String(value))}`;
    })
    .join('&');
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function hmacSha256(key: Buffer | string, value: string): Buffer {
  return createHmac('sha256', key).update(value).digest();
}

function normalizeHeaderValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function canonicalHeaders(headers: Record<string, string>): string {
  return Object.entries(headers)
    .filter(([key]) => !UNSIGNABLE_HEADERS.has(key.toLowerCase()))
    .sort(([left], [right]) => left.toLowerCase().localeCompare(right.toLowerCase()))
    .map(([key, value]) => `${key.toLowerCase()}:${normalizeHeaderValue(value)}`)
    .join('\n');
}

function signedHeaders(headers: Record<string, string>): string {
  return Object.keys(headers)
    .map(key => key.toLowerCase())
    .filter(key => !UNSIGNABLE_HEADERS.has(key))
    .sort()
    .join(';');
}

function iso8601(date: Date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function getDateTime(date: Date = new Date()): string {
  return iso8601(date).replace(/[:\-]|\.\d{3}/g, '');
}

function buildAuthorizationHeader(
  request: SignedRequest,
  credentials: VolcengineArkCredentials,
  datetime: string,
): string {
  const date = datetime.slice(0, 8);
  const params = request.params ?? {};
  const headers = request.headers ?? {};
  const canonicalRequest = [
    request.method.toUpperCase(),
    request.pathname || '/',
    queryParamsToString(params),
    `${canonicalHeaders(headers)}\n`,
    signedHeaders(headers),
    headers['X-Content-Sha256'] ?? sha256Hex(request.body ?? ''),
  ].join('\n');

  const credentialScope = `${date}/${request.region}/${SIGNING_SERVICE}/${SIGNING_TERMINATOR}`;
  const stringToSign = [
    SIGNING_ALGORITHM,
    datetime,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(credentials.secretKey, date);
  const kRegion = hmacSha256(kDate, request.region);
  const kService = hmacSha256(kRegion, SIGNING_SERVICE);
  const kSigning = hmacSha256(kService, SIGNING_TERMINATOR);
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  return `${SIGNING_ALGORITHM} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders(headers)}, Signature=${signature}`;
}

function createProxyDispatcher(): Dispatcher | undefined {
  const proxyUrl =
    process.env.HTTPS_PROXY ??
    process.env.https_proxy ??
    process.env.HTTP_PROXY ??
    process.env.http_proxy;

  if (!proxyUrl) {
    return undefined;
  }

  try {
    return new ProxyAgent(proxyUrl);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('Warning: Failed to configure proxy for Volcengine Ark provider:', reason);
    return undefined;
  }
}

function cleanString(value: MaybeString): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toPositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const normalized = value.trim().replace(/,/g, '');
    if (!normalized) {
      return undefined;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  return undefined;
}

function normalizeDate(value: MaybeString): string | undefined {
  const trimmed = cleanString(value);
  if (!trimmed) {
    return undefined;
  }

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp).toISOString().slice(0, 10);
}

function normalizeModelId(value: MaybeString): string | null {
  const trimmed = cleanString(value);
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function inferVisionCapability(id: string): boolean {
  const normalized = id.toLowerCase();
  return normalized.includes('vision') || normalized.includes('vl');
}

function inferReasoningCapability(id: string): boolean {
  const normalized = id.toLowerCase();
  return (
    normalized.includes('thinking') ||
    normalized.includes('reasoning') ||
    normalized.includes('2.0-lite') ||
    normalized.includes('2.0-mini') ||
    normalized.includes('2.0-pro') ||
    normalized.includes('1.8')
  );
}

function inferModalities(id: string, fallback?: ModelInfo): ModelModalities | undefined {
  if (fallback?.modalities) {
    return {
      ...fallback.modalities,
      input: fallback.modalities.input ? [...fallback.modalities.input] : undefined,
      output: fallback.modalities.output ? [...fallback.modalities.output] : undefined,
    };
  }

  if (inferVisionCapability(id)) {
    return {
      input: ['text', 'image'],
      output: ['text'],
    };
  }

  return {
    input: ['text'],
    output: ['text'],
  };
}

function cloneReasoning(reasoning: ModelInfo['reasoning']): ModelInfo['reasoning'] {
  if (typeof reasoning === 'boolean') {
    return reasoning;
  }

  return reasoning ? { ...reasoning } : false;
}

function cloneModel(model: ModelInfo): ModelInfo {
  return {
    ...model,
    reasoning: cloneReasoning(model.reasoning),
    modalities: model.modalities
      ? {
          ...model.modalities,
          input: model.modalities.input ? [...model.modalities.input] : undefined,
          output: model.modalities.output ? [...model.modalities.output] : undefined,
        }
      : undefined,
    cost: model.cost ? { ...model.cost } : undefined,
    limit: model.limit ? { ...model.limit } : undefined,
    metadata: model.metadata ? { ...model.metadata } : undefined,
    interleaved: cloneLegacyInterleaved(model.interleaved),
    extraCapabilities: cloneExtraCapabilities(model.extraCapabilities),
  };
}

function isDoubaoFoundationModel(model: FoundationModelSummary): boolean {
  const name = cleanString(model.Name)?.toLowerCase();
  const displayName = cleanString(model.DisplayName)?.toLowerCase();

  return Boolean(
    name?.startsWith('doubao') ||
      displayName?.includes('doubao'),
  );
}

function resolveOfficialContextLength(version?: FoundationModelVersionDetail): number | undefined {
  return (
    toPositiveInteger(version?.Configuration?.AppSettings?.MaxInputTokenLength) ??
    toPositiveInteger(version?.Configuration?.AppSettings?.SystemPrompt?.MaxInputTokenLength)
  );
}

function resolveTokenCounts(
  contextLength?: number,
  maxTokens?: number,
): { contextLength: number; maxTokens: number } {
  let context = contextLength ?? 0;
  let max = maxTokens ?? 0;

  if (context <= 0 && max > 0) {
    context = max;
  }
  if (max <= 0 && context > 0) {
    max = context;
  }
  if (context <= 0) {
    context = 8192;
  }
  if (max <= 0) {
    max = context;
  }
  if (max > context) {
    max = context;
  }

  return {
    contextLength: context,
    maxTokens: max,
  };
}

export function resolveVolcengineArkCredentials(): VolcengineArkCredentials | null {
  const accessKeyId =
    cleanString(process.env.VOLCENGINE_ACCESS_KEY_ID) ??
    cleanString(process.env.VOLC_ACCESSKEY);
  const secretKey =
    cleanString(process.env.VOLCENGINE_SECRET_ACCESS_KEY) ??
    cleanString(process.env.VOLC_SECRETKEY);
  const sessionToken =
    cleanString(process.env.VOLCENGINE_SESSION_TOKEN) ??
    cleanString(process.env.VOLC_SESSION_TOKEN);

  if (!accessKeyId || !secretKey) {
    return null;
  }

  return {
    accessKeyId,
    secretKey,
    sessionToken,
  };
}

export class VolcengineArkDoubaoProvider implements Provider {
  private readonly dispatcher?: Dispatcher;
  private readonly fallbackModels = new Map<string, ModelInfo>();
  private readonly region: string;

  constructor(
    private readonly apiUrl: string = DEFAULT_VOLCENGINE_ARK_CONTROL_API_URL,
    private readonly credentials: VolcengineArkCredentials,
    fallbackModels: ModelInfo[] = [],
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.dispatcher = createProxyDispatcher();
    this.region =
      cleanString(process.env.VOLCENGINE_ARK_REGION) ??
      cleanString(process.env.VOLCENGINE_REGION) ??
      'cn-beijing';

    for (const model of fallbackModels) {
      this.fallbackModels.set(model.id, cloneModel(model));
    }
  }

  providerId(): string {
    return 'doubao';
  }

  providerName(): string {
    return 'Doubao';
  }

  private async invokeControlPlane<T>(
    action: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(this.apiUrl);
    const pathname = url.pathname && url.pathname !== '' ? url.pathname : '/';
    const params: Record<string, unknown> = {
      Action: action,
      Version: '2024-01-01',
    };
    const rawBody = JSON.stringify(body);
    const headers: Record<string, string> = {
      Host: url.host,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Date': getDateTime(),
      'X-Content-Sha256': sha256Hex(rawBody),
    };

    if (this.credentials.sessionToken) {
      headers['X-Security-Token'] = this.credentials.sessionToken;
    }

    const request: SignedRequest = {
      region: this.region,
      method: 'POST',
      pathname,
      params,
      headers,
      body: rawBody,
    };
    headers.Authorization = buildAuthorizationHeader(
      request,
      this.credentials,
      headers['X-Date'],
    );

    const response = await fetch(`${url.origin}${pathname}?Action=${action}&Version=2024-01-01`, {
      method: 'POST',
      headers,
      body: rawBody,
      dispatcher: this.dispatcher,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`${action} failed with status ${response.status}: ${raw.slice(0, 500)}`);
    }

    let parsed: OpenApiResponse<T>;
    try {
      parsed = JSON.parse(raw) as OpenApiResponse<T>;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${action} returned invalid JSON: ${reason}`);
    }

    const apiError = parsed.ResponseMetadata?.Error;
    if (apiError) {
      const code = apiError.Code ?? 'UnknownCode';
      throw new Error(`${action} failed: ${code} ${apiError.Message}`);
    }

    if (!parsed.Result) {
      throw new Error(`${action} returned no Result payload`);
    }

    return parsed.Result;
  }

  private async listFoundationModels(): Promise<FoundationModelSummary[]> {
    const allItems: FoundationModelSummary[] = [];
    let pageNumber = 1;

    while (true) {
      const result = await this.invokeControlPlane<ListFoundationModelsResult>(
        'ListFoundationModels',
        {
          PageNumber: pageNumber,
          PageSize: DEFAULT_PAGE_SIZE,
          Filter: {
            AccessTypes: ['Public'],
          },
          SortOrder: 'Asc',
          SortBy: 'UpdateTime',
        },
      );

      const items = Array.isArray(result.Items) ? result.Items : [];
      allItems.push(...items);

      const totalCount = toPositiveInteger(result.TotalCount) ?? allItems.length;
      if (items.length === 0 || allItems.length >= totalCount || items.length < DEFAULT_PAGE_SIZE) {
        break;
      }

      pageNumber += 1;
    }

    return allItems;
  }

  private async getFoundationModelVersion(
    foundationModelName: string,
    modelVersion: string,
  ): Promise<FoundationModelVersionDetail> {
    return this.invokeControlPlane<FoundationModelVersionDetail>('GetFoundationModelVersion', {
      FoundationModelName: foundationModelName,
      ModelVersion: modelVersion,
    });
  }

  private async getLatestFoundationModelVersion(
    foundationModelName: string,
  ): Promise<FoundationModelVersionDetail | undefined> {
    const result = await this.invokeControlPlane<ListFoundationModelVersionsResult>(
      'ListFoundationModelVersions',
      {
        FoundationModelName: foundationModelName,
        PageNumber: 1,
        PageSize: 1,
        Filter: {
          Statuses: ['Published'],
        },
        SortOrder: 'Desc',
        SortBy: 'UpdateTime',
      },
    );

    return result.Items?.[0];
  }

  private async resolveVersionDetails(
    model: FoundationModelSummary,
  ): Promise<FoundationModelVersionDetail | undefined> {
    const foundationModelName = normalizeModelId(model.Name);
    if (!foundationModelName) {
      return undefined;
    }

    const primaryVersion = cleanString(model.PrimaryVersion);
    try {
      if (primaryVersion) {
        return await this.getFoundationModelVersion(foundationModelName, primaryVersion);
      }

      return await this.getLatestFoundationModelVersion(foundationModelName);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️  Failed to fetch Volcengine version details for ${foundationModelName}: ${reason}`,
      );
      return undefined;
    }
  }

  private buildModel(
    officialModel: FoundationModelSummary,
    version?: FoundationModelVersionDetail,
  ): ModelInfo | null {
    const id = normalizeModelId(officialModel.Name);
    if (!id) {
      return null;
    }

    const fallback = this.fallbackModels.get(id);
    const officialContextLength = resolveOfficialContextLength(version);
    const { contextLength, maxTokens } = resolveTokenCounts(
      fallback?.contextLength ?? officialContextLength,
      fallback?.maxTokens,
    );
    const vision = fallback?.vision ?? inferVisionCapability(id);
    const functionCall = fallback?.functionCall ?? true;
    const reasoning = fallback?.reasoning ?? inferReasoningCapability(id);
    const type = fallback?.type ?? ModelType.Chat;
    const displayName =
      fallback?.name ??
      cleanString(officialModel.DisplayName) ??
      cleanString(officialModel.Name) ??
      id;
    const releaseDate =
      normalizeDate(version?.PublishTime) ??
      normalizeDate(version?.CreateTime) ??
      normalizeDate(officialModel.CreateTime) ??
      fallback?.releaseDate;
    const lastUpdated =
      normalizeDate(version?.UpdateTime) ??
      normalizeDate(officialModel.UpdateTime) ??
      fallback?.lastUpdated;
    const officialDescription =
      cleanString(version?.Description) ?? cleanString(officialModel.Description);
    const officialIntroduction = cleanString(officialModel.Introduction);

    const metadata: Record<string, unknown> = {
      ...(fallback?.metadata ? { ...fallback.metadata } : {}),
      sourcePriority: 'official-volcengine-ark',
      officialSource: 'volcengine-ark-control-plane',
      officialVendorName: cleanString(officialModel.VendorName),
      officialAccessType: cleanString(officialModel.AccessType),
      officialPrimaryVersion: cleanString(officialModel.PrimaryVersion),
      officialDescription,
      officialIntroduction,
      officialStatus: cleanString(version?.Status),
      officialActiveConfigurationId: cleanString(version?.ActiveConfigurationId),
    };

    if (officialContextLength) {
      metadata.officialMaxInputTokenLength = officialContextLength;
    }

    if (fallback) {
      const cloned = cloneModel(fallback);
      return {
        ...cloned,
        id,
        name: displayName,
        contextLength,
        maxTokens,
        vision,
        functionCall,
        reasoning: cloneReasoning(reasoning),
        type,
        releaseDate,
        lastUpdated,
        metadata,
      };
    }

    const modalities = inferModalities(id);
    const toolCall = functionCall;
    const limit = officialContextLength
      ? {
          context: officialContextLength,
          output: maxTokens,
        }
      : undefined;

    return createModelInfo(
      id,
      displayName,
      contextLength,
      maxTokens,
      vision,
      functionCall,
      reasoning,
      type,
      {
        attachment: vision,
        temperature: true,
        toolCall,
        modalities,
        limit,
        openWeights: false,
        releaseDate,
        lastUpdated,
        metadata,
      },
    );
  }

  async fetchModels(): Promise<ModelInfo[]> {
    console.log('🔄 Fetching Doubao models from Volcengine Ark control-plane API...');

    const officialModels = await this.listFoundationModels();
    const doubaoModels = officialModels.filter(isDoubaoFoundationModel);

    console.log(`📋 Found ${doubaoModels.length} Doubao foundation models from Volcengine Ark`);

    const versionEntries = await Promise.all(
      doubaoModels.map(async model => {
        const id = normalizeModelId(model.Name);
        if (!id) {
          return null;
        }
        const detail = await this.resolveVersionDetails(model);
        return [id, detail] as const;
      }),
    );

    const versionDetails = new Map<string, FoundationModelVersionDetail | undefined>();
    for (const entry of versionEntries) {
      if (!entry) {
        continue;
      }
      versionDetails.set(entry[0], entry[1]);
    }

    const deduped = new Map<string, ModelInfo>();
    for (const officialModel of doubaoModels) {
      const id = normalizeModelId(officialModel.Name);
      if (!id || deduped.has(id)) {
        continue;
      }

      const mapped = this.buildModel(officialModel, versionDetails.get(id));
      if (mapped) {
        deduped.set(id, mapped);
      }
    }

    const models = Array.from(deduped.values()).sort((left, right) => left.id.localeCompare(right.id));
    console.log(`✅ Successfully processed ${models.length} Doubao models from Volcengine Ark`);

    return models;
  }
}
