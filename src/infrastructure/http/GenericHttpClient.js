// src/infrastructure/http/GenericHttpClient.js
import { IHttpClient } from '../../application/ports/IHttpClient.js';

export class GenericHttpClient extends IHttpClient {
    constructor() {
        super();
        this.apiConfigCache = null;
    }

    async loadConfig() {
        if (!this.apiConfigCache) {
            const res = await fetch('/public/metadata/api-config.json');
            this.apiConfigCache = await res.json();
        }
        return this.apiConfigCache;
    }

    /**
     * Replaces variable tokens like :userId in strings with actual values.
     */
    interpolate(template, params) {
        if (!template || !params) return template;
        return template.replace(/:([a-zA-Z0-9_]+)/g, (match, key) => {
            return params[key] !== undefined ? params[key] : match;
        });
    }

    async execute(operationId, params = {}) {
        const configMap = await this.loadConfig();
        const config = configMap[operationId];

        if (!config) {
            throw new Error(`API Configuration for operation '${operationId}' not found.`);
        }

        const url = this.interpolate(config.url, params);
        const method = config.method || 'GET';
        const headers = {
            'Content-Type': 'application/json',
            ...(config.headers || {})
        };

        const fetchOptions = {
            method,
            headers
        };

        if (method !== 'GET' && method !== 'HEAD') {
            fetchOptions.body = JSON.stringify(params.body || {});
        }

        try {
            const response = await fetch(url, fetchOptions);

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            // Assume JSON response for convenience in this platform
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        } catch (error) {
            console.error(`[HttpClient] Failed to execute ${operationId}:`, error);
            throw error;
        }
    }
}
