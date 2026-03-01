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
