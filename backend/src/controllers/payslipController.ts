import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { generatePayslipPDF } from '../services/pdfService';
import path from 'path';
import fs from 'fs';

export const generatePayslip = async (req: AuthRequest, res: Response) => {
  try {
    const { payrollId } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: true,
        adjustments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!payroll) {
      return sendError(res, 'Payroll not found', 404);
    }

    // Check if employee can access this payslip
    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee && payroll.employeeId !== employee.id) {
        return sendError(res, 'Unauthorized to view this payslip', 403);
      }
    }

    // Get company details from system config
    const companyName =
      (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_NAME' } }))
        ?.value || process.env.COMPANY_NAME || 'Company Name';
    const companyAddress =
      (
        await prisma.systemConfig.findUnique({
          where: { key: 'COMPANY_ADDRESS' },
        })
      )?.value || process.env.COMPANY_ADDRESS || 'Company Address';
    const companyPhone =
      (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_PHONE' } }))
        ?.value || process.env.COMPANY_PHONE || 'N/A';
    const companyEmail =
      (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_EMAIL' } }))
        ?.value || process.env.COMPANY_EMAIL || 'N/A';

    // Prepare payslip data
    const payslipData = {
      employee: {
        employeeId: payroll.employee.employeeId,
        firstName: payroll.employee.firstName,
        lastName: payroll.employee.lastName,
        email: payroll.employee.email,
        department: payroll.employee.department,
        jobTitle: payroll.employee.jobTitle,
      },
      payroll: {
        id: payroll.id,
        month: payroll.month,
        year: payroll.year,
        workingDays: payroll.workingDays,
        presentDays: payroll.presentDays,
        leaveDays: payroll.leaveDays,
        absenceDays: payroll.absenceDays,
        baseSalary: Number(payroll.baseSalary),
        travellingAllowance: Number(payroll.travellingAllowance),
        otherAllowances: Number(payroll.otherAllowances),
        travellingDeduction: Number(payroll.travellingDeduction),
        totalDeductions: Number(payroll.totalDeductions),
        grossSalary: Number(payroll.grossSalary),
        netSalary: Number(payroll.netSalary),
        adjustments: (payroll.adjustments || []).map(a => ({
          label: a.label,
          type: a.type as 'DEDUCTION' | 'ADDITION',
          amount: Number(a.amount),
        })),
      },
      company: {
        name: companyName,
        address: companyAddress,
        phone: companyPhone,
        email: companyEmail,
      },
    };

    // Generate PDF — use /tmp on serverless (Vercel); uploads/ on self-hosted
    const uploadDir = process.env.VERCEL ? '/tmp' : (process.env.UPLOAD_DIR || 'uploads');
    const payslipsDir = path.join(uploadDir, 'payslips');
    const filename = `payslip_${payroll.employee.employeeId}_${payroll.month}_${payroll.year}.pdf`;
    const pdfPath = path.join(payslipsDir, filename);

    await generatePayslipPDF(payslipData, pdfPath);

    // Create or update payslip record
    const payslip = await prisma.payslip.upsert({
      where: { payrollId },
      update: {
        pdfPath,
        generatedAt: new Date(),
      },
      create: {
        payrollId,
        employeeId: payroll.employeeId,
        pdfPath,
      },
    });

    return sendSuccess(
      res,
      { payslip, pdfPath },
      'Payslip generated successfully'
    );
  } catch (error: any) {
    console.error('Generate payslip error:', error);
    return sendError(res, 'Failed to generate payslip', 500);
  }
};

export const downloadPayslip = async (req: AuthRequest, res: Response) => {
  try {
    const { payrollId } = req.params;

    const payslip = await prisma.payslip.findUnique({
      where: { payrollId },
      include: {
        payroll: {
          include: {
            employee: true,
            adjustments: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!payslip) {
      return sendError(res, 'Payslip not found', 404);
    }

    // Check if employee can access this payslip
    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee && payslip.employeeId !== employee.id) {
        return sendError(res, 'Unauthorized to download this payslip', 403);
      }
    }

    // Regenerate if file missing (e.g. /tmp cleared between serverless invocations)
    if (!payslip.pdfPath || !fs.existsSync(payslip.pdfPath)) {
      const pr = payslip.payroll;
      const emp = pr.employee;
      const companyName = (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_NAME' } }))?.value || process.env.COMPANY_NAME || 'Company Name';
      const companyAddress = (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_ADDRESS' } }))?.value || process.env.COMPANY_ADDRESS || 'Company Address';
      const companyPhone = (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_PHONE' } }))?.value || process.env.COMPANY_PHONE || 'N/A';
      const companyEmail = (await prisma.systemConfig.findUnique({ where: { key: 'COMPANY_EMAIL' } }))?.value || process.env.COMPANY_EMAIL || 'N/A';
      const uploadDir = process.env.VERCEL ? '/tmp' : (process.env.UPLOAD_DIR || 'uploads');
      const regeneratedPath = path.join(uploadDir, 'payslips', path.basename(payslip.pdfPath || `payslip_${emp.employeeId}_${pr.month}_${pr.year}.pdf`));
      await generatePayslipPDF({
        employee: { employeeId: emp.employeeId, firstName: emp.firstName, lastName: emp.lastName, email: emp.email, department: emp.department, jobTitle: emp.jobTitle },
        payroll: { id: pr.id, month: pr.month, year: pr.year, workingDays: pr.workingDays, presentDays: pr.presentDays, leaveDays: pr.leaveDays, absenceDays: pr.absenceDays, baseSalary: Number(pr.baseSalary), travellingAllowance: Number(pr.travellingAllowance), otherAllowances: Number(pr.otherAllowances), travellingDeduction: Number(pr.travellingDeduction), totalDeductions: Number(pr.totalDeductions), grossSalary: Number(pr.grossSalary), netSalary: Number(pr.netSalary), adjustments: (pr.adjustments || []).map((a: any) => ({ label: a.label, type: a.type, amount: Number(a.amount) })) },
        company: { name: companyName, address: companyAddress, phone: companyPhone, email: companyEmail },
      }, regeneratedPath);
      await prisma.payslip.update({ where: { payrollId }, data: { pdfPath: regeneratedPath } });
      payslip.pdfPath = regeneratedPath;
    }

    // Update downloaded timestamp
    await prisma.payslip.update({
      where: { payrollId },
      data: { downloadedAt: new Date() },
    });

    // Send file
    const filename = `payslip_${payslip.payroll.employee.employeeId}_${payslip.payroll.month}_${payslip.payroll.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(payslip.pdfPath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Download payslip error:', error);
    return sendError(res, 'Failed to download payslip', 500);
  }
};

export const getEmployeePayslips = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;

    // Check if employee can access these payslips
    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee && employee.id !== employeeId) {
        return sendError(res, 'Unauthorized to view these payslips', 403);
      }
    }

    const payslips = await prisma.payslip.findMany({
      where: { employeeId },
      include: {
        payroll: {
          select: {
            month: true,
            year: true,
            netSalary: true,
            status: true,
          },
        },
      },
      orderBy: [{ payroll: { year: 'desc' } }, { payroll: { month: 'desc' } }],
    });

    return sendSuccess(res, payslips);
  } catch (error: any) {
    console.error('Get employee payslips error:', error);
    return sendError(res, 'Failed to fetch payslips', 500);
  }
};
