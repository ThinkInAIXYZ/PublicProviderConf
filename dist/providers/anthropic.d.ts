import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class AnthropicProvider implements Provider {
    private apiKey?;
    constructor(apiKey?: string);
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=anthropic.d.ts.map