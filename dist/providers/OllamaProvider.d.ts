import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class OllamaProvider implements Provider {
    constructor();
    private convertTemplateModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=OllamaProvider.d.ts.map