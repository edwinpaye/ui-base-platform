// src/bootstrap.js
import { GlobalStore } from './infrastructure/state/GlobalStore.js';
import { GenericHttpClient } from './infrastructure/http/GenericHttpClient.js';
import { MicrokernelLoader } from './infrastructure/ui/loader/MicrokernelLoader.js';
import { LoadUIFromMetadata } from './application/use-cases/LoadUIFromMetadata.js';

// Global Components
import './infrastructure/ui/components/GlobalLoader.js';

async function bootstrap() {
    const isDarkMode = window?.matchMedia?.('(prefers-color-scheme:dark)')?.matches ?? false;
    setupDarkTheme(isDarkMode);

    const container = document.getElementById('dynamic-content');

    const loadingComponent = document.createElement('global-loader');
    container.appendChild(loadingComponent);

    console.log("🚀 Bootstrapping Vanilla Microkernel Platform");

    // 1. Initialize Infrastructure (Adapters)
    const store = new GlobalStore();
    const httpClient = new GenericHttpClient();
    const componentLoader = new MicrokernelLoader();

    // 2. Initialize Use Cases (Application Layer)
    const loadUIUseCase = new LoadUIFromMetadata(componentLoader);

    // Inject dependencies into window for global access/debugging (optional, but useful for microfrontends)
    window.App = {
        store,
        httpClient,
        componentLoader,
        loadUIUseCase
    };

    // 3. Kickoff the application by loading initial metadata
    try {
        store.set('platform.loading', true);
        const response = await fetch('./public/metadata/ui-config.json');
        if (!response.ok) throw new Error('Failed to load UI metadata');
        const uiConfig = await response.json();

        // 4. Orchestrate component rendering via Use Case
        // const container = document.getElementById('dynamic-content');
        await loadUIUseCase.execute(uiConfig, container);

        console.log("✅ Platform booted successfully");
    } catch (error) {
        console.error("❌ Platform boot failed:", error);
    } finally {
        store.set('platform.loading', false);
    }
}

function setupDarkTheme(isDarkMode) {
    const next = isDarkMode ? 'dark' : 'light';
    document.body.setAttribute('data-theme', next);
}

// Start application
document.addEventListener('DOMContentLoaded', bootstrap);
