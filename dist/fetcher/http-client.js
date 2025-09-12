"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
const axios_1 = __importDefault(require("axios"));
class HttpClient {
    client;
    rateLimit;
    lastRequestTime = 0;
    constructor(config = {}) {
        const { baseURL, timeout = 30000, headers = {}, rateLimit, userAgent = 'PublicProviderConf/1.0.0' } = config;
        this.rateLimit = rateLimit;
        this.client = axios_1.default.create({
            baseURL,
            timeout,
            headers: {
                'User-Agent': userAgent,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...headers
            }
        });
        // Add request interceptor for rate limiting
        this.client.interceptors.request.use(async (config) => {
            if (this.rateLimit) {
                await this.enforceRateLimit();
            }
            return config;
        });
        // Add response interceptor for error handling
        this.client.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                // Server responded with error status
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
            }
            else if (error.request) {
                // Request was made but no response received
                throw new Error('No response received from server');
            }
            else {
                // Something else happened
                throw new Error(`Request failed: ${error.message}`);
            }
        });
    }
    /**
     * Enforce rate limiting between requests
     */
    async enforceRateLimit() {
        if (!this.rateLimit)
            return;
        const minInterval = 1000 / this.rateLimit; // milliseconds between requests
        const timeSinceLastRequest = Date.now() - this.lastRequestTime;
        if (timeSinceLastRequest < minInterval) {
            const delayTime = minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delayTime));
        }
        this.lastRequestTime = Date.now();
    }
    /**
     * GET request
     */
    async get(url, config) {
        return this.client.get(url, config);
    }
    /**
     * POST request
     */
    async post(url, data, config) {
        return this.client.post(url, data, config);
    }
    /**
     * PUT request
     */
    async put(url, data, config) {
        return this.client.put(url, data, config);
    }
    /**
     * DELETE request
     */
    async delete(url, config) {
        return this.client.delete(url, config);
    }
    /**
     * Get JSON data directly
     */
    async getJson(url, config) {
        const response = await this.get(url, config);
        return response.data;
    }
    /**
     * Set authorization header
     */
    setAuthToken(token, type = 'Bearer') {
        this.client.defaults.headers.common['Authorization'] = `${type} ${token}`;
    }
    /**
     * Remove authorization header
     */
    clearAuthToken() {
        delete this.client.defaults.headers.common['Authorization'];
    }
    /**
     * Set custom header
     */
    setHeader(name, value) {
        this.client.defaults.headers.common[name] = value;
    }
    /**
     * Remove custom header
     */
    removeHeader(name) {
        delete this.client.defaults.headers.common[name];
    }
    /**
     * Create a new client instance with different configuration
     */
    static create(config) {
        return new HttpClient(config);
    }
}
exports.HttpClient = HttpClient;
//# sourceMappingURL=http-client.js.map