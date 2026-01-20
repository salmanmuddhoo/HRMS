# Employee Leave & Payroll Management System (ELPMS)

A comprehensive web-based system for managing employee leave applications, attendance tracking, and automated payroll processing.

## Features

### Employee Management
- Add, edit, and deactivate employees
- Manage employee details (ID, name, department, job title, joining date)
- Configure salary components (base salary, allowances)
- Set leave entitlements (local leave, sick leave)

### Leave Management
- Employee self-service leave applications
- Support for local leave and sick leave
- Document attachment support for sick leave
- Leave approval workflow
- Employer-initiated urgent leave
- Leave balance tracking

### Attendance & Absence Tracking
- Automatic absence tracking
- Differentiation between approved leave and unpaid absence
- Monthly attendance summaries
- Integration with leave management

### Salary & Allowance Management
- Base salary configuration
- Travelling allowance management
- Configurable allowance deduction rules
- Automatic deductions for absences

### Payroll Processing
- Monthly salary calculations
- Automatic deduction processing
- Payroll approval and locking
- Audit trail for payroll changes

### Payslip Generation
- Automated PDF payslip generation
- Detailed earnings and deductions breakdown
- Employee self-service payslip download

### Reporting & Dashboard
- Employer dashboard with key metrics
- Employee leave reports
- Monthly attendance reports
- Payroll reports
- Allowance deduction reports

### System Configuration
- Configurable leave entitlements
- Working days per month configuration
- Allowance deduction policy settings
- Public holiday management

## Technology Stack

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Authentication:** JWT
- **PDF Generation:** PDFKit

### Frontend
- **Framework:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **State Management:** React Context API
- **HTTP Client:** Axios

## Project Structure

```
HRMS/
├── backend/                    # Backend application
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utility functions
│   │   └── server.ts          # Application entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # Frontend application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── context/           # React context
│   │   ├── services/          # API services
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Utility functions
│   │   └── App.tsx            # Root component
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/elpms"
JWT_SECRET="your-secret-key"
PORT=5000
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Seed the database (optional):
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

The backend API will be available at `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The frontend application will be available at `http://localhost:3000`

## Default Users

After seeding the database, you can use these default accounts:

**Admin Account:**
- Email: admin@elpms.com
- Password: Admin@123

**Employee Account:**
- Email: employee@elpms.com
- Password: Employee@123

## API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Employee Endpoints
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Deactivate employee

### Leave Endpoints
- `GET /api/leaves` - Get all leaves
- `GET /api/leaves/:id` - Get leave by ID
- `POST /api/leaves` - Apply for leave
- `PUT /api/leaves/:id/approve` - Approve leave
- `PUT /api/leaves/:id/reject` - Reject leave
- `POST /api/leaves/urgent` - Add urgent leave

### Attendance Endpoints
- `GET /api/attendance` - Get attendance records
- `GET /api/attendance/summary/:employeeId/:month` - Get monthly summary

### Payroll Endpoints
- `GET /api/payroll` - Get payroll records
- `POST /api/payroll/process/:month` - Process monthly payroll
- `PUT /api/payroll/:id/approve` - Approve payroll
- `GET /api/payroll/:id/payslip` - Download payslip PDF

### Reports Endpoints
- `GET /api/reports/leave` - Leave report
- `GET /api/reports/attendance` - Attendance report
- `GET /api/reports/payroll` - Payroll report

## Security Features

- Role-based access control (RBAC)
- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- SQL injection prevention (via Prisma)
- XSS protection
- CORS configuration
- Rate limiting
- Audit trail for critical operations

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@elpms.com or create an issue in the repository.
