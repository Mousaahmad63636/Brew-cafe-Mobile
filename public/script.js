document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date');
    const periodButtons = document.querySelectorAll('.period-filter button');
    const employeeSelect = document.getElementById('employee-select');
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    
    // Dashboard elements
    const totalSalesEl = document.querySelector('#total-sales .value');
    const totalTransactionsEl = document.querySelector('#total-transactions .value');
    const totalExpenseEl = document.querySelector('#total-expense .value');
    const totalProfitEl = document.querySelector('#total-profit .value');
    const openDrawersEl = document.querySelector('#open-drawers .value');
    const pendingInvoicesEl = document.querySelector('#pending-invoices .value');
    const customerPaymentsEl = document.querySelector('#customer-payments .value');
    const availableTablesEl = document.querySelector('#available-tables .value');
    
    // Loading and error elements
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const noDataEl = document.getElementById('no-data');
    
    // Sales section elements
    const transactionsTable = document.getElementById('transactions-table');
    const transactionsBody = document.getElementById('transactions-body');
    const transactionCards = document.getElementById('transaction-cards');
    
    // Filter elements
    const drawerStatusFilter = document.getElementById('drawer-status-filter');
    const supplierStatusFilter = document.getElementById('supplier-status-filter');
    const paymentMethodFilter = document.getElementById('payment-method-filter');
    const inventoryTypeFilter = document.getElementById('inventory-type-filter');
    const tableStatusFilter = document.getElementById('table-status-filter');
    
    let currentPeriod = 'today';
    let selectedEmployee = 'all';
    let currentSection = 'dashboard';
    
    const today = new Date();
    const formattedDate = formatDate(today);
    dateInput.value = formattedDate;
    
    // Initialize with animations
    document.body.classList.add('animate-fade-in');
    fetchEmployees().then(() => {
        loadDashboardData(formattedDate);
    });
    
    // Add animation classes to sections when they become visible
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);
    
    // Observe all cards for animation
    document.querySelectorAll('.summary-card, .data-container, .transaction-card').forEach(card => {
        observer.observe(card);
    });
    
    // Navigation event listeners
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            switchSection(section);
        });
    });
    
    dateInput.addEventListener('change', function() {
        const date = this.value;
        if (currentSection === 'dashboard') {
            loadDashboardData(date);
        } else if (currentSection === 'sales') {
            fetchSalesData(date, 'custom', selectedEmployee);
        } else {
            loadSectionData(currentSection, date);
        }
        
        periodButtons.forEach(button => {
            button.classList.remove('active');
        });
    });
    
    employeeSelect.addEventListener('change', function() {
        selectedEmployee = this.value;
        if (currentSection === 'sales') {
            fetchSalesData(dateInput.value, currentPeriod, selectedEmployee);
        }
    });
    
    // Filter event listeners
    if (drawerStatusFilter) {
        drawerStatusFilter.addEventListener('change', function() {
            if (currentSection === 'drawers') {
                loadDrawersData(dateInput.value, this.value);
            }
        });
    }
    
    if (supplierStatusFilter) {
        supplierStatusFilter.addEventListener('change', function() {
            if (currentSection === 'suppliers') {
                loadSuppliersData(dateInput.value, this.value);
            }
        });
    }
    
    if (paymentMethodFilter) {
        paymentMethodFilter.addEventListener('change', function() {
            if (currentSection === 'customers') {
                loadCustomersData(dateInput.value, this.value);
            }
        });
    }
    
    if (inventoryTypeFilter) {
        inventoryTypeFilter.addEventListener('change', function() {
            if (currentSection === 'inventory') {
                loadInventoryData(dateInput.value, this.value);
            }
        });
    }
    
    if (tableStatusFilter) {
        tableStatusFilter.addEventListener('change', function() {
            if (currentSection === 'restaurant') {
                loadRestaurantData(this.value);
            }
        });
    }
    
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            currentPeriod = period;
            
            periodButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            this.classList.add('active');
            
            let date;
            switch(period) {
                case 'today':
                    date = formatDate(new Date());
                    break;
                case 'week':
                    date = getStartOfWeek();
                    break;
                case 'month':
                    date = getStartOfMonth();
                    break;
                default:
                    date = formatDate(new Date());
            }
            
            dateInput.value = date;
            if (currentSection === 'dashboard') {
                loadDashboardData(date);
            } else if (currentSection === 'sales') {
                fetchSalesData(date, period, selectedEmployee);
            } else {
                loadSectionData(currentSection, date);
            }
        });
    });
    
    async function fetchEmployees() {
        try {
            const response = await fetch('/api/employees');
            if (!response.ok) {
                throw new Error('فشل في جلب بيانات الموظفين');
            }
            
            const employees = await response.json();
            
            while (employeeSelect.options.length > 1) {
                employeeSelect.remove(1);
            }
            
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp._id;
                option.textContent = emp.name;
                employeeSelect.appendChild(option);
            });
            
        } catch (err) {
            console.error('Error fetching employees:', err);
        }
    }
    
    function fetchSalesData(date, period, employeeId) {
        showLoading();
        
        let url = `/api/sales?date=${date}`;
        if(period) {
            url += `&period=${period}`;
        }
        if(employeeId && employeeId !== 'all') {
            url += `&employee=${employeeId}`;
        }
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('فشل في جلب البيانات');
                }
                return response.json();
            })
            .then(data => {
                hideLoading();
                data.summary.startDate = new Date(data.summary.startDate);
                data.summary.endDate = new Date(data.summary.endDate);
                displayData(data);
            })
            .catch(err => {
                hideLoading();
                showError('خطأ في تحميل بيانات المبيعات. يرجى المحاولة لاحقاً.');
                console.error(err);
            });
    }
    
    function displayData(data) {
        const { transactions, summary } = data;
        
        totalSalesEl.textContent = `$${summary.totalSales.toFixed(2)}`;
        totalTransactionsEl.textContent = summary.totalTransactions;
        totalExpenseEl.textContent = `$${summary.totalExpense.toFixed(2)}`;
        
        const profit = summary.totalSales - summary.totalExpense;
        totalProfitEl.textContent = `$${profit.toFixed(2)}`;

        // Clear previous content
        transactionsBody.innerHTML = '';
        transactionCards.innerHTML = '';
        
        if (transactions.length === 0) {
            noDataEl.style.display = 'block';
            transactionsTable.style.display = 'none';
            transactionCards.style.display = 'none';
        } else {
            noDataEl.style.display = 'none';
            transactionCards.style.display = 'flex';
            
            transactions.forEach(tx => {
                // Process transaction data
                const txDate = new Date(tx.transactionDate);
                const formattedDate = `${txDate.getDate()}/${txDate.getMonth() + 1}/${txDate.getFullYear()} ${txDate.getHours().toString().padStart(2, '0')}:${txDate.getMinutes().toString().padStart(2, '0')}`;
                
                const rawAmount = tx.totalAmount;
                const amount = !isNaN(parseFloat(rawAmount)) ? parseFloat(rawAmount) : 0;
                
                // Create card for mobile view
                const card = document.createElement('div');
                card.className = 'transaction-card';
                
                card.innerHTML = `
                    <div class="transaction-card-header">
                        <div class="transaction-id">#${tx.transactionId}</div>
                        <div class="transaction-amount">$${amount.toFixed(2)}</div>
                    </div>
                    <div class="transaction-detail">
                        <div class="detail-label">العميل:</div>
                        <div class="detail-value">${tx.customerName || 'عميل عابر'}</div>
                    </div>
                    <div class="transaction-detail">
                        <div class="detail-label">الموظف:</div>
                        <div class="detail-value">${tx.cashierName || 'غير محدد'}</div>
                    </div>
                    <div class="transaction-detail">
                        <div class="detail-label">التاريخ:</div>
                        <div class="detail-value">${formattedDate}</div>
                    </div>
                `;
                
                transactionCards.appendChild(card);
                
                // Also create row for table (for larger screens)
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${tx.transactionId}</td>
                    <td>${tx.customerName || 'عميل عابر'}</td>
                    <td>${tx.cashierName || 'غير محدد'}</td>
                    <td>$${amount.toFixed(2)}</td>
                `;
                
                transactionsBody.appendChild(row);
            });
        }
    }
    
    function showLoading() {
        loadingEl.style.display = 'flex';
        errorEl.style.display = 'none';
        noDataEl.style.display = 'none';
        transactionsTable.style.display = 'none';
        transactionCards.style.display = 'none';
    }
    
    function hideLoading() {
        loadingEl.style.display = 'none';
    }
    
    function showError(message) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        noDataEl.style.display = 'none';
        transactionsTable.style.display = 'none';
        transactionCards.style.display = 'none';
    }
    
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    function getStartOfWeek() {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(now.setDate(diff));
        return formatDate(startOfWeek);
    }
    
    function getStartOfMonth() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return formatDate(startOfMonth);
    }
    
    // Section management functions
    function switchSection(section) {
        currentSection = section;
        
        // Update navigation
        navButtons.forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Hide all sections
        sections.forEach(sec => sec.style.display = 'none');
        
        // Show selected section
        const targetSection = document.getElementById(`${section}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Load section data
        loadSectionData(section, dateInput.value);
    }
    
    function loadSectionData(section, date) {
        switch(section) {
            case 'dashboard':
                loadDashboardData(date);
                break;
            case 'sales':
                fetchSalesData(date, currentPeriod, selectedEmployee);
                break;
            case 'drawers':
                loadDrawersData(date);
                break;
            case 'suppliers':
                loadSuppliersData(date);
                break;
            case 'customers':
                loadCustomersData(date);
                break;
            case 'inventory':
                loadInventoryData(date);
                break;
            case 'restaurant':
                loadRestaurantData();
                break;
        }
    }
    
    // Dashboard data loading
    async function loadDashboardData(date) {
        try {
            const response = await fetch(`/api/dashboard-summary?date=${date}`);
            if (!response.ok) throw new Error('Failed to fetch dashboard data');
            
            const data = await response.json();
            
            // Update dashboard cards
            if (totalSalesEl) totalSalesEl.textContent = `$${data.sales.totalAmount.toFixed(2)}`;
            if (totalTransactionsEl) totalTransactionsEl.textContent = data.sales.transactionCount;
            if (totalExpenseEl) totalExpenseEl.textContent = `$${data.expenses.totalAmount.toFixed(2)}`;
            if (totalProfitEl) totalProfitEl.textContent = `$${data.profit.toFixed(2)}`;
            if (openDrawersEl) openDrawersEl.textContent = data.drawers.openCount;
            if (pendingInvoicesEl) pendingInvoicesEl.textContent = data.suppliers.pendingInvoices;
            if (customerPaymentsEl) customerPaymentsEl.textContent = `$${data.customers.paymentsToday.toFixed(2)}`;
            if (availableTablesEl) availableTablesEl.textContent = data.restaurant.availableTables;
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    // Drawers data loading
    async function loadDrawersData(date, status = '') {
        try {
            let url = `/api/drawers?date=${date}`;
            if (status) url += `&status=${status}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch drawers data');
            
            const drawers = await response.json();
            const container = document.getElementById('drawers-container');
            
            if (container) {
                container.innerHTML = drawers.map(drawer => `
                    <div class="drawer-card">
                        <div class="card-header">
                            <span>درج #${drawer.drawerId}</span>
                            <span class="status-badge status-${drawer.status.toLowerCase()}">${drawer.status}</span>
                        </div>
                        <div class="card-body">
                            <div><strong>الكاشير:</strong> ${drawer.cashierName}</div>
                            <div><strong>الرصيد الحالي:</strong> <span class="amount">$${drawer.currentBalance.toFixed(2)}</span></div>
                            <div><strong>المبيعات:</strong> <span class="amount">$${drawer.totalSales.toFixed(2)}</span></div>
                            <div><strong>المصروفات:</strong> <span class="amount negative">$${drawer.totalExpenses.toFixed(2)}</span></div>
                            <div><strong>فتح في:</strong> <span class="date-time">${new Date(drawer.openedAt).toLocaleString('ar-EG')}</span></div>
                            ${drawer.closedAt ? `<div><strong>أغلق في:</strong> <span class="date-time">${new Date(drawer.closedAt).toLocaleString('ar-EG')}</span></div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading drawers data:', error);
        }
    }
    
    // Suppliers data loading
    async function loadSuppliersData(date, status = '') {
        try {
            let url = `/api/supplier-invoices?date=${date}`;
            if (status) url += `&status=${status}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch suppliers data');
            
            const data = await response.json();
            const container = document.getElementById('suppliers-container');
            const summaryContainer = document.getElementById('supplier-summary');
            
            // Update summary
            if (summaryContainer) {
                summaryContainer.innerHTML = `
                    <div class="summary-card">
                        <h3>إجمالي الفواتير</h3>
                        <p class="value">${data.summary.totalInvoices}</p>
                    </div>
                    <div class="summary-card">
                        <h3>إجمالي المبلغ</h3>
                        <p class="value amount">$${data.summary.totalAmount.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h3>المدفوع</h3>
                        <p class="value amount">$${data.summary.totalPaid.toFixed(2)}</p>
                    </div>
                    <div class="summary-card">
                        <h3>المتبقي</h3>
                        <p class="value amount negative">$${data.summary.totalOutstanding.toFixed(2)}</p>
                    </div>
                `;
            }
            
            // Update invoices list
            if (container) {
                container.innerHTML = data.invoices.map(invoice => `
                    <div class="invoice-card">
                        <div class="card-header">
                            <span>فاتورة #${invoice.invoiceNumber}</span>
                            <span class="status-badge status-${invoice.status.toLowerCase()}">${invoice.status}</span>
                        </div>
                        <div class="card-body">
                            <div><strong>المورد:</strong> ${invoice.supplierId}</div>
                            <div><strong>المبلغ الإجمالي:</strong> <span class="amount">$${invoice.totalAmount.toFixed(2)}</span></div>
                            <div><strong>المدفوع:</strong> <span class="amount">$${invoice.amountPaid.toFixed(2)}</span></div>
                            <div><strong>المتبقي:</strong> <span class="amount negative">$${(invoice.totalAmount - invoice.amountPaid).toFixed(2)}</span></div>
                            <div><strong>تاريخ الفاتورة:</strong> <span class="date-time">${new Date(invoice.invoiceDate).toLocaleDateString('ar-EG')}</span></div>
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading suppliers data:', error);
        }
    }
    
    // Customers data loading
    async function loadCustomersData(date, paymentMethod = '') {
        try {
            let url = `/api/customer-payments?date=${date}`;
            if (paymentMethod) url += `&paymentMethod=${paymentMethod}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch customers data');
            
            const data = await response.json();
            const container = document.getElementById('customers-container');
            const summaryContainer = document.getElementById('customer-summary');
            
            // Update summary
            if (summaryContainer) {
                summaryContainer.innerHTML = `
                    <div class="summary-card">
                        <h3>عدد المدفوعات</h3>
                        <p class="value">${data.summary.totalPayments}</p>
                    </div>
                    <div class="summary-card">
                        <h3>إجمالي المبلغ</h3>
                        <p class="value amount">$${data.summary.totalAmount.toFixed(2)}</p>
                    </div>
                `;
            }
            
            // Update payments list
            if (container) {
                container.innerHTML = data.payments.map(payment => `
                    <div class="payment-card">
                        <div class="card-header">
                            <span>دفعة #${payment.paymentId}</span>
                            <span class="highlight">${payment.paymentMethod}</span>
                        </div>
                        <div class="card-body">
                            <div><strong>العميل:</strong> ${payment.customerId}</div>
                            <div><strong>المبلغ:</strong> <span class="amount">$${payment.amount.toFixed(2)}</span></div>
                            <div><strong>تاريخ الدفع:</strong> <span class="date-time">${new Date(payment.paymentDate).toLocaleString('ar-EG')}</span></div>
                            ${payment.notes ? `<div><strong>ملاحظات:</strong> ${payment.notes}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading customers data:', error);
        }
    }
    
    // Inventory data loading
    async function loadInventoryData(date, transactionType = '') {
        try {
            let url = `/api/inventory-history?date=${date}`;
            if (transactionType) url += `&transactionType=${transactionType}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch inventory data');
            
            const history = await response.json();
            const container = document.getElementById('inventory-container');
            
            if (container) {
                container.innerHTML = history.map(item => `
                    <div class="inventory-card">
                        <div class="card-header">
                            <span>منتج #${item.productId}</span>
                            <span class="highlight">${item.transactionType}</span>
                        </div>
                        <div class="card-body">
                            <div><strong>الكمية:</strong> ${item.quantity}</div>
                            <div><strong>تاريخ العملية:</strong> <span class="date-time">${new Date(item.transactionDate).toLocaleString('ar-EG')}</span></div>
                            ${item.notes ? `<div><strong>ملاحظات:</strong> ${item.notes}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading inventory data:', error);
        }
    }
    
    // Restaurant data loading
    async function loadRestaurantData(status = '') {
        try {
            let url = '/api/restaurant-tables';
            if (status) url += `?status=${status}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch restaurant data');
            
            const tables = await response.json();
            const container = document.getElementById('tables-grid');
            
            if (container) {
                container.innerHTML = tables.map(table => `
                    <div class="table-card ${table.status.toLowerCase()}">
                        <h3>طاولة ${table.tableNumber}</h3>
                        <p class="status-badge status-${table.status.toLowerCase()}">${table.status}</p>
                        <p>${table.description}</p>
                    </div>
                `).join('');
            }
            
        } catch (error) {
            console.error('Error loading restaurant data:', error);
        }
    }
});