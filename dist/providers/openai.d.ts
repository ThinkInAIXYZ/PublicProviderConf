import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class OpenAIProvider implements Provider {
    private apiKey?;
    constructor(apiKey?: string);
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=openai.d.ts.map