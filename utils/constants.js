/**
 * Centralized enum / constant definitions.
 * Import these in models, controllers, and the /api/meta endpoint
 * to avoid duplicating magic strings across the codebase.
 */

const ROLES = ['Admin', 'Procurement Officer', 'Vendor', 'Manager'];

const VENDOR_CATEGORIES = [
  'Electronics',
  'Furniture',
  'Software',
  'Stationery',
  'Services',
  'Hardware',
];

const VENDOR_STATUSES = ['Active', 'Inactive', 'Blacklisted'];

const RFQ_STATUSES = ['Draft', 'Sent', 'Open', 'Closed', 'Approved', 'Rejected'];

const QUOTATION_STATUSES = ['Draft', 'Submitted', 'Under Review', 'Accepted', 'Rejected'];

const PO_STATUSES = ['Issued', 'Acknowledged', 'Completed', 'Cancelled'];

const INVOICE_STATUSES = ['Pending', 'Paid', 'Overdue', 'Cancelled'];

const UNITS = ['Units', 'Pcs', 'Boxes', 'Kg', 'Licenses', 'Hours', 'Sets'];

const USER_STATUSES = ['Active', 'Inactive'];

module.exports = {
  ROLES,
  VENDOR_CATEGORIES,
  VENDOR_STATUSES,
  RFQ_STATUSES,
  QUOTATION_STATUSES,
  PO_STATUSES,
  INVOICE_STATUSES,
  UNITS,
  USER_STATUSES,
};
