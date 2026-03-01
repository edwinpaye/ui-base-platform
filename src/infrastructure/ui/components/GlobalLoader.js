// src/infrastructure/ui/components/GlobalLoader.js

/**
 * A visually appealing, modern full-screen loader.
 */
export class GlobalLoader extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isActive = false;
        this.unsub = null;
    }

    connectedCallback() {
        this.render();
        // Delay dependency retrieval slightly to ensure bootstrap is mostly complete 
        // or rely on window.App set synchronously.
        setTimeout(() => this.setupSubscription(), 0);
    }

    setupSubscription() {
        if (window.App && window.App.store) {
            this.unsub = window.App.store.subscribe('platform.loading', (isLoading) => {
                this.isActive = isLoading;
                this.updateVisibility();
            });
        }
    }

    disconnectedCallback() {
        if (this.unsub) this.unsub();
    }

    updateVisibility() {
        const container = this.shadowRoot.querySelector('.loader-overlay');
        if (container) {
            if (this.isActive) {
                container.classList.add('active');
            } else {
                container.classList.remove('active');
            }
        }
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .loader-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(15, 23, 42, 0.8);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease-in-out;
                }
                .loader-overlay.active {
                    opacity: 1;
                    pointer-events: all;
                }
                .spinner {
                    width: 60px;
                    height: 60px;
                    border: 4px solid rgba(255, 255, 255, 0.1);
                    border-left-color: #3b82f6; /* Tailwind Blue 500 */
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 20px;
                }
                .text {
                    color: #fff;
                    font-family: 'Inter', sans-serif;
                    font-size: 1.1rem;
                    font-weight: 500;
                    letter-spacing: 0.5px;
                    animation: pulse 1.5s infinite;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.6; }
                    50% { opacity: 1; }
                }
            </style>
            <div class="loader-overlay">
                <div class="spinner"></div>
                <div class="text">Loading Application...</div>
            </div>
        `;
        this.updateVisibility();
    }
}

// Self-registering for simplicity since it's used globally
if (!customElements.get('global-loader')) {
    customElements.define('global-loader', GlobalLoader);
}
