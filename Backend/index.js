const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const initializeRBAC = require('./src/scripts/initializeRBAC.js');
const auth = require('./src/routes/authRoutes.js');
const corp = require('./src/routes/corpRoutes.js');
const rbacRouter = require('./src/routes/rbacRoutes.js');
const userRoutes = require('./src/routes/userRoutes.js');
const testLogsRouter = require("./src/routes/testLogRoutes.js")
const settingRoutes = require('./src/routes/settingRoutes.js');
const vehicleRoutes = require('./src/routes/vehicleRoutes.js');
const orgRoutes = require('./src/routes/orgRoutes.js');
const agreementRoutes = require('./src/routes/agreementRoutes.js');
const customerRoutes = require('./src/routes/customerRoutes.js');
const swishRoutes = require('./src/routes/swishRoutes.js');
const receiptRoutes = require('./src/routes/receiptRoutes.js');
const dashboardRoutes = require('./src/routes/dashboardRoutes.js');
const { connectDB } = require('./src/database/connectionDatabase.js');

const app = express();
const httpServer = createServer(app);

// CORS configuration
const allowedOrigins = [
  'http://localhost:8080',
  'http://localhost:8081',
  'https://cloudspherex.tech',
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Origin not allowed by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Parse JSON bodies
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/rbac', rbacRouter);
app.use('/api/auth', auth);
app.use('/api/corporations', corp);
app.use('/api/users', userRoutes);
app.use('/api/theme', settingRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/agreements', agreementRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/swish', swishRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/dashboard', dashboardRoutes);

// testing logs
app.use('/api', testLogsRouter);

// Set up a route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const PORT = process.env.PORT || 3000;

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize RBAC
    await initializeRBAC();
    
    // Start HTTP server
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
