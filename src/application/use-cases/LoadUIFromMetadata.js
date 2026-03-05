// src/application/use-cases/LoadUIFromMetadata.js

/**
 * Orchestrates the loading of the UI based on a JSON metadata definition.
 */
export class LoadUIFromMetadata {
    /**
     * @param {import('../ports/IComponentLoader.js').IComponentLoader} componentLoader
     */
    constructor(componentLoader) {
        this.componentLoader = componentLoader;
    }

    /**
     * Executes the process of building the DOM from the JSON configuration.
     * @param {Array} uiConfig Array of component definitions.
     * @param {HTMLElement} rootContainer The HTML node to mount components into.
     */
    async execute(uiConfig, rootContainer) {
        // rootContainer.innerHTML = ''; // Clear previous content

        const fragment = document.createDocumentFragment();

        for (const config of uiConfig) {
            // 1. Tell the infrastructure to lazy load the script for this Web Component
            await this.componentLoader.load(config);

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

            fragment.appendChild(element);
        }

        // const data = await new Promise(resolve =>
        //     setTimeout(() => resolve(['Apple', 'Banana', 'Cherry']), 1000)
        // );

        // 4. Attach all instantiated components to the DOM
        // rootContainer.appendChild(fragment);
        rootContainer.replaceChildren(fragment);
    }
}
