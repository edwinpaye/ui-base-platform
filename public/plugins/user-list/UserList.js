// public/plugins/UserList.js
import { BaseWebComponent } from '/src/infrastructure/ui/components/BaseWebComponent.js';
import { ExecuteCrudOperation } from '/src/application/use-cases/ExecuteCrudOperation.js';

export default class UserList extends BaseWebComponent {
    constructor() {
        super();
        this.users = [];
        this.error = null;
    }

    async onMount() {
        // Subscribe to a specific state key where we'll put our users
        this.subscribeToState('users.list', (users) => {
            if (users) {
                this.users = users;
                this.render(); // Re-render when state changes
            }
        });

        // Initialize Use Case instance just for this component
        // In a real app we might inject this via a DI container
        this.crudUseCase = new ExecuteCrudOperation(
            window.App.httpClient,
            window.App.store
        );

        await this.fetchUsers();
    }

    async fetchUsers() {
        try {
            // Executes 'getUsers' from api-config.json, saves to 'users.list' state
            await this.crudUseCase.execute('getUsers', {}, 'users.list');
        } catch (err) {
            this.error = "Failed to load users.";
            this.render();
        }
    }

    getStyles() {
        return `
            @import url('/public/plugins/user-list/UserList.css');
            ${super.getStyles()}
        `;
    }

    getTemplate() {
        if (this.error) {
            return `<div class="error animate-fade-in">${this.error}</div>`;
        }

        if (!this.users.length) {
            // The global loader will handle the UX, but we can put a placeholder
            return `<div></div>`;
        }

        const cards = this.users.map(user => `
            <div class="user-card glass-panel animate-fade-in">
                <h3>${user.name}</h3>
                <p>@${user.username}</p>
                <p class="email">${user.email}</p>
                <p>${user.company?.name || 'Unknown Company'}</p>
            </div>
        `).join('');

        return `
            <div class="user-grid">
                ${cards}
            </div>
        `;
    }
}
