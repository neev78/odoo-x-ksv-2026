const PDFDocument = require('pdfkit');

const BRAND = '#4f46e5'; // indigo
const DARK = '#1e293b';
const GREY = '#64748b';
const LIGHT = '#f1f5f9';

const inr = (n) =>
  'Rs. ' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Build a PDF document (Purchase Order or Invoice) and pipe it to `stream`.
 * @param {'PO'|'INVOICE'} kind
 * @param {object} data  populated PO or Invoice document (with vendor populated)
 * @param {stream.Writable} stream
 */
function generateDocument(kind, data, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  const isInvoice = kind === 'INVOICE';
  const title = isInvoice ? 'TAX INVOICE' : 'PURCHASE ORDER';
  const number = isInvoice ? data.invoiceNumber : data.poNumber;
  const vendor = data.vendor || {};

  // ---- Header band ----
  doc.rect(0, 0, doc.page.width, 110).fill(BRAND);
  doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text('VENDOR BRIDGE', 50, 35);
  doc.fontSize(10).font('Helvetica').text('Procurement Management System', 50, 68);
  doc.fontSize(20).font('Helvetica-Bold').text(title, 0, 40, { align: 'right', width: doc.page.width - 50 });
  doc.fontSize(11).font('Helvetica').text(number || '', 0, 70, { align: 'right', width: doc.page.width - 50 });

  doc.fillColor(DARK);
  let y = 140;

  // ---- Meta row ----
  doc.fontSize(10).font('Helvetica-Bold').fillColor(GREY).text('DATE', 50, y);
  doc.font('Helvetica').fillColor(DARK).text(new Date(data.createdAt || Date.now()).toLocaleDateString('en-IN'), 50, y + 14);

  if (isInvoice) {
    doc.font('Helvetica-Bold').fillColor(GREY).text('DUE DATE', 200, y);
    doc.font('Helvetica').fillColor(DARK).text(
      data.dueDate ? new Date(data.dueDate).toLocaleDateString('en-IN') : '-', 200, y + 14
    );
    doc.font('Helvetica-Bold').fillColor(GREY).text('STATUS', 350, y);
    doc.font('Helvetica').fillColor(DARK).text(data.paymentStatus || 'Pending', 350, y + 14);
  } else {
    doc.font('Helvetica-Bold').fillColor(GREY).text('STATUS', 200, y);
    doc.font('Helvetica').fillColor(DARK).text(data.status || 'Issued', 200, y + 14);
  }

  // ---- Vendor block ----
  y += 55;
  doc.font('Helvetica-Bold').fillColor(GREY).fontSize(10).text('VENDOR / SUPPLIER', 50, y);
  doc.font('Helvetica-Bold').fillColor(DARK).fontSize(12).text(vendor.companyName || 'N/A', 50, y + 16);
  doc.font('Helvetica').fillColor(GREY).fontSize(10);
  doc.text(`Contact: ${vendor.contactPerson || '-'}`, 50, y + 34);
  doc.text(`Email: ${vendor.email || '-'}   |   Phone: ${vendor.phone || '-'}`, 50, y + 48);
  doc.text(`GST: ${vendor.gstNumber || '-'}`, 50, y + 62);
  if (vendor.address) doc.text(`Address: ${vendor.address}`, 50, y + 76, { width: 480 });

  // ---- Items table ----
  y += 110;
  const tableTop = y;
  const cols = { item: 50, qty: 290, rate: 360, amount: 460 };

  doc.rect(50, tableTop, doc.page.width - 100, 24).fill(BRAND);
  doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
  doc.text('DESCRIPTION', cols.item + 6, tableTop + 7);
  doc.text('QTY', cols.qty, tableTop + 7);
  doc.text('RATE', cols.rate, tableTop + 7);
  doc.text('AMOUNT', cols.amount, tableTop + 7);

  const subTotal = (data.pricePerUnit || 0) * (data.quantity || 0);
  const rowY = tableTop + 24;
  doc.rect(50, rowY, doc.page.width - 100, 30).fill(LIGHT);
  doc.fillColor(DARK).font('Helvetica').fontSize(10);
  doc.text(data.productName || 'Item', cols.item + 6, rowY + 9, { width: 220 });
  doc.text(`${data.quantity} ${data.unit || ''}`, cols.qty, rowY + 9);
  doc.text(inr(data.pricePerUnit), cols.rate, rowY + 9);
  doc.text(inr(subTotal), cols.amount, rowY + 9);

  // ---- Totals ----
  let ty = rowY + 50;
  const labelX = 350;
  const valX = 460;
  const line = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10).fillColor(bold ? DARK : GREY);
    doc.text(label, labelX, ty);
    doc.fillColor(DARK).text(value, valX, ty, { width: 90, align: 'right' });
    ty += bold ? 22 : 18;
  };
  line('Sub Total', inr(subTotal));
  line(`GST (${data.taxPercent || 0}%)`, inr(data.taxAmount));
  doc.moveTo(labelX, ty).lineTo(doc.page.width - 50, ty).strokeColor('#cbd5e1').stroke();
  ty += 8;
  line('Grand Total', inr(data.totalAmount), true);

  // ---- Footer ----
  const footY = doc.page.height - 90;
  doc.moveTo(50, footY).lineTo(doc.page.width - 50, footY).strokeColor('#e2e8f0').stroke();
  doc.fontSize(9).fillColor(GREY).font('Helvetica');
  doc.text(
    isInvoice
      ? 'This is a computer-generated invoice and does not require a physical signature.'
      : 'This Purchase Order is generated electronically and is valid without signature.',
    50, footY + 12, { align: 'center', width: doc.page.width - 100 }
  );
  doc.text('VENDOR BRIDGE • Procurement Management System • Made for Odoo Hackathon', 50, footY + 30, {
    align: 'center',
    width: doc.page.width - 100,
  });

  doc.end();
}

module.exports = { generateDocument };
