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

// Drawer management endpoints
app.get('/api/drawers', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { status, cashierId, date } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (cashierId) query.cashierId = cashierId;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.openedAt = { $gte: startDate, $lte: endDate };
    }
    
    const drawers = await db.collection('drawers')
      .find(query)
      .sort({ openedAt: -1 })
      .limit(50)
      .toArray();
    
    res.status(200).json(drawers);
  } catch (error) {
    console.error('Error fetching drawers:', error);
    res.status(500).json({ error: 'فشل في جلب بيانات الأدراج' });
  }
});

// Supplier invoices endpoint
app.get('/api/supplier-invoices', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const { status, supplierId, date } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (supplierId) query.supplierId = parseInt(supplierId);
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query.invoiceDate = { $gte: startDate, $lte: endDate };
    }
    
    const invoices = await db.collection('supplierinvoices')
      .find(query)
      .sort({ invoiceDate: -1 })
      .limit(100)
      .toArray();
    
    const totalAmount = invoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.totalAmount) || 0;
      return sum + amount;
    }, 0);
    
    const totalPaid = invoices.reduce((sum, inv) => {
      const paid = parseFloat(inv.amountPaid) || 0;
      return sum + paid;
    }, 0);
    
    res.status(200).json({
      invoices,
      summary: {
        totalInvoices: invoices.length,
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
    const { db } = await connectToDatabase();
    const { status, isActive } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const tables = await db.collection('restauranttables')
      .find(query)
      .sort({ tableNumber: 1 })
      .toArray();
    
    res.status(200).json(tables);
  } catch (error) {
    console.error('Error fetching restaurant tables:', error);
    res.status(500).json({ error: 'فشل في جلب طاولات المطعم' });
  }
});

// Dashboard summary endpoint
app.get('/api/dashboard-summary', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
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
    
    // Get sales data
    const salesQuery = {
      transactionDate: { $gte: startDate, $lte: endDate },
      transactionType: "Sale"
    };
    
    const transactions = await db.collection('transactions').find(salesQuery).toArray();
    const totalSales = transactions.reduce((sum, tx) => sum + (parseFloat(tx.totalAmount) || 0), 0);
    
    // Get expenses
    const expenses = await db.collection('expenses')
      .find({
        $or: [
          { date: { $gte: startDate, $lte: endDate } },
          { createdAt: { $gte: startDate, $lte: endDate } }
        ]
      })
      .toArray();
    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
    
    // Get drawer status
    const openDrawers = await db.collection('drawers').countDocuments({ status: 'Open' });
    
    // Get supplier invoices
    const pendingInvoices = await db.collection('supplierinvoices')
      .countDocuments({ status: { $in: ['Draft', 'Pending'] } });
    
    // Get customer payments
    const todayPayments = await db.collection('customerpayments')
      .find({ paymentDate: { $gte: startDate, $lte: endDate } })
      .toArray();
    const totalCustomerPayments = todayPayments.reduce((sum, pay) => sum + (parseFloat(pay.amount) || 0), 0);
    
    // Get available tables
    const availableTables = await db.collection('restauranttables')
      .countDocuments({ status: 'Available', isActive: true });
    
    res.status(200).json({
      sales: {
        totalAmount: totalSales,
        transactionCount: transactions.length
      },
      expenses: {
        totalAmount: totalExpenses,
        expenseCount: expenses.length
      },
      profit: totalSales - totalExpenses,
      drawers: {
        openCount: openDrawers
      },
      suppliers: {
        pendingInvoices
      },
      customers: {
        paymentsToday: totalCustomerPayments,
        paymentCount: todayPayments.length
      },
      restaurant: {
        availableTables
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: 'فشل في جلب ملخص لوحة التحكم' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;