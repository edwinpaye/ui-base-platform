// public/plugins/UiHeader.js
import { BaseWebComponent } from '/src/infrastructure/ui/components/BaseWebComponent.js';

export default class UiHeader extends BaseWebComponent {
    getStyles() {
        return `
            ${super.getStyles()}
            :host {
                display: block;
                margin-bottom: 2rem;
            }
            header {
                padding: 1.5rem 2rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid var(--border-color);
            }
            h1 {
                font-size: 1.5rem;
                font-weight: 600;
                background: linear-gradient(135deg, var(--text-primary), var(--primary-color));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
        `;
    }

    getTemplate() {
        const title = this.getAttribute('title') || 'Platform';
        return `
            <header class="glass-panel animate-fade-in">
                <h1>${title}</h1>
                <div class="user-info">Admin</div>
            </header>
        `;
    }
}
