import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class DeepSeekProvider implements Provider {
    constructor();
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=deepseek.d.ts.map