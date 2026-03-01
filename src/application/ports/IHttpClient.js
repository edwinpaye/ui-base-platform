// src/application/ports/IHttpClient.js

export class IHttpClient {
    /**
     * Executes an HTTP request based on defined metadata.
     * @param {Object} requestConfig The metadata config for this request.
     * @param {Object} [params] Dynamic parameters to replace in URL or Body.
     * @returns {Promise<any>} Response data.
     */
    async execute(requestConfig, params) {
        throw new Error('Method not implemented.');
    }
}
