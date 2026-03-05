// src/infrastructure/ui/loader/MicrokernelLoader.js
import { IComponentLoader } from '../../../application/ports/IComponentLoader.js';

/**
 * MicrokernelLoader is responsible for dynamically fetching JavaScript modules
 * containing Web Components and ensuring they are registered in the customElements registry.
 */
export class MicrokernelLoader extends IComponentLoader {
    constructor() {
        super();
        this.loadedComponents = new Set();
    }

    async load(componentConfig) {
        const { id, component, url } = componentConfig;

        if (this.loadedComponents.has(component)) {
            console.log(`[Microkernel] Component <${component}> is already loaded.`);
            return;
        }

        try {
            console.log(`[Microkernel] Loading module for <${component}> from ${url}`);

            // Dynamically import the script as an ES Module
            const module = await import(url);

            // The module is expected to export a 'default' class extending HTMLElement
            if (!module.default) {
                throw new Error(`Module at ${url} does not have a default export`);
            }

            // Registering the component
            if (!customElements.get(component)) {
                customElements.define(component, module.default);
                this.loadedComponents.add(component);
                console.log(`[Microkernel] Successfully registered <${component}>`);
            }
        } catch (error) {
            console.error(`[Microkernel] Failed to load component <${component}>:`, error);
            throw error;
        }
    }
}
