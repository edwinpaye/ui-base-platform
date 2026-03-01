// src/application/ports/IComponentLoader.js

/**
 * Interface that defines how the system loads UI components.
 * In a vanilla JS environment, interfaces are just conceptual contracts.
 */
export class IComponentLoader {
    /**
     * Loads a component from a remote URL and registers it with the given metadata.
     * @param {Object} componentConfig Metadata containing id, component tag, and url.
     * @returns {Promise<void>}
     */
    async load(componentConfig) {
        throw new Error('Method not implemented.');
    }
}
