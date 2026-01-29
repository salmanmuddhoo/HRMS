import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;

    // Only configure if all required env variables are present
    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransporter({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
      this.isConfigured = true;
      console.log('Email service configured successfully');
    } else {
      console.warn('Email service not configured. Set SMTP_* environment variables to enable email notifications.');
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.warn('Email service not configured. Email not sent:', options.subject);
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'Waqt HRMS <noreply@waqt.com>',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  async sendLeaveApprovalNotification(
    adminEmails: string[],
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    totalDays: number,
    reason: string
  ): Promise<boolean> {
    const subject = `New Leave Request from ${employeeName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3b82f6; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #4b5563; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Leave Request</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>A new leave request has been submitted and requires your approval.</p>

            <div class="details">
              <div class="detail-row">
                <span class="label">Employee:</span> ${employeeName}
              </div>
              <div class="detail-row">
                <span class="label">Leave Type:</span> ${leaveType === 'LOCAL' ? 'Annual Leave' : 'Sick Leave'}
              </div>
              <div class="detail-row">
                <span class="label">Start Date:</span> ${new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div class="detail-row">
                <span class="label">End Date:</span> ${new Date(endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div class="detail-row">
                <span class="label">Total Days:</span> ${totalDays}
              </div>
              ${reason ? `<div class="detail-row"><span class="label">Reason:</span> ${reason}</div>` : ''}
            </div>

            <p style="text-align: center; margin-top: 20px;">
              <strong>Please log in to the system to review and approve/reject this request.</strong>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated email from Waqt HRMS. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Leave Request from ${employeeName}

Employee: ${employeeName}
Leave Type: ${leaveType === 'LOCAL' ? 'Annual Leave' : 'Sick Leave'}
Start Date: ${new Date(startDate).toLocaleDateString()}
End Date: ${new Date(endDate).toLocaleDateString()}
Total Days: ${totalDays}
${reason ? `Reason: ${reason}` : ''}

Please log in to the system to review and approve/reject this request.
    `;

    return this.sendEmail({ to: adminEmails, subject, html, text });
  }

  async sendLeaveStatusNotification(
    employeeEmail: string,
    employeeName: string,
    leaveType: string,
    startDate: string,
    endDate: string,
    status: string,
    rejectionReason?: string
  ): Promise<boolean> {
    const isApproved = status === 'APPROVED';
    const subject = `Leave Request ${isApproved ? 'Approved' : 'Rejected'}`;
    const statusColor = isApproved ? '#10b981' : '#ef4444';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusColor}; }
          .detail-row { margin: 10px 0; }
          .label { font-weight: bold; color: #4b5563; }
          .footer { background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Leave Request ${isApproved ? 'Approved' : 'Rejected'}</h1>
          </div>
          <div class="content">
            <p>Hello ${employeeName},</p>
            <p>Your leave request has been <strong>${isApproved ? 'approved' : 'rejected'}</strong>.</p>

            <div class="details">
              <div class="detail-row">
                <span class="label">Leave Type:</span> ${leaveType === 'LOCAL' ? 'Annual Leave' : 'Sick Leave'}
              </div>
              <div class="detail-row">
                <span class="label">Start Date:</span> ${new Date(startDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div class="detail-row">
                <span class="label">End Date:</span> ${new Date(endDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              ${rejectionReason ? `<div class="detail-row"><span class="label">Rejection Reason:</span> ${rejectionReason}</div>` : ''}
            </div>

            ${isApproved ? '<p>Enjoy your leave!</p>' : '<p>If you have any questions, please contact your manager.</p>'}
          </div>
          <div class="footer">
            <p>This is an automated email from Waqt HRMS. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Leave Request ${isApproved ? 'Approved' : 'Rejected'}

Hello ${employeeName},

Your leave request has been ${isApproved ? 'approved' : 'rejected'}.

Leave Type: ${leaveType === 'LOCAL' ? 'Annual Leave' : 'Sick Leave'}
Start Date: ${new Date(startDate).toLocaleDateString()}
End Date: ${new Date(endDate).toLocaleDateString()}
${rejectionReason ? `Rejection Reason: ${rejectionReason}` : ''}

${isApproved ? 'Enjoy your leave!' : 'If you have any questions, please contact your manager.'}
    `;

    return this.sendEmail({ to: employeeEmail, subject, html, text });
  }
}

export default new EmailService();
