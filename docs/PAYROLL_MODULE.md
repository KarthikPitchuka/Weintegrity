# Payroll Module Documentation

## Overview

The Payroll Module is a comprehensive salary management system designed for Indian payroll compliance. It handles salary structure management, payroll processing, statutory deductions (PF, ESI, Professional Tax, TDS), and payslip generation.

---

## Table of Contents

1. [Folder Structure](#folder-structure)
2. [Database Models](#database-models)
3. [Payroll Calculation Logic](#payroll-calculation-logic)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [How to Use](#how-to-use)
7. [Sample API Requests](#sample-api-requests)

---

## Folder Structure

```
backend/
├── models/
│   ├── SalaryStructure.js    # Salary components and settings per employee
│   ├── Payroll.js            # Monthly payroll records
│   └── Payslip.js            # Generated payslips
├── controllers/
│   └── payrollController.js   # All payroll business logic
├── routes/
│   └── payrollRoutes.js       # API route definitions
├── services/
│   └── payrollCalculator.js   # Calculation utilities
└── scripts/
    └── seedSalaryStructures.js # Test data seeder

frontend/src/pages/payroll/
├── PayrollList.jsx           # Main payroll management page (HR)
├── PayslipView.jsx           # Printable payslip view
└── MyPayslips.jsx            # Employee self-service payslips
```

---

## Database Models

### SalaryStructure
Stores salary configuration for each employee:
- **Basic Pay**: Base salary amount
- **HRA**: House Rent Allowance (% of basic)
- **DA**: Dearness Allowance (% of basic)
- **Special Allowance**: Fixed additional pay
- **Conveyance Allowance**: Default ₹1,600
- **Medical Allowance**: Default ₹1,250
- **LTA**: Leave Travel Allowance
- **PF Settings**: Employee & Employer contribution %
- **ESI Settings**: For employees with gross < ₹21,000
- **Professional Tax**: State-wise (max ₹200/month)

### Payroll
Monthly payroll record per employee:
- Pay period (month/year)
- Working days breakdown
- Earnings breakdown
- Deductions breakdown
- Employer contributions
- Status workflow (draft → pending → approved → processed → paid)
- Lock mechanism to prevent reprocessing

### Payslip
Generated payslip document:
- Employee details snapshot
- Earnings list with amounts
- Deductions list with amounts
- Net pay with amount in words
- YTD (Year-to-Date) figures

---

## Payroll Calculation Logic

### Gross Salary Calculation
```
Gross = Basic + HRA + DA + Special Allowance + Conveyance + Medical + LTA + Other Allowances + Overtime + Bonus
```

### Deductions

1. **Provident Fund (PF)**
   - Employee: 12% of Basic (capped at ₹15,000)
   - Employer: 12% of Basic (part of CTC)

2. **ESI (Employee State Insurance)**
   - Applicable only if Gross ≤ ₹21,000
   - Employee: 0.75% of Gross
   - Employer: 3.25% of Gross

3. **Professional Tax**
   - State-based (typically ₹200/month for salary > ₹15,000)

4. **Income Tax (TDS)**
   - Calculated using New Tax Regime slabs:
     - Up to ₹3L: 0%
     - ₹3L - ₹6L: 5%
     - ₹6L - ₹9L: 10%
     - ₹9L - ₹12L: 15%
     - ₹12L - ₹15L: 20%
     - Above ₹15L: 30%
   - Plus 4% Health & Education Cess

5. **Loss of Pay (LOP)**
   - (Gross / Working Days) × LOP Days

### Net Salary
```
Net Salary = Gross Earnings - Total Deductions
```

---

## API Endpoints

### Salary Structure APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/payroll/salary-structures` | Get all salary structures | HR, Admin |
| GET | `/api/payroll/salary-structures/employee/:id` | Get employee's salary | HR, Admin |
| POST | `/api/payroll/salary-structures` | Create/Update salary structure | HR, Admin |

### Payroll Processing APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/payroll?month=1&year=2026` | Get payroll list for month | HR, Admin |
| GET | `/api/payroll/:id` | Get payroll details | HR, Admin, Employee |
| POST | `/api/payroll/process` | Process payroll for month | HR, Admin |
| PUT | `/api/payroll/:id/approve` | Approve single payroll | HR Manager |
| PUT | `/api/payroll/approve-bulk` | Approve all pending | HR Manager |
| PUT | `/api/payroll/:id/lock` | Lock payroll | Admin |

### Payslip APIs

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/payroll/:id/payslip` | Generate payslip | HR, Admin |
| GET | `/api/payroll/payslips/:id` | Get payslip by ID | All |
| GET | `/api/payroll/my-payslips` | Get logged-in user's payslips | Employee |
| GET | `/api/payroll/history/:employeeId` | Get payroll history | HR, Admin |

### Dashboard API

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/payroll/dashboard` | Payroll dashboard stats | HR, Admin |

---

## Frontend Components

### PayrollList.jsx (HR View)
- Month/Year selector
- Dashboard stats cards
- Employee payroll table
- Process Payroll button
- Approve/Lock actions
- Salary breakdown modal
- Add Salary Structure modal

### PayslipView.jsx
- Professional payslip layout
- Employee details section
- Earnings breakdown table
- Deductions breakdown table
- Net pay in figures and words
- Print functionality
- Download PDF button

### MyPayslips.jsx (Employee View)
- Year selector
- YTD summary cards
- List of payslips by month
- Quick view/download actions
- Tax summary section

---

## How to Use

### 1. Setup Salary Structures
Before processing payroll, create salary structures for employees:

```bash
# Run seed script for test data
cd backend
node scripts/seedSalaryStructures.js
```

Or use the UI:
1. Go to Payroll page
2. Click "Add Salary Structure"
3. Select employee, enter Basic Pay and allowances
4. Save

### 2. Process Monthly Payroll
1. Select Month and Year
2. Click "Process Payroll"
3. System fetches attendance, calculates earnings/deductions
4. Review generated payroll records

### 3. Approve Payroll
1. Review pending payrolls
2. Click individual "Approve" or "Approve All Pending"
3. Approved payrolls can generate payslips

### 4. Generate Payslips
1. For approved payroll, click "Generate Payslip"
2. Payslip is created with all details
3. Employees can view via "My Payslips"

### 5. Lock Payroll
1. After approval, admin can lock payroll
2. Locked payrolls cannot be modified
3. Status changes to "processed"

---

## Sample API Requests

### Create Salary Structure
```http
POST /api/payroll/salary-structures
Authorization: Bearer <token>
Content-Type: application/json

{
  "employeeId": "65abc123def456...",
  "basicPay": 50000,
  "hraPercentage": 40,
  "specialAllowance": 10000,
  "pfEnabled": true,
  "professionalTax": 200
}
```

**Response:**
```json
{
  "message": "Salary structure created successfully",
  "salaryStructure": {
    "_id": "...",
    "employeeId": "...",
    "basicPay": 50000,
    "hra": 20000,
    "grossSalary": 84850,
    "ctc": 1090200,
    "isActive": true
  }
}
```

### Process Payroll
```http
POST /api/payroll/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": 1,
  "year": 2026
}
```

**Response:**
```json
{
  "message": "Payroll processing completed",
  "period": {
    "month": 1,
    "year": 2026,
    "monthName": "January"
  },
  "results": {
    "processed": [
      {
        "employeeId": "...",
        "employeeCode": "EMP00001",
        "name": "John Doe",
        "netSalary": 72500
      }
    ],
    "skipped": [],
    "errors": []
  }
}
```

### Get Payroll List
```http
GET /api/payroll?month=1&year=2026
Authorization: Bearer <token>
```

**Response:**
```json
{
  "payrolls": [...],
  "summary": {
    "totalGross": 250000,
    "totalDeductions": 45000,
    "totalNet": 205000,
    "count": 3
  },
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 3
  }
}
```

### Generate Payslip
```http
POST /api/payroll/65abc.../payslip
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Payslip generated successfully",
  "payslip": {
    "_id": "...",
    "payslipNumber": "PS-202601-0001",
    "employeeDetails": {...},
    "earnings": [...],
    "deductions": [...],
    "netPay": 72500,
    "netPayInWords": "Seventy Two Thousand Five Hundred Rupees Only"
  }
}
```

---

## Security Features

1. **JWT Authentication**: All endpoints require valid token
2. **Role-Based Access**: Different permissions for Admin, HR, Employee
3. **Payroll Locking**: Prevents modification after approval
4. **Audit Logging**: All payroll actions are logged
5. **Input Validation**: All inputs validated server-side

---

## Future Enhancements

- [ ] PDF payslip generation with digital signature
- [ ] Bank file generation for salary disbursement
- [ ] Form 16 generation
- [ ] Advance salary & loan management
- [ ] Reimbursement workflow
- [ ] Arrears calculation
- [ ] Bonus & incentive automation
