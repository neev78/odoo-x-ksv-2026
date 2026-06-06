require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const rateLimit = require('./middleware/rateLimiter');
const {
  ROLES, VENDOR_CATEGORIES, VENDOR_STATUSES, RFQ_STATUSES,
  QUOTATION_STATUSES, PO_STATUSES, INVOICE_STATUSES, UNITS,
} = require('./utils/constants');

const app = express();

// ---- Security & Core middleware ----
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['*'];
app.use(cors({
  origin: allowedOrigins.includes('*') ? true : allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.disable('x-powered-by'); // don't leak framework info

if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// Global API rate limit: 200 requests per 15 min per IP
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Stricter rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

// ---- API routes ----
app.use('/api/auth', authLimiter, require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/rfqs', require('./routes/rfqRoutes'));
app.use('/api/quotations', require('./routes/quotationRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/purchase-orders', require('./routes/poRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// ---- Metadata (enums used to populate dropdowns) ----
// Values are imported from the shared constants file — single source of truth.
app.get('/api/meta', (req, res) => {
  res.json({
    success: true,
    data: {
      roles: ROLES,
      vendorCategories: VENDOR_CATEGORIES,
      vendorStatuses: VENDOR_STATUSES,
      rfqStatuses: RFQ_STATUSES,
      quotationStatuses: QUOTATION_STATUSES,
      poStatuses: PO_STATUSES,
      invoiceStatuses: INVOICE_STATUSES,
      units: UNITS,
    },
  });
});

app.get('/api/health', (req, res) => res.json({
  success: true,
  status: 'ok',
  time: new Date(),
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage().rss,
}));

// ---- Static frontend ----
app.use(express.static(path.join(__dirname, 'public')));

// Friendly routes for HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// ---- Error handling ----
app.use('/api', notFound);
app.use(errorHandler);

// ---- Boot ----
const PORT = process.env.PORT || 5000;
let server;

connectDB().then(async () => {
  const User = require('./models/User');
  if (await User.countDocuments() === 0) {
    console.log('🌱 Database is empty. Seeding dummy data...');
    const runSeed = require('./utils/seed');
    await runSeed(process.env.MONGODB_URI);
  }

  server = app.listen(PORT, () => {
    console.log(`\n🚀  VENDOR BRIDGE server running at http://localhost:${PORT}`);
    console.log(`    Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
});

// ---- Graceful shutdown ----
function gracefulShutdown(signal) {
  console.log(`\n⏳  ${signal} received — shutting down gracefully…`);
  if (server) {
    server.close(() => {
      const mongoose = require('mongoose');
      mongoose.connection.close(false).then(() => {
        console.log('✅  MongoDB connection closed.');
        process.exit(0);
      });
    });
    // Force-kill if not done in 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch-all for unhandled errors so the server doesn't crash silently
process.on('unhandledRejection', (reason) => {
  console.error('💥  Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥  Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

module.exports = app;
