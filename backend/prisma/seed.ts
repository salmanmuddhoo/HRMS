import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...');

  // Create system configuration
  console.log('Creating system configuration...');
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'WORKING_DAYS_PER_MONTH',
        value: '22',
        description: 'Default working days per month',
      },
      {
        key: 'COMPANY_NAME',
        value: 'ELPMS Company',
        description: 'Company name for payslips',
      },
      {
        key: 'COMPANY_ADDRESS',
        value: '123 Business Street, City, Country',
        description: 'Company address for payslips',
      },
      {
        key: 'COMPANY_PHONE',
        value: '+1234567890',
        description: 'Company phone number',
      },
      {
        key: 'COMPANY_EMAIL',
        value: 'hr@elpms.com',
        description: 'Company email address',
      },
    ],
    skipDuplicates: true,
  });

  // Create admin user
  console.log('Creating admin user...');
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@elpms.com' },
    update: {},
    create: {
      email: 'admin@elpms.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  console.log('Admin user created:', adminUser.email);

  // Create admin employee profile
  const adminEmployee = await prisma.employee.upsert({
    where: { email: 'admin@elpms.com' },
    update: {},
    create: {
      employeeId: 'EMP001',
      userId: adminUser.id,
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@elpms.com',
      phone: '+1234567890',
      department: 'Administration',
      jobTitle: 'System Administrator',
      joiningDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      baseSalary: 5000,
      travellingAllowance: 500,
      otherAllowances: 200,
      localLeaveBalance: 15,
      sickLeaveBalance: 10,
    },
  });

  console.log('Admin employee created:', adminEmployee.employeeId);

  // Create sample employees
  console.log('Creating sample employees...');

  const employeePassword = await bcrypt.hash('Employee@123', 10);

  const employees = [
    {
      employeeId: 'EMP002',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@elpms.com',
      phone: '+1234567891',
      department: 'Engineering',
      jobTitle: 'Senior Software Engineer',
      joiningDate: new Date('2023-03-15'),
      baseSalary: 4500,
      travellingAllowance: 400,
      otherAllowances: 150,
      localLeaveBalance: 12,
      sickLeaveBalance: 8,
    },
    {
      employeeId: 'EMP003',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@elpms.com',
      phone: '+1234567892',
      department: 'Human Resources',
      jobTitle: 'HR Manager',
      joiningDate: new Date('2023-06-01'),
      baseSalary: 4000,
      travellingAllowance: 350,
      otherAllowances: 150,
      localLeaveBalance: 15,
      sickLeaveBalance: 10,
    },
    {
      employeeId: 'EMP004',
      firstName: 'Michael',
      lastName: 'Johnson',
      email: 'michael.johnson@elpms.com',
      phone: '+1234567893',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      joiningDate: new Date('2023-09-01'),
      baseSalary: 3500,
      travellingAllowance: 300,
      otherAllowances: 100,
      localLeaveBalance: 12,
      sickLeaveBalance: 8,
    },
    {
      employeeId: 'EMP005',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'sarah.williams@elpms.com',
      phone: '+1234567894',
      department: 'Finance',
      jobTitle: 'Financial Analyst',
      joiningDate: new Date('2023-11-15'),
      baseSalary: 3800,
      travellingAllowance: 320,
      otherAllowances: 120,
      localLeaveBalance: 10,
      sickLeaveBalance: 7,
    },
  ];

  for (const emp of employees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        password: employeePassword,
        role: 'EMPLOYEE',
      },
    });

    await prisma.employee.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        ...emp,
        userId: user.id,
        status: 'ACTIVE',
      },
    });

    console.log(`Employee created: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
  }

  // Create public holidays
  console.log('Creating public holidays...');
  const currentYear = new Date().getFullYear();

  const holidays = [
    {
      name: 'New Year\'s Day',
      date: new Date(`${currentYear}-01-01`),
      description: 'New Year celebration',
    },
    {
      name: 'Independence Day',
      date: new Date(`${currentYear}-07-04`),
      description: 'National holiday',
    },
    {
      name: 'Christmas Day',
      date: new Date(`${currentYear}-12-25`),
      description: 'Christmas celebration',
    },
  ];

  for (const holiday of holidays) {
    await prisma.publicHoliday.upsert({
      where: { date: holiday.date },
      update: {},
      create: holiday,
    });

    console.log(`Holiday created: ${holiday.name}`);
  }

  console.log('Database seeding completed successfully!');
  console.log('\nDefault login credentials:');
  console.log('Admin:');
  console.log('  Email: admin@elpms.com');
  console.log('  Password: Admin@123');
  console.log('\nEmployee (John Doe):');
  console.log('  Email: john.doe@elpms.com');
  console.log('  Password: Employee@123');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
