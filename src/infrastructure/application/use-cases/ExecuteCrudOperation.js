// src/application/use-cases/ExecuteCrudOperation.js

/**
 * Orchestrates an HTTP operation by managing state and executing the request.
 */
export class ExecuteCrudOperation {
    /**
     * @param {import('../ports/IHttpClient.js').IHttpClient} httpClient
     * @param {import('../ports/IStateStore.js').IStateStore} stateStore
     */
    constructor(httpClient, stateStore) {
        this.httpClient = httpClient;
        this.stateStore = stateStore;
    }

    /**
     * Executes an API request by operation ID, updating the global loading state and data state.
     * @param {string} operationId The key in api-config.json
     * @param {Object} params Parameters for URL interpolation and Body
     * @param {string} [stateKey] Optional store key to automatically persist the result
     */
    async execute(operationId, params = {}, stateKey = null) {
        this.stateStore.set('platform.loading', true);

        try {
            const result = await this.httpClient.execute(operationId, params);

            if (stateKey) {
                this.stateStore.set(stateKey, result);
            }

            return result;
        } catch (error) {
            console.error(`[UseCase] ExecuteCrudOperation failed for ${operationId}:`, error);
            // Optionally set global error state here
            this.stateStore.set('platform.error', error.message);
            throw error;
        } finally {
            this.stateStore.set('platform.loading', false);
        }
    }
}
