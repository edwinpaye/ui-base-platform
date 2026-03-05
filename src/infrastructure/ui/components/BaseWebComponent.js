// src/infrastructure/ui/components/BaseWebComponent.js

/**
 * BaseWebComponent provides common functionality for all micro-frontend components,
 * such as standardized rendering, styling setup, and state connection.
 */
export class BaseWebComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.unsubscribeCallbacks = [];
    }

    async loadNestedComponents(uiConfig) {
        const fragment = document.createDocumentFragment();

        if (!window.App || !window.App.componentLoader) {
            console.error('Component loader not initialized');
            return;
        }

        const loadPromise = uiConfig.map(config => {
            window.App.componentLoader.load(config);
        });

        // const data = await new Promise(resolve =>
        //     setTimeout(() => resolve(['Apple', 'Banana', 'Cherry']), 3000)
        // );

        await Promise.all(loadPromise).then(() => {
            for (const config of uiConfig) {
                // 1. Tell the infrastructure to lazy load the script for this Web Component
                // await this.componentLoader.load(config);
                // window.App.componentLoader.load(config);

                // 2. Instantiate the element based on the `component` tag name from config
                const element = document.createElement(config.component);

                // 3. Optional: apply metadata properties/attributes to the Custom Element
                if (config.id) element.id = config.id;
                if (config.props) {
                    for (const [key, value] of Object.entries(config.props)) {
                        // For Web Components, properties are often better set directly on the DOM node instead of attributes
                        // if they are complex objects, but for simplicity here we do both or assume strings.
                        element.setAttribute(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    }
                }

                // this.shadowRoot.getElementById('loading-card').replaceChildren(element);
                fragment.appendChild(element);
            }
        });

        return fragment;
    }

    connectedCallback() {
        this.render();
        this.onMount();
    }

    disconnectedCallback() {
        this.unsubscribeCallbacks.forEach(cb => cb());
        this.onUnmount();
    }

    /**
     * Helper to get the global store.
     */
    get store() {
        return window.App?.store;
    }

    /**
     * Subscribe to a distinct state key from the global store.
     * @param {string} key 
     * @param {Function} callback 
     */
    subscribeToState(key, callback) {
        if (this.store) {
            const unsub = this.store.subscribe(key, callback);
            this.unsubscribeCallbacks.push(unsub);
        }
    }

    /**
     * Dispatch an action or state change.
     */
    dispatchState(key, value) {
        if (this.store) {
            this.store.set(key, value);
        }
    }

    /**
     * To be overridden by subclasses. Return HTML string.
     */
    getTemplate() {
        return `<div>Base Component</div>`;
    }

    /**
     * To be overridden by subclasses for specific styles.
     */
    getStyles() {
        return `
            @import url('/public/css/index.css');
            :host { display: block; }
        `;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>${this.getStyles()}</style>
            ${this.getTemplate()}
        `;
        this.onRender();
    }

    /** Lifecycle Hooks */
    onMount() { }
    onUnmount() { }
    onRender() { }
}
