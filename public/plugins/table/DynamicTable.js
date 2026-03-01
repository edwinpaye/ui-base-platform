import { BaseWebComponent } from '/src/infrastructure/ui/components/BaseWebComponent.js';
// import { ExecuteCrudOperation } from '/src/application/use-cases/ExecuteCrudOperation.js';

/**
 * Enterprise Table Component
 * A metadata-driven, configurable vanilla JS table.
 */
export default class DynamicTable extends BaseWebComponent {
    constructor() {
        super();
        // Bind methods
        this.handleSort = this.handleSort.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleRowAction = this.handleRowAction.bind(this);
        this.toggleDropdown = this.toggleDropdown.bind(this);
        this.handleGlobalSelect = this.handleGlobalSelect.bind(this);
        this.handleRowSelect = this.handleRowSelect.bind(this);
        this.closeModal = this.closeModal.bind(this);
        this.handleModalSubmit = this.handleModalSubmit.bind(this);
    }
    getStyles() {
        return `
            @import url('/public/plugins/table/Table.css');
            ${super.getStyles()}
        `;
    }

    getTemplate() {
        if (this.error) {
            return `<div class="error animate-fade-in">${this.error}</div>`;
        }

        return `
            <div id="table-root"></div>

            <!-- Modal for Edit/Create -->
            <div id="crud-modal" class="et-modal-overlay">
                <div class="et-modal">
                    <h3 id="modal-title">Edit Item</h3>
                    <form id="modal-form">
                        <div id="modal-fields"></div>
                        <div class="et-modal-footer">
                            <button type="button" class="et-btn" id="modal-cancel">Cancel</button>
                            <button type="submit" class="et-btn primary" id="modal-save">Save</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="toast-container" class="et-toast-container"></div>
        `;
    }

    onRender() {
        this.rootId = this.getAttribute('rootId');
        this.root = this.shadowRoot.getElementById(this.rootId);
        this.metadata = this.getAttribute('tableData') ? JSON.parse(this.getAttribute('tableData')) : {}
        this.config = {
            sortable: true,
            pagination: true,
            pageSize: 5,
            selectable: true,
            searchable: true,
            actions: ['edit', 'delete', 'view'], // Available actions in kebab
            ...(this.getAttribute('config') ? JSON.parse(this.getAttribute('config')) : {})
        };

        // Internal State
        this.state = {
            data: Array.from({ length: 25 }, (_, i) => ({
                id: i + 1,
                name: `Employee ${i + 1}`,
                email: `employee${i + 1}@company.com`,
                role: i % 3 === 0 ? 'Manager' : 'Developer',
                department: ['Engineering', 'HR', 'Sales'][i % 3],
                status: ['Active', 'Inactive', 'Pending'][i % 3],
                joinDate: (10 + (i % 20)) + '/01/2023'
            })),
            currentPage: 1,
            sortColumn: null,
            sortDirection: 'asc', // 'asc' or 'desc'
            selectedIds: new Set(),
            searchQuery: '',
            openDropdownId: null // ID of the row whose menu is open
        };

        this.init();
    }

    init() {
        this.renderContainer();
        this.renderTable();
        this.attachGlobalEvents();
    }

    // --- Rendering Logic ---

    renderContainer() {
        this.root.innerHTML = '';
        const container = document.createElement('div');
        container.className = 'et-container';

        // Toolbar
        if (this.config.searchable || this.config.actions.includes('create')) {
            const toolbar = document.createElement('div');
            toolbar.className = 'et-toolbar';

            const leftDiv = document.createElement('div');
            leftDiv.className = 'et-title';
            leftDiv.textContent = this.config.title || 'Data Table';

            const rightDiv = document.createElement('div');
            rightDiv.className = 'et-actions';

            if (this.config.searchable) {
                const searchWrap = document.createElement('div');
                searchWrap.className = 'et-search';
                const input = document.createElement('input');
                input.type = 'text';
                input.placeholder = 'Search...';
                input.addEventListener('input', (e) => this.handleSearch(e.target.value));
                searchWrap.appendChild(input);
                rightDiv.appendChild(searchWrap);
            }

            if (this.config.actions.includes('create')) {
                const createBtn = document.createElement('button');
                createBtn.className = 'et-btn primary';
                createBtn.textContent = '+ Add New';
                createBtn.onclick = () => this.openModal();
                rightDiv.appendChild(createBtn);
            }

            toolbar.appendChild(leftDiv);
            toolbar.appendChild(rightDiv);
            container.appendChild(toolbar);
        }

        // Table Wrapper
        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'et-table-wrapper';
        this.tableElement = document.createElement('table');
        this.tableElement.id = this.rootId + '-table';
        this.tableElement.innerHTML = `
            <thead>
                <tr id="et-header-row"></tr>
            </thead>
            <tbody id="et-body"></tbody>
        `;
        tableWrapper.appendChild(this.tableElement);
        container.appendChild(tableWrapper);

        // Footer (Pagination)
        if (this.config.pagination) {
            const footer = document.createElement('div');
            footer.className = 'et-footer';
            footer.id = 'et-footer';
            container.appendChild(footer);
        }

        this.root.appendChild(container);
    }

    renderTable() {
        this.renderHeader();
        this.renderBody();
        if (this.config.pagination) this.renderFooter();
    }

    renderHeader() {
        const tr = this.shadowRoot.getElementById('et-header-row');
        tr.innerHTML = '';

        if (this.config.selectable) {
            const th = document.createElement('th');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'et-checkbox';
            checkbox.addEventListener('click', () => this.handleGlobalSelect(checkbox.checked));
            th.appendChild(checkbox);
            tr.appendChild(th);
        }

        this.metadata.columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.header;
            if (this.config.sortable && col.sortable !== false) {
                th.classList.add('sortable');
                if (this.state.sortColumn === col.field) {
                    th.classList.add('active');
                    th.innerHTML = `${col.header} <span class="sort-icon">${this.state.sortDirection === 'asc' ? '▲' : '▼'}</span>`;
                }
                th.onclick = () => this.handleSort(col.field);
            }
            tr.appendChild(th);
        });

        // Action column
        if (this.config.actions.length > 0) {
            const th = document.createElement('th');
            th.style.textAlign = 'right';
            th.textContent = 'Actions';
            tr.appendChild(th);
        }
    }

    getProcessedData() {
        let data = [...this.state.data];

        // 1. Filter
        if (this.state.searchQuery) {
            const lowerQuery = this.state.searchQuery.toLowerCase();
            data = data.filter(row => {
                return this.metadata.columns.some(col => {
                    const val = row[col.field];
                    return String(val).toLowerCase().includes(lowerQuery);
                });
            });
        }

        // 2. Sort
        if (this.state.sortColumn) {
            const colDef = this.metadata.columns.find(c => c.field === this.state.sortColumn);
            data.sort((a, b) => {
                const valA = a[this.state.sortColumn];
                const valB = b[this.state.sortColumn];

                if (colDef && typeof colDef.sortValue === 'function') {
                    return colDef.sortValue(valA, valB, this.state.sortDirection);
                }

                if (valA < valB) return this.state.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.state.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }

    renderBody() {
        const tbody = this.shadowRoot.getElementById('et-body');
        tbody.innerHTML = '';

        const processedData = this.getProcessedData();
        const totalPages = this.config.pagination ? Math.ceil(processedData.length / this.config.pageSize) : 1;

        // Adjust current page if out of bounds
        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages || 1;

        const startIndex = (this.state.currentPage - 1) * this.config.pageSize;
        const endIndex = this.config.pagination ? startIndex + this.config.pageSize : processedData.length;
        const pageData = processedData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = this.metadata.columns.length + (this.config.selectable ? 1 : 0) + (this.config.actions.length ? 1 : 0);
            td.className = 'et-empty-state';
            td.textContent = 'No data found';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        pageData.forEach(row => {
            const tr = document.createElement('tr');
            if (this.state.selectedIds.has(row.id)) tr.classList.add('selected');

            if (this.config.selectable) {
                const td = document.createElement('td');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'et-checkbox';
                checkbox.checked = this.state.selectedIds.has(row.id);
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation();
                    this.handleRowSelect(row.id, e.target.checked);
                });
                td.appendChild(checkbox);
                tr.appendChild(td);
            }

            this.metadata.columns.forEach(col => {
                const td = document.createElement('td');
                if (col.render) {
                    // td.innerHTML = col.render(row[col.field], row);
                    const result = col.render.replace(/\$\{(\w+)\}/g, (match, key) => {
                        return row[key] !== undefined ? row[key] : match;
                    });
                    td.innerHTML = result;
                } else {
                    td.textContent = row[col.field];
                }
                tr.appendChild(td);
            });

            if (this.config.actions.length > 0) {
                const td = document.createElement('td');
                td.className = 'et-action-cell';

                const btn = document.createElement('button');
                btn.className = `et-kebab-btn ${this.state.openDropdownId === row.id ? 'active' : ''}`;
                btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(row.id);
                };

                const menu = document.createElement('div');
                menu.className = `et-dropdown-menu ${this.state.openDropdownId === row.id ? 'show' : ''}`;
                menu.onclick = (e) => e.stopPropagation();

                if (this.config.actions.includes('view')) {
                    this.addMenuItem(menu, 'View', () => this.handleRowAction('view', row));
                }
                if (this.config.actions.includes('edit')) {
                    this.addMenuItem(menu, 'Edit', () => this.handleRowAction('edit', row));
                }
                if (this.config.actions.includes('delete')) {
                    this.addMenuItem(menu, 'Delete', () => this.handleRowAction('delete', row), true);
                }

                td.appendChild(btn);
                td.appendChild(menu);
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        });
    }

    addMenuItem(menu, text, callback, isDanger = false) {
        const btn = document.createElement('button');
        btn.className = `et-dropdown-item ${isDanger ? 'danger' : ''}`;
        btn.textContent = text;
        btn.onclick = () => {
            callback();
            this.state.openDropdownId = null;
            this.renderTable(); // Re-render to close menu
        };
        menu.appendChild(btn);
    }

    renderFooter() {
        const footer = this.shadowRoot.getElementById('et-footer');
        footer.innerHTML = '';

        const processedData = this.getProcessedData();
        const totalItems = processedData.length;
        const totalPages = Math.ceil(totalItems / this.config.pageSize);

        const info = document.createElement('div');
        info.textContent = `Showing ${totalItems === 0 ? 0 : (this.state.currentPage - 1) * this.config.pageSize + 1} to ${Math.min(this.state.currentPage * this.config.pageSize, totalItems)} of ${totalItems} entries`;
        footer.appendChild(info);

        const pagination = document.createElement('div');
        pagination.className = 'et-pagination';

        const prevBtn = document.createElement('button');
        prevBtn.className = 'et-btn';
        prevBtn.textContent = 'Previous';
        prevBtn.disabled = this.state.currentPage === 1;
        prevBtn.onclick = () => this.handlePageChange(this.state.currentPage - 1);

        const pageInfo = document.createElement('span');
        pageInfo.className = 'et-page-info';
        pageInfo.textContent = `${this.state.currentPage} / ${totalPages || 1}`;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'et-btn';
        nextBtn.textContent = 'Next';
        nextBtn.disabled = this.state.currentPage === totalPages || totalPages === 0;
        nextBtn.onclick = () => this.handlePageChange(this.state.currentPage + 1);

        pagination.appendChild(prevBtn);
        pagination.appendChild(pageInfo);
        pagination.appendChild(nextBtn);
        footer.appendChild(pagination);
    }

    // --- Event Handlers ---

    handleSort(column) {
        if (this.state.sortColumn === column) {
            this.state.sortDirection = this.state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortColumn = column;
            this.state.sortDirection = 'asc';
        }
        this.renderTable();
    }

    handlePageChange(page) {
        if (page < 1) return;
        this.state.currentPage = page;
        this.renderTable();
    }

    handleSearch(query) {
        this.state.searchQuery = query;
        this.state.currentPage = 1; // Reset to first page
        this.renderTable();
    }

    handleRowSelect(id, checked) {
        if (checked) {
            this.state.selectedIds.add(id);
        } else {
            this.state.selectedIds.delete(id);
        }
        this.renderTable();
    }

    handleGlobalSelect(checked) {
        const currentData = this.getProcessedData();
        // const currentData = this.getProcessedData().slice(
        //     (this.state.currentPage - 1) * this.config.pageSize,
        //     this.state.currentPage * this.config.pageSize
        // );

        currentData.forEach(row => {
            if (checked) this.state.selectedIds.add(row.id);
            else this.state.selectedIds.delete(row.id);
        });
        this.renderTable();
        this.renderBody();
    }

    toggleDropdown(id) {
        // Toggle logic: if same id, close it. If different, open new one.
        if (this.state.openDropdownId === id) {
            this.state.openDropdownId = null;
        } else {
            this.state.openDropdownId = id;
        }
        this.renderTable(); // Efficient enough for vanilla JS tables
    }

    // --- CRUD & Modal Logic ---

    handleRowAction(action, row) {
        if (action === 'delete') {
            if (confirm(`Are you sure you want to delete item "${row.name || row.id}"?`)) {
                this.state.data = this.state.data.filter(item => item.id !== row.id);
                this.showToast('Item deleted successfully', 'success');
                this.renderTable();
            }
        } else if (action === 'edit') {
            this.openModal(row);
        } else if (action === 'view') {
            this.showToast(`Viewing item ID: ${row.id}`, 'info');
        }
    }

    openModal(row = null) {
        const modal = this.shadowRoot.getElementById('crud-modal');
        const title = this.shadowRoot.getElementById('modal-title');
        const fieldsContainer = this.shadowRoot.getElementById('modal-fields');
        const form = this.shadowRoot.getElementById('modal-form');

        this.currentEditingId = row ? row.id : null;
        title.textContent = row ? 'Edit Item' : 'Add New Item';
        fieldsContainer.innerHTML = '';

        // Generate fields based on metadata columns (simplified for demo)
        // In a real scenario, you might have separate 'formFields' metadata
        this.metadata.columns.filter(col => col.field !== 'id').forEach(col => {
            const wrapper = document.createElement('div');
            wrapper.className = 'et-modal-field';

            const label = document.createElement('label');
            label.textContent = col.header;

            let input;
            if (col.type === 'select') {
                input = document.createElement('select');
                // Mock options
                ['Active', 'Inactive', 'Pending'].forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    if (row && row[col.field] === opt) option.selected = true;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = col.type || 'text';
                input.value = row ? row[col.field] : '';
            }

            input.name = col.field;
            wrapper.appendChild(label);
            wrapper.appendChild(input);
            fieldsContainer.appendChild(wrapper);
        });

        modal.classList.add('open');
    }

    closeModal() {
        this.shadowRoot.getElementById('crud-modal').classList.remove('open');
        this.currentEditingId = null;
    }

    handleModalSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newData = {};

        formData.forEach((value, key) => newData[key] = value);

        if (this.currentEditingId) {
            // Update
            const index = this.state.data.findIndex(item => item.id === this.currentEditingId);
            if (index !== -1) {
                this.state.data[index] = { ...this.state.data[index], ...newData };
                this.showToast('Item updated successfully', 'success');
            }
        } else {
            // Create
            const newId = Math.max(...this.state.data.map(i => i.id), 0) + 1;
            this.state.data.unshift({ id: newId, ...newData });
            this.showToast('Item created successfully', 'success');
        }

        this.closeModal();
        this.renderTable();
    }

    // --- Utilities ---

    attachGlobalEvents() {
        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (this.state.openDropdownId !== null) {
                this.state.openDropdownId = null;
                this.renderTable();
            }
        });

        // Modal events
        this.shadowRoot.getElementById('modal-cancel').addEventListener('click', this.closeModal);
        this.shadowRoot.getElementById('modal-form').addEventListener('submit', this.handleModalSubmit);

        // Close modal on outside click
        this.shadowRoot.getElementById('crud-modal').addEventListener('click', (e) => {
            if (e.target.id === 'crud-modal') this.closeModal();
        });
    }

    showToast(message, type = 'info') {
        const container = this.shadowRoot.getElementById('toast-container');
        const toast = this.shadowRoot.createElement('div');
        toast.className = 'et-toast';

        let color = 'var(--primary-color)';
        if (type === 'success') color = 'var(--success-color)';
        if (type === 'error') color = 'var(--danger-color)';

        toast.style.borderLeftColor = color;
        toast.innerHTML = `
            <span>${message}</span>
            <button style="background:none;border:none;cursor:pointer;font-size:1.2rem;margin-left:10px;" onclick="this.parentElement.remove()">&times;</button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// --- Example Usage ---

// Define Metadata
// const tableMetadata = {
//     columns: [
//         { field: 'id', header: 'ID', sortable: false },
//         {
//             field: 'name',
//             header: 'Employee Name',
//             render: (val, row) => `<div style="font-weight:500;">${val}</div><div style="font-size:12px;color:#64748b">${row.email}</div>`
//         },
//         { field: 'role', header: 'Role' },
//         { field: 'department', header: 'Department' },
//         {
//             field: 'status',
//             header: 'Status',
//             render: (val) => {
//                 const map = {
//                     'Active': 'et-badge-success',
//                     'Inactive': 'et-badge-danger',
//                     'Pending': 'et-badge-warning'
//                 };
//                 const cls = map[val] || 'et-badge-warning';
//                 return `<span class="et-badge ${cls}">${val}</span>`;
//             }
//         },
//         { field: 'joinDate', header: 'Join Date' }
//     ],
//     // Mock Data
//     data: Array.from({ length: 25 }, (_, i) => ({
//         id: i + 1,
//         name: `Employee ${i + 1}`,
//         email: `employee${i + 1}@company.com`,
//         role: i % 3 === 0 ? 'Manager' : 'Developer',
//         department: ['Engineering', 'HR', 'Sales'][i % 3],
//         status: ['Active', 'Inactive', 'Pending'][i % 3],
//         joinDate: (10 + (i % 20)) + '/01/2023'
//     }))
// };

// Initialize Table
// const myTable = new DynamicTable('table-root', tableMetadata, {
//     title: 'Employee Directory',
//     pageSize: 10,
//     sortable: true,
//     selectable: true,
//     searchable: true,
//     actions: ['view', 'edit', 'delete', 'create'] // 'create' adds a global button
// });

// function tableToCSV() {
//     const table = document.querySelector('table');
//     const rows = Array.from(table.querySelectorAll('tr'));

//     // Extract data into a 2D array
//     const data = rows.map(row =>
//         Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText)
//     );

//     // Escape CSV values and handle line endings
//     function escapeCSV(str) {
//         if (str === null || str === undefined) return '';
//         str = String(str);
//         if (/[,"\n\r]/.test(str)) {
//             return `"${str.replace(/"/g, '""')}"`;
//         }
//         return str;
//     }

//     // Generate CSV with BOM and proper line endings
//     const csv = data.map(row =>
//         row.map(cell => escapeCSV(cell)).join(',')
//     ).join('\r\n');

//     const bom = '\uFEFF'; // UTF-8 BOM
//     const csvWithBOM = bom + csv;

//     // Create Blob and trigger download
//     const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = 'table_export.csv'; // Use .csv for clarity
//     a.click();
//     URL.revokeObjectURL(url);
// }

// function tableToXLS() {
//     const table = document.getElementById("table-root-table").outerHTML;
//     let url = 'data:application/vnd.ms-excel,' + encodeURIComponent(table);
//     let a = document.createElement("a");

//     a.href = url;
//     a.download = "datos.xls";

//     a.click();
// }

// function jsonToExcelSafe(data, filename = 'data.xls') {
//     if (!Array.isArray(data) || data.length === 0) {
//         throw new Error('Data must be a non-empty array');
//     }

//     const headers = Object.keys(data[0]);

//     const xml =
//         `<?xml version="1.0" encoding="UTF-8"?>
// <?mso-application progid="Excel.Sheet"?>
// <Workbook
//  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
//  xmlns:o="urn:schemas-microsoft-com:office:office"
//  xmlns:x="urn:schemas-microsoft-com:office:excel"
//  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">

//   <Worksheet ss:Name="Sheet1">
//     <Table>

//       <Row>
//         ${headers.map(h =>
//             `<Cell><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`
//         ).join('')}
//       </Row>

//       ${data.map(row =>
//             `<Row>
//           ${headers.map(h => {
//                 const v = row[h];
//                 const type = typeof v === 'number' ? 'Number' : 'String';
//                 return `<Cell><Data ss:Type="${type}">${xmlEscape(v)}</Data></Cell>`;
//             }).join('')}
//         </Row>`
//         ).join('')}

//     </Table>
//   </Worksheet>
// </Workbook>`;

//     const blob = new Blob([xml], {
//         type: 'application/vnd.ms-excel;charset=utf-8;'
//     });

//     download(blob, filename);
// }

// function xmlEscape(value) {
//     if (value === null || value === undefined) return '';
//     return String(value)
//         .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // control chars
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&apos;');
// }

// function download(blob, filename) {
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(link.href);
// }

// function escapeXml(value) {
//     return String(value)
//         .replace(/&/g, '&amp;')
//         .replace(/</g, '&lt;')
//         .replace(/>/g, '&gt;')
//         .replace(/"/g, '&quot;')
//         .replace(/'/g, '&apos;');
// }

// function downloadBlob(blob, filename) {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
// }

// function downloadXLSX() {
//     this.jsonToExcelSafe(tableMetadata.data);
// }









// /**
//  * Converts an XLS/XLSX file to an HTML table element.
//  * @param {File} file - The uploaded XLS/XLSX file.
//  * @returns {Promise<HTMLTableElement>} Resolves to the generated <table> element.
//  */
// async function xlsToTable(file) {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();

//     // Determine file type and handle accordingly
//     if (file.type === "application/vnd.ms-excel" || file.name.endsWith(".xls")) {
//       // Handle XLS (treated as CSV)
//       reader.readAsText(file, "ISO-8859-1"); // XLS often uses this encoding
//     } else if (
//       file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
//       file.name.endsWith(".xlsx")
//     ) {
//       // Handle XLSX (read as ArrayBuffer for binary data)
//       reader.readAsArrayBuffer(file);
//     } else {
//       reject(new Error("Unsupported file type. Use .xls or .xlsx"));
//       return;
//     }

//     reader.onload = async () => {
//       try {
//         const table = document.createElement("table");
//         table.setAttribute("border", "1");

//         let data;
//         if (file.name.endsWith(".xlsx")) {
//           // Parse XLSX (simplified XML-based approach)
//           data = await parseXLSX(reader.result);
//         } else {
//           // Parse XLS as CSV
//           data = parseXLSAsCSV(reader.result);
//         }

//         // Build HTML table rows/columns
//         data.forEach((row, rowIndex) => {
//           const tr = table.insertRow();
//           row.forEach((cellValue) => {
//             const td = tr.insertCell();
//             td.textContent = cellValue || ""; // Handle empty cells
//           });
//         });

//         resolve(table);
//       } catch (error) {
//         reject(error);
//       }
//     };

//     reader.onerror = () => reject(new Error("File reading failed"));
//   });
// }

// /* ---------------------------- Helper Functions ---------------------------- */

// /**
//  * Parses XLS as CSV (comma-separated values).
//  * @param {string} content - Raw XLS file content as text.
//  * @returns {Array<Array<string>>} 2D array of rows/columns.
//  */
// function parseXLSAsCSV(content) {
//   return content
//     .split(/\r\n|\n/) // Split rows
//     .map((line) =>
//       line.split(/\t|,/) // Split columns (tab or comma)
//            .map((cell) => cell.trim()) // Trim whitespace
//     );
// }

// /**
//  * Parses XLSX by extracting the first worksheet XML (simplified).
//  * @param {ArrayBuffer} buffer - Raw XLSX file content.
//  * @returns {Promise<Array<Array<string>>>>} 2D array of rows/columns.
//  */
// async function parseXLSX(buffer) {
//   // XLSX is a ZIP archive containing XML files.
//   // We extract the first worksheet XML manually (no dependencies).

//   // Convert ArrayBuffer to Blob and trigger download (workaround to parse XML)
//   const blob = new Blob([buffer], { type: "application/zip" });
//   const url = URL.createObjectURL(blob);
//   const zip = await fetch(url).then((res) => res.arrayBuffer());

//   // In a real scenario, use a ZIP library to extract XML.
//   // This is a simplified demo for **very basic XLSX files only**.
//   // For production, use `JSZip` or `SheetJS`.

//   // Placeholder: Assume the first sheet is at `xl/worksheets/sheet1.xml`
//   // (This requires manual ZIP extraction, which we skip here.)
//   throw new Error(
//     "XLSX parsing requires ZIP/XML extraction (use JSZip in production)."
//   );
// }

// // HTML: <input type="file" id="fileInput" accept=".xls,.xlsx">

// document.getElementById("fileInput").addEventListener("change", async (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   try {
//     const table = await xlsToTable(file);
//     document.getElementById("tableContainer").appendChild(table); // Render table
//   } catch (error) {
//     console.error("Conversion failed:", error);
//     alert("Failed to parse file. Ensure it’s a simple spreadsheet.");
//   }
// });
