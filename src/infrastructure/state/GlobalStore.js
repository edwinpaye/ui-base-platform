// src/infrastructure/state/GlobalStore.js
import { IStateStore } from '../../application/ports/IStateStore.js';

/**
 * A simple Reactive State Store utilizing the Pub/Sub pattern.
 */
export class GlobalStore extends IStateStore {
    constructor() {
        super();
        this.state = new Map();
        this.listeners = new Map();
    }

    get(key) {
        return this.state.get(key);
    }

    set(key, value) {
        if (this.state.get(key) !== value) {
            this.state.set(key, value);
            this.notify(key, value);
        }
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Immediately call with current value if exists
        if (this.state.has(key)) {
            callback(this.state.get(key));
        }

        // Return unsubscribe function
        return () => {
            const subs = this.listeners.get(key);
            if (subs) subs.delete(callback);
        };
    }

    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(cb => {
                try {
                    cb(value);
                } catch (err) {
                    console.error(`Error in subscriber for key ${key}:`, err);
                }
            });
        }
    }
}
