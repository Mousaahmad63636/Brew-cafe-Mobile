document.addEventListener('DOMContentLoaded', function() {
    // API Configuration - Use relative URLs for both local and Vercel
    const API_BASE_URL = ''; // Always use relative URLs
    
    console.log('API Base URL:', API_BASE_URL);
    console.log('Current location:', window.location.href);
    
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
            const response = await fetch(`${API_BASE_URL}/api/employees`);
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
    async function fetchSalesData(date, period, employeeId) {
        showLoading();
        
        try {
            let url = `${API_BASE_URL}/api/sales?date=${date}`;
            if(period) {
                url += `&period=${period}`;
            }
            if(employeeId && employeeId !== 'all') {
                url += `&employee=${employeeId}`;
            }
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('فشل في جلب البيانات');
            }
            
            const data = await response.json();
            hideLoading();
            data.summary.startDate = new Date(data.summary.startDate);
            data.summary.endDate = new Date(data.summary.endDate);
            displayData(data);
            
        } catch (err) {
            hideLoading();
            showError('خطأ في تحميل بيانات المبيعات. يرجى المحاولة لاحقاً.');
            console.error(err);
        }
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
            
            // Show table on desktop
            if (window.innerWidth > 768) {
                transactionsTable.style.display = 'table';
                transactionCards.style.display = 'none';
                populateTransactionsTable(transactions);
            }
            
            transactions.forEach(tx => {
                // Process transaction data
                const txDate = new Date(tx.transactionDate);
                const formattedDate = `${txDate.getDate()}/${txDate.getMonth() + 1}/${txDate.getFullYear()}`;
                const formattedTime = `${txDate.getHours().toString().padStart(2, '0')}:${txDate.getMinutes().toString().padStart(2, '0')}`;
                
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
                        <div class="detail-value">${formattedDate} ${formattedTime}</div>
                    </div>
                    <div class="transaction-detail">
                        <div class="detail-label">طريقة الدفع:</div>
                        <div class="detail-value">${tx.paymentMethod || 'نقدي'}</div>
                    </div>
                    <div class="transaction-actions">
                        <button class="detail-btn" onclick="showTransactionDetails('${tx.transactionId}')">
                            <i class="fas fa-eye"></i> عرض التفاصيل
                        </button>
                    </div>
                `;
                
                transactionCards.appendChild(card);
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
            const response = await fetch(`${API_BASE_URL}/api/dashboard-summary?date=${date}`);
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
    
    // Drawers data loading - now uses API
    async function loadDrawersData(date, status = '') {
        try {
            let url = `${API_BASE_URL}/api/drawers?date=${date}`;
            if (status) url += `&status=${status}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch drawers data');
            
            const drawers = await response.json();
            const container = document.getElementById('drawers-container');
            
            if (container) {
                if (drawers.length === 0) {
                    container.innerHTML = `
                        <div class="no-data-message">
                            <i class="fas fa-cash-register"></i>
                            <h3>لا توجد أدراج</h3>
                            <p>لا توجد بيانات أدراج متاحة للفلتر المحدد</p>
                        </div>
                    `;
                } else {
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
            }
        } catch (error) {
            console.error('Error loading drawers data:', error);
            const container = document.getElementById('drawers-container');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>خطأ في تحميل البيانات</h3>
                        <p>فشل في جلب بيانات الأدراج</p>
                    </div>
                `;
            }
        }
    }
    
    // Suppliers data loading - with sample data
    async function loadSuppliersData(date, status = '') {
        const container = document.getElementById('suppliers-container');
        const summaryContainer = document.getElementById('supplier-summary');
        
        // Sample supplier invoices data
        const sampleInvoices = [
            {
                invoiceNumber: 'INV-001',
                supplierId: 'شركة المواد الغذائية',
                totalAmount: 2500.00,
                amountPaid: 2500.00,
                status: 'Paid',
                invoiceDate: new Date().toISOString()
            },
            {
                invoiceNumber: 'INV-002',
                supplierId: 'مورد الخضار والفواكه',
                totalAmount: 1800.00,
                amountPaid: 1000.00,
                status: 'Pending',
                invoiceDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                invoiceNumber: 'INV-003',
                supplierId: 'شركة المشروبات',
                totalAmount: 950.00,
                amountPaid: 0.00,
                status: 'Draft',
                invoiceDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
        
        // Filter by status if provided
        const filteredInvoices = status ? sampleInvoices.filter(inv => inv.status === status) : sampleInvoices;
        
        // Calculate summary
        const totalInvoices = filteredInvoices.length;
        const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
        const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
        const totalOutstanding = totalAmount - totalPaid;
        
        // Update summary
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h3>إجمالي الفواتير</h3>
                    <p class="value">${totalInvoices}</p>
                </div>
                <div class="summary-card">
                    <h3>إجمالي المبلغ</h3>
                    <p class="value amount">$${totalAmount.toFixed(2)}</p>
                </div>
                <div class="summary-card">
                    <h3>المدفوع</h3>
                    <p class="value amount">$${totalPaid.toFixed(2)}</p>
                </div>
                <div class="summary-card">
                    <h3>المتبقي</h3>
                    <p class="value amount negative">$${totalOutstanding.toFixed(2)}</p>
                </div>
            `;
        }
        
        // Update invoices list
        if (container) {
            if (filteredInvoices.length === 0) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-truck"></i>
                        <h3>لا توجد فواتير</h3>
                        <p>لا توجد فواتير موردين للفلتر المحدد</p>
                    </div>
                `;
            } else {
                container.innerHTML = filteredInvoices.map(invoice => `
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
        }
    }
    
    // Customers data loading - with sample data
    async function loadCustomersData(date, paymentMethod = '') {
        const container = document.getElementById('customers-container');
        const summaryContainer = document.getElementById('customer-summary');
        
        // Sample customer payments data
        const samplePayments = [
            {
                paymentId: 'PAY-001',
                customerId: 'أحمد محمد علي',
                amount: 150.00,
                paymentMethod: 'Cash',
                paymentDate: new Date().toISOString(),
                notes: 'دفع نقدي'
            },
            {
                paymentId: 'PAY-002',
                customerId: 'فاطمة أحمد',
                amount: 275.50,
                paymentMethod: 'Card',
                paymentDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                notes: 'دفع بالبطاقة'
            },
            {
                paymentId: 'PAY-003',
                customerId: 'محمد حسن',
                amount: 89.25,
                paymentMethod: 'Transfer',
                paymentDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
                notes: 'تحويل بنكي'
            },
            {
                paymentId: 'PAY-004',
                customerId: 'سارة علي',
                amount: 320.00,
                paymentMethod: 'Cash',
                paymentDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
                notes: ''
            }
        ];
        
        // Filter by payment method if provided
        const filteredPayments = paymentMethod ? samplePayments.filter(p => p.paymentMethod === paymentMethod) : samplePayments;
        
        // Calculate summary
        const totalPayments = filteredPayments.length;
        const totalAmount = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
        
        // Update summary
        if (summaryContainer) {
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h3>عدد المدفوعات</h3>
                    <p class="value">${totalPayments}</p>
                </div>
                <div class="summary-card">
                    <h3>إجمالي المبلغ</h3>
                    <p class="value amount">$${totalAmount.toFixed(2)}</p>
                </div>
            `;
        }
        
        // Update payments list
        if (container) {
            if (filteredPayments.length === 0) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-users"></i>
                        <h3>لا توجد مدفوعات</h3>
                        <p>لا توجد مدفوعات عملاء للفلتر المحدد</p>
                    </div>
                `;
            } else {
                container.innerHTML = filteredPayments.map(payment => `
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
        }
    }
    
    // Inventory data loading - with sample data
    async function loadInventoryData(date, transactionType = '') {
        const container = document.getElementById('inventory-container');
        
        // Sample inventory history data
        const sampleInventory = [
            {
                productId: 'برجر لحم',
                transactionType: 'Sale',
                quantity: -5,
                transactionDate: new Date().toISOString(),
                notes: 'بيع عادي'
            },
            {
                productId: 'بيتزا مارجريتا',
                transactionType: 'Sale',
                quantity: -3,
                transactionDate: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                notes: 'بيع للعملاء'
            },
            {
                productId: 'كوكا كولا',
                transactionType: 'Purchase',
                quantity: +50,
                transactionDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
                notes: 'شراء من المورد'
            },
            {
                productId: 'فرايز',
                transactionType: 'Adjustment',
                quantity: -2,
                transactionDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                notes: 'تعديل المخزون - تالف'
            },
            {
                productId: 'شاورما دجاج',
                transactionType: 'Sale',
                quantity: -8,
                transactionDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                notes: 'بيع مساء'
            }
        ];
        
        // Filter by transaction type if provided
        const filteredInventory = transactionType ? sampleInventory.filter(item => item.transactionType === transactionType) : sampleInventory;
        
        if (container) {
            if (filteredInventory.length === 0) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-boxes"></i>
                        <h3>لا توجد حركات مخزون</h3>
                        <p>لا توجد حركات مخزون للفلتر المحدد</p>
                    </div>
                `;
            } else {
                container.innerHTML = filteredInventory.map(item => `
                    <div class="inventory-card">
                        <div class="card-header">
                            <span>منتج: ${item.productId}</span>
                            <span class="highlight">${item.transactionType}</span>
                        </div>
                        <div class="card-body">
                            <div><strong>الكمية:</strong> <span class="${item.quantity > 0 ? 'amount' : 'amount negative'}">${item.quantity > 0 ? '+' : ''}${item.quantity}</span></div>
                            <div><strong>تاريخ العملية:</strong> <span class="date-time">${new Date(item.transactionDate).toLocaleString('ar-EG')}</span></div>
                            ${item.notes ? `<div><strong>ملاحظات:</strong> ${item.notes}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
    }
    
    // Restaurant data loading - with sample data
    async function loadRestaurantData(status = '') {
        const container = document.getElementById('tables-grid');
        
        // Sample restaurant tables data
        const sampleTables = [
            { tableNumber: 1, status: 'Available', description: 'طاولة للشخصين' },
            { tableNumber: 2, status: 'Occupied', description: 'طاولة للأربعة أشخاص' },
            { tableNumber: 3, status: 'Available', description: 'طاولة للشخصين' },
            { tableNumber: 4, status: 'Reserved', description: 'طاولة للستة أشخاص' },
            { tableNumber: 5, status: 'Available', description: 'طاولة للأربعة أشخاص' },
            { tableNumber: 6, status: 'Occupied', description: 'طاولة للثمانية أشخاص' },
            { tableNumber: 7, status: 'Available', description: 'طاولة للشخصين' },
            { tableNumber: 8, status: 'Available', description: 'طاولة للأربعة أشخاص' },
            { tableNumber: 9, status: 'Reserved', description: 'طاولة للستة أشخاص' },
            { tableNumber: 10, status: 'Available', description: 'طاولة للشخصين' },
            { tableNumber: 11, status: 'Occupied', description: 'طاولة للأربعة أشخاص' },
            { tableNumber: 12, status: 'Available', description: 'طاولة للعشرة أشخاص' }
        ];
        
        // Filter by status if provided
        const filteredTables = status ? sampleTables.filter(table => table.status === status) : sampleTables;
        
        if (container) {
            if (filteredTables.length === 0) {
                container.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-utensils"></i>
                        <h3>لا توجد طاولات</h3>
                        <p>لا توجد طاولات للحالة المحددة</p>
                    </div>
                `;
            } else {
                container.innerHTML = filteredTables.map(table => `
                    <div class="table-card ${table.status.toLowerCase()}">
                        <h3>طاولة ${table.tableNumber}</h3>
                        <p class="status-badge status-${table.status.toLowerCase()}">${table.status}</p>
                        <p>${table.description}</p>
                    </div>
                `).join('');
            }
        }
    }
    
    // Transaction table population
    function populateTransactionsTable(transactions) {
        const tbody = document.getElementById('transactions-body');
        tbody.innerHTML = '';
        
        transactions.forEach(tx => {
            const txDate = new Date(tx.transactionDate);
            const formattedDate = `${txDate.getDate()}/${txDate.getMonth() + 1}/${txDate.getFullYear()}`;
            const formattedTime = `${txDate.getHours().toString().padStart(2, '0')}:${txDate.getMinutes().toString().padStart(2, '0')}`;
            const amount = !isNaN(parseFloat(tx.totalAmount)) ? parseFloat(tx.totalAmount) : 0;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${tx.transactionId}</td>
                <td>${tx.customerId || 'عميل عام'}</td>
                <td>${tx.employeeName || 'غير محدد'}</td>
                <td class="amount">$${amount.toFixed(2)}</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td>${tx.paymentMethod || 'نقدي'}</td>
                <td>
                    <button class="detail-btn" onclick="showTransactionDetails('${tx.transactionId}')">
                        <i class="fas fa-eye"></i> عرض
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    
    // Transaction detail modal functions
    window.showTransactionDetails = async function(transactionId) {
        try {
            console.log('Fetching transaction details for ID:', transactionId);
            
            const response = await fetch(`${API_BASE_URL}/api/transaction-details/${transactionId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const transaction = await response.json();
            console.log('Transaction details received:', transaction);
            
            displayTransactionDetails(transaction);
            
            const modal = document.getElementById('transaction-modal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
                console.log('Modal opened successfully');
            } else {
                console.error('Modal element not found');
            }
            
        } catch (error) {
            console.error('Error fetching transaction details:', error);
            alert('فشل في جلب تفاصيل المعاملة: ' + error.message);
        }
    };
    
    window.closeTransactionModal = function() {
        const modal = document.getElementById('transaction-modal');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };
    
    function displayTransactionDetails(transaction) {
        const detailsContainer = document.getElementById('transaction-details');
        const txDate = new Date(transaction.transactionDate);
        const formattedDateTime = txDate.toLocaleString('ar-EG');
        
        // Helper function to parse MongoDB decimal values
        function parseMongoDecimal(value) {
            if (!value) return 0;
            if (typeof value === 'object' && value.$numberDecimal) {
                return parseFloat(value.$numberDecimal);
            }
            return parseFloat(value) || 0;
        }
        
        // Parse amounts
        const totalAmount = parseMongoDecimal(transaction.totalAmount);
        const taxAmount = parseMongoDecimal(transaction.taxAmount);
        const discountAmount = parseMongoDecimal(transaction.discountAmount);
        const paidAmount = parseMongoDecimal(transaction.paidAmount);
        
        // Use transactionDetails if items is empty (as shown in your console)
        const itemsData = transaction.items && transaction.items.length > 0 
            ? transaction.items 
            : transaction.transactionDetails || [];
        
        detailsContainer.innerHTML = `
            <div class="transaction-detail-grid">
                <div class="detail-section">
                    <h3><i class="fas fa-info-circle"></i> معلومات المعاملة</h3>
                    <div class="detail-row">
                        <span class="label">رقم المعاملة:</span>
                        <span class="value">${transaction.transactionId}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">التاريخ والوقت:</span>
                        <span class="value">${formattedDateTime}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">الموظف:</span>
                        <span class="value">${transaction.employeeName || 'غير محدد'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">العميل:</span>
                        <span class="value">${transaction.customerId || transaction.customerName || 'عميل عام'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">الحالة:</span>
                        <span class="value">${transaction.status || 'مكتملة'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <h3><i class="fas fa-dollar-sign"></i> المبالغ المالية</h3>
                    <div class="detail-row">
                        <span class="label">المبلغ الإجمالي:</span>
                        <span class="value amount">$${totalAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">المبلغ المدفوع:</span>
                        <span class="value amount">$${paidAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">الضريبة:</span>
                        <span class="value">$${taxAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">الخصم:</span>
                        <span class="value">$${discountAmount.toFixed(2)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">طريقة الدفع:</span>
                        <span class="value">${transaction.paymentMethod || 'نقدي'}</span>
                    </div>
                </div>
            </div>
            
            ${itemsData && itemsData.length > 0 ? `
                <div class="detail-section">
                    <h3><i class="fas fa-list"></i> الأصناف المباعة</h3>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th>رقم الصنف</th>
                                <th>الكمية</th>
                                <th>السعر</th>
                                <th>الخصم</th>
                                <th>الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsData.map(item => {
                                const quantity = parseMongoDecimal(item.quantity);
                                const unitPrice = parseMongoDecimal(item.unitPrice);
                                const discount = parseMongoDecimal(item.discount);
                                const total = parseMongoDecimal(item.total);
                                
                                return `
                                    <tr>
                                        <td>${item.productName || item.productId || 'غير محدد'}</td>
                                        <td>${quantity}</td>
                                        <td>$${unitPrice.toFixed(2)}</td>
                                        <td>$${discount.toFixed(2)}</td>
                                        <td class="amount">$${total.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
            
            ${transaction.notes ? `
                <div class="detail-section">
                    <h3><i class="fas fa-sticky-note"></i> ملاحظات</h3>
                    <p>${transaction.notes}</p>
                </div>
            ` : ''}
        `;
    }
    
    // Close modal on outside click
    document.addEventListener('click', function(e) {
        const modal = document.getElementById('transaction-modal');
        if (e.target === modal) {
            closeTransactionModal();
        }
    });
    
    // Close modal on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeTransactionModal();
        }
    });
});