import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

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

export class HttpClient {
  private client: AxiosInstance;
  private rateLimit?: number;
  private lastRequestTime: number = 0;

  constructor(config: HttpClientConfig = {}) {
    const {
      baseURL,
      timeout = 30000,
      headers = {},
      rateLimit,
      userAgent = 'PublicProviderConf/1.0.0'
    } = config;

    this.rateLimit = rateLimit;

    this.client = axios.create({
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
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          // Server responded with error status
          throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
        } else if (error.request) {
          // Request was made but no response received
          throw new Error('No response received from server');
        } else {
          // Something else happened
          throw new Error(`Request failed: ${error.message}`);
        }
      }
    );
  }

  /**
   * Enforce rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    if (!this.rateLimit) return;

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
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  /**
   * POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  /**
   * Get JSON data directly
   */
  async getJson<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.get<T>(url, config);
    return response.data;
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string, type: string = 'Bearer'): void {
    this.client.defaults.headers.common['Authorization'] = `${type} ${token}`;
  }

  /**
   * Remove authorization header
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
  }

  /**
   * Set custom header
   */
  setHeader(name: string, value: string): void {
    this.client.defaults.headers.common[name] = value;
  }

  /**
   * Remove custom header
   */
  removeHeader(name: string): void {
    delete this.client.defaults.headers.common[name];
  }

  /**
   * Create a new client instance with different configuration
   */
  static create(config: HttpClientConfig): HttpClient {
    return new HttpClient(config);
  }
}