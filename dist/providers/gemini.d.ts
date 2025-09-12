import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class GeminiProvider implements Provider {
    private apiKey?;
    constructor(apiKey?: string);
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=gemini.d.ts.map