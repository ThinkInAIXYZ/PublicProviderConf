import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class AnthropicProvider implements Provider {
    private apiUrl;
    private client;
    private apiKey?;
    constructor(apiKey?: string);
    private convertTemplateModel;
    private fetchAvailableModelIds;
    private loadTemplateModels;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=AnthropicProvider.d.ts.map