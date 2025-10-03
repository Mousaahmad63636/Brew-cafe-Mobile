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

// Drawers endpoint - returns sample data for now
app.get('/api/drawers', async (req, res) => {
  try {
    const { status, date } = req.query;
    
    // Sample drawer data
    let sampleDrawers = [
      {
        drawerId: 1,
        status: 'Open',
        cashierName: 'أحمد محمد',
        currentBalance: 1250.50,
        totalSales: 2500.00,
        totalExpenses: 150.00,
        openedAt: new Date().toISOString()
      },
      {
        drawerId: 2,
        status: 'Closed',
        cashierName: 'فاطمة علي',
        currentBalance: 0.00,
        totalSales: 1800.00,
        totalExpenses: 75.00,
        openedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        closedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    // Filter by status if provided
    if (status) {
      sampleDrawers = sampleDrawers.filter(drawer => drawer.status === status);
    }
    
    res.json(sampleDrawers);
  } catch (error) {
    console.error('Error fetching drawers:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الأدراج' });
  }
});

// Supplier invoices endpoint
app.get('/api/supplier-invoices', async (req, res) => {
  try {
    const { status, date } = req.query;
    
    // Sample supplier invoices data
    let sampleInvoices = [
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
      }
    ];
    
    // Filter by status if provided
    if (status) {
      sampleInvoices = sampleInvoices.filter(invoice => invoice.status === status);
    }
    
    // Calculate summary
    const totalAmount = sampleInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = sampleInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    
    res.json({
      invoices: sampleInvoices,
      summary: {
        totalInvoices: sampleInvoices.length,
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

// Customer payments endpoint
app.get('/api/customer-payments', async (req, res) => {
  try {
    const { paymentMethod, date } = req.query;
    
    // Sample customer payments data
    let samplePayments = [
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
      }
    ];
    
    // Filter by payment method if provided
    if (paymentMethod) {
      samplePayments = samplePayments.filter(payment => payment.paymentMethod === paymentMethod);
    }
    
    // Calculate summary
    const totalAmount = samplePayments.reduce((sum, payment) => sum + payment.amount, 0);
    
    res.json({
      payments: samplePayments,
      summary: {
        totalPayments: samplePayments.length,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({ error: 'فشل في جلب مدفوعات العملاء' });
  }
});

// Inventory history endpoint
app.get('/api/inventory-history', async (req, res) => {
  try {
    const { transactionType, date } = req.query;
    
    // Sample inventory data
    let sampleInventory = [
      {
        productId: 'برجر لحم',
        transactionType: 'Sale',
        quantity: -5,
        transactionDate: new Date().toISOString(),
        notes: 'بيع عادي'
      },
      {
        productId: 'كوكا كولا',
        transactionType: 'Purchase',
        quantity: 50,
        transactionDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        notes: 'شراء من المورد'
      }
    ];
    
    // Filter by transaction type if provided
    if (transactionType) {
      sampleInventory = sampleInventory.filter(item => item.transactionType === transactionType);
    }
    
    res.json(sampleInventory);
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({ error: 'فشل في جلب تاريخ المخزون' });
  }
});

// Restaurant tables endpoint  
app.get('/api/restaurant-tables', async (req, res) => {
  try {
    const { status } = req.query;
    
    // Sample restaurant tables
    let sampleTables = [
      { tableNumber: 1, status: 'Available', description: 'طاولة للشخصين' },
      { tableNumber: 2, status: 'Occupied', description: 'طاولة للأربعة أشخاص' },
      { tableNumber: 3, status: 'Reserved', description: 'طاولة للستة أشخاص' }
    ];
    
    // Filter by status if provided
    if (status) {
      sampleTables = sampleTables.filter(table => table.status === status);
    }
    
    res.json(sampleTables);
  } catch (error) {
    console.error('Error fetching restaurant tables:', error);
    res.status(500).json({ error: 'فشل في جلب طاولات المطعم' });
  }
});

// Keep the original customer payments structure for compatibility
app.get('/api/customer-payments-old', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { customerId, date, paymentMethod } = req.query;
    
    let query = {};
    if (customerId) query.customerId = parseInt(customerId);
    if (paymentMethod) query.paymentMethod = paymentMethod;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.paymentDate = { $gte: startDate, $lte: endDate };
    }
    
    const payments = await db.collection('customerpayments')
      .find(query)
      .sort({ paymentDate: -1 })
      .limit(100)
      .toArray();
    
    const totalAmount = payments.reduce((sum, payment) => {
      const amount = parseFloat(payment.amount) || 0;
      return sum + amount;
    }, 0);
    
    res.status(200).json({
      payments,
      summary: {
        totalPayments: payments.length,
        totalAmount
      }
    });
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({ error: 'فشل في جلب مدفوعات العملاء' });
  }
});

// Inventory history endpoint
app.get('/api/inventory-history', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { productId, date, transactionType } = req.query;
    
    let query = {};
    if (productId) query.productId = parseInt(productId);
    if (transactionType) query.transactionType = transactionType;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.transactionDate = { $gte: startDate, $lte: endDate };
    }
    
    const history = await db.collection('inventoryhistories')
      .find(query)
      .sort({ transactionDate: -1 })
      .limit(100)
      .toArray();
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({ error: 'فشل في جلب تاريخ المخزون' });
  }
});

// Restaurant tables endpoint
app.get('/api/restaurant-tables', async (req, res) => {
    try {
        const { status } = req.query;
        
        let filter = {};
        if (status) {
            filter.status = status;
        }
        
        const tables = await db.collection('RestaurantTables').find(filter).toArray();
        
        res.json(tables);
    } catch (error) {
        console.error('Error fetching restaurant tables:', error);
        res.status(500).json({ error: 'Internal server error' });
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
      const possibleDrawerCollections = ['Drawers', 'drawers', 'Drawer'];
      
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