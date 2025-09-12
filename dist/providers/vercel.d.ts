import { Provider } from './Provider';
import { ModelInfo } from '../models/model-info';
export declare class VercelProvider implements Provider {
    private apiUrl;
    constructor(apiUrl: string);
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=vercel.d.ts.map