import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class GithubAiProvider implements Provider {
    private apiUrl;
    private client;
    constructor(apiUrl: string);
    private convertModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=GithubAiProvider.d.ts.map