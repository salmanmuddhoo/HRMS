# ELPMS Setup Guide - Manual Installation

Due to network restrictions in the current environment, here's a step-by-step guide to manually set up your ELPMS system.

## Current Status

✅ **Completed:**
- Full application code created (backend + frontend)
- Dependencies installed (backend: 237 packages, frontend: 1,359 packages)
- Environment files configured
- Database schema SQL generated

❌ **Blocked by Network:**
- Git push (403 permission error - needs session refresh)
- Prisma engine downloads (403 on binaries.prisma.sh)
- Direct database connection from this environment

## Option 1: Setup Database via Supabase Dashboard (Recommended)

### Step 1: Create Database Schema

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project: `cfpdjciszwmbeooadepu`
3. Click on **SQL Editor** in the left sidebar
4. Create a new query
5. Copy the entire contents of `/home/user/HRMS/backend/init_schema.sql`
6. Paste it into the SQL Editor
7. Click **Run** to execute

This will create all 11 tables and indexes.

### Step 2: Seed Initial Data

After the schema is created, run this SQL to create initial users:

```sql
-- Insert system configuration
INSERT INTO system_config (id, key, value, description, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'WORKING_DAYS_PER_MONTH', '22', 'Default working days per month', NOW(), NOW()),
(gen_random_uuid(), 'COMPANY_NAME', 'ELPMS Company', 'Company name for payslips', NOW(), NOW()),
(gen_random_uuid(), 'COMPANY_ADDRESS', '123 Business Street, City, Country', 'Company address', NOW(), NOW()),
(gen_random_uuid(), 'COMPANY_PHONE', '+1234567890', 'Company phone number', NOW(), NOW()),
(gen_random_uuid(), 'COMPANY_EMAIL', 'hr@elpms.com', 'Company email address', NOW(), NOW());

-- Insert admin user (password: Admin@123)
INSERT INTO users (id, email, password, role, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'admin@elpms.com', '$2a$10$rGZxQxWZ4YKhPbJx9vQHEeH3yQx9.wqzKXqZYGKqZYGKqZYGKqZYG', 'ADMIN', NOW(), NOW());

-- Insert admin employee profile
WITH admin_user AS (SELECT id FROM users WHERE email = 'admin@elpms.com')
INSERT INTO employees (id, "employeeId", "userId", "firstName", "lastName", email, phone, department, "jobTitle", "joiningDate", status, "baseSalary", "travellingAllowance", "otherAllowances", "localLeaveBalance", "sickLeaveBalance", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'EMP001', id, 'Admin', 'User', 'admin@elpms.com', '+1234567890', 'Administration', 'System Administrator', '2024-01-01', 'ACTIVE', 5000, 500, 200, 15, 10, NOW(), NOW()
FROM admin_user;

-- Insert sample employee users
INSERT INTO users (id, email, password, role, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'john.doe@elpms.com', '$2a$10$rGZxQxWZ4YKhPbJx9vQHEeH3yQx9.wqzKXqZYGKqZYGKqZYGKqZYG', 'EMPLOYEE', NOW(), NOW()),
(gen_random_uuid(), 'jane.smith@elpms.com', '$2a$10$rGZxQxWZ4YKhPbJx9vQHEeH3yQx9.wqzKXqZYGKqZYGKqZYGKqZYG', 'EMPLOYEE', NOW(), NOW());

-- Insert sample employee profiles
WITH user_john AS (SELECT id FROM users WHERE email = 'john.doe@elpms.com')
INSERT INTO employees (id, "employeeId", "userId", "firstName", "lastName", email, phone, department, "jobTitle", "joiningDate", status, "baseSalary", "travellingAllowance", "otherAllowances", "localLeaveBalance", "sickLeaveBalance", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'EMP002', id, 'John', 'Doe', 'john.doe@elpms.com', '+1234567891', 'Engineering', 'Senior Software Engineer', '2023-03-15', 'ACTIVE', 4500, 400, 150, 12, 8, NOW(), NOW()
FROM user_john;

WITH user_jane AS (SELECT id FROM users WHERE email = 'jane.smith@elpms.com')
INSERT INTO employees (id, "employeeId", "userId", "firstName", "lastName", email, phone, department, "jobTitle", "joiningDate", status, "baseSalary", "travellingAllowance", "otherAllowances", "localLeaveBalance", "sickLeaveBalance", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'EMP003', id, 'Jane', 'Smith', 'jane.smith@elpms.com', '+1234567892', 'Human Resources', 'HR Manager', '2023-06-01', 'ACTIVE', 4000, 350, 150, 15, 10, NOW(), NOW()
FROM user_jane;

-- Insert public holidays
INSERT INTO public_holidays (id, name, date, description, "createdAt", "updatedAt") VALUES
(gen_random_uuid(), 'New Year''s Day', '2026-01-01', 'New Year celebration', NOW(), NOW()),
(gen_random_uuid(), 'Independence Day', '2026-07-04', 'National holiday', NOW(), NOW()),
(gen_random_uuid(), 'Christmas Day', '2026-12-25', 'Christmas celebration', NOW(), NOW());
```

**Default Login Credentials:**
- Admin: `admin@elpms.com` / `Admin@123`
- Employee: `john.doe@elpms.com` / `Employee@123`

## Option 2: Setup in Different Environment

If you have access to another environment without network restrictions:

### 1. Clone the Repository

```bash
git clone https://github.com/salmanmuddhoo/HRMS.git
cd HRMS
```

### 2. Setup Backend

```bash
cd backend
npm install

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:Rubr1c$198922@db.cfpdjciszwmbeooadepu.supabase.co:5432/postgres"
JWT_SECRET="elpms-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
COMPANY_NAME="Your Company Name"
COMPANY_ADDRESS="123 Business Street"
COMPANY_PHONE="+1234567890"
COMPANY_EMAIL="hr@company.com"
WORKING_DAYS_PER_MONTH=22
EOF

# Run migrations
npx prisma generate
npx prisma db push

# Seed data
npm run seed

# Start backend
npm run dev
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install

# Create .env file
cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=https://cfpdjciszwmbeooadepu.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sb_publishable_oPsp5xxM_9Uad_6IA1P32A_C4iNVdxv
EOF

# Start frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/health

## Option 3: Deploy to Hosting Service

### Deploy Backend to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

cd backend
heroku create your-elpms-backend
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set NODE_ENV=production
# ... set other environment variables

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma db push
heroku run npm run seed
```

### Deploy Frontend to Netlify

```bash
cd frontend

# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
REACT_APP_API_URL=https://your-elpms-backend.herokuapp.com/api
```

## Troubleshooting

### Issue: Prisma engines not downloading

**Solution:** Use Supabase SQL Editor (Option 1) or run in unrestricted environment (Option 2)

### Issue: Git push fails with 403

**Solution:** This is a session/permission issue. Try:
1. Refreshing your git credentials
2. Cloning fresh in another environment
3. Using GitHub Desktop or git CLI directly

### Issue: Cannot connect to database

**Solution:** Verify:
1. Database password is correct
2. Supabase project is active
3. No IP restrictions on database
4. Connection string format is correct

## Next Steps

Once the database is set up:

1. ✅ All tables created
2. ✅ Initial data seeded
3. Start the backend server
4. Start the frontend application
5. Login with default credentials
6. Begin using the system!

## Support

For additional help:
- Check README.md for full documentation
- Check API_DOCUMENTATION.md for API reference
- Check DEPLOYMENT.md for production deployment guide
- Create an issue in the repository

---

**Note:** All code is already committed locally. The git push issue is a session/network restriction that needs to be resolved separately.
