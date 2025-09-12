import { Provider } from './Provider';
import { ModelInfo } from '../types/ModelInfo';
export declare class DeepSeekProvider implements Provider {
    private docsUrl;
    private client;
    constructor();
    private scrapeModelDetails;
    private parseModelTable;
    private extractModelFromRow;
    private createDeepseekChatDetails;
    private createDeepseekReasonerDetails;
    private addFallbackModels;
    private convertModel;
    fetchModels(): Promise<ModelInfo[]>;
    providerId(): string;
    providerName(): string;
}
//# sourceMappingURL=DeepSeekProvider.d.ts.map