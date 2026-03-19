const nodemailer = require('nodemailer');

/**
 * Notification Service
 * Handles Email and UI notifications
 */
class NotificationService {
  constructor() {
    // Setup email transporter (Gmail example – configure in .env)
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Send a notification
   * @param {Object} options - { channel, recipient, subject, body, data }
   */
  async send({ channel = 'ui', recipient, subject, body, data = {} }) {
    switch (channel) {
      case 'email':
        return await this.sendEmail(recipient, subject, body, data);
      case 'ui':
        return this.sendUINotification(subject, body, data);
      default:
        console.log(`[Notification] Unknown channel: ${channel}`);
    }
  }

  /**
   * Send email via Nodemailer
   */
  async sendEmail(to, subject, body, data) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || 
        process.env.EMAIL_USER === 'your_email@gmail.com') {
      console.log('[Notification] Email not configured – skipping email send');
      return { skipped: true, reason: 'Email not configured' };
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #6c47ff;">FlowForge Notification</h2>
        <p>${body}</p>
        ${Object.keys(data).length > 0 ? `
        <h3>Workflow Data:</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${JSON.stringify(data, null, 2)}</pre>
        ` : ''}
        <hr>
        <small style="color: #999;">Sent by FlowForge Automation Platform</small>
      </div>
    `;

    try {
      const info = await this.transporter.sendMail({
        from:    `"FlowForge" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html:    htmlBody
      });
      console.log(`[Notification] Email sent to ${to}:`, info.messageId);
      return { sent: true, messageId: info.messageId };
    } catch (err) {
      console.error('[Notification] Email error:', err.message);
      throw err;
    }
  }

  /**
   * UI notification (stored in memory or could be pushed via SSE)
   */
  sendUINotification(title, message, data) {
    const notification = {
      id:        Date.now().toString(),
      title,
      message,
      data,
      timestamp: new Date().toISOString(),
      read:      false
    };
    // In a full system, this would emit via WebSocket or store in DB
    console.log('[Notification] UI notification created:', notification.id, title);
    return notification;
  }
}

module.exports = new NotificationService();
