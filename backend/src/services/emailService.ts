import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('[EmailService] SMTP not configured — skipping email (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
      return null;
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
    return this.transporter;
  }

  async sendLeaveRequestNotification(opts: {
    to: string[];
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    reason: string;
  }): Promise<void> {
    const transport = this.getTransporter();
    if (!transport || opts.to.length === 0) return;

    const subject = `Leave Request from ${opts.employeeName}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#1a7a3a;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h2 style="color:white;margin:0;">New Leave Request</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#333;">A new leave request requires your approval:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#666;width:140px;font-weight:bold;">Employee</td><td style="padding:8px;color:#333;">${opts.employeeName}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px;color:#666;font-weight:bold;">Leave Type</td><td style="padding:8px;color:#333;">${opts.leaveType === 'LOCAL' ? 'Annual Leave' : 'Sick Leave'}</td></tr>
            <tr><td style="padding:8px;color:#666;font-weight:bold;">From</td><td style="padding:8px;color:#333;">${opts.startDate}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px;color:#666;font-weight:bold;">To</td><td style="padding:8px;color:#333;">${opts.endDate}</td></tr>
            <tr><td style="padding:8px;color:#666;font-weight:bold;">Days</td><td style="padding:8px;color:#333;">${opts.totalDays}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px;color:#666;font-weight:bold;">Reason</td><td style="padding:8px;color:#333;">${opts.reason}</td></tr>
          </table>
          <p style="color:#666;font-size:13px;">Please log in to the HRMS system to approve or reject this request.</p>
          <p style="color:#999;font-size:11px;margin-top:20px;">To stop receiving these notifications, update your notification preferences in your profile settings.</p>
        </div>
      </div>
    `;

    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM || 'HRMS <noreply@hrms.com>',
        to: opts.to.join(','),
        subject,
        html,
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }
  }

  async sendLeaveStatusNotification(opts: {
    to: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    status: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  }): Promise<void> {
    const transport = this.getTransporter();
    if (!transport) return;

    const approved = opts.status === 'APPROVED';
    const subject = `Your Leave Request has been ${approved ? 'Approved' : 'Rejected'}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:${approved ? '#1a7a3a' : '#dc2626'};padding:20px;border-radius:8px 8px 0 0;text-align:center;">
          <h2 style="color:white;margin:0;">Leave Request ${approved ? 'Approved' : 'Rejected'}</h2>
        </div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#333;">Dear ${opts.employeeName},</p>
          <p style="color:#333;">Your leave request has been <strong>${approved ? 'approved' : 'rejected'}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;color:#666;font-weight:bold;">Leave Type</td><td style="padding:8px;color:#333;">${opts.leaveType === 'LOCAL' ? 'Annual Leave' : 'Sick Leave'}</td></tr>
            <tr style="background:#fff;"><td style="padding:8px;color:#666;font-weight:bold;">From</td><td style="padding:8px;color:#333;">${opts.startDate}</td></tr>
            <tr><td style="padding:8px;color:#666;font-weight:bold;">To</td><td style="padding:8px;color:#333;">${opts.endDate}</td></tr>
            ${!approved && opts.rejectionReason ? `<tr style="background:#fff;"><td style="padding:8px;color:#666;font-weight:bold;">Reason</td><td style="padding:8px;color:#dc2626;">${opts.rejectionReason}</td></tr>` : ''}
          </table>
        </div>
      </div>
    `;

    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM || 'HRMS <noreply@hrms.com>',
        to: opts.to,
        subject,
        html,
      });
    } catch (err) {
      console.error('Email send failed:', err);
    }
  }
}

export default new EmailService();
