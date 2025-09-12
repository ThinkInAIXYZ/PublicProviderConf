import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class VercelProvider implements Provider {
    private apiUrl;
    private client;
    constructor(apiUrl: string);
    private convertModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=VercelProvider.d.ts.map