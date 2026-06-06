const BRAND_COLOR = '#4f46e5';

function baseTemplate(title, content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f6f7fb; color: #1e293b; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background-color: ${BRAND_COLOR}; color: #ffffff; padding: 30px 40px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .body { padding: 40px; line-height: 1.6; }
        .footer { background-color: #f1f5f9; color: #64748b; padding: 20px 40px; text-align: center; font-size: 13px; }
        .btn { display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>VENDOR BRIDGE</h1>
          <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">${title}</p>
        </div>
        <div class="body">
          ${content}
        </div>
        <div class="footer">
          <p>This is an automated message from VENDOR BRIDGE Procurement Management System.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function rfqAssignmentTemplate(vendorName, rfqNumber, title, deadline) {
  const content = `
    <h2 style="margin-top: 0;">New Request for Quotation</h2>
    <p>Dear ${vendorName},</p>
    <p>You have been invited to submit a quotation for the following RFQ:</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px;"><strong>RFQ Number:</strong> ${rfqNumber}</p>
      <p style="margin: 0 0 10px;"><strong>Title:</strong> ${title}</p>
      <p style="margin: 0;"><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString('en-IN')}</p>
    </div>
    <p>Please log in to your Vendor Bridge dashboard to review the details and submit your quotation before the deadline.</p>
    <a href="${process.env.BASE_URL || 'http://localhost:5000'}" class="btn">View RFQ Details</a>
  `;
  return baseTemplate('New RFQ Assignment', content);
}

function poIssuedTemplate(vendorName, poNumber, totalAmount) {
  const inr = Number(totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const content = `
    <h2 style="margin-top: 0;">Purchase Order Issued</h2>
    <p>Dear ${vendorName},</p>
    <p>A new Purchase Order has been issued to your company.</p>
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px;"><strong>PO Number:</strong> ${poNumber}</p>
      <p style="margin: 0;"><strong>Total Amount:</strong> Rs. ${inr}</p>
    </div>
    <p>We have attached the official Purchase Order document as a PDF to this email.</p>
    <p>Please review the order and acknowledge receipt through your dashboard.</p>
    <a href="${process.env.BASE_URL || 'http://localhost:5000'}" class="btn">View Purchase Order</a>
  `;
  return baseTemplate('Purchase Order Issued', content);
}

module.exports = {
  rfqAssignmentTemplate,
  poIssuedTemplate
};
