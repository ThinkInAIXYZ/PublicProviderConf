import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class GeminiProvider implements Provider {
    private apiUrl;
    private docsUrl;
    private client;
    private apiKey?;
    constructor(apiKey?: string);
    private fetchApiModels;
    private scrapeModelDetails;
    private parseTableFormat;
    private parseListFormat;
    private addFallbackModels;
    private extractCleanModelName;
    private createModelDetails;
    private createDisplayName;
    private convertModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=GeminiProvider.d.ts.map