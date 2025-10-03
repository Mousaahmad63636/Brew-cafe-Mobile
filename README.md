# 🏪 QuickTech Restaurant Management Dashboard

A **professional, enterprise-grade** web-based dashboard for comprehensive restaurant management, seamlessly integrated with the QuickTech DataSync Service. Built with modern design principles and advanced UI/UX patterns.

## Features

### 📊 Dashboard Overview
- **Real-time Sales Analytics**: Total sales, transactions, and profit tracking
- **Expense Management**: Monitor daily expenses and calculate net profit
- **Drawer Status**: Track open/closed cash drawers
- **Supplier Management**: Monitor pending invoices and payments
- **Customer Payments**: Track customer payment history
- **Table Management**: Restaurant table availability and status

### 🏪 Sales Management
- **Transaction History**: Detailed sales transaction records
- **Employee Filtering**: Filter sales by specific cashiers/employees
- **Date Range Analysis**: Daily, weekly, and monthly sales reports
- **Real-time Updates**: Live data synchronization with POS system

### 💰 Drawer Management
- **Cash Drawer Tracking**: Monitor opening/closing balances
- **Cashier Performance**: Track individual cashier activities
- **Cash Flow Analysis**: Daily cash in/out tracking
- **Drawer History**: Complete audit trail of drawer operations

### 🏭 Supplier Operations
- **Invoice Management**: Track supplier invoices and payment status
- **Payment Tracking**: Monitor paid vs outstanding amounts
- **Supplier Analytics**: Comprehensive supplier payment summaries
- **Status Filtering**: Filter by draft, pending, or paid invoices

### 👥 Customer Management
- **Payment History**: Track all customer payments
- **Payment Methods**: Support for cash, card, and transfer payments
- **Customer Analytics**: Payment summaries and trends
- **Payment Tracking**: Detailed payment records with timestamps

### 📦 Inventory Management
- **Stock Movement History**: Track all inventory transactions
- **Transaction Types**: Monitor sales, purchases, and adjustments
- **Product Tracking**: Individual product movement history
- **Inventory Analytics**: Comprehensive stock movement reports

### 🍽️ Restaurant Operations
- **Table Management**: Visual table status overview
- **Table Status Tracking**: Available, occupied, and reserved tables
- **Real-time Updates**: Live table status synchronization
- **Table Configuration**: Manage table numbers and descriptions

## 🎨 Professional Design System

### **Modern UI/UX Features**
- **Design System**: CSS custom properties with comprehensive color palette
- **Typography**: Inter font family with optimized font weights and sizes
- **Glassmorphism**: Modern glass-effect cards with backdrop blur
- **Micro-interactions**: Smooth animations and hover effects
- **Professional Icons**: FontAwesome 6.4.0 integration with contextual icons
- **Gradient Backgrounds**: Sophisticated color gradients throughout the interface

### **Advanced Visual Elements**
- **Animated Cards**: Fade-in animations with intersection observer
- **Status Indicators**: Color-coded badges with gradient backgrounds
- **Interactive Navigation**: Shimmer effects and smooth transitions
- **Professional Shadows**: Multi-layer shadow system for depth
- **Responsive Grid**: CSS Grid with auto-fit and minmax for perfect layouts

### **Accessibility & Performance**
- **Focus Management**: Professional focus states with outline indicators
- **Keyboard Navigation**: Full keyboard accessibility support
- **Print Optimization**: Dedicated print styles for reports
- **Mobile-First**: Progressive enhancement from mobile to desktop
- **Performance**: Optimized animations with hardware acceleration

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: MongoDB (synced from SQL Server via DataSync Service)
- **Frontend**: Vanilla JavaScript with modern CSS Grid/Flexbox
- **Styling**: Professional design system with CSS custom properties
- **Icons**: FontAwesome 6.4.0 with contextual business icons
- **Typography**: Google Fonts (Inter) with Arabic RTL support
- **APIs**: RESTful API endpoints for all operations

## Installation

1. **Prerequisites**
   ```bash
   Node.js >= 14.0.0
   MongoDB connection (configured in .env)
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create a `.env` file with:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_DB=QuickTechPOS
   PORT=3000
   ```

4. **Start the Server**
   ```bash
   # Production
   npm start
   
   # Development with auto-reload
   npm run dev
   ```

## API Endpoints

### Core Endpoints
- `GET /api/sales` - Sales transactions with filtering
- `GET /api/employees` - Employee/cashier list
- `GET /api/dashboard-summary` - Complete dashboard overview

### Management Endpoints
- `GET /api/drawers` - Cash drawer information
- `GET /api/supplier-invoices` - Supplier invoice management
- `GET /api/customer-payments` - Customer payment history
- `GET /api/inventory-history` - Inventory movement tracking
- `GET /api/restaurant-tables` - Restaurant table management

## Features by Section

### Dashboard
- 8 key performance indicators
- Real-time data updates
- Comprehensive business overview
- Quick status indicators

### Sales
- Transaction filtering by employee and date
- Mobile-responsive transaction cards
- Desktop table view for detailed analysis
- Export capabilities

### Drawers
- Real-time drawer status monitoring
- Cashier performance tracking
- Opening/closing balance management
- Cash flow analysis

### Suppliers
- Invoice status tracking (Draft/Pending/Paid)
- Payment summaries and outstanding amounts
- Supplier performance analytics
- Payment history tracking

### Customers
- Payment method analysis
- Customer payment history
- Payment summaries and trends
- Detailed payment records

### Inventory
- Stock movement tracking
- Transaction type filtering
- Product-specific history
- Inventory analytics

### Restaurant
- Visual table layout
- Real-time status updates
- Table availability tracking
- Status-based filtering

## Integration

This dashboard integrates seamlessly with the QuickTech DataSync Service:

1. **Data Source**: SQL Server (Primary POS Database)
2. **Sync Service**: QuickTech DataSync Service
3. **Target Database**: MongoDB (Web Dashboard)
4. **Sync Frequency**: Real-time with 2-minute intervals
5. **Data Entities**: 15+ business entities synchronized

## Mobile Support

- **Responsive Design**: Optimized for mobile devices
- **Touch-Friendly**: Large buttons and touch targets
- **Arabic RTL**: Full right-to-left language support
- **Offline Indicators**: Clear loading and error states

## Security

- **CORS Configuration**: Secure cross-origin requests
- **Environment Variables**: Secure configuration management
- **Error Handling**: Comprehensive error management
- **Data Validation**: Input validation and sanitization

## Deployment

The dashboard can be deployed to various platforms:

- **Local Server**: Direct Node.js deployment
- **Cloud Platforms**: Heroku, Vercel, AWS, etc.
- **Docker**: Containerized deployment
- **PM2**: Process management for production

## Support

For technical support or feature requests, contact the QuickTech development team.

---

© 2025 QuickTech Systems - Comprehensive Restaurant Management Solution
