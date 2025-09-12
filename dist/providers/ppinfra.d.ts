import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class PPInfraProvider implements Provider {
    private apiUrl;
    constructor(apiUrl: string);
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=ppinfra.d.ts.map