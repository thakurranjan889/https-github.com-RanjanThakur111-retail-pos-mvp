const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

const allowedStatuses = ['completed', 'unsuccessful'];

function buildTransport() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('SMTP env vars are not configured. Skipping order status email.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth: {
      user,
      pass,
    },
  });
}

function getStatusLabel(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'unsuccessful') return 'Unsuccessful';
  return status;
}

exports.sendOrderStatusEmail = onDocumentUpdated('sales/{saleId}', async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (!after || !after.customerEmail) {
    return null;
  }

  const previousStatus = (before && before.status) || 'pending';
  const currentStatus = after.status;

  if (!currentStatus || previousStatus === currentStatus) {
    return null;
  }

  if (!allowedStatuses.includes(currentStatus)) {
    return null;
  }

  const transporter = buildTransport();
  if (!transporter) {
    return null;
  }

  const subject = `Your order status is ${getStatusLabel(currentStatus)}`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin-bottom: 12px;">Order update</h2>
      <p>Hello,</p>
      <p>Your order has been updated to <strong>${getStatusLabel(currentStatus)}</strong>.</p>
      <p><strong>Order status:</strong> ${getStatusLabel(currentStatus)}</p>
      <p><strong>Order total:</strong> $${Number(after.total || 0).toFixed(2)}</p>
      <p>Thank you for shopping with us.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@retail-pos-mvp.com',
      to: after.customerEmail,
      subject,
      html,
    });

    logger.info(`Order status email sent to ${after.customerEmail} for order ${event.params.saleId}`);
    return null;
  } catch (error) {
    logger.error('Failed to send order status email', error);
    return null;
  }
});
