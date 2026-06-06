/**
 * ─────────────────────────────────────────────────────────────
 *  VENDOR BRIDGE – Database Seed Script
 *  Run: node utils/seed.js
 * ─────────────────────────────────────────────────────────────
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

// ── Models ──────────────────────────────────────────────────
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const RFQ = require('../models/RFQ');
const Quotation = require('../models/Quotation');
const PurchaseOrder = require('../models/PurchaseOrder');
const Invoice = require('../models/Invoice');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');

// ── Helpers ─────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const daysAgo = (d) => new Date(Date.now() - d * 86400000);
const daysFromNow = (d) => new Date(Date.now() + d * 86400000);
const round2 = (n) => Math.round(n * 100) / 100;
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

// ── Exported Function ──────────────────────────────────────────
async function runSeed(overrideUri) {
  try {
    // ── 1. Connect ──────────────────────────────────────────
    const uri = overrideUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/vendorbridge';
    console.log('🔌 Connecting to MongoDB for seeding…');
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(uri);
    }
    console.log('✅ Connected for seeding\n');

    // ── 2. Clear all collections ────────────────────────────
    console.log('🗑️  Clearing existing data…');
    await Promise.all([
      User.deleteMany({}),
      Vendor.deleteMany({}),
      RFQ.deleteMany({}),
      Quotation.deleteMany({}),
      PurchaseOrder.deleteMany({}),
      Invoice.deleteMany({}),
      Activity.deleteMany({}),
      Notification.deleteMany({}),
      Counter.deleteMany({}),
    ]);
    console.log('✅ All collections cleared\n');

    // ══════════════════════════════════════════════════════════
    //  USERS (6)
    // ══════════════════════════════════════════════════════════
    console.log('👤 Creating users…');
    const usersData = [
      { name: 'Rajesh Kumar',  email: 'admin@vendorbridge.com',       role: 'Admin',               phone: '+91 98100 10001' },
      { name: 'Priya Sharma',  email: 'procurement@vendorbridge.com', role: 'Procurement Officer',  phone: '+91 98100 10002' },
      { name: 'Amit Patel',    email: 'manager@vendorbridge.com',     role: 'Manager',              phone: '+91 98100 10003' },
      { name: 'Neha Singh',    email: 'vendor1@vendorbridge.com',     role: 'Vendor',               phone: '+91 98100 10004' },
      { name: 'Vikram Reddy',  email: 'vendor2@vendorbridge.com',     role: 'Vendor',               phone: '+91 98100 10005' },
      { name: 'Sanjay Gupta',  email: 'officer2@vendorbridge.com',    role: 'Procurement Officer',  phone: '+91 98100 10006' },
    ];

    const users = [];
    for (const u of usersData) {
      const doc = await User.create({ ...u, password: 'password123', status: 'Active' });
      users.push(doc);
      console.log(`   ✔ ${doc.name} (${doc.role})`);
    }

    const [adminUser, procUser, managerUser, vendorUser1, vendorUser2, procUser2] = users;
    console.log(`✅ ${users.length} users created\n`);

    // ══════════════════════════════════════════════════════════
    //  VENDORS (25)
    // ══════════════════════════════════════════════════════════
    console.log('🏢 Creating vendors…');
    const vendorsData = [
      { companyName: 'Tata Infosystems Pvt Ltd',        contactPerson: 'Arun Mehta',       email: 'sales@tatainfosys.in',       phone: '+91 22 4567 8901', address: '101, Nariman Point, Mumbai, Maharashtra 400021',       gstNumber: '27AABCT1234A1Z5', category: 'Electronics',  rating: 4.5,  performanceScore: 92 },
      { companyName: 'Reliance Digital Solutions',       contactPerson: 'Siddharth Joshi',  email: 'info@reliancedigital.in',    phone: '+91 40 2345 6789', address: '45, HITEC City, Hyderabad, Telangana 500081',           gstNumber: '36AABCR5678B1Z3', category: 'Software',     rating: 4.2,  performanceScore: 88 },
      { companyName: 'Mahindra Office Furnishings',      contactPerson: 'Deepak Kulkarni',  email: 'orders@mahindraoffice.in',   phone: '+91 20 6789 1234', address: '78, Hinjawadi Phase 2, Pune, Maharashtra 411057',      gstNumber: '27AABCM9012C1Z1', category: 'Furniture',    rating: 4.0,  performanceScore: 85 },
      { companyName: 'Wipro Tech Services',              contactPerson: 'Kiran Rao',        email: 'support@wiprotech.in',       phone: '+91 80 4321 5678', address: '12, Electronic City, Bangalore, Karnataka 560100',     gstNumber: '29AABCW3456D1Z9', category: 'Services',     rating: 4.7,  performanceScore: 95 },
      { companyName: 'Godrej Interio Solutions',         contactPerson: 'Meera Desai',      email: 'sales@godrejinterio.in',     phone: '+91 11 2345 6780', address: '56, Vikhroli East, Mumbai, Maharashtra 400079',        gstNumber: '27AABCG7890E1Z7', category: 'Furniture',    rating: 4.3,  performanceScore: 89 },
      { companyName: 'HCL Hardware Solutions',           contactPerson: 'Ravi Shankar',     email: 'hardware@hclsolutions.in',   phone: '+91 120 456 7890', address: '23, Sector 62, Noida, Uttar Pradesh 201309',           gstNumber: '09AABCH1234F1Z5', category: 'Hardware',     rating: 3.8,  performanceScore: 78 },
      { companyName: 'Infosys Stationery Supplies',      contactPerson: 'Lakshmi Nair',     email: 'supplies@infosysstat.in',    phone: '+91 821 234 5678', address: '99, Electronic City, Mysore, Karnataka 570100',        gstNumber: '29AABCI5678G1Z3', category: 'Stationery',   rating: 3.5,  performanceScore: 72 },
      { companyName: 'Tech Mahindra Peripherals',        contactPerson: 'Suresh Iyer',      email: 'peripherals@techmah.in',     phone: '+91 44 5678 9012', address: '34, OMR Road, Chennai, Tamil Nadu 600119',             gstNumber: '33AABCT9012H1Z1', category: 'Electronics',  rating: 4.1,  performanceScore: 86 },
      { companyName: 'Larsen & Toubro Equipment',        contactPerson: 'Nikhil Shah',      email: 'equip@lntequip.in',          phone: '+91 79 3456 7890', address: '67, SG Highway, Ahmedabad, Gujarat 380054',            gstNumber: '24AABCL3456I1Z9', category: 'Hardware',     rating: 4.6,  performanceScore: 93 },
      { companyName: 'Birla Office Supplies',            contactPerson: 'Ananya Das',       email: 'office@birlasupplies.in',    phone: '+91 33 6789 0123', address: '12, Salt Lake City, Kolkata, West Bengal 700091',      gstNumber: '19AABCB7890J1Z7', category: 'Stationery',   rating: 3.6,  performanceScore: 74 },
      { companyName: 'Bajaj Electrical Systems',         contactPerson: 'Rajiv Malhotra',   email: 'systems@bajajelec.in',       phone: '+91 20 1234 5678', address: '45, Kothrud, Pune, Maharashtra 411038',                gstNumber: '27AABCB1234K1Z5', category: 'Electronics',  rating: 4.4,  performanceScore: 90 },
      { companyName: 'Zoho Software Pvt Ltd',            contactPerson: 'Pradeep Mohan',    email: 'sales@zohosoft.in',          phone: '+91 44 2345 6789', address: '90, Tidal Park, Chennai, Tamil Nadu 600113',           gstNumber: '33AABCZ5678L1Z3', category: 'Software',     rating: 4.8,  performanceScore: 96 },
      { companyName: 'Crompton Office Lighting',         contactPerson: 'Vikas Pandey',     email: 'lighting@crompton.in',       phone: '+91 22 3456 7890', address: '23, Andheri East, Mumbai, Maharashtra 400069',         gstNumber: '27AABCC9012M1Z1', category: 'Hardware',     rating: 3.9,  performanceScore: 80 },
      { companyName: 'Hindustan Paper Corp',             contactPerson: 'Kavita Bhat',      email: 'paper@hinpaper.in',          phone: '+91 361 234 5678', address: '5, GS Road, Guwahati, Assam 781005',                   gstNumber: '18AABCH3456N1Z9', category: 'Stationery',   rating: 3.2,  performanceScore: 68 },
      { companyName: 'Mphasis IT Services',              contactPerson: 'Rohan Kapoor',     email: 'services@mphasis.in',        phone: '+91 80 5678 9012', address: '78, Whitefield, Bangalore, Karnataka 560066',          gstNumber: '29AABCM7890O1Z7', category: 'Services',     rating: 4.0,  performanceScore: 84 },
      { companyName: 'Havells Power Systems',            contactPerson: 'Gaurav Saxena',    email: 'power@havellsys.in',         phone: '+91 120 678 9012', address: '11, Sector 18, Noida, Uttar Pradesh 201301',           gstNumber: '09AABCH1234P1Z5', category: 'Electronics',  rating: 4.3,  performanceScore: 87 },
      { companyName: 'Prestige Furniture House',         contactPerson: 'Swathi Menon',     email: 'orders@prestigefurn.in',     phone: '+91 80 8901 2345', address: '56, MG Road, Bangalore, Karnataka 560001',             gstNumber: '29AABCP5678Q1Z3', category: 'Furniture',    rating: 3.7,  performanceScore: 76 },
      { companyName: 'Mindtree Cloud Solutions',         contactPerson: 'Arjun Nambiar',    email: 'cloud@mindtreecloud.in',     phone: '+91 80 1234 5679', address: '34, Outer Ring Road, Bangalore, Karnataka 560103',     gstNumber: '29AABCM9012R1Z1', category: 'Software',     rating: 4.5,  performanceScore: 91 },
      { companyName: 'Siemens India Equipment',          contactPerson: 'Farhan Ahmed',     email: 'equipment@siemens.in',       phone: '+91 22 6789 0124', address: '89, BKC, Mumbai, Maharashtra 400051',                  gstNumber: '27AABCS3456S1Z9', category: 'Hardware',     rating: 4.9,  performanceScore: 98 },
      { companyName: 'ITC Papercraft Ltd',               contactPerson: 'Divya Sharma',     email: 'paper@itccraft.in',          phone: '+91 33 4567 8902', address: '7, Park Street, Kolkata, West Bengal 700016',          gstNumber: '19AABCI7890T1Z7', category: 'Stationery',   rating: 3.4,  performanceScore: 70 },
      { companyName: 'Cognizant Consulting Services',    contactPerson: 'Manoj Tiwari',     email: 'consult@cognizantserv.in',   phone: '+91 44 3456 7891', address: '12, Sholinganallur, Chennai, Tamil Nadu 600119',       gstNumber: '33AABCC1234U1Z5', category: 'Services',     rating: 4.2,  performanceScore: 86 },
      { companyName: 'Asian Paints Office Décor',        contactPerson: 'Pooja Jain',       email: 'decor@asianoffice.in',       phone: '+91 22 5678 9013', address: '33, Bhandup, Mumbai, Maharashtra 400078',              gstNumber: '27AABCA5678V1Z3', category: 'Furniture',    rating: 3.8,  performanceScore: 77 },
      { companyName: 'Micromax Digital Peripherals',     contactPerson: 'Harsh Vardhan',    email: 'peripherals@micromax.in',    phone: '+91 124 234 5678', address: '55, Sector 44, Gurgaon, Haryana 122003',               gstNumber: '06AABCM9012W1Z1', category: 'Electronics',  rating: 3.0,  performanceScore: 62 },
      { companyName: 'NIIT Training Solutions',          contactPerson: 'Shalini Verma',    email: 'training@niitsol.in',        phone: '+91 11 7890 1234', address: '8, Nehru Place, New Delhi 110019',                     gstNumber: '07AABCN3456X1Z9', category: 'Services',     rating: 2.5,  performanceScore: 55 },
      { companyName: 'Kores Office Stationery',          contactPerson: 'Vinod Khanna',     email: 'orders@koresoffice.in',      phone: '+91 22 8901 2346', address: '17, Worli, Mumbai, Maharashtra 400018',                gstNumber: '27AABCK7890Y1Z7', category: 'Stationery',   rating: 5.0,  performanceScore: 97 },
    ];

    const vendors = [];
    for (const v of vendorsData) {
      const doc = await Vendor.create({ ...v, status: 'Active', createdBy: adminUser._id });
      vendors.push(doc);
      console.log(`   ✔ ${doc.vendorId} – ${doc.companyName}`);
    }
    console.log(`✅ ${vendors.length} vendors created\n`);

    // ── Link Vendor users to vendor records ─────────────────
    console.log('🔗 Linking vendor users to vendor records…');
    vendorUser1.vendorRef = vendors[0]._id; // Tata Infosystems
    await vendorUser1.save();
    console.log(`   ✔ ${vendorUser1.name} → ${vendors[0].companyName}`);

    vendorUser2.vendorRef = vendors[1]._id; // Reliance Digital
    await vendorUser2.save();
    console.log(`   ✔ ${vendorUser2.name} → ${vendors[1].companyName}`);
    console.log('✅ Vendor users linked\n');

    // ══════════════════════════════════════════════════════════
    //  RFQs (15)
    // ══════════════════════════════════════════════════════════
    console.log('📋 Creating RFQs…');

    const rfqsData = [
      // Draft (2)
      { title: 'Procurement of Laptops',             productName: 'Business Laptops',          productCategory: 'Electronics', quantity: 50,  unit: 'Units',    specifications: 'Intel i7, 16GB RAM, 512GB SSD, Windows 11 Pro', status: 'Draft',    assignedCount: 3 },
      { title: 'Office Stationery Bulk Order',       productName: 'A4 Paper Reams',             productCategory: 'Stationery',  quantity: 500, unit: 'Boxes',    specifications: '75 GSM, A4 size, 500 sheets per ream',          status: 'Draft',    assignedCount: 2 },

      // Sent (2)
      { title: 'Network Infrastructure Upgrade',     productName: 'Network Switches',           productCategory: 'Hardware',    quantity: 20,  unit: 'Units',    specifications: '48-port managed gigabit PoE+ switches',         status: 'Sent',     assignedCount: 3 },
      { title: 'Office Projectors',                  productName: 'HD Projectors',              productCategory: 'Electronics', quantity: 10,  unit: 'Units',    specifications: '4000 lumens, Full HD 1080p, HDMI',              status: 'Sent',     assignedCount: 2 },

      // Open (3)
      { title: 'Ergonomic Office Chairs',            productName: 'Office Chairs',              productCategory: 'Furniture',   quantity: 100, unit: 'Units',    specifications: 'Ergonomic, lumbar support, adjustable height',  status: 'Open',     assignedCount: 4 },
      { title: 'ERP Software License',               productName: 'ERP Software License',       productCategory: 'Software',    quantity: 1,   unit: 'Licenses', specifications: '500-user enterprise license, 3-year support',   status: 'Open',     assignedCount: 3 },
      { title: 'Antivirus License Renewal',          productName: 'Antivirus License',          productCategory: 'Software',    quantity: 200, unit: 'Licenses', specifications: 'Endpoint protection, 1-year, centralized mgmt', status: 'Open',     assignedCount: 3 },

      // Closed (2)
      { title: 'Standing Desks for IT Dept',         productName: 'Standing Desks',             productCategory: 'Furniture',   quantity: 30,  unit: 'Units',    specifications: 'Electric height-adjustable, 120x60cm',         status: 'Closed',   assignedCount: 3 },
      { title: 'Printer Cartridge Supply',           productName: 'Printer Cartridges',         productCategory: 'Stationery',  quantity: 100, unit: 'Pcs',      specifications: 'HP LaserJet compatible, black & color',         status: 'Closed',   assignedCount: 2 },

      // Approved (4)
      { title: 'Server Room Equipment',              productName: 'Server Racks',               productCategory: 'Hardware',    quantity: 5,   unit: 'Units',    specifications: '42U floor-standing, cable management, PDU',     status: 'Approved', assignedCount: 3 },
      { title: 'Company Laptop Refresh',             productName: 'Premium Laptops',            productCategory: 'Electronics', quantity: 25,  unit: 'Units',    specifications: 'i9, 32GB RAM, 1TB SSD, dedicated GPU',         status: 'Approved', assignedCount: 3 },
      { title: 'Cloud Consulting Services',          productName: 'Cloud Migration Consulting',  productCategory: 'Services',    quantity: 200, unit: 'Hours',    specifications: 'AWS certified, security audit included',        status: 'Approved', assignedCount: 2 },
      { title: 'Conference Room Furniture',          productName: 'Conference Tables & Chairs',  productCategory: 'Furniture',   quantity: 10,  unit: 'Sets',     specifications: '12-seater table with executive chairs',         status: 'Approved', assignedCount: 3 },

      // Rejected (2)
      { title: 'Premium Fountain Pens',              productName: 'Fountain Pens',              productCategory: 'Stationery',  quantity: 50,  unit: 'Pcs',      specifications: 'Parker/Cross premium pens for executives',      status: 'Rejected', assignedCount: 2 },
      { title: 'VR Headsets for Training',           productName: 'VR Headsets',                productCategory: 'Electronics', quantity: 15,  unit: 'Units',    specifications: 'Standalone VR, 6DoF, enterprise management',    status: 'Rejected', assignedCount: 2 },
    ];

    // Map categories to suitable vendors
    const vendorsByCategory = {};
    for (const v of vendors) {
      if (!vendorsByCategory[v.category]) vendorsByCategory[v.category] = [];
      vendorsByCategory[v.category].push(v);
    }

    const rfqs = [];
    const procOfficers = [procUser, procUser2];
    for (let i = 0; i < rfqsData.length; i++) {
      const d = rfqsData[i];
      const categoryVendors = shuffle(vendorsByCategory[d.productCategory] || vendors);
      const assigned = categoryVendors.slice(0, d.assignedCount).map((v) => v._id);
      const creator = procOfficers[i % 2];

      const rfqDoc = {
        title: d.title,
        productName: d.productName,
        productCategory: d.productCategory,
        quantity: d.quantity,
        unit: d.unit,
        specifications: d.specifications,
        description: `Request for quotation: ${d.title}. Please submit competitive pricing.`,
        status: d.status,
        deadline: daysFromNow(rand(30, 60)),
        assignedVendors: assigned,
        createdBy: creator._id,
      };

      // For Approved/Rejected, set approval info
      if (d.status === 'Approved') {
        rfqDoc.approval = {
          decidedBy: managerUser._id,
          remarks: 'Approved – budget allocated and requirement verified.',
          decidedAt: daysAgo(rand(1, 10)),
        };
      } else if (d.status === 'Rejected') {
        rfqDoc.approval = {
          decidedBy: managerUser._id,
          remarks: 'Rejected – not in current quarter budget.',
          decidedAt: daysAgo(rand(1, 10)),
        };
      }

      const doc = await RFQ.create(rfqDoc);
      rfqs.push({ doc, data: d, assigned });
      console.log(`   ✔ ${doc.rfqNumber} – ${doc.title} [${doc.status}]`);
    }
    console.log(`✅ ${rfqs.length} RFQs created\n`);

    // ══════════════════════════════════════════════════════════
    //  QUOTATIONS (≈40)
    // ══════════════════════════════════════════════════════════
    console.log('💰 Creating quotations…');

    // Price ranges by product for realistic Indian pricing
    const priceRanges = {
      'Business Laptops':          { min: 45000,  max: 65000 },
      'A4 Paper Reams':            { min: 180,    max: 350 },
      'Network Switches':          { min: 25000,  max: 45000 },
      'HD Projectors':             { min: 35000,  max: 60000 },
      'Office Chairs':             { min: 8000,   max: 15000 },
      'ERP Software License':      { min: 1500000, max: 3500000 },
      'Antivirus License':         { min: 800,    max: 2500 },
      'Standing Desks':            { min: 18000,  max: 35000 },
      'Printer Cartridges':        { min: 1200,   max: 3500 },
      'Server Racks':              { min: 45000,  max: 85000 },
      'Premium Laptops':           { min: 95000,  max: 150000 },
      'Cloud Migration Consulting': { min: 3500,   max: 7000 },
      'Conference Tables & Chairs': { min: 75000,  max: 150000 },
      'Fountain Pens':             { min: 2500,   max: 8000 },
      'VR Headsets':               { min: 35000,  max: 65000 },
    };

    const warranties = ['1 Year', '2 Years', '3 Years', '6 Months', 'No Warranty', 'Lifetime'];

    // Create quotations only for Open, Closed, Approved, Rejected RFQs
    const quotableStatuses = ['Open', 'Closed', 'Approved', 'Rejected'];
    const quotations = []; // { doc, rfqIdx }

    for (let ri = 0; ri < rfqs.length; ri++) {
      const { doc: rfq, data, assigned } = rfqs[ri];
      if (!quotableStatuses.includes(data.status)) continue;

      const range = priceRanges[data.productName] || { min: 5000, max: 50000 };
      const numQuotes = Math.min(assigned.length, rand(2, 4));
      const vendorsForQuotes = shuffle([...assigned]).slice(0, numQuotes);

      // For Approved RFQs, pick one vendor as the winner
      const winnerIdx = data.status === 'Approved' ? 0 : -1;

      for (let qi = 0; qi < vendorsForQuotes.length; qi++) {
        const vendorId = vendorsForQuotes[qi];
        const pricePerUnit = round2(rand(range.min * 100, range.max * 100) / 100);
        const taxPercent = pick([18, 18, 18, 12, 28]); // mostly 18% GST

        let qStatus = 'Submitted';
        if (data.status === 'Approved') {
          qStatus = qi === winnerIdx ? 'Accepted' : 'Rejected';
        } else if (data.status === 'Rejected') {
          qStatus = 'Rejected';
        } else if (data.status === 'Closed') {
          qStatus = 'Under Review';
        }

        const qDoc = await Quotation.create({
          rfq: rfq._id,
          vendor: vendorId,
          pricePerUnit,
          quantity: data.quantity,
          taxPercent,
          deliveryTimeline: rand(7, 45),
          warranty: pick(warranties),
          notes: `Competitive pricing for ${data.productName}. Delivery as per schedule.`,
          status: qStatus,
          submittedBy: pick([vendorUser1, vendorUser2])._id,
        });

        quotations.push({ doc: qDoc, rfqIdx: ri, vendorId, accepted: qStatus === 'Accepted' });
        console.log(`   ✔ ${qDoc.quotationNumber} – ₹${qDoc.pricePerUnit.toLocaleString('en-IN')} × ${qDoc.quantity} = ₹${qDoc.totalAmount.toLocaleString('en-IN')} [${qDoc.status}]`);
      }
    }
    console.log(`✅ ${quotations.length} quotations created\n`);

    // ══════════════════════════════════════════════════════════
    //  PURCHASE ORDERS (10)
    // ══════════════════════════════════════════════════════════
    console.log('📦 Creating purchase orders…');

    const acceptedQuotes = quotations.filter((q) => q.accepted);
    const poStatuses = ['Issued', 'Issued', 'Issued', 'Issued', 'Acknowledged', 'Acknowledged', 'Acknowledged', 'Completed', 'Completed', 'Completed'];
    const purchaseOrders = [];

    for (let pi = 0; pi < Math.min(acceptedQuotes.length, 10); pi++) {
      const { doc: qt, rfqIdx, vendorId } = acceptedQuotes[pi];
      const rfq = rfqs[rfqIdx];
      const subTotal = round2(qt.pricePerUnit * qt.quantity);
      const taxAmount = round2((subTotal * qt.taxPercent) / 100);
      const totalAmount = round2(subTotal + taxAmount);

      const po = await PurchaseOrder.create({
        rfq: rfq.doc._id,
        quotation: qt._id,
        vendor: vendorId,
        productName: rfq.data.productName,
        quantity: qt.quantity,
        unit: rfq.data.unit,
        pricePerUnit: qt.pricePerUnit,
        taxPercent: qt.taxPercent,
        taxAmount,
        subTotal,
        totalAmount,
        status: poStatuses[pi] || 'Issued',
        invoiced: poStatuses[pi] === 'Completed',
        createdBy: procUser._id,
      });

      purchaseOrders.push(po);
      console.log(`   ✔ ${po.poNumber} – ${po.productName} – ₹${po.totalAmount.toLocaleString('en-IN')} [${po.status}]`);
    }
    console.log(`✅ ${purchaseOrders.length} purchase orders created\n`);

    // ══════════════════════════════════════════════════════════
    //  INVOICES (10)
    // ══════════════════════════════════════════════════════════
    console.log('🧾 Creating invoices…');

    const invoiceStatuses = ['Pending', 'Pending', 'Pending', 'Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Overdue', 'Overdue'];
    const invoices = [];

    for (let ii = 0; ii < Math.min(purchaseOrders.length, 10); ii++) {
      const po = purchaseOrders[ii];
      const createdDate = daysAgo(rand(5, 35));
      const dueDate = new Date(createdDate.getTime() + 30 * 86400000);

      const inv = await Invoice.create({
        purchaseOrder: po._id,
        vendor: po.vendor,
        productName: po.productName,
        quantity: po.quantity,
        unit: po.unit,
        pricePerUnit: po.pricePerUnit,
        taxPercent: po.taxPercent,
        taxAmount: po.taxAmount,
        subTotal: po.subTotal,
        totalAmount: po.totalAmount,
        dueDate,
        paymentStatus: invoiceStatuses[ii] || 'Pending',
        createdBy: procUser._id,
      });

      invoices.push(inv);
      console.log(`   ✔ ${inv.invoiceNumber} – ${inv.productName} – ₹${inv.totalAmount.toLocaleString('en-IN')} [${inv.paymentStatus}]`);
    }
    console.log(`✅ ${invoices.length} invoices created\n`);

    // ══════════════════════════════════════════════════════════
    //  ACTIVITIES (25)
    // ══════════════════════════════════════════════════════════
    console.log('📝 Creating activity log…');

    const activitiesData = [
      { user: adminUser,    action: 'User Login',           description: 'Admin logged into the system',                                     entityType: 'User',       entityId: adminUser._id.toString() },
      { user: procUser,     action: 'User Login',           description: 'Procurement officer logged in',                                    entityType: 'User',       entityId: procUser._id.toString() },
      { user: managerUser,  action: 'User Login',           description: 'Manager logged into the system',                                   entityType: 'User',       entityId: managerUser._id.toString() },
      { user: adminUser,    action: 'Vendor Added',         description: `Added vendor: ${vendors[0].companyName}`,                           entityType: 'Vendor',     entityId: vendors[0].vendorId },
      { user: adminUser,    action: 'Vendor Added',         description: `Added vendor: ${vendors[1].companyName}`,                           entityType: 'Vendor',     entityId: vendors[1].vendorId },
      { user: adminUser,    action: 'Vendor Added',         description: `Added vendor: ${vendors[2].companyName}`,                           entityType: 'Vendor',     entityId: vendors[2].vendorId },
      { user: adminUser,    action: 'Vendor Added',         description: `Added vendor: ${vendors[3].companyName}`,                           entityType: 'Vendor',     entityId: vendors[3].vendorId },
      { user: adminUser,    action: 'Vendor Added',         description: `Added vendor: ${vendors[4].companyName}`,                           entityType: 'Vendor',     entityId: vendors[4].vendorId },
      { user: procUser,     action: 'RFQ Created',          description: `Created RFQ: ${rfqs[0].doc.title}`,                                 entityType: 'RFQ',        entityId: rfqs[0].doc.rfqNumber },
      { user: procUser2,    action: 'RFQ Created',          description: `Created RFQ: ${rfqs[1].doc.title}`,                                 entityType: 'RFQ',        entityId: rfqs[1].doc.rfqNumber },
      { user: procUser,     action: 'RFQ Created',          description: `Created RFQ: ${rfqs[4].doc.title}`,                                 entityType: 'RFQ',        entityId: rfqs[4].doc.rfqNumber },
      { user: procUser2,    action: 'RFQ Created',          description: `Created RFQ: ${rfqs[5].doc.title}`,                                 entityType: 'RFQ',        entityId: rfqs[5].doc.rfqNumber },
      { user: procUser,     action: 'RFQ Created',          description: `Created RFQ: ${rfqs[9].doc.title}`,                                 entityType: 'RFQ',        entityId: rfqs[9].doc.rfqNumber },
      { user: vendorUser1,  action: 'Quotation Submitted',  description: `Submitted quotation for ${rfqs[4].doc.title}`,                      entityType: 'Quotation',  entityId: quotations[0]?.doc?.quotationNumber || 'QT-0001' },
      { user: vendorUser2,  action: 'Quotation Submitted',  description: `Submitted quotation for ${rfqs[5].doc.title}`,                      entityType: 'Quotation',  entityId: quotations[2]?.doc?.quotationNumber || 'QT-0003' },
      { user: vendorUser1,  action: 'Quotation Submitted',  description: `Submitted quotation for ${rfqs[9].doc.title}`,                      entityType: 'Quotation',  entityId: quotations[5]?.doc?.quotationNumber || 'QT-0006' },
      { user: managerUser,  action: 'Approval Completed',   description: `Approved RFQ: ${rfqs[9].doc.title}`,                                entityType: 'RFQ',        entityId: rfqs[9].doc.rfqNumber },
      { user: managerUser,  action: 'Approval Completed',   description: `Approved RFQ: ${rfqs[10].doc.title}`,                               entityType: 'RFQ',        entityId: rfqs[10].doc.rfqNumber },
      { user: managerUser,  action: 'Approval Completed',   description: `Approved RFQ: ${rfqs[11].doc.title}`,                               entityType: 'RFQ',        entityId: rfqs[11].doc.rfqNumber },
      { user: managerUser,  action: 'Approval Completed',   description: `Rejected RFQ: ${rfqs[13].doc.title}`,                               entityType: 'RFQ',        entityId: rfqs[13].doc.rfqNumber },
      { user: procUser,     action: 'PO Generated',         description: `Generated PO for ${purchaseOrders[0]?.productName || 'Server Racks'}`, entityType: 'PurchaseOrder', entityId: purchaseOrders[0]?.poNumber || 'PO-0001' },
      { user: procUser,     action: 'PO Generated',         description: `Generated PO for ${purchaseOrders[1]?.productName || 'Premium Laptops'}`, entityType: 'PurchaseOrder', entityId: purchaseOrders[1]?.poNumber || 'PO-0002' },
      { user: procUser,     action: 'Invoice Generated',    description: `Invoice generated for ${invoices[0]?.productName || 'Server Racks'}`,  entityType: 'Invoice',   entityId: invoices[0]?.invoiceNumber || 'INV-0001' },
      { user: procUser,     action: 'Invoice Generated',    description: `Invoice generated for ${invoices[1]?.productName || 'Premium Laptops'}`, entityType: 'Invoice', entityId: invoices[1]?.invoiceNumber || 'INV-0002' },
      { user: procUser2,    action: 'User Login',           description: 'Procurement officer 2 logged in',                                   entityType: 'User',       entityId: procUser2._id.toString() },
    ];

    const activities = [];
    for (let ai = 0; ai < activitiesData.length; ai++) {
      const a = activitiesData[ai];
      const doc = await Activity.create({
        user: a.user._id,
        userName: a.user.name,
        action: a.action,
        description: a.description,
        entityType: a.entityType,
        entityId: a.entityId,
        createdAt: daysAgo(rand(0, 30)),
      });
      activities.push(doc);
    }
    console.log(`✅ ${activities.length} activities created\n`);

    // ══════════════════════════════════════════════════════════
    //  NOTIFICATIONS (15)
    // ══════════════════════════════════════════════════════════
    console.log('🔔 Creating notifications…');

    const notificationsData = [
      { recipient: procUser._id,    roles: ['Procurement Officer'], title: 'New RFQ Assigned',                  message: `RFQ ${rfqs[4].doc.rfqNumber} has been assigned to vendors for quotation.`,    type: 'New RFQ',              read: true },
      { recipient: procUser2._id,   roles: ['Procurement Officer'], title: 'New RFQ Assigned',                  message: `RFQ ${rfqs[5].doc.rfqNumber} has been assigned to vendors for quotation.`,    type: 'New RFQ',              read: true },
      { recipient: managerUser._id, roles: ['Manager'],             title: 'Approval Pending',                  message: `RFQ ${rfqs[9].doc.rfqNumber} requires your approval.`,                        type: 'Approval Pending',     read: true },
      { recipient: managerUser._id, roles: ['Manager'],             title: 'Approval Pending',                  message: `RFQ ${rfqs[10].doc.rfqNumber} requires your approval.`,                       type: 'Approval Pending',     read: false },
      { recipient: null,            roles: ['Admin', 'Procurement Officer'], title: 'Quotation Received',       message: `New quotation received for ${rfqs[4].doc.title}.`,                            type: 'Quotation Submitted',  read: false },
      { recipient: null,            roles: ['Admin', 'Procurement Officer'], title: 'Quotation Received',       message: `New quotation received for ${rfqs[9].doc.title}.`,                            type: 'Quotation Submitted',  read: true },
      { recipient: procUser._id,    roles: ['Procurement Officer'], title: 'RFQ Approved',                      message: `RFQ ${rfqs[9].doc.rfqNumber} has been approved by ${managerUser.name}.`,      type: 'Approval Completed',   read: true },
      { recipient: procUser._id,    roles: ['Procurement Officer'], title: 'RFQ Approved',                      message: `RFQ ${rfqs[10].doc.rfqNumber} has been approved by ${managerUser.name}.`,     type: 'Approval Completed',   read: false },
      { recipient: procUser2._id,   roles: ['Procurement Officer'], title: 'RFQ Rejected',                      message: `RFQ ${rfqs[13].doc.rfqNumber} has been rejected. Reason: Budget constraints.`, type: 'Approval Completed',  read: false },
      { recipient: vendorUser1._id, roles: ['Vendor'],              title: 'New RFQ Invitation',                message: `You have been invited to submit a quotation for ${rfqs[4].doc.title}.`,       type: 'New RFQ',              read: true },
      { recipient: vendorUser2._id, roles: ['Vendor'],              title: 'New RFQ Invitation',                message: `You have been invited to submit a quotation for ${rfqs[5].doc.title}.`,       type: 'New RFQ',              read: false },
      { recipient: vendorUser1._id, roles: ['Vendor'],              title: 'Purchase Order Issued',             message: `A purchase order has been generated for your quotation.`,                     type: 'General',              read: false },
      { recipient: procUser._id,    roles: ['Procurement Officer'], title: 'Invoice Due Soon',                  message: `Invoice ${invoices[0]?.invoiceNumber || 'INV-0001'} is due within 7 days.`,   type: 'Invoice Generated',    read: false },
      { recipient: adminUser._id,   roles: ['Admin'],               title: 'System Alert',                      message: 'Monthly procurement report is ready for review.',                             type: 'General',              read: false },
      { recipient: null,            roles: ['Admin', 'Manager'],    title: 'Overdue Invoice Alert',             message: `There are ${invoices.filter(i => i.paymentStatus === 'Overdue').length} overdue invoices requiring attention.`, type: 'Invoice Generated', read: false },
    ];

    const notifications = [];
    for (const n of notificationsData) {
      const doc = await Notification.create({
        ...n,
        createdAt: daysAgo(rand(0, 15)),
      });
      notifications.push(doc);
    }
    console.log(`✅ ${notifications.length} notifications created\n`);

    // ══════════════════════════════════════════════════════════
    //  COUNTER SYNC
    // ══════════════════════════════════════════════════════════
    // Counters are already set correctly by the pre-save hooks.
    // Just log current state.
    const counters = await Counter.find({});
    console.log('🔢 Counter state:');
    counters.forEach((c) => console.log(`   ${c._id}: ${c.seq}`));
    console.log('');

    // ══════════════════════════════════════════════════════════
    //  SUMMARY
    // ══════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════');
    console.log('  🎉  SEED COMPLETE – VENDOR BRIDGE');
    console.log('═══════════════════════════════════════════════');
    console.log(`  Users:           ${users.length}`);
    console.log(`  Vendors:         ${vendors.length}`);
    console.log(`  RFQs:            ${rfqs.length}`);
    console.log(`  Quotations:      ${quotations.length}`);
    console.log(`  Purchase Orders: ${purchaseOrders.length}`);
    console.log(`  Invoices:        ${invoices.length}`);
    console.log(`  Activities:      ${activities.length}`);
    console.log(`  Notifications:   ${notifications.length}`);
    console.log('═══════════════════════════════════════════════');
    console.log('  Default password for all users: password123');
    console.log('═══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  }
}

// Run directly if called via CLI
if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = runSeed;
