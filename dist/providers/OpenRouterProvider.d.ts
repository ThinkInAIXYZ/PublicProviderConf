import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class OpenRouterProvider implements Provider {
    private apiUrl;
    private client;
    constructor(apiUrl: string);
    private convertModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=OpenRouterProvider.d.ts.map