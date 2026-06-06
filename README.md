<a href="https://vendor-bridge-mps1.onrender.com">Open vendor bridge</a>

# 🏢 VENDOR BRIDGE

> A Modern Procurement Management System inspired by Odoo ERP

**VENDOR BRIDGE** is a full-stack web application that streamlines the complete procurement workflow — from vendor onboarding and RFQ management to quotation comparison, approvals, purchase orders, and invoice generation.

Built for the **Odoo Hackathon**, it demonstrates a production-grade procurement solution with role-based access, real-time analytics, and PDF generation.

---

## ✨ Features

### Core Modules
- **Vendor Management** — Register, track, rate, and categorize vendors
- **RFQ Management** — Create and distribute Request for Quotations
- **Quotation Comparison** — Side-by-side comparison with smart highlights
- **Approval Workflow** — Manager-driven approve/reject/request-changes flow
- **Purchase Orders** — Auto-generated POs with PDF download
- **Invoice Management** — Generate invoices, track payments, email PDFs
- **Analytics Dashboard** — Real-time KPIs, charts, and procurement trends
- **Activity Logs** — Full audit trail of all system actions
- **Notifications** — Role-based notification system

### Security & Architecture
- JWT Authentication with role-based access control
- Rate limiting on auth endpoints
- Input sanitization (ReDoS-safe regex)
- Graceful shutdown with DB cleanup
- Pagination on all list endpoints
- Centralized error handling with AppError class
- MongoDB connection retry with backoff

---

## 🧑‍💼 User Roles

| Role | Permissions |
|------|------------|
| **Admin** | Full access, user management, analytics |
| **Procurement Officer** | Create RFQs, manage vendors, generate POs/invoices |
| **Vendor** | View assigned RFQs, submit quotations, track orders |
| **Manager** | Approve/reject RFQs, monitor workflow |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6), Bootstrap 5 |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas or local), Mongoose ODM |
| Auth | JWT, bcrypt |
| PDF | PDFKit |
| Email | Nodemailer |
| Charts | Chart.js |

---

## 📂 Project Structure

```
vendor-bridge/
├── config/
│   └── db.js                # MongoDB connection with retry logic
├── controllers/
│   ├── activityController.js
│   ├── approvalController.js
│   ├── authController.js
│   ├── dashboardController.js
│   ├── invoiceController.js
│   ├── notificationController.js
│   ├── poController.js
│   ├── quotationController.js
│   ├── rfqController.js
│   ├── userController.js
│   └── vendorController.js
├── middleware/
│   ├── asyncHandler.js      # Async error wrapper
│   ├── auth.js              # JWT + role-based auth
│   ├── errorHandler.js      # Central error handler
│   ├── rateLimiter.js       # In-memory rate limiter
│   └── validate.js          # Request validation helpers
├── models/
│   ├── Activity.js
│   ├── Counter.js           # Atomic sequence counter
│   ├── Invoice.js
│   ├── Notification.js
│   ├── PurchaseOrder.js
│   ├── Quotation.js
│   ├── RFQ.js
│   ├── User.js
│   └── Vendor.js
├── public/
│   ├── index.html           # Login page
│   ├── register.html        # Registration page
│   ├── forgot-password.html # Password reset request
│   └── dashboard.html       # Main SPA dashboard
├── routes/
│   ├── activityRoutes.js
│   ├── approvalRoutes.js
│   ├── authRoutes.js
│   ├── dashboardRoutes.js
│   ├── invoiceRoutes.js
│   ├── notificationRoutes.js
│   ├── poRoutes.js
│   ├── quotationRoutes.js
│   ├── rfqRoutes.js
│   ├── userRoutes.js
│   └── vendorRoutes.js
├── utils/
│   ├── AppError.js          # Custom error class
│   ├── constants.js         # Centralized enums
│   ├── email.js             # Nodemailer wrapper
│   ├── escapeRegex.js       # Regex sanitizer
│   ├── logger.js            # Activity & notification logger
│   ├── paginate.js          # Pagination helpers
│   ├── pdfGenerator.js      # PDFKit document generator
│   └── seed.js              # Demo data seeder
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd vendor-bridge

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# 4. Seed demo data (optional but recommended)
npm run seed

# 5. Start the server
npm run dev
```

### Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@vendorbridge.com | password123 |
| Procurement Officer | procurement@vendorbridge.com | password123 |
| Manager | manager@vendorbridge.com | password123 |
| Vendor | vendor1@vendorbridge.com | password123 |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password/:token` | Reset password |

### Vendors
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendors` | List vendors (paginated) |
| GET | `/api/vendors/:id` | Get vendor details |
| POST | `/api/vendors` | Create vendor |
| PUT | `/api/vendors/:id` | Update vendor |
| DELETE | `/api/vendors/:id` | Delete vendor |

### RFQs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rfqs` | List RFQs (paginated) |
| GET | `/api/rfqs/:id` | Get RFQ details |
| POST | `/api/rfqs` | Create RFQ |
| PUT | `/api/rfqs/:id` | Update RFQ |
| DELETE | `/api/rfqs/:id` | Delete RFQ |

### Quotations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotations` | List quotations |
| GET | `/api/quotations/compare/:rfqId` | Compare quotations |
| POST | `/api/quotations` | Submit quotation |
| PUT | `/api/quotations/:id` | Update quotation |
| DELETE | `/api/quotations/:id` | Delete quotation |

### Approvals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/approvals/queue` | Get approval queue |
| GET | `/api/approvals/history` | Get approval history |
| POST | `/api/approvals/:rfqId/approve` | Approve RFQ |
| POST | `/api/approvals/:rfqId/reject` | Reject RFQ |
| POST | `/api/approvals/:rfqId/request-changes` | Request changes |

### Purchase Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/purchase-orders` | List POs |
| GET | `/api/purchase-orders/:id` | Get PO |
| POST | `/api/purchase-orders` | Generate PO |
| PUT | `/api/purchase-orders/:id` | Update PO status |
| GET | `/api/purchase-orders/:id/pdf` | Download PO PDF |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | List invoices |
| GET | `/api/invoices/:id` | Get invoice |
| POST | `/api/invoices` | Generate invoice |
| PUT | `/api/invoices/:id` | Update payment status |
| GET | `/api/invoices/:id/pdf` | Download invoice PDF |
| POST | `/api/invoices/:id/email` | Email invoice |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Dashboard KPIs |
| GET | `/api/dashboard/charts` | Chart data |
| GET | `/api/dashboard/summary` | Summary data |
| GET | `/api/activities` | Activity logs |
| GET | `/api/notifications` | User notifications |
| GET | `/api/meta` | Enum metadata |
| GET | `/api/health` | Health check |

---

## 💰 Currency

All monetary values are in **Indian Rupees (₹)** with GST tax calculations.

---

## 📄 License

MIT

---

## 👥 Team

**VENDOR BRIDGE Team** — Built for the Odoo Hackathon
