import { ProviderInfo } from '../models/provider-info';
export declare class JsonValidator {
    static validateProviderInfo(provider: ProviderInfo): void;
    private static validateModelInfo;
    /**
     * Validate JSON structure and content
     */
    static validateJson(data: any): boolean;
    /**
     * Validate that the data can be serialized to JSON
     */
    static validateJsonSerializable(data: any): void;
}
//# sourceMappingURL=json-validator.d.ts.map