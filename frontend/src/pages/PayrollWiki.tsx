import React, { useState } from 'react';
import Layout from '../components/Layout';

interface Section {
  title: string;
  content: React.ReactNode;
}

const PayrollWiki: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  const toggle = (i: number) => setOpen(prev => (prev === i ? null : i));

  const sections: Section[] = [
    {
      title: 'Payroll Workflow',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <p>The payroll cycle follows these steps:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li><span className="font-medium">Treasurer / Admin</span> — processes payroll for the selected month. All active employee payrolls are created as <span className="font-semibold text-yellow-700">DRAFT</span>.</li>
            <li><span className="font-medium">Treasurer / Admin</span> — may edit individual payroll records (adjustments, remarks). Editing an <span className="font-semibold text-green-700">APPROVED</span> payroll resets it back to <span className="font-semibold text-yellow-700">DRAFT</span>.</li>
            <li><span className="font-medium">Secretary / Admin</span> — reviews each payroll and either <span className="font-semibold text-green-700">APPROVES</span> or <span className="font-semibold text-red-600">REJECTS</span> it (with a written reason).</li>
            <li>On rejection, the Treasurer is notified by email and must reprocess or correct the payroll, which resets it to <span className="font-semibold text-yellow-700">DRAFT</span>.</li>
            <li><span className="font-medium">Treasurer / Admin</span> — locks all approved payrolls. A <span className="font-semibold text-gray-700">LOCKED</span> payroll cannot be edited.</li>
          </ol>
        </div>
      ),
    },
    {
      title: 'CSG — Contribution Sociale Généralisée (Employee)',
      content: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>CSG is a statutory <span className="font-medium">employee</span> contribution deducted from gross salary.</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Monthly Basic Salary</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Employee Rate</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Example (Rs 40,000)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">≤ Rs 50,000</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">1.5%</td>
                <td className="border border-gray-300 px-3 py-2">Rs 600.00</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">&gt; Rs 50,000</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">3.0%</td>
                <td className="border border-gray-300 px-3 py-2">Rs 1,800.00 (on Rs 60,000)</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500">CSG is auto-calculated on every save and deducted from the employee's net salary. The employer remits this on behalf of the employee.</p>
        </div>
      ),
    },
    {
      title: 'NSF — National Savings Fund (Employee)',
      content: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>NSF is a statutory <span className="font-medium">employee</span> contribution of <span className="font-semibold">1%</span> of basic salary, capped at the maximum monthly basic wage of <span className="font-semibold">Rs 28,570</span> (effective 1 July 2024).</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Monthly Basic Salary</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Employee Contribution</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">&lt; Rs 28,570</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">1% × Basic Salary</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">≥ Rs 28,570</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">1% × Rs 28,570 = <span className="text-primary-700">Rs 285.70</span> (maximum)</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500">NSF is auto-calculated on every save and deducted from the employee's net salary. The employer remits this on behalf of the employee.</p>
        </div>
      ),
    },
    {
      title: 'Employer CSG & NSF Contributions',
      content: (
        <div className="space-y-3 text-sm text-gray-700">
          <p>In addition to remitting employee deductions, the <span className="font-medium">employer</span> must make its own statutory contributions. These do <span className="font-semibold">not</span> affect employee net salary — they are an additional cost borne by the organisation.</p>

          <h4 className="font-semibold text-gray-800 mt-3">Employer CSG</h4>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-orange-50">
                <th className="border border-gray-300 px-3 py-2 text-left">Employee Monthly Basic Salary</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Employer Rate</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Example (Rs 40,000)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">≤ Rs 50,000</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">3%</td>
                <td className="border border-gray-300 px-3 py-2">Rs 1,200.00</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">&gt; Rs 50,000</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">6%</td>
                <td className="border border-gray-300 px-3 py-2">Rs 3,600.00 (on Rs 60,000)</td>
              </tr>
            </tbody>
          </table>

          <h4 className="font-semibold text-gray-800 mt-3">Employer NSF</h4>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-orange-50">
                <th className="border border-gray-300 px-3 py-2 text-left">Monthly Basic Salary</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Employer Rate</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">&lt; Rs 28,570</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">2.5% × Basic Salary</td>
                <td className="border border-gray-300 px-3 py-2">Rs 25,000 → Rs 625.00</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">≥ Rs 28,570</td>
                <td className="border border-gray-300 px-3 py-2 font-semibold">2.5% × Rs 28,570 = <span className="text-orange-700">Rs 714.25</span> (maximum)</td>
                <td className="border border-gray-300 px-3 py-2">Rs 50,000 → Rs 714.25</td>
              </tr>
            </tbody>
          </table>

          <div className="bg-orange-50 border border-orange-200 rounded p-3 text-xs text-orange-800 mt-2">
            <span className="font-semibold">Where to find totals:</span> The Payroll Management page (Treasurer view) shows a monthly "Employer Contributions" summary card with total CSG and NSF the employer must remit. Individual payroll detail modals also show the per-employee employer contribution.
          </div>
        </div>
      ),
    },
    {
      title: 'Travelling Allowance Deduction',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <p>When an employee is <span className="font-medium text-red-600">absent</span> (not on approved leave), their daily travelling allowance is deducted.</p>
          <div className="bg-gray-50 rounded p-3 font-mono text-xs">
            Daily Rate = Travelling Allowance ÷ Working Days in Cycle<br />
            Deduction = Daily Rate × Absence Days
          </div>
          <p>Working days are computed from the payroll cycle start–end range, counting <span className="font-medium">Monday to Saturday</span> and excluding public holidays.</p>
          <p className="text-xs text-gray-500">Approved leave days are NOT penalised — only unexplained absences trigger this deduction.</p>
        </div>
      ),
    },
    {
      title: 'Gross Salary Calculation',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <div className="bg-gray-50 rounded p-3 font-mono text-xs space-y-1">
            <div>Gross = Base Salary</div>
            <div className="pl-4">+ Travelling Allowance</div>
            <div className="pl-4">+ Other Allowances</div>
            <div className="pl-4">+ Compensations (employee-specific)</div>
            <div className="pl-4">+ Addition Adjustments</div>
          </div>
          <p className="text-xs text-gray-500">Compensations are snapshotted at the time of payroll processing. Changes to an employee's compensation profile after processing require a reprocess.</p>
        </div>
      ),
    },
    {
      title: 'Net Salary Calculation',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <div className="bg-gray-50 rounded p-3 font-mono text-xs space-y-1">
            <div>Net = Gross Salary</div>
            <div className="pl-4">− Travel Deduction (absence penalty)</div>
            <div className="pl-4">− CSG</div>
            <div className="pl-4">− NSF</div>
            <div className="pl-4">− Other Deduction Adjustments</div>
            <div className="pl-4">− Transfers (Shares A/C, MSA, HSA, Shariah)</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Working Days',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <p>Working days are <span className="font-medium">Monday to Saturday</span>. Sunday is the only weekly day off.</p>
          <p>Public holidays that fall within the payroll cycle are automatically excluded from the working-day count.</p>
          <p>The working-day count is calculated dynamically per cycle period — it varies month to month based on the calendar and public holidays.</p>
        </div>
      ),
    },
    {
      title: 'Leave Balances',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Leave Type</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Default Annual Entitlement</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">Annual (Local) Leave</td>
                <td className="border border-gray-300 px-3 py-2">Configurable in Settings</td>
                <td className="border border-gray-300 px-3 py-2">Prorated for mid-year joiners</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">Sick Leave</td>
                <td className="border border-gray-300 px-3 py-2">Configurable in Settings</td>
                <td className="border border-gray-300 px-3 py-2">Prorated for mid-year joiners</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs text-gray-500">Half-day leaves deduct 0.5 from the balance. An employee can take morning annual leave and afternoon sick leave on the same day.</p>
        </div>
      ),
    },
    {
      title: 'Employee Transfers',
      content: (
        <div className="space-y-2 text-sm text-gray-700">
          <p>Employees may elect to have a fixed amount transferred to one or more of the following fund accounts each month:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li><span className="font-medium">Shares A/C</span> — employee share purchase scheme</li>
            <li><span className="font-medium">MSA</span> — Medical Savings Account</li>
            <li><span className="font-medium">HSA</span> — Housing Savings Account</li>
            <li><span className="font-medium">Shariah Compliant Financing</span></li>
          </ul>
          <p>Transfer amounts are set per employee in the employee profile and are deducted from net salary each payroll cycle. They appear as a separate "Transfers" section on the payslip.</p>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payroll Rules &amp; Reference</h1>
          <p className="text-sm text-gray-500 mt-1">Admin-only documentation for payroll policies and calculation rules.</p>
        </div>

        <div className="space-y-2">
          {sections.map((section, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => toggle(i)}
                className="w-full flex justify-between items-center px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900">{section.title}</span>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${open === i ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-5 border-t border-gray-100">
                  <div className="pt-3">{section.content}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default PayrollWiki;
