import { Provider } from '../providers/Provider';
import { ProviderInfo } from '../models/provider-info';
export declare class DataFetcher {
    private providers;
    constructor();
    addProvider(provider: Provider): void;
    fetchAll(): Promise<ProviderInfo[]>;
}
//# sourceMappingURL=data-fetcher.d.ts.map