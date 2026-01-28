# ELPMS API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### POST /auth/login
Login to the system

**Request Body:**
```json
{
  "email": "admin@elpms.com",
  "password": "Admin@123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "admin@elpms.com",
      "role": "ADMIN",
      "employee": {...}
    }
  }
}
```

### GET /auth/me
Get current user information

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@elpms.com",
    "role": "ADMIN",
    "employee": {...}
  }
}
```

### POST /auth/change-password
Change user password

**Request Body:**
```json
{
  "currentPassword": "OldPassword@123",
  "newPassword": "NewPassword@123"
}
```

---

## Employee Endpoints

### GET /employees
Get all employees (requires auth)

**Query Parameters:**
- `status` (optional): ACTIVE | INACTIVE | SUSPENDED
- `department` (optional): Filter by department
- `search` (optional): Search by name, email, or employee ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employeeId": "EMP001",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "department": "Engineering",
      "jobTitle": "Software Engineer",
      "status": "ACTIVE",
      ...
    }
  ]
}
```

### GET /employees/:id
Get employee by ID

### POST /employees
Create new employee (Admin/Employer only)

**Request Body:**
```json
{
  "employeeId": "EMP005",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "department": "Engineering",
  "jobTitle": "Software Engineer",
  "joiningDate": "2024-01-01",
  "baseSalary": 5000,
  "travellingAllowance": 500,
  "otherAllowances": 200,
  "localLeaveBalance": 15,
  "sickLeaveBalance": 10,
  "password": "Employee@123",
  "role": "EMPLOYEE"
}
```

### PUT /employees/:id
Update employee (Admin/Employer only)

### DELETE /employees/:id
Deactivate employee (Admin/Employer only)

### GET /employees/stats
Get employee statistics (Admin/Employer only)

---

## Leave Endpoints

### GET /leaves
Get all leaves

**Query Parameters:**
- `status`: PENDING | APPROVED | REJECTED
- `employeeId`: Filter by employee
- `leaveType`: LOCAL | SICK
- `startDate`: Filter by start date
- `endDate`: Filter by end date

### GET /leaves/:id
Get leave by ID

### POST /leaves/apply
Apply for leave (Employee)

**Request Body:**
```json
{
  "leaveType": "LOCAL",
  "startDate": "2024-02-01",
  "endDate": "2024-02-05",
  "reason": "Family vacation",
  "attachment": "optional-file-url"
}
```

### POST /leaves/urgent
Add urgent leave (Admin/Employer only)

**Request Body:**
```json
{
  "employeeId": "uuid",
  "leaveType": "SICK",
  "startDate": "2024-02-01",
  "endDate": "2024-02-02",
  "reason": "Medical emergency"
}
```

### PUT /leaves/:id/approve
Approve leave (Admin/Employer only)

### PUT /leaves/:id/reject
Reject leave (Admin/Employer only)

**Request Body:**
```json
{
  "rejectionReason": "Insufficient leave balance"
}
```

### DELETE /leaves/:id
Cancel leave

---

## Attendance Endpoints

### GET /attendance
Get attendance records

**Query Parameters:**
- `employeeId`: Filter by employee
- `startDate`: Start date
- `endDate`: End date
- `month`: Month (1-12)
- `year`: Year

### GET /attendance/summary/:employeeId
Get monthly attendance summary

**Query Parameters:**
- `month` (required): 1-12
- `year` (required): e.g., 2024

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDays": 22,
    "presentDays": 20,
    "leaveDays": 2,
    "localLeaveDays": 1,
    "sickLeaveDays": 1,
    "absenceDays": 0,
    "records": [...]
  }
}
```

### POST /attendance/absence
Mark absence (Admin/Employer only)

**Request Body:**
```json
{
  "employeeId": "uuid",
  "date": "2024-02-01",
  "remarks": "Absent without notice"
}
```

### PUT /attendance/:id
Update attendance record (Admin/Employer only)

---

## Payroll Endpoints

### GET /payroll
Get all payroll records

**Query Parameters:**
- `employeeId`: Filter by employee
- `month`: 1-12
- `year`: e.g., 2024
- `status`: DRAFT | APPROVED | LOCKED

### GET /payroll/:id
Get payroll by ID

### POST /payroll/process
Process monthly payroll (Admin/Employer only)

**Request Body:**
```json
{
  "month": 2,
  "year": 2024
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payroll processed for 50 employees",
  "data": [...]
}
```

### PUT /payroll/:id/approve
Approve payroll (Admin/Employer only)

### PUT /payroll/:id/lock
Lock payroll (Admin/Employer only)

### PUT /payroll/:id
Update payroll (Admin/Employer only)

**Request Body:**
```json
{
  "baseSalary": 5000,
  "travellingAllowance": 500,
  "otherAllowances": 200,
  "remarks": "Bonus added"
}
```

### DELETE /payroll/:id
Delete payroll (Admin/Employer only)

---

## Payslip Endpoints

### POST /payslips/generate/:payrollId
Generate payslip PDF

### GET /payslips/download/:payrollId
Download payslip PDF

### GET /payslips/employee/:employeeId
Get all payslips for an employee

---

## Public Holiday Endpoints

### GET /holidays
Get all holidays

**Query Parameters:**
- `year`: Filter by year
- `month`: Filter by month

### GET /holidays/upcoming
Get upcoming holidays

**Query Parameters:**
- `limit`: Number of holidays to return (default: 5)

### GET /holidays/:id
Get holiday by ID

### POST /holidays
Create holiday (Admin/Employer only)

**Request Body:**
```json
{
  "name": "New Year's Day",
  "date": "2024-01-01",
  "description": "New Year celebration"
}
```

### PUT /holidays/:id
Update holiday (Admin/Employer only)

### DELETE /holidays/:id
Delete holiday (Admin/Employer only)

---

## Report Endpoints

### GET /reports/dashboard
Get dashboard statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 50,
    "onLeaveToday": 5,
    "pendingLeaves": 3,
    "currentMonthPayroll": {
      "month": 2,
      "year": 2024,
      "totalAmount": 250000,
      "employeeCount": 50
    },
    "departments": [...],
    "recentLeaves": [...],
    "upcomingHolidays": [...]
  }
}
```

### GET /reports/leave
Get leave report (Admin/Employer only)

**Query Parameters:**
- `startDate`: Filter start date
- `endDate`: Filter end date
- `department`: Filter by department
- `leaveType`: LOCAL | SICK
- `status`: PENDING | APPROVED | REJECTED

### GET /reports/attendance
Get attendance report (Admin/Employer only)

**Query Parameters:**
- `month` (required): 1-12
- `year` (required): e.g., 2024
- `department`: Filter by department
- `employeeId`: Filter by employee

### GET /reports/payroll
Get payroll report (Admin/Employer only)

**Query Parameters:**
- `month`: 1-12
- `year`: e.g., 2024
- `department`: Filter by department
- `status`: DRAFT | APPROVED | LOCKED

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Rate Limiting

Currently, there are no rate limits implemented. In production, consider implementing rate limiting to prevent abuse.

## Pagination

For large datasets, consider implementing pagination using query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

## WebSocket Support

Real-time notifications are not currently implemented but can be added for:
- Leave approval notifications
- Payroll processing updates
- System announcements
