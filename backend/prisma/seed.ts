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

  // Create admin user — credentials from env vars or fall back to defaults
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@elpms.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

  console.log(`Creating admin user: ${adminEmail}`);
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: adminPasswordHash, role: 'ADMIN' },
    create: {
      email: adminEmail,
      password: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  console.log('Admin user ready:', adminUser.email);

  // Create admin employee profile (required for login)
  await prisma.employee.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      employeeId: 'EMP001',
      userId: adminUser.id,
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      department: 'Administration',
      jobTitle: 'System Administrator',
      joiningDate: new Date('2024-01-01'),
      status: 'ACTIVE',
      baseSalary: 0,
      travellingAllowance: 0,
      otherAllowances: 0,
      localLeaveBalance: 0,
      sickLeaveBalance: 0,
    },
  });

  console.log('Admin employee profile ready.');

  // Ensure default leave settings exist
  await prisma.systemConfig.upsert({
    where: { key: 'DEFAULT_LOCAL_LEAVE' },
    update: {},
    create: { key: 'DEFAULT_LOCAL_LEAVE', value: '15', description: 'Default annual local leave days' },
  });
  await prisma.systemConfig.upsert({
    where: { key: 'DEFAULT_SICK_LEAVE' },
    update: {},
    create: { key: 'DEFAULT_SICK_LEAVE', value: '10', description: 'Default annual sick leave days' },
  });

  console.log('Database seeding completed.');
  console.log(`\nAdmin login → ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

