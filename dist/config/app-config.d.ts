export interface ProviderConfig {
    apiUrl: string;
    apiKeyEnv?: string;
    apiKey?: string;
    rateLimit?: number;
    timeout?: number;
    getApiKey(): string | undefined;
}
export interface AppConfig {
    providers: Record<string, ProviderConfig>;
}
export declare function loadConfig(configPath: string): AppConfig;
export declare function getDefaultConfig(): AppConfig;
//# sourceMappingURL=app-config.d.ts.map