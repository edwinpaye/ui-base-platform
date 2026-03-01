import { BaseWebComponent } from '/src/infrastructure/ui/components/BaseWebComponent.js';
// import { ExecuteCrudOperation } from '/src/application/use-cases/ExecuteCrudOperation.js';

export default class EnterpriseLayout extends BaseWebComponent {
    constructor() {
        super();
        // State
        this.openTabs = [];
        this.activeTabId = null;

        // Context Menu State
        this.contextTarget = null; // The menu item data being clicked

        // this.init();
        this.error = null;
    }

    // async onMount() {
    //     // Subscribe to a specific state key where we'll put our users
    //     this.subscribeToState('users.list', (users) => {
    //         if (users) {
    //             this.users = users;
    //             this.render(); // Re-render when state changes
    //         }
    //     });

    //     // Initialize Use Case instance just for this component
    //     // In a real app we might inject this via a DI container
    //     this.crudUseCase = new ExecuteCrudOperation(
    //         window.App.httpClient,
    //         window.App.store
    //     );

    //     await this.fetchUsers();
    // }

    // async fetchUsers() {
    //     try {
    //         // Executes 'getUsers' from api-config.json, saves to 'users.list' state
    //         await this.crudUseCase.execute('getUsers', {}, 'users.list');
    //     } catch (err) {
    //         this.error = "Failed to load users.";
    //         this.render();
    //     }
    // }

    getStyles() {
        return `
            @import url('/public/plugins/layout/Layout.css');
            ${super.getStyles()}
        `;
    }

    getTemplate() {
        if (this.error) {
            return `<div class="error animate-fade-in">${this.error}</div>`;
        }

        return `
            <div id="app-container">
                <!-- SIDEBAR -->
                <aside class="sidebar" id="sidebar">
                    <div class="brand">
                        <span>❖</span> Enterprise UI <button class="theme-toggle" id="themeBtn">Dark Mode</button>
                    </div>
                    <div class="menu-container" id="sidebarMenu">
                        <!-- Sidebar content injected by JS -->
                    </div>
                </aside>

                <!-- MAIN CONTENT -->
                <main class="main-content">
                    <!-- Tabs Navigation -->
                    <header class="tabs-header">
                        <button class="tabs-scroll-btn" id="tabScrollLeft" disabled>&lt;</button>
                        <div class="tabs-viewport" id="tabsViewport">
                            <!-- Tabs injected by JS -->
                        </div>
                        <button class="tabs-scroll-btn" id="tabScrollRight" disabled>&gt;</button>
                    </header>

                    <!-- Page Content Area -->
                    <div class="page-viewport" id="pageViewport">
                        <!-- Pages injected by JS -->
                    </div>
                </main>

                <!-- Mobile Toggle -->
                <button class="mobile-toggle" id="mobileMenuBtn">☰</button>

                <!-- Context Menu -->
                <div id="context-menu">
                    <div class="ctx-item" data-action="open">Open</div>
                    <div class="ctx-item" data-action="new-tab">Open in New Tab</div>
                </div>
            </div>
        `;
    }

    onRender() {
        this.ICONS = this.getAttribute('icons') ? JSON.parse(this.getAttribute('icons')) : {};
        this.menuData = this.getAttribute('menuData') ? JSON.parse(this.getAttribute('menuData')) : [];
        // DOM Elements
        this.sidebarEl = this.shadowRoot.getElementById('sidebarMenu');
        this.tabsViewport = this.shadowRoot.getElementById('tabsViewport');
        this.pageViewport = this.shadowRoot.getElementById('pageViewport');
        this.tabScrollLeft = this.shadowRoot.getElementById('tabScrollLeft');
        this.tabScrollRight = this.shadowRoot.getElementById('tabScrollRight');
        this.contextMenu = this.shadowRoot.getElementById('context-menu');

        this.init();
    }

    init() {
        this.renderSidebar();
        this.setupEventListeners();
        this.setupTheme();

        // Open Dashboard by default
        this.menuData.length > 0 && this.openTab(this.menuData[0], false);
    }

    // --- Sidebar Rendering ---
    renderSidebar() {
        const createMenuItem = (item, level = 0) => {
            const container = document.createElement('div');

            // Label for categories (optional logic)
            if (item.type === 'label') {
                container.className = 'menu-label';
                container.textContent = item.title;
                return container;
            }

            // The actual clickable row
            const el = document.createElement('div');
            el.className = `menu-item ${level > 0 ? 'submenu-item' : ''}`;
            el.dataset.id = item.id;
            el.dataset.type = item.type;

            // Inner HTML
            const iconHtml = this.ICONS[item.icon] || this.ICONS.dashboard;
            const arrowHtml = item.type === 'submenu' ? this.ICONS.arrow : '';

            el.innerHTML = `
                <div class="menu-icon">${iconHtml}</div>
                <span>${item.title}</span>
                ${arrowHtml ? `<div class="menu-arrow">${arrowHtml}</div>` : ''}
            `;

            // Click Interaction
            el.addEventListener('click', () => this.handleMenuClick(item, el));
            el.addEventListener('contextmenu', (e) => this.handleContextMenu(e, item));

            container.appendChild(el);

            // Recursion for children
            if (item.type === 'submenu' && item.children) {
                const subContainer = document.createElement('div');
                subContainer.className = 'submenu';
                item.children.forEach(child => {
                    subContainer.appendChild(createMenuItem(child, level + 1));
                });
                container.appendChild(subContainer);
            }

            return container;
        };

        this.menuData.forEach(item => {
            this.sidebarEl.appendChild(createMenuItem(item));
        });
    }

    handleMenuClick(item, domEl) {
        // Toggle Submenu
        if (item.type === 'submenu') {
            domEl.classList.toggle('expanded');
            const sub = domEl.nextElementSibling;
            if (sub) sub.classList.toggle('open');
            return;
        }

        // It's a link, open tab
        this.openTab(item, false);
        this.closeContextMenu();
    }

    handleContextMenu(e, item) {
        e.preventDefault();
        this.contextTarget = item;

        // Position menu
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${e.pageX}px`;
        this.contextMenu.style.top = `${e.pageY}px`;
    }

    closeContextMenu() {
        this.contextMenu.style.display = 'none';
    }

    // --- Tab Management ---

    /**
     * Opens a tab.
     * @param {Object} item - The menu item metadata
     * @param {Boolean} forceNew - If true, always creates a new instance (context aware)
     */
    openTab(item, forceNew = false) {
        // If we aren't forcing a new tab, check if it's already open
        if (!forceNew) {
            const existingTab = this.openTabs.find(t => t.baseId === item.id && !t.isClone);
            if (existingTab) {
                this.activateTab(existingTab.id);
                return;
            }
        }

        // Create Unique ID for this instance
        // Example: 'customers' -> 'customers_1698123'
        const uniqueId = item.id + '_' + Date.now() + Math.floor(Math.random() * 1000);
        const isClone = forceNew || this.openTabs.some(t => t.baseId === item.id);

        const tabObj = {
            id: uniqueId,
            baseId: item.id,
            title: item.title + (isClone ? ` (${this.openTabs.filter(t => t.baseId === item.id).length + 1})` : ''),
            content: this.generatePageContent(item, isClone),
            isClone: isClone,
            timestamp: Date.now()
        };

        this.openTabs.push(tabObj);
        this.renderTab(tabObj);
        this.renderPage(tabObj);
        this.activateTab(uniqueId);
        this.updateScrollButtons();

        // Scroll to new tab
        setTimeout(() => {
            const tabEl = this.shadowRoot.querySelector(`.tab[data-id="${uniqueId}"]`);
            if (tabEl) tabEl.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        }, 10);
    }

    activateTab(tabId) {
        this.activeTabId = tabId;

        // Update Sidebar Highlighting
        this.shadowRoot.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));

        // Find the base menu item to highlight in sidebar
        const tabData = this.openTabs.find(t => t.id === tabId);
        if (tabData) {
            const sidebarLink = this.shadowRoot.querySelector(`.menu-item[data-id="${tabData.baseId}"]`);
            if (sidebarLink) sidebarLink.classList.add('active');
        }

        // Update Tab Styles
        this.shadowRoot.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
        const activeTabEl = this.shadowRoot.querySelector(`.tab[data-id="${tabId}"]`);
        if (activeTabEl) activeTabEl.classList.add('active');

        // Update Page Visibility
        this.shadowRoot.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
        const activePage = this.shadowRoot.getElementById(`page-${tabId}`);
        if (activePage) activePage.classList.add('active');
    }

    closeTab(e, tabId) {
        e.stopPropagation(); // Prevent tab activation when clicking close

        const index = this.openTabs.findIndex(t => t.id === tabId);
        if (index === -1) return;

        // Remove DOM
        this.shadowRoot.querySelector(`.tab[data-id="${tabId}"]`).remove();
        this.shadowRoot.getElementById(`page-${tabId}`).remove();

        // Remove from State
        this.openTabs.splice(index, 1);

        // If we closed the active tab, switch to another
        if (this.activeTabId === tabId) {
            if (this.openTabs.length > 0) {
                // Try to go to the one to the left, or the first one
                const newIndex = Math.max(0, index - 1);
                this.activateTab(this.openTabs[newIndex].id);
            } else {
                this.activeTabId = null;
            }
        }

        this.updateScrollButtons();
    }

    renderTab(tabObj) {
        const el = document.createElement('div');
        el.className = 'tab';
        el.dataset.id = tabObj.id;
        el.innerHTML = `
            <span class="tab-title">${tabObj.title}</span>
            <button class="tab-close">&#10006;</button>
        `;

        el.addEventListener('click', () => this.activateTab(tabObj.id));
        el.querySelector('.tab-close').addEventListener('click', (e) => this.closeTab(e, tabObj.id));

        this.tabsViewport.appendChild(el);
    }

    renderPage(tabObj) {
        const el = document.createElement('div');
        el.className = 'page-container';
        el.id = `page-${tabObj.id}`;
        el.innerHTML = tabObj.content;
        this.pageViewport.appendChild(el);
    }

    // --- Content Generation (Simulation) ---
    generatePageContent(item, isContextInstance) {
        // Simulate different data/context for different instances
        const randomVal = Math.floor(Math.random() * 1000);
        const status = Math.random() > 0.5 ? 'Active' : 'Draft';
        const statusColor = status === 'Active' ? '#10b981' : '#f59e0b';

        return `
            <div class="card">
                <h2>${item.title} View</h2>
                <p>This is the view for <strong>${item.id}</strong>.</p>
                ${isContextInstance ?
                `<div class="status-badge" style="background:${statusColor}20; color:${statusColor}">
                        Context Instance • ID: ${randomVal} • Status: ${status}
                        </div>`
                : ''}
            </div>
            <div class="card">
                <h3>Details</h3>
                <p>Metadata loaded for this page instance.</p>
                <ul style="margin-left:20px; margin-top:10px; color:var(--text-secondary)">
                    <li>Route: /app/${item.id}</li>
                    <li>Permissions: read, write</li>
                    ${isContextInstance ? `<li>Context ID: ${randomVal}</li>` : ''}
                </ul>
            </div>
            <div style="height: 500px; background: repeating-linear-gradient(45deg, var(--bg-body), var(--bg-body) 10px, var(--bg-header) 10px, var(--bg-header) 20px); border-radius:8px; opacity:0.5; border:1px dashed var(--border-color)"></div>
        `;
    }

    // --- Event Listeners & Utilities ---

    setupEventListeners() {
        // Tab Scrolling
        const scrollAmount = 150;
        this.tabScrollLeft.addEventListener('click', () => {
            this.tabsViewport.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        });
        this.tabScrollRight.addEventListener('click', () => {
            this.tabsViewport.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        });

        // Update scroll buttons state
        this.tabsViewport.addEventListener('scroll', () => this.updateScrollButtons());
        window.addEventListener('resize', () => this.updateScrollButtons());

        // Context Menu Actions
        this.shadowRoot.querySelectorAll('.ctx-item').forEach(ctxItem => {
            ctxItem.addEventListener('click', (e) => {
                if (!this.contextTarget) return;
                const action = e.target.dataset.action;
                if (action === 'open') {
                    this.openTab(this.contextTarget, false);
                } else if (action === 'new-tab') {
                    this.openTab(this.contextTarget, true);
                }
                this.closeContextMenu();
            });
        });

        // Close context menu on click elsewhere
        this.shadowRoot.addEventListener('click', (e) => {
            if (!e.target.closest('#context-menu')) {
                this.closeContextMenu();
            }
        });

        // Mobile Sidebar Toggle
        const mobileBtn = this.shadowRoot.getElementById('mobileMenuBtn');
        const sidebar = this.shadowRoot.getElementById('sidebar');
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Close sidebar on mobile when clicking main content
        this.pageViewport.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
            }
        });
    }

    updateScrollButtons() {
        // Enable/Disable left button
        this.tabScrollLeft.disabled = this.tabsViewport.scrollLeft <= 0;

        // Enable/Disable right button
        const maxScroll = this.tabsViewport.scrollWidth - this.tabsViewport.clientWidth;
        this.tabScrollRight.disabled = this.tabsViewport.scrollLeft >= maxScroll - 1; // -1 for rounding errors
    }

    setupTheme() {
        const btn = this.shadowRoot.getElementById('themeBtn');
        btn.addEventListener('click', () => {
            const current = document.body.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            btn.textContent = next === 'dark' ? 'Light Mode' : 'Dark Mode';
        });
    }
}

// Initialize App
// this.shadowRoot.addEventListener('DOMContentLoaded', () => {
//     new EnterpriseLayout(MENU_DATA);
// });

// const initializer = this.shadowRoot.getElementById('initializer');

// new Promise(resolve => setTimeout(resolve, 5200))
//     .then(() => {
//         initializer.classList.add('hidden');
//     });
