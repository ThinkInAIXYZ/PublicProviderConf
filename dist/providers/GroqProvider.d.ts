import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class GroqProvider implements Provider {
    private apiKey?;
    private apiUrl;
    private client;
    constructor(apiKey?: string);
    static withUrl(apiUrl: string, apiKey?: string): GroqProvider;
    private convertToModelInfo;
    private determineModelType;
    private hasVisionCapability;
    private hasFunctionCallCapability;
    private hasReasoningCapability;
    private createDisplayName;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=GroqProvider.d.ts.map