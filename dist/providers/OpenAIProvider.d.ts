import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class OpenAIProvider implements Provider {
    private apiUrl;
    private client;
    private apiKey?;
    constructor(apiKey?: string);
    private createDefaultModel;
    private convertTemplateModel;
    private fetchAvailableModelIds;
    private loadTemplateModels;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=OpenAIProvider.d.ts.map