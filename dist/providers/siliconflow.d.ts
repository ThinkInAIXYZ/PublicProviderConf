import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class SiliconFlowProvider implements Provider {
    constructor();
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=siliconflow.d.ts.map