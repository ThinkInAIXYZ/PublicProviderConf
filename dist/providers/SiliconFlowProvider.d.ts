import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class SiliconFlowProvider implements Provider {
    constructor();
    private convertTemplateModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=SiliconFlowProvider.d.ts.map