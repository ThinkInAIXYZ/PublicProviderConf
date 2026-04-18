import { join } from 'path';
import { fetch } from 'undici';
import {
  type ModelsDevApiResponse,
  type ModelsDevLimit,
  type ModelsDevModel,
  type ModelsDevProvider,
  providersToRecord,
} from '../models/models-dev';
import { JsonWriter } from '../output/json-writer';
import { normalizeProviderId } from './models-dev-shared';

const VOLCENGINE_DOC_URL = 'https://www.volcengine.com/docs/82379/1330310?lang=zh';
const VOLCENGINE_DOC_DETAIL_URL =
  'https://www.volcengine.com/api/doc/getDocDetail?LibraryID=82379&DocumentID=1330310&lang=zh';
const DOUBAO_PROVIDER_ID = 'doubao';

const SECTION_TYPE_MAP: Record<string, string> = {
  '深度思考能力': 'chat',
  '文本生成能力': 'chat',
  '视觉理解能力': 'chat',
  'GUI 任务处理能力': 'chat',
  '工具调用能力': 'chat',
  '上下文缓存能力': 'chat',
  '结构化输出能力(beta)': 'chat',
  '图片生成能力': 'image-generation',
  '向量化能力': 'embedding',
  '视频生成能力': 'video',
};

const TYPE_PRIORITY: Record<string, number> = {
  embedding: 5,
  'image-generation': 4,
  video: 4,
  rerank: 4,
  audio: 4,
  chat: 1,
};

export interface VolcengineDocDetail {
  UpdatedTime?: string;
  MDContent?: string;
}

interface VolcengineDocDetailResponse {
  Result?: VolcengineDocDetail;
}

interface LoggerLike {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}

interface ParsedTableRow {
  raw: string[];
  cells: string[];
}

interface ModelRef {
  modelId: string;
  canonicalId?: string;
  detailUrl?: string;
}

interface MutableModelState {
  id: string;
  name: string;
  displayName: string;
  type?: string;
  vision: boolean;
  toolCall: boolean;
  reasoningSupported: boolean;
  structuredOutput: boolean;
  attachment: boolean;
  lastUpdated?: string;
  detailUrl?: string;
  canonicalId?: string;
  limit: ModelsDevLimit;
  modalitiesInput: Set<string>;
  modalitiesOutput: Set<string>;
  sections: Set<string>;
  capabilities: Set<string>;
  rawLimits: Set<string>;
  features: Set<string>;
  metadata: Record<string, unknown>;
}

export interface SyncVolcengineOutputOptions {
  outputDir: string;
  loadDocDetail?: () => Promise<VolcengineDocDetail>;
  logger?: LoggerLike;
}

export interface SyncVolcengineOutputResult {
  success: boolean;
  providerWritten: boolean;
  aggregatedWritten: boolean;
  provider?: ModelsDevProvider;
  reason?: string;
}

function normalizeSectionTitle(title: string): string {
  return stripMarkdown(title).replace(/\s+/g, ' ').trim();
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\\-/g, '-')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/[`*_~]/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function removeUndefinedValues<T extends Record<string, unknown>>(value: T): T {
  const result = { ...value };
  for (const [key, current] of Object.entries(result)) {
    if (current === undefined) {
      delete result[key];
    }
  }
  return result;
}

function stripVersionSuffix(modelId: string): string {
  return modelId.replace(/-\d{6,8}$/u, '');
}

function sanitizeModelId(rawId: string): string {
  return stripMarkdown(rawId).trim();
}

function parseQueryParam(url: string, target: string): string | undefined {
  try {
    const parsed = new URL(url);
    const value = parsed.searchParams.get(target);
    return value ? value.trim() : undefined;
  } catch {
    const match = new RegExp(`[?&]${target}=([^&#)]+)`, 'i').exec(url);
    return match?.[1] ? decodeURIComponent(match[1]).trim() : undefined;
  }
}

function isDividerLine(line: string): boolean {
  const body = line.trim().replace(/\\$/u, '').replace(/^\|/u, '').replace(/\|$/u, '');
  if (!body) {
    return false;
  }
  const cells = body.split('|').map(cell => cell.trim());
  return cells.length > 0 && cells.every(cell => cell.length > 0 && /^:?-+:?$/u.test(cell));
}

function parseMarkdownRow(line: string): string[] {
  const body = line.trim().replace(/\\$/u, '').replace(/^\|/u, '').replace(/\|$/u, '');
  return body.split('|').map(cell => cell.trim());
}

function parseTableRows(lines: string[]): ParsedTableRow[] {
  const dividerIndex = lines.findIndex(isDividerLine);
  if (dividerIndex < 0) {
    return [];
  }

  const rows: ParsedTableRow[] = [];
  const previousCells: string[] = [];

  for (const line of lines.slice(dividerIndex + 1)) {
    const raw = parseMarkdownRow(line);
    const cells = raw.map((cell, index) => {
      const normalized = stripMarkdown(cell);
      if (normalized === '^^') {
        return previousCells[index] ?? '';
      }
      return normalized;
    });

    for (let index = 0; index < cells.length; index += 1) {
      if (cells[index]) {
        previousCells[index] = cells[index];
      }
    }

    rows.push({ raw, cells });
  }

  return rows;
}

function collectTableBlocks(mdContent: string): Array<{ section: string; lines: string[] }> {
  const lines = mdContent.replace(/\r/g, '').split('\n');
  const blocks: Array<{ section: string; lines: string[] }> = [];
  let currentSection: string | undefined;
  let currentLines: string[] = [];

  const flush = (): void => {
    if (!currentSection || currentLines.length === 0) {
      currentLines = [];
      return;
    }
    blocks.push({ section: currentSection, lines: [...currentLines] });
    currentLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const headingMatch = /^#\s+(.+)$/u.exec(line);
    if (headingMatch) {
      flush();
      const section = normalizeSectionTitle(headingMatch[1]);
      currentSection = SECTION_TYPE_MAP[section] ? section : undefined;
      continue;
    }

    if (line.trimStart().startsWith('|')) {
      currentLines.push(line);
      continue;
    }

    if (currentLines.length > 0) {
      flush();
    }
  }

  flush();
  return blocks;
}

function extractLinkedModelRefs(rawCell: string): ModelRef[] {
  const refs: ModelRef[] = [];
  const matches = rawCell.matchAll(/\[([^\]]+)\]\(([^)]+)\)/gu);

  for (const match of matches) {
    const modelId = sanitizeModelId(match[1]);
    if (!modelId) {
      continue;
    }

    const detailUrl = match[2]?.trim();
    const canonicalId = detailUrl ? parseQueryParam(detailUrl, 'Id') : undefined;
    refs.push({
      modelId,
      canonicalId: canonicalId || stripVersionSuffix(modelId),
      detailUrl,
    });
  }

  return refs;
}

function extractPlainModelIds(cell: string): string[] {
  const normalized = stripMarkdown(cell);
  const matches = normalized.match(/\b[a-z0-9]+(?:[-.][a-z0-9]+){2,}\b/giu) ?? [];
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const modelId = match.trim();
    if (!/[a-z]/iu.test(modelId) || seen.has(modelId)) {
      continue;
    }
    seen.add(modelId);
    ids.push(modelId);
  }

  return ids;
}

function setModelType(model: MutableModelState, nextType: string): void {
  if (!nextType) {
    return;
  }
  if (!model.type) {
    model.type = nextType;
    return;
  }
  const existingPriority = TYPE_PRIORITY[model.type] ?? 0;
  const nextPriority = TYPE_PRIORITY[nextType] ?? 0;
  if (nextPriority > existingPriority) {
    model.type = nextType;
  }
}

function addInputModality(model: MutableModelState, value: string): void {
  model.modalitiesInput.add(value);
  if (value !== 'text') {
    model.attachment = true;
  }
  if (value === 'image' || value === 'video') {
    model.vision = true;
  }
}

function addOutputModality(model: MutableModelState, value: string): void {
  model.modalitiesOutput.add(value);
}

function addCapability(model: MutableModelState, value: string): void {
  const normalized = stripMarkdown(value);
  if (normalized) {
    model.capabilities.add(normalized);
  }
}

function addRawLimit(model: MutableModelState, value: string): void {
  const normalized = stripMarkdown(value);
  if (normalized) {
    model.rawLimits.add(normalized);
  }
}

function parseCompactNumber(rawValue: string): number | undefined {
  const normalized = rawValue.trim().toLowerCase().replace(/,/gu, '');
  const match = /^(\d+(?:\.\d+)?)(k|m|g|亿)?$/u.exec(normalized);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return undefined;
  }

  switch (match[2]) {
    case 'k':
      return Math.round(value * 1_000);
    case 'm':
      return Math.round(value * 1_000_000);
    case 'g':
      return Math.round(value * 1_000_000_000);
    case '亿':
      return Math.round(value * 100_000_000);
    default:
      return Math.round(value);
  }
}

function extractLabeledNumber(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match?.[1]) {
      continue;
    }
    const parsed = parseCompactNumber(match[1]);
    if (parsed !== undefined) {
      return parsed;
    }
  }
  return undefined;
}

function applyLimitHints(
  model: MutableModelState,
  rowText: string,
  section: string,
  cells: string[],
): void {
  const context = extractLabeledNumber(rowText, [
    /上下文窗口:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
    /最大输入:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
  ]);
  if (context !== undefined) {
    model.limit.context = Math.max(model.limit.context ?? 0, context);
  }

  const output = extractLabeledNumber(rowText, [
    /最大回答(?:\(默认\s*[0-9.]+(?:k|m|g|亿)?\))?:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
    /最大输出:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
  ]);
  if (output !== undefined) {
    model.limit.output = Math.max(model.limit.output ?? 0, output);
  }

  const maxThinking = extractLabeledNumber(rowText, [
    /最大思维链:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
  ]);
  if (maxThinking !== undefined) {
    model.metadata.max_thinking_tokens = Math.max(
      Number(model.metadata.max_thinking_tokens ?? 0),
      maxThinking,
    );
  }

  const maxInput = extractLabeledNumber(rowText, [
    /最大输入:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
  ]);
  if (maxInput !== undefined) {
    model.metadata.max_input_tokens = Math.max(Number(model.metadata.max_input_tokens ?? 0), maxInput);
  }

  const rpm = extractLabeledNumber(rowText, [/最大 RPM:\s*([0-9.]+(?:k|m|g|亿)?)/iu]);
  if (rpm !== undefined) {
    model.limit.requests_per_minute = Math.max(model.limit.requests_per_minute ?? 0, rpm);
  }

  const ipm = parseCompactNumber(cells[cells.length - 1] ?? '');
  if (
    section === '图片生成能力' &&
    model.limit.requests_per_minute === undefined &&
    ipm !== undefined &&
    !rowText.includes('最大 RPM')
  ) {
    model.limit.requests_per_minute = ipm;
  }

  const rpd = extractLabeledNumber(rowText, [/最大 TPD:\s*([0-9.]+(?:k|m|g|亿)?)/iu]);
  if (rpd !== undefined) {
    model.limit.requests_per_day = Math.max(model.limit.requests_per_day ?? 0, rpd);
  }

  const vectorDimension = extractLabeledNumber(rowText, [
    /最高向量维度:\s*([0-9.]+(?:k|m|g|亿)?)/iu,
  ]);
  if (vectorDimension !== undefined) {
    model.metadata.vector_dimension = Math.max(
      Number(model.metadata.vector_dimension ?? 0),
      vectorDimension,
    );
  }

  if (section === '向量化能力') {
    const contextFromColumn = parseCompactNumber(cells[2] ?? '');
    if (contextFromColumn !== undefined) {
      model.limit.context = Math.max(model.limit.context ?? 0, contextFromColumn);
    }

    const vectorFromColumn = parseCompactNumber(cells[3] ?? '');
    if (vectorFromColumn !== undefined) {
      model.metadata.vector_dimension = Math.max(
        Number(model.metadata.vector_dimension ?? 0),
        vectorFromColumn,
      );
    }
  }

  for (const value of rowText.split('|')) {
    if (/上下文窗口|最大输入|最大回答|最大输出|最大思维链|最大 RPM|最大 TPM|最大 TPD|最大 IPM|最高向量维度/u.test(value)) {
      addRawLimit(model, value);
    }
  }
}

function applySectionDefaults(model: MutableModelState, section: string): void {
  const mappedType = SECTION_TYPE_MAP[section];
  if (mappedType) {
    setModelType(model, mappedType);
  }

  switch (section) {
    case '深度思考能力':
      model.reasoningSupported = true;
      addInputModality(model, 'text');
      addOutputModality(model, 'text');
      break;
    case '文本生成能力':
      addInputModality(model, 'text');
      addOutputModality(model, 'text');
      break;
    case '视觉理解能力':
      model.vision = true;
      addInputModality(model, 'text');
      addInputModality(model, 'image');
      addOutputModality(model, 'text');
      break;
    case 'GUI 任务处理能力':
      model.vision = true;
      addInputModality(model, 'text');
      addInputModality(model, 'image');
      addOutputModality(model, 'text');
      break;
    case '工具调用能力':
      model.toolCall = true;
      addInputModality(model, 'text');
      addOutputModality(model, 'text');
      break;
    case '上下文缓存能力':
      model.features.add('context-cache');
      addInputModality(model, 'text');
      addOutputModality(model, 'text');
      break;
    case '结构化输出能力(beta)':
      model.structuredOutput = true;
      addInputModality(model, 'text');
      addOutputModality(model, 'text');
      break;
    case '图片生成能力':
      addOutputModality(model, 'image');
      break;
    case '向量化能力':
      addOutputModality(model, 'embedding');
      break;
    case '视频生成能力':
      addOutputModality(model, 'video');
      break;
    default:
      break;
  }
}

function applyCapabilityHints(model: MutableModelState, rowText: string, section: string): void {
  applySectionDefaults(model, section);

  if (rowText.includes('深度思考')) {
    model.reasoningSupported = true;
    addCapability(model, '深度思考');
  }

  if (rowText.includes('结构化输出')) {
    model.structuredOutput = true;
    addCapability(model, '结构化输出');
  }

  if (rowText.includes('工具调用') || rowText.includes('函数调用')) {
    model.toolCall = true;
    addCapability(model, '工具调用');
  }

  if (rowText.includes('文本生成')) {
    addCapability(model, '文本生成');
    addInputModality(model, 'text');
    addOutputModality(model, 'text');
  }

  if (rowText.includes('多模态理解') || rowText.includes('视觉定位') || rowText.includes('GUI 任务处理')) {
    model.vision = true;
    addCapability(model, rowText.includes('视觉定位') ? '视觉定位' : '多模态理解');
    addInputModality(model, 'text');
    addInputModality(model, 'image');
    addOutputModality(model, 'text');
  }

  if (rowText.includes('文档理解')) {
    addInputModality(model, 'pdf');
    addOutputModality(model, 'text');
  }

  if (rowText.includes('文生图')) {
    addCapability(model, '文生图');
    addInputModality(model, 'text');
    addOutputModality(model, 'image');
  }

  if (rowText.includes('图生图')) {
    addCapability(model, '图生图');
    addInputModality(model, 'image');
    addOutputModality(model, 'image');
  }

  if (rowText.includes('生成组图')) {
    addCapability(model, '生成组图');
    addOutputModality(model, 'image');
  }

  if (rowText.includes('文生视频')) {
    addCapability(model, '文生视频');
    addInputModality(model, 'text');
    addOutputModality(model, 'video');
  }

  if (rowText.includes('图生视频')) {
    addCapability(model, '图生视频');
    addInputModality(model, 'image');
    addOutputModality(model, 'video');
  }

  if (rowText.includes('编辑视频') || rowText.includes('延长视频')) {
    addCapability(model, rowText.includes('编辑视频') ? '编辑视频' : '延长视频');
    addInputModality(model, 'video');
    addOutputModality(model, 'video');
  }

  if (rowText.includes('音画同生')) {
    addCapability(model, '音画同生');
    addInputModality(model, 'audio');
    addInputModality(model, 'image');
    addOutputModality(model, 'video');
  }

  if (rowText.includes('多模态向量化')) {
    addCapability(model, '多模态向量化');
    addOutputModality(model, 'embedding');
  }

  if (rowText.includes('支持 视频') && rowText.includes('输入')) {
    addInputModality(model, 'video');
  }
  if (section === '向量化能力' && rowText.includes('文本') && rowText.includes('输入')) {
    addInputModality(model, 'text');
  }
  if (section === '向量化能力' && rowText.includes('图片') && rowText.includes('输入')) {
    addInputModality(model, 'image');
  }
}

function createMutableModel(ref: ModelRef, updatedTime?: string): MutableModelState {
  return {
    id: ref.modelId,
    name: ref.modelId,
    displayName: ref.modelId,
    type: undefined,
    vision: false,
    toolCall: false,
    reasoningSupported: false,
    structuredOutput: false,
    attachment: false,
    lastUpdated: updatedTime,
    detailUrl: ref.detailUrl,
    canonicalId: ref.canonicalId,
    limit: {},
    modalitiesInput: new Set<string>(),
    modalitiesOutput: new Set<string>(),
    sections: new Set<string>(),
    capabilities: new Set<string>(),
    rawLimits: new Set<string>(),
    features: new Set<string>(),
    metadata: {
      source: 'volcengine-docs',
    },
  };
}

function getOrCreateModel(
  models: Map<string, MutableModelState>,
  ref: ModelRef,
  updatedTime?: string,
): MutableModelState {
  const existing = models.get(ref.modelId);
  if (existing) {
    existing.detailUrl ||= ref.detailUrl;
    existing.canonicalId ||= ref.canonicalId;
    existing.lastUpdated ||= updatedTime;
    return existing;
  }

  const created = createMutableModel(ref, updatedTime);
  models.set(ref.modelId, created);
  return created;
}

function materializeModel(model: MutableModelState): ModelsDevModel {
  const metadata = removeUndefinedValues({
    ...model.metadata,
    source: 'volcengine-docs',
    canonical_id: model.canonicalId,
    detail_url: model.detailUrl,
    section_titles: undefined as string[] | undefined,
    capabilities: undefined as string[] | undefined,
    raw_limits: undefined as string[] | undefined,
    features: undefined as string[] | undefined,
  });

  const sectionTitles = Array.from(model.sections).sort();
  if (sectionTitles.length > 0) {
    metadata.section_titles = sectionTitles;
  }

  const capabilities = Array.from(model.capabilities).sort();
  if (capabilities.length > 0) {
    metadata.capabilities = capabilities;
  }

  const rawLimits = Array.from(model.rawLimits).sort();
  if (rawLimits.length > 0) {
    metadata.raw_limits = rawLimits;
  }

  const features = Array.from(model.features).sort();
  if (features.length > 0) {
    metadata.features = features;
  }

  const limit = removeUndefinedValues({
    context: model.limit.context,
    output: model.limit.output,
    requests_per_minute: model.limit.requests_per_minute,
    requests_per_day: model.limit.requests_per_day,
  });

  const modalities = removeUndefinedValues({
    input: model.modalitiesInput.size > 0 ? Array.from(model.modalitiesInput).sort() : undefined,
    output: model.modalitiesOutput.size > 0 ? Array.from(model.modalitiesOutput).sort() : undefined,
  });

  return removeUndefinedValues({
    id: model.id,
    name: model.name,
    display_name: model.displayName,
    type: model.type || 'chat',
    attachment: model.attachment,
    reasoning: model.reasoningSupported
      ? { supported: true, default: true }
      : { supported: false },
    tool_call: model.toolCall,
    structured_output: model.structuredOutput || undefined,
    last_updated: model.lastUpdated,
    vision: model.vision,
    modalities: Object.keys(modalities).length > 0 ? modalities : undefined,
    limit: Object.keys(limit).length > 0 ? limit : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  });
}

export function buildVolcengineProvider(detail: VolcengineDocDetail): ModelsDevProvider {
  const mdContent = detail.MDContent?.trim();
  if (!mdContent) {
    throw new Error('Volcengine doc detail is missing MDContent');
  }

  const updatedTime =
    detail.UpdatedTime && !Number.isNaN(Date.parse(detail.UpdatedTime))
      ? detail.UpdatedTime
      : new Date().toISOString();

  const models = new Map<string, MutableModelState>();
  const tableBlocks = collectTableBlocks(mdContent);

  for (const block of tableBlocks) {
    const rows = parseTableRows(block.lines);
    let currentModelIds: string[] = [];

    for (const row of rows) {
      const firstRaw = row.raw[0] ?? '';
      const firstCell = row.cells[0] ?? '';
      const linkedRefs = extractLinkedModelRefs(firstRaw);

      if (linkedRefs.length > 0) {
        currentModelIds = linkedRefs.map(ref => ref.modelId);
        for (const ref of linkedRefs) {
          const model = getOrCreateModel(models, ref, updatedTime);
          model.sections.add(block.section);
        }
      } else if (firstCell) {
        const aliasIds = extractPlainModelIds(firstCell);
        if (aliasIds.length > 0) {
          for (const aliasId of aliasIds) {
            if (!currentModelIds.includes(aliasId)) {
              currentModelIds.push(aliasId);
            }

            const model = getOrCreateModel(
              models,
              {
                modelId: aliasId,
                canonicalId: stripVersionSuffix(aliasId),
              },
              updatedTime,
            );
            model.sections.add(block.section);
          }
        }
      }

      if (currentModelIds.length === 0) {
        continue;
      }

      const rowText = row.cells.filter(Boolean).join(' | ');
      if (!rowText) {
        continue;
      }

      for (const modelId of currentModelIds) {
        const model = models.get(modelId);
        if (!model) {
          continue;
        }

        model.sections.add(block.section);
        applyCapabilityHints(model, rowText, block.section);
        applyLimitHints(model, rowText, block.section, row.cells);
      }
    }
  }

  const providerModels = Array.from(models.values())
    .map(materializeModel)
    .sort((left, right) => left.id.localeCompare(right.id));

  if (providerModels.length === 0) {
    throw new Error('No Volcengine models were parsed from MDContent');
  }

  return {
    id: DOUBAO_PROVIDER_ID,
    name: 'Doubao',
    display_name: 'Doubao',
    doc: VOLCENGINE_DOC_URL,
    updated_at: updatedTime,
    metadata: {
      source: 'volcengine-docs',
      doc_detail_url: VOLCENGINE_DOC_DETAIL_URL,
    },
    models: providerModels,
  };
}

export async function fetchVolcengineDocDetail(): Promise<VolcengineDocDetail> {
  const response = await fetch(VOLCENGINE_DOC_DETAIL_URL, {
    headers: {
      accept: 'application/json',
      'user-agent': 'PublicProviderConf/1.0 (+https://github.com/ThinkInAIXYZ/PublicProviderConf)',
    },
  });

  if (!response.ok) {
    throw new Error(`Volcengine doc request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as VolcengineDocDetailResponse;
  if (!payload.Result) {
    throw new Error('Volcengine doc response missing Result field');
  }

  return payload.Result;
}

async function writeVolcengineProviderFile(
  provider: ModelsDevProvider,
  outputDir: string,
): Promise<void> {
  await JsonWriter.writeToFile(provider, join(outputDir, `${DOUBAO_PROVIDER_ID}.json`));
}

async function updateAggregatedOutputFile(
  provider: ModelsDevProvider,
  outputDir: string,
): Promise<boolean> {
  const aggregatedPath = join(outputDir, 'all.json');
  if (!(await JsonWriter.fileExists(aggregatedPath))) {
    return false;
  }

  const aggregatedData = await JsonWriter.readFromFile<ModelsDevApiResponse>(aggregatedPath);
  const providers = providersToRecord(aggregatedData.providers);
  providers[DOUBAO_PROVIDER_ID] = provider;

  await JsonWriter.writeToFileCompact(
    {
      ...aggregatedData,
      providers,
      updated_at: new Date().toISOString(),
    },
    aggregatedPath,
  );

  return true;
}

export function shouldSyncDoubaoProvider(providerNames?: string[]): boolean {
  if (!providerNames || providerNames.length === 0) {
    return true;
  }

  return providerNames.some(name => normalizeProviderId(name) === DOUBAO_PROVIDER_ID);
}

export async function syncVolcengineOutput(
  options: SyncVolcengineOutputOptions,
): Promise<SyncVolcengineOutputResult> {
  const logger = options.logger ?? console;
  const loadDocDetail = options.loadDocDetail ?? fetchVolcengineDocDetail;

  try {
    const detail = await loadDocDetail();
    const provider = buildVolcengineProvider(detail);

    await writeVolcengineProviderFile(provider, options.outputDir);
    const aggregatedWritten = await updateAggregatedOutputFile(provider, options.outputDir);

    logger.log(
      `🔄 Volcengine doc sync updated ${DOUBAO_PROVIDER_ID}.json with ${provider.models.length} models`,
    );
    if (aggregatedWritten) {
      logger.log('🔄 Volcengine doc sync refreshed all.json provider entry');
    } else {
      logger.warn('⚠️  Volcengine doc sync skipped all.json update: file not found');
    }

    return {
      success: true,
      providerWritten: true,
      aggregatedWritten,
      provider,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown error';
    logger.warn(`⚠️  Volcengine doc sync skipped: ${reason}`);
    return {
      success: false,
      providerWritten: false,
      aggregatedWritten: false,
      reason,
    };
  }
}
