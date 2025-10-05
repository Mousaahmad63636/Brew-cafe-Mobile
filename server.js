const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectToDatabase } = require('./db');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/sales', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { date, period, employee } = req.query;
    
    let startDate, endDate;
    
    if (date) {
      if (period === 'week') {
        startDate = new Date(date);
        endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'month') {
        startDate = new Date(date);
        endDate = new Date(date);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        
        endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
      }
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }
    
    // Build the query with date and transaction type
    let query = {
      transactionDate: { 
        $gte: startDate, 
        $lte: endDate 
      },
      transactionType: "Sale"
    };
    
    // Add employee filter if provided
    if (employee && employee !== 'all') {
      query.cashierId = employee;
    }
    
    const transactions = await db.collection('transactions')
      .find(query)
      .sort({ transactionDate: -1 })
      .limit(100)
      .toArray();
      
    // Create date strings to handle timezone properly for expense queries
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Query for expenses using multiple date formats to ensure we catch all records
    const expenses = await db.collection('expenses')
      .find({
        $or: [
          // Option 1: If date is stored as a Date object
          {
            date: { 
              $gte: startDate, 
              $lte: endDate 
            }
          },
          // Option 2: If date is stored as a string (ISO format)
          {
            date: { 
              $gte: startDateStr,
              $lte: endDateStr + 'T23:59:59.999Z'
            }
          },
          // Option 3: Try with createdAt field if date field isn't working
          {
            createdAt: {
              $gte: startDate, 
              $lte: endDate
            }
          }
        ]
      })
      .toArray();

    // Process transactions to ensure amount is a valid number
    const processedTransactions = transactions.map(tx => {
      let amount = 0;
      if (tx.totalAmount) {
        const amountStr = tx.totalAmount.toString();
        amount = parseFloat(amountStr);
        if (isNaN(amount)) amount = 0;
      }
      
      return {
        ...tx,
        totalAmount: amount
      };
    });
    
    const totalSales = processedTransactions.reduce((sum, tx) => sum + tx.totalAmount, 0);
    const totalTransactions = processedTransactions.length;
    
    const totalExpense = expenses.reduce((sum, expense) => {
      let amount = 0;
      if (expense.amount) {
        const amountStr = expense.amount.toString();
        amount = parseFloat(amountStr);
        if (isNaN(amount)) amount = 0;
      }
      return sum + amount;
    }, 0);
    
    res.status(200).json({
      transactions: processedTransactions,
      summary: {
        totalSales,
        totalTransactions,
        totalExpense,
        date: startDate.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        period: period || 'day'
      }
    });
  } catch (error) {
    console.error('Error fetching sales data:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات المبيعات' });
  }
});

// Add a new endpoint to get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    
    // Get unique cashier IDs and names from transactions
    const employees = await db.collection('transactions')
      .aggregate([
        { 
          $match: { 
            cashierId: { $exists: true, $ne: "" },
            cashierName: { $exists: true, $ne: "" }
          }
        },
        {
          $group: {
            _id: "$cashierId",
            name: { $first: "$cashierName" },
            role: { $first: "$cashierRole" }
          }
        },
        { $sort: { name: 1 } }
      ])
      .toArray();
    
    res.status(200).json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الموظفين' });
  }
});

// Drawers endpoint - returns real data from MongoDB
app.get('/api/drawers', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { status, date } = req.query;
    
    // Build query for drawers
    let query = {};
    if (status) {
      query.status = status;
    }
    
    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.openedAt = { $gte: startDate, $lte: endDate };
    }
    
    // Try different possible collection names for drawers
    const possibleCollections = ['drawers', 'Drawers', 'Drawer'];
    let drawers = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          console.log(`Found drawers collection: ${collectionName}`);
          drawers = await db.collection(collectionName)
            .find(query)
            .sort({ openedAt: -1 })
            .toArray();
          console.log(`Found ${drawers.length} drawers`);
          break;
        }
      } catch (err) {
        console.log(`Collection ${collectionName} not found or error:`, err.message);
      }
    }
    
    // Process drawers to ensure consistent field names and data types
    const processedDrawers = drawers.map(drawer => ({
      drawerId: drawer.drawerId || drawer.id || drawer._id,
      status: drawer.status || 'Unknown',
      cashierName: drawer.cashierName || drawer.cashier_name || 'غير محدد',
      cashierId: drawer.cashierId || drawer.cashier_id,
      currentBalance: parseFloat(drawer.currentBalance) || 0,
      totalSales: parseFloat(drawer.totalSales) || parseFloat(drawer.dailySales) || 0,
      totalExpenses: parseFloat(drawer.totalExpenses) || parseFloat(drawer.dailyExpenses) || 0,
      openingBalance: parseFloat(drawer.openingBalance) || 0,
      netSales: parseFloat(drawer.netSales) || 0,
      openedAt: drawer.openedAt || drawer.opened_at,
      closedAt: drawer.closedAt || drawer.closed_at,
      lastUpdated: drawer.lastUpdated || drawer.last_updated,
      notes: drawer.notes || ''
    }));
    
    res.json(processedDrawers);
  } catch (error) {
    console.error('Error fetching drawers:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الأدراج' });
  }
});

// Supplier invoices endpoint - returns real data from MongoDB
app.get('/api/supplier-invoices', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { status, date } = req.query;
    
    // Build query for supplier invoices
    let query = {};
    if (status) {
      query.status = status;
    }
    
    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.$or = [
        { invoiceDate: { $gte: startDate, $lte: endDate } },
        { invoice_date: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ];
    }
    
    // Try different possible collection names for supplier invoices
    const possibleCollections = ['supplierinvoices', 'SupplierInvoices', 'SupplierInvoice', 'supplier_invoices'];
    let invoices = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          console.log(`Found supplier invoices collection: ${collectionName}`);
          invoices = await db.collection(collectionName)
            .find(query)
            .sort({ invoiceDate: -1, invoice_date: -1, createdAt: -1 })
            .limit(100)
            .toArray();
          console.log(`Found ${invoices.length} supplier invoices`);
          break;
        }
      } catch (err) {
        console.log(`Collection ${collectionName} not found or error:`, err.message);
      }
    }
    
    // Get supplier names for the invoices
    const supplierIds = [...new Set(invoices.map(inv => inv.supplierId || inv.supplier_id).filter(Boolean))];
    let suppliers = [];
    
    if (supplierIds.length > 0) {
      const possibleSupplierCollections = ['suppliers', 'Suppliers', 'Supplier'];
      
      for (const collectionName of possibleSupplierCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            suppliers = await db.collection(collectionName)
              .find({ 
                $or: [
                  { supplierId: { $in: supplierIds } },
                  { supplier_id: { $in: supplierIds } },
                  { _id: { $in: supplierIds } }
                ]
              })
              .toArray();
            break;
          }
        } catch (err) {
          console.log(`Supplier collection ${collectionName} not found:`, err.message);
        }
      }
    }
    
    // Create supplier lookup map
    const supplierMap = {};
    suppliers.forEach(supplier => {
      const id = supplier.supplierId || supplier.supplier_id || supplier._id;
      supplierMap[id] = supplier.name || supplier.supplierName || supplier.supplier_name || `مورد ${id}`;
    });
    
    // Process invoices to ensure consistent field names and data types
    const processedInvoices = invoices.map(invoice => {
      const supplierId = invoice.supplierId || invoice.supplier_id;
      return {
        invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || `INV-${invoice._id}`,
        supplierId: supplierMap[supplierId] || `مورد ${supplierId}`,
        supplierName: supplierMap[supplierId] || `مورد ${supplierId}`,
        totalAmount: parseFloat(invoice.totalAmount || invoice.total_amount || invoice.calculatedAmount) || 0,
        amountPaid: parseFloat(invoice.amountPaid || invoice.amount_paid) || 0,
        status: invoice.status || 'Draft',
        invoiceDate: invoice.invoiceDate || invoice.invoice_date || invoice.createdAt,
        notes: invoice.notes || '',
        createdAt: invoice.createdAt || invoice.created_at
      };
    });
    
    // Calculate summary
    const totalAmount = processedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = processedInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    
    res.json({
      invoices: processedInvoices,
      summary: {
        totalInvoices: processedInvoices.length,
        totalAmount,
        totalPaid,
        totalOutstanding: totalAmount - totalPaid
      }
    });
  } catch (error) {
    console.error('Error fetching supplier invoices:', error);
    res.status(500).json({ error: 'فشل في جلب فواتير الموردين' });
  }
});

// Customer payments endpoint - returns real data from MongoDB
app.get('/api/customer-payments', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { paymentMethod, date, customerId } = req.query;
    
    // Build query for customer payments
    let query = {};
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    if (customerId) {
      query.customerId = parseInt(customerId) || customerId;
    }
    
    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.$or = [
        { paymentDate: { $gte: startDate, $lte: endDate } },
        { payment_date: { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } }
      ];
    }
    
    // Try different possible collection names for customer payments
    const possibleCollections = ['customerpayments', 'CustomerPayments', 'CustomerPayment', 'customer_payments'];
    let payments = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          console.log(`Found customer payments collection: ${collectionName}`);
          payments = await db.collection(collectionName)
            .find(query)
            .sort({ paymentDate: -1, payment_date: -1, createdAt: -1 })
            .limit(100)
            .toArray();
          console.log(`Found ${payments.length} customer payments`);
          break;
        }
      } catch (err) {
        console.log(`Collection ${collectionName} not found or error:`, err.message);
      }
    }
    
    // Get customer names for the payments
    const customerIds = [...new Set(payments.map(payment => payment.customerId || payment.customer_id).filter(Boolean))];
    let customers = [];
    
    if (customerIds.length > 0) {
      const possibleCustomerCollections = ['customers', 'Customers', 'Customer'];
      
      for (const collectionName of possibleCustomerCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            customers = await db.collection(collectionName)
              .find({ 
                $or: [
                  { customerId: { $in: customerIds } },
                  { customer_id: { $in: customerIds } },
                  { _id: { $in: customerIds } }
                ]
              })
              .toArray();
            break;
          }
        } catch (err) {
          console.log(`Customer collection ${collectionName} not found:`, err.message);
        }
      }
    }
    
    // Create customer lookup map
    const customerMap = {};
    customers.forEach(customer => {
      const id = customer.customerId || customer.customer_id || customer._id;
      customerMap[id] = customer.name || customer.customerName || customer.customer_name || `عميل ${id}`;
    });
    
    // Process payments to ensure consistent field names and data types
    const processedPayments = payments.map(payment => {
      const customerId = payment.customerId || payment.customer_id;
      return {
        paymentId: payment.paymentId || payment.payment_id || `PAY-${payment._id}`,
        customerId: customerMap[customerId] || `عميل ${customerId}`,
        customerName: customerMap[customerId] || `عميل ${customerId}`,
        amount: parseFloat(payment.amount) || 0,
        paymentMethod: payment.paymentMethod || payment.payment_method || 'Cash',
        paymentDate: payment.paymentDate || payment.payment_date || payment.createdAt,
        status: payment.status || 'Completed',
        notes: payment.notes || '',
        createdBy: payment.createdBy || payment.created_by || '',
        createdAt: payment.createdAt || payment.created_at
      };
    });
    
    // Calculate summary
    const totalAmount = processedPayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    res.json({
      payments: processedPayments,
      summary: {
        totalPayments: processedPayments.length,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({ error: 'فشل في جلب مدفوعات العملاء' });
  }
});

// Inventory history endpoint - returns real data from MongoDB
app.get('/api/inventory-history', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { transactionType, date, productId } = req.query;
    
    // Build query for inventory history
    let query = {};
    if (transactionType) {
      query.$or = [
        { type: transactionType },
        { transactionType: transactionType },
        { transaction_type: transactionType }
      ];
    }
    if (productId) {
      query.productId = parseInt(productId) || productId;
    }
    
    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { timestamp: { $gte: startDate, $lte: endDate } },
          { transactionDate: { $gte: startDate, $lte: endDate } },
          { transaction_date: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      });
    }
    
    // Try different possible collection names for inventory history
    const possibleCollections = ['inventoryhistories', 'InventoryHistories', 'InventoryHistory', 'inventory_history'];
    let history = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          console.log(`Found inventory history collection: ${collectionName}`);
          history = await db.collection(collectionName)
            .find(query)
            .sort({ timestamp: -1, transactionDate: -1, createdAt: -1 })
            .limit(100)
            .toArray();
          console.log(`Found ${history.length} inventory history records`);
          break;
        }
      } catch (err) {
        console.log(`Collection ${collectionName} not found or error:`, err.message);
      }
    }
    
    // Get product names for the history records
    const productIds = [...new Set(history.map(item => item.productId || item.product_id).filter(Boolean))];
    let products = [];
    
    if (productIds.length > 0) {
      const possibleProductCollections = ['products', 'Products', 'Product'];
      
      for (const collectionName of possibleProductCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            products = await db.collection(collectionName)
              .find({ 
                $or: [
                  { productId: { $in: productIds } },
                  { product_id: { $in: productIds } },
                  { _id: { $in: productIds } }
                ]
              })
              .toArray();
            break;
          }
        } catch (err) {
          console.log(`Product collection ${collectionName} not found:`, err.message);
        }
      }
    }
    
    // Create product lookup map
    const productMap = {};
    products.forEach(product => {
      const id = product.productId || product.product_id || product._id;
      productMap[id] = product.name || product.productName || product.product_name || `منتج ${id}`;
    });
    
    // Process history to ensure consistent field names and data types
    const processedHistory = history.map(item => {
      const productId = item.productId || item.product_id;
      return {
        inventoryHistoryId: item.inventoryHistoryId || item.inventory_history_id || item._id,
        productId: productMap[productId] || `منتج ${productId}`,
        productName: productMap[productId] || `منتج ${productId}`,
        transactionType: item.type || item.transactionType || item.transaction_type || 'Unknown',
        quantity: parseFloat(item.quantityChange || item.quantity_change || item.quantity) || 0,
        newQuantity: parseFloat(item.newQuantity || item.new_quantity) || 0,
        transactionDate: item.timestamp || item.transactionDate || item.transaction_date || item.createdAt,
        notes: item.notes || item.description || ''
      };
    });
    
    res.json(processedHistory);
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({ error: 'فشل في جلب تاريخ المخزون' });
  }
});

// Restaurant tables endpoint - returns real data from MongoDB
app.get('/api/restaurant-tables', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { status } = req.query;
    
    // Build query for restaurant tables
    let query = {};
    if (status) {
      query.status = status;
    }
    
    // Only show active tables
    query.isActive = { $ne: false };
    
    // Try different possible collection names for restaurant tables
    const possibleCollections = ['restauranttables', 'RestaurantTables', 'RestaurantTable', 'restaurant_tables', 'tables', 'Tables'];
    let tables = [];
    
    for (const collectionName of possibleCollections) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          console.log(`Found restaurant tables collection: ${collectionName}`);
          tables = await db.collection(collectionName)
            .find(query)
            .sort({ tableNumber: 1, table_number: 1 })
            .toArray();
          console.log(`Found ${tables.length} restaurant tables`);
          break;
        }
      } catch (err) {
        console.log(`Collection ${collectionName} not found or error:`, err.message);
      }
    }
    
    // Process tables to ensure consistent field names and data types
    const processedTables = tables.map(table => ({
      id: table.id || table._id,
      tableNumber: table.tableNumber || table.table_number || 0,
      status: table.status || 'Available',
      description: table.description || table.desc || `طاولة رقم ${table.tableNumber || table.table_number}`,
      isActive: table.isActive !== false,
      createdAt: table.createdAt || table.created_at,
      updatedAt: table.updatedAt || table.updated_at
    }));
    
    res.json(processedTables);
  } catch (error) {
    console.error('Error fetching restaurant tables:', error);
    res.status(500).json({ error: 'فشل في جلب طاولات المطعم' });
  }
});


// Transaction details endpoint
app.get('/api/transaction-details/:transactionId', async (req, res) => {
    try {
        const { db } = await connectToDatabase();
        const { transactionId } = req.params;
        
        console.log('Fetching transaction details for ID:', transactionId);
        
        // Try different possible collection names and field names for transactions
        const possibleTransactionCollections = ['Transactions', 'transactions', 'Transaction'];
        let transaction = null;
        
        for (const collectionName of possibleTransactionCollections) {
            try {
                const collections = await db.listCollections({ name: collectionName }).toArray();
                if (collections.length > 0) {
                    console.log(`Checking collection: ${collectionName}`);
                    
                    // Try different possible field names for transaction ID
                    const possibleQueries = [
                        { transactionId: transactionId },
                        { transactionId: parseInt(transactionId) },
                        { _id: transactionId },
                        { id: transactionId },
                        { id: parseInt(transactionId) }
                    ];
                    
                    for (const query of possibleQueries) {
                        transaction = await db.collection(collectionName).findOne(query);
                        if (transaction) {
                            console.log(`Found transaction with query:`, query);
                            break;
                        }
                    }
                    
                    if (transaction) break;
                }
            } catch (err) {
                console.log(`Error checking collection ${collectionName}:`, err.message);
            }
        }
        
        if (!transaction) {
            console.log('Transaction not found with ID:', transactionId);
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        console.log('Found transaction:', transaction);
        
        // Try to get transaction items
        let items = [];
        const possibleItemCollections = ['TransactionItems', 'transactionitems', 'TransactionItem', 'Items'];
        
        for (const collectionName of possibleItemCollections) {
            try {
                const collections = await db.listCollections({ name: collectionName }).toArray();
                if (collections.length > 0) {
                    console.log(`Checking items collection: ${collectionName}`);
                    
                    const possibleQueries = [
                        { transactionId: transactionId },
                        { transactionId: parseInt(transactionId) },
                        { transaction_id: transactionId },
                        { transaction_id: parseInt(transactionId) }
                    ];
                    
                    for (const query of possibleQueries) {
                        items = await db.collection(collectionName).find(query).toArray();
                        if (items.length > 0) {
                            console.log(`Found ${items.length} items with query:`, query);
                            break;
                        }
                    }
                    
                    if (items.length > 0) break;
                }
            } catch (err) {
                console.log(`Error checking items collection ${collectionName}:`, err.message);
            }
        }
        
        // Try to get employee name
        let employeeName = 'غير محدد';
        if (transaction.employeeId || transaction.employee_id || transaction.cashierId) {
            const employeeId = transaction.employeeId || transaction.employee_id || transaction.cashierId;
            
            const possibleEmployeeCollections = ['Employees', 'employees', 'Employee'];
            
            for (const collectionName of possibleEmployeeCollections) {
                try {
                    const collections = await db.listCollections({ name: collectionName }).toArray();
                    if (collections.length > 0) {
                        const employee = await db.collection(collectionName).findOne({
                            $or: [
                                { employeeId: employeeId },
                                { _id: employeeId },
                                { id: employeeId }
                            ]
                        });
                        
                        if (employee) {
                            employeeName = employee.name || employee.employeeName || employee.firstName || 'غير محدد';
                            console.log('Found employee:', employeeName);
                            break;
                        }
                    }
                } catch (err) {
                    console.log(`Error checking employee collection ${collectionName}:`, err.message);
                }
            }
        }
        
        // Combine transaction with items and employee info
        const transactionDetails = {
            ...transaction,
            items: items,
            employeeName: employeeName,
            // Ensure we have standard field names
            transactionId: transaction.transactionId || transaction.id || transaction._id,
            totalAmount: transaction.totalAmount || transaction.total_amount || transaction.amount || 0,
            taxAmount: transaction.taxAmount || transaction.tax_amount || transaction.tax || 0,
            discountAmount: transaction.discountAmount || transaction.discount_amount || transaction.discount || 0,
            paymentMethod: transaction.paymentMethod || transaction.payment_method || 'نقدي',
            customerId: transaction.customerId || transaction.customer_id || 'عميل عام',
            notes: transaction.notes || transaction.description || ''
        };
        
        console.log('Returning transaction details:', transactionDetails);
        res.json(transactionDetails);
        
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            details: error.message,
            transactionId: req.params.transactionId
        });
    }
});

// Dashboard summary endpoint
app.get('/api/dashboard-summary', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    console.log('Dashboard summary requested with date:', req.query.date);
    
    const { date } = req.query;
    
    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }
    
    console.log('Date range:', { startDate, endDate });
    
    // Initialize default values
    let totalSales = 0;
    let transactionCount = 0;
    let totalExpenses = 0;
    let expenseCount = 0;
    let openDrawers = 0;
    let pendingInvoices = 0;
    let totalCustomerPayments = 0;
    let paymentCount = 0;
    let availableTables = 0;
    
    try {
      // Get sales data - try multiple possible collection names
      const possibleTransactionCollections = ['Transactions', 'transactions', 'Transaction'];
      let transactions = [];
      
      for (const collectionName of possibleTransactionCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            console.log(`Found transactions collection: ${collectionName}`);
            const salesQuery = {
              transactionDate: { $gte: startDate, $lte: endDate }
            };
            transactions = await db.collection(collectionName).find(salesQuery).toArray();
            console.log(`Found ${transactions.length} transactions`);
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err.message);
        }
      }
      
      totalSales = transactions.reduce((sum, tx) => sum + (parseFloat(tx.totalAmount) || 0), 0);
      transactionCount = transactions.length;
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
    
    try {
      // Get expenses
      const possibleExpenseCollections = ['Expenses', 'expenses', 'Expense'];
      let expenses = [];
      
      for (const collectionName of possibleExpenseCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            console.log(`Found expenses collection: ${collectionName}`);
            expenses = await db.collection(collectionName)
              .find({
                $or: [
                  { date: { $gte: startDate, $lte: endDate } },
                  { createdAt: { $gte: startDate, $lte: endDate } },
                  { expenseDate: { $gte: startDate, $lte: endDate } }
                ]
              })
              .toArray();
            console.log(`Found ${expenses.length} expenses`);
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err.message);
        }
      }
      
      totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
      expenseCount = expenses.length;
      
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
    
    try {
      // Get drawer status
      const possibleDrawerCollections = ['drawers', 'Drawers', 'Drawer'];
      
      for (const collectionName of possibleDrawerCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            console.log(`Found drawers collection: ${collectionName}`);
            openDrawers = await db.collection(collectionName).countDocuments({ status: 'Open' });
            console.log(`Found ${openDrawers} open drawers`);
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err.message);
        }
      }
      
    } catch (error) {
      console.error('Error fetching drawers:', error);
    }
    
    try {
      // Get pending supplier invoices
      const possibleSupplierCollections = ['supplierinvoices', 'SupplierInvoices', 'SupplierInvoice'];
      
      for (const collectionName of possibleSupplierCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            console.log(`Found supplier invoices collection: ${collectionName}`);
            pendingInvoices = await db.collection(collectionName).countDocuments({ 
              status: { $in: ['Pending', 'Draft'] }
            });
            console.log(`Found ${pendingInvoices} pending invoices`);
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err.message);
        }
      }
      
    } catch (error) {
      console.error('Error fetching supplier invoices:', error);
    }
    
    try {
      // Get customer payments for today
      const possiblePaymentCollections = ['customerpayments', 'CustomerPayments', 'CustomerPayment'];
      
      for (const collectionName of possiblePaymentCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            console.log(`Found customer payments collection: ${collectionName}`);
            const payments = await db.collection(collectionName)
              .find({
                $or: [
                  { paymentDate: { $gte: startDate, $lte: endDate } },
                  { payment_date: { $gte: startDate, $lte: endDate } },
                  { createdAt: { $gte: startDate, $lte: endDate } }
                ]
              })
              .toArray();
            
            totalCustomerPayments = payments.reduce((sum, payment) => {
              return sum + (parseFloat(payment.amount) || 0);
            }, 0);
            paymentCount = payments.length;
            console.log(`Found ${paymentCount} customer payments totaling ${totalCustomerPayments}`);
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err.message);
        }
      }
      
    } catch (error) {
      console.error('Error fetching customer payments:', error);
    }
    
    try {
      // Get available restaurant tables
      const possibleTableCollections = ['restauranttables', 'RestaurantTables', 'RestaurantTable'];
      
      for (const collectionName of possibleTableCollections) {
        try {
          const collections = await db.listCollections({ name: collectionName }).toArray();
          if (collections.length > 0) {
            console.log(`Found restaurant tables collection: ${collectionName}`);
            availableTables = await db.collection(collectionName).countDocuments({ 
              status: 'Available',
              isActive: { $ne: false }
            });
            console.log(`Found ${availableTables} available tables`);
            break;
          }
        } catch (err) {
          console.log(`Collection ${collectionName} not found or error:`, err.message);
        }
      }
      
    } catch (error) {
      console.error('Error fetching restaurant tables:', error);
    }
    
    // Return response with available data
    const response = {
      sales: {
        totalAmount: totalSales,
        transactionCount: transactionCount
      },
      expenses: {
        totalAmount: totalExpenses,
        expenseCount: expenseCount
      },
      profit: totalSales - totalExpenses,
      drawers: {
        openCount: openDrawers
      },
      suppliers: {
        pendingInvoices: pendingInvoices
      },
      customers: {
        paymentsToday: totalCustomerPayments,
        paymentCount: paymentCount
      },
      restaurant: {
        availableTables: availableTables
      }
    };
    
    console.log('Dashboard response:', response);
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Error in dashboard summary endpoint:', error);
    res.status(500).json({ 
      error: 'فشل في جلب ملخص لوحة التحكم',
      details: error.message 
    });
  }
});

// Debug endpoint to list all collections
app.get('/api/debug/collections', async (req, res) => {
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    console.log('Available collections:', collectionNames);
    res.json({ collections: collectionNames });
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;