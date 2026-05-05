import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

interface PayrollAdjustmentItem {
  label: string;
  type: 'DEDUCTION' | 'ADDITION';
  amount: number;
}

interface PayslipData {
  employee: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string;
    jobTitle: string;
  };
  payroll: {
    id: string;
    month: number;
    year: number;
    workingDays: number;
    presentDays: number;
    leaveDays: number;
    absenceDays: number;
    baseSalary: number;
    travellingAllowance: number;
    otherAllowances: number;
    travellingDeduction: number;
    totalDeductions: number;
    grossSalary: number;
    netSalary: number;
    localLeaveBalance?: number;
    sickLeaveBalance?: number;
    adjustments?: PayrollAdjustmentItem[];
    compensations?: { label: string; amount: number }[];
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
}

export const generatePayslipPDF = async (
  data: PayslipData,
  outputPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 30 });

      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      const PRIMARY    = '#2c3e50';
      const SECONDARY  = '#555555';
      const ACCENT     = '#1a6fc4';
      const PAGE_W     = doc.page.width;   // 595.28 pt (A4)
      const L          = 45;               // left content edge
      const R          = PAGE_W - 45;      // right content edge  (~550)
      const ROW_H      = 17;              // standard row height
      const C2_L       = 300;             // 2nd-column label x
      const C2_V       = 390;             // 2nd-column value x
      const AMT_X      = R - 110;         // amount box left edge
      const AMT_W      = 110;             // amount box width (right-aligned)

      // ── Logo (centered) ────────────────────────────────────────────
      const logoPath = path.join(process.cwd(), 'backend', 'assets', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoW = 65;
        doc.image(logoPath, (PAGE_W - logoW) / 2, doc.y, { width: logoW });
        doc.moveDown(0.5);
      }

      // ── Title ──────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(18).fillColor(PRIMARY)
        .text('PAYSLIP', { align: 'center' })
        .moveDown(0.2);

      // ── Company info ───────────────────────────────────────────────
      doc.font('Helvetica').fontSize(9).fillColor(SECONDARY)
        .text(data.company.name, { align: 'center' })
        .text(data.company.address, { align: 'center' })
        .text(`${data.company.phone}  |  ${data.company.email}`, { align: 'center' })
        .moveDown(0.3);

      // ── Pay period ─────────────────────────────────────────────────
      const MONTHS = [
        'January','February','March','April','May','June',
        'July','August','September','October','November','December',
      ];
      doc.font('Helvetica-Bold').fontSize(11).fillColor(ACCENT)
        .text(`Pay Period: ${MONTHS[data.payroll.month - 1]} ${data.payroll.year}`, { align: 'center' })
        .moveDown(0.45);

      // ── Helpers ────────────────────────────────────────────────────

      // Horizontal rule
      const hr = (thick = false) => {
        doc.strokeColor(thick ? PRIMARY : '#cccccc')
          .lineWidth(thick ? 1.2 : 0.5)
          .moveTo(L, doc.y).lineTo(R, doc.y).stroke()
          .moveDown(0.35);
      };

      // Section heading
      const heading = (title: string) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(PRIMARY)
          .text(title, L)
          .moveDown(0.3);
        doc.font('Helvetica');
      };

      // Two-column info row (for Employee Details / Attendance)
      const infoRow2 = (
        l1: string, v1: string,
        l2: string, v2: string,
        y: number,
        labelW = 90,
      ) => {
        doc.font('Helvetica').fontSize(9).fillColor(SECONDARY)
          .text(l1,  L,          y, { width: labelW })
          .text(v1,  L + labelW + 5, y, { width: C2_L - L - labelW - 10 })
          .text(l2,  C2_L, y, { width: 85 })
          .text(v2,  C2_V, y, { width: R - C2_V });
      };

      // Amount row: label left, amount right-aligned
      const amtRow = (label: string, amount: string, y: number, bold = false) => {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(bold ? 10 : 9)
          .fillColor(bold ? PRIMARY : SECONDARY)
          .text(label,  L,     y, { width: AMT_X - L - 10 })
          .text(amount, AMT_X, y, { width: AMT_W, align: 'right' });
        doc.font('Helvetica');
      };

      // ── Employee Details ───────────────────────────────────────────
      hr();
      heading('Employee Details');
      let y = doc.y;
      infoRow2('Employee ID:', data.employee.employeeId,
               'Name:', `${data.employee.firstName} ${data.employee.lastName}`, y);
      y += ROW_H;
      infoRow2('Job Title:', data.employee.jobTitle,
               'Email:', data.employee.email, y);
      y += ROW_H + 8;
      doc.y = y;

      // ── Attendance Summary ─────────────────────────────────────────
      hr();
      heading('Attendance Summary');
      y = doc.y;
      infoRow2('Working Days:', String(data.payroll.workingDays),
               'Leaves Taken:', String(data.payroll.leaveDays), y);
      y += ROW_H;
      const annualBal = data.payroll.localLeaveBalance != null ? `${data.payroll.localLeaveBalance} days` : 'N/A';
      const sickBal   = data.payroll.sickLeaveBalance  != null ? `${data.payroll.sickLeaveBalance} days`  : 'N/A';
      // Use wider label column (110pt) to accommodate "Ann. Leave Bal.:"
      infoRow2('Ann. Leave Bal.:', annualBal, 'Sick Leave Bal.:', sickBal, y, 110);
      y += ROW_H + 8;
      doc.y = y;

      // ── Earnings ───────────────────────────────────────────────────
      const additions = (data.payroll.adjustments || []).filter(a => a.type === 'ADDITION' && a.amount > 0);

      // Build earnings lines — skip any item with amount === 0
      const earningsLines: { label: string; amount: number }[] = [];
      earningsLines.push({ label: 'Base Salary', amount: data.payroll.baseSalary });
      if (data.payroll.travellingAllowance > 0)
        earningsLines.push({ label: 'Travelling Allowance', amount: data.payroll.travellingAllowance });
      if (data.payroll.otherAllowances > 0)
        earningsLines.push({ label: 'Other Allowances', amount: data.payroll.otherAllowances });
      for (const comp of (data.payroll.compensations || []))
        if (comp.amount > 0) earningsLines.push({ label: comp.label, amount: comp.amount });
      for (const adj of additions)
        earningsLines.push({ label: adj.label, amount: adj.amount });

      hr();
      heading('Earnings');
      y = doc.y;
      earningsLines.forEach((line, i) => {
        if (i > 0) y += ROW_H;
        amtRow(`${line.label}:`, `Rs ${line.amount.toFixed(2)}`, y);
      });
      y += ROW_H + 4;
      amtRow('Gross Salary:', `Rs ${data.payroll.grossSalary.toFixed(2)}`, y, true);
      y += ROW_H + 8;
      doc.y = y;

      // ── Deductions ─────────────────────────────────────────────────
      const deductions = (data.payroll.adjustments || []).filter(a => a.type === 'DEDUCTION' && a.amount > 0);

      // Build deduction lines — skip any item with amount === 0
      const deductionLines: { label: string; amount: number }[] = [];
      if (data.payroll.travellingDeduction > 0)
        deductionLines.push({ label: 'Travelling Allowance Deduction', amount: data.payroll.travellingDeduction });
      for (const adj of deductions)
        deductionLines.push({ label: adj.label, amount: adj.amount });

      hr();
      heading('Deductions');
      y = doc.y;
      deductionLines.forEach((line, i) => {
        if (i > 0) y += ROW_H;
        amtRow(`${line.label}:`, `Rs ${line.amount.toFixed(2)}`, y);
      });
      y += (deductionLines.length > 0 ? ROW_H + 4 : 4);
      amtRow('Total Deductions:', `Rs ${data.payroll.totalDeductions.toFixed(2)}`, y, true);
      y += ROW_H + 8;
      doc.y = y;

      // ── Net Salary ─────────────────────────────────────────────────
      hr(true);
      y = doc.y;
      doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT)
        .text('NET SALARY:', L, y)
        .text(`Rs ${data.payroll.netSalary.toFixed(2)}`, AMT_X, y, { width: AMT_W, align: 'right' });
      doc.font('Helvetica');
      y += 24;
      doc.y = y + 8;

      // ── Footer ─────────────────────────────────────────────────────
      hr();
      doc.font('Helvetica').fontSize(7).fillColor('#999999')
        .text('This is a system-generated payslip and does not require a signature.', { align: 'center' })
        .moveDown(0.2)
        .text(
          `Generated on: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}`,
          { align: 'center' }
        );

      doc.end();
      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
};
