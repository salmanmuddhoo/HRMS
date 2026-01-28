import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
      // Create PDF document
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // Ensure output directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Pipe to file
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Colors
      const primaryColor = '#2c3e50';
      const secondaryColor = '#34495e';
      const accentColor = '#3498db';

      // Header
      doc
        .fontSize(24)
        .fillColor(primaryColor)
        .text('PAYSLIP', { align: 'center' })
        .moveDown(0.5);

      // Company Info
      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .text(data.company.name, { align: 'center' })
        .text(data.company.address, { align: 'center' })
        .text(`${data.company.phone} | ${data.company.email}`, {
          align: 'center',
        })
        .moveDown(1);

      // Pay Period
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];

      doc
        .fontSize(14)
        .fillColor(accentColor)
        .text(
          `Pay Period: ${monthNames[data.payroll.month - 1]} ${
            data.payroll.year
          }`,
          { align: 'center' }
        )
        .moveDown(1);

      // Divider line
      doc
        .strokeColor('#bdc3c7')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Employee Details Section
      doc
        .fontSize(12)
        .fillColor(primaryColor)
        .text('Employee Details', { underline: true })
        .moveDown(0.5);

      const leftColumn = 50;
      const rightColumn = 300;
      let yPos = doc.y;

      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .text('Employee ID:', leftColumn, yPos)
        .text(data.employee.employeeId, leftColumn + 100, yPos);

      yPos += 20;
      doc
        .text('Name:', leftColumn, yPos)
        .text(
          `${data.employee.firstName} ${data.employee.lastName}`,
          leftColumn + 100,
          yPos
        );

      yPos += 20;
      doc
        .text('Department:', leftColumn, yPos)
        .text(data.employee.department, leftColumn + 100, yPos);

      yPos += 20;
      doc
        .text('Job Title:', leftColumn, yPos)
        .text(data.employee.jobTitle, leftColumn + 100, yPos);

      yPos += 20;
      doc
        .text('Email:', leftColumn, yPos)
        .text(data.employee.email, leftColumn + 100, yPos);

      doc.moveDown(2);

      // Divider line
      doc
        .strokeColor('#bdc3c7')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Attendance Summary
      doc
        .fontSize(12)
        .fillColor(primaryColor)
        .text('Attendance Summary', { underline: true })
        .moveDown(0.5);

      yPos = doc.y;

      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .text('Working Days:', leftColumn, yPos)
        .text(data.payroll.workingDays.toString(), leftColumn + 150, yPos);

      doc
        .text('Present Days:', rightColumn, yPos)
        .text(data.payroll.presentDays.toString(), rightColumn + 100, yPos);

      yPos += 20;
      doc
        .text('Leave Days:', leftColumn, yPos)
        .text(data.payroll.leaveDays.toString(), leftColumn + 150, yPos);

      doc
        .text('Absence Days:', rightColumn, yPos)
        .text(data.payroll.absenceDays.toString(), rightColumn + 100, yPos);

      doc.moveDown(2);

      // Divider line
      doc
        .strokeColor('#bdc3c7')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Earnings Section
      doc
        .fontSize(12)
        .fillColor(primaryColor)
        .text('Earnings', { underline: true })
        .moveDown(0.5);

      yPos = doc.y;

      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .text('Base Salary:', leftColumn, yPos)
        .text(
          `$${data.payroll.baseSalary.toFixed(2)}`,
          leftColumn + 150,
          yPos,
          { align: 'right', width: 100 }
        );

      yPos += 20;
      doc
        .text('Travelling Allowance:', leftColumn, yPos)
        .text(
          `$${data.payroll.travellingAllowance.toFixed(2)}`,
          leftColumn + 150,
          yPos,
          { align: 'right', width: 100 }
        );

      yPos += 20;
      doc
        .text('Other Allowances:', leftColumn, yPos)
        .text(
          `$${data.payroll.otherAllowances.toFixed(2)}`,
          leftColumn + 150,
          yPos,
          { align: 'right', width: 100 }
        );

      yPos += 30;
      doc
        .fontSize(11)
        .fillColor(primaryColor)
        .text('Gross Salary:', leftColumn, yPos)
        .text(
          `$${data.payroll.grossSalary.toFixed(2)}`,
          leftColumn + 150,
          yPos,
          { align: 'right', width: 100 }
        );

      doc.moveDown(2);

      // Divider line
      doc
        .strokeColor('#bdc3c7')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Deductions Section
      doc
        .fontSize(12)
        .fillColor(primaryColor)
        .text('Deductions', { underline: true })
        .moveDown(0.5);

      yPos = doc.y;

      doc
        .fontSize(10)
        .fillColor(secondaryColor)
        .text('Travelling Allowance Deduction:', leftColumn, yPos)
        .text(
          `$${data.payroll.travellingDeduction.toFixed(2)}`,
          leftColumn + 200,
          yPos,
          { align: 'right', width: 100 }
        );

      yPos += 30;
      doc
        .fontSize(11)
        .fillColor(primaryColor)
        .text('Total Deductions:', leftColumn, yPos)
        .text(
          `$${data.payroll.totalDeductions.toFixed(2)}`,
          leftColumn + 200,
          yPos,
          { align: 'right', width: 100 }
        );

      doc.moveDown(2);

      // Divider line
      doc
        .strokeColor('#bdc3c7')
        .lineWidth(2)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Net Salary (highlighted)
      doc
        .fontSize(16)
        .fillColor(accentColor)
        .text('NET SALARY:', leftColumn, doc.y)
        .fontSize(16)
        .text(
          `$${data.payroll.netSalary.toFixed(2)}`,
          leftColumn + 150,
          doc.y - 16,
          { align: 'right', width: 150 }
        );

      doc.moveDown(3);

      // Divider line
      doc
        .strokeColor('#bdc3c7')
        .lineWidth(1)
        .moveTo(50, doc.y)
        .lineTo(545, doc.y)
        .stroke()
        .moveDown(1);

      // Footer
      doc
        .fontSize(8)
        .fillColor('#7f8c8d')
        .text(
          'This is a system-generated payslip and does not require a signature.',
          { align: 'center' }
        )
        .moveDown(0.5)
        .text(
          `Generated on: ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}`,
          { align: 'center' }
        );

      // Finalize PDF
      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
};
