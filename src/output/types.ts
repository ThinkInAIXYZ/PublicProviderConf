import { ModelInfo } from '../models/model-info';

export interface AggregatedOutput {
  version: string;
  generatedAt: Date;
  totalModels: number;
  providers: Record<string, AggregatedProvider>;
}

export interface AggregatedProvider {
  providerId: string;
  providerName: string;
  lastUpdated: Date;
  models: ModelInfo[];
  api?: string;
  doc?: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}
