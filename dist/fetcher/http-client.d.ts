import { AxiosRequestConfig, AxiosResponse } from 'axios';
export interface HttpClientConfig {
    /** Base URL for requests */
    baseURL?: string;
    /** Timeout in milliseconds */
    timeout?: number;
    /** Default headers */
    headers?: Record<string, string>;
    /** Rate limiting - max requests per second */
    rateLimit?: number;
    /** User agent string */
    userAgent?: string;
}
export declare class HttpClient {
    private client;
    private rateLimit?;
    private lastRequestTime;
    constructor(config?: HttpClientConfig);
    /**
     * Enforce rate limiting between requests
     */
    private enforceRateLimit;
    /**
     * GET request
     */
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * POST request
     */
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * PUT request
     */
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * DELETE request
     */
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;
    /**
     * Get JSON data directly
     */
    getJson<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    /**
     * Set authorization header
     */
    setAuthToken(token: string, type?: string): void;
    /**
     * Remove authorization header
     */
    clearAuthToken(): void;
    /**
     * Set custom header
     */
    setHeader(name: string, value: string): void;
    /**
     * Remove custom header
     */
    removeHeader(name: string): void;
    /**
     * Create a new client instance with different configuration
     */
    static create(config: HttpClientConfig): HttpClient;
}
//# sourceMappingURL=http-client.d.ts.map