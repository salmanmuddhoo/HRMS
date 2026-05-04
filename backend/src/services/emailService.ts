import { Resend } from 'resend';

class EmailService {
  private client: Resend | null = null;

  private getClient(): Resend | null {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[EmailService] RESEND_API_KEY not set — skipping email');
      return null;
    }
    if (!this.client) {
      this.client = new Resend(process.env.RESEND_API_KEY);
    }
    return this.client;
  }

  private get from(): string {
    return process.env.EMAIL_FROM || 'HRMS <onboarding@resend.dev>';
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
    const client = this.getClient();
    if (!client || opts.to.length === 0) return;

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
        </div>
      </div>
    `;

    const { error } = await client.emails.send({
      from: this.from,
      to: opts.to,
      subject: `Leave Request from ${opts.employeeName}`,
      html,
    });

    if (error) console.error('[EmailService] Send failed:', error);
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
    const client = this.getClient();
    if (!client) return;

    const approved = opts.status === 'APPROVED';
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

    const { error } = await client.emails.send({
      from: this.from,
      to: opts.to,
      subject: `Your Leave Request has been ${approved ? 'Approved' : 'Rejected'}`,
      html,
    });

    if (error) console.error('[EmailService] Send failed:', error);
  }
}

export default new EmailService();
