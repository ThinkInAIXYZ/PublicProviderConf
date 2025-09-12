import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class OllamaProvider implements Provider {
    constructor();
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=ollama.d.ts.map