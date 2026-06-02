# ACOLYTE HR MANAGEMENT SYSTEM (HRMS)
## Comprehensive Documentation & Setup Guide

---

## 📋 TABLE OF CONTENTS
1. [System Overview](#system-overview)
2. [Multi-Company Architecture](#multi-company-architecture)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Database Models](#database-models)
5. [API Documentation](#api-documentation)
6. [Setup & Configuration](#setup--configuration)
7. [Workflows](#workflows)
8. [Security](#security)

---

## 🎯 SYSTEM OVERVIEW

**ACOLYTE HRMS** is a comprehensive Human Resource Management System built with Next.js that manages:
- ✅ Employee lifecycle (Onboarding → Training → Performance → Separation)
- ✅ Payroll & Attendance management
- ✅ Recruitment pipeline (Job posting → Interview → Verification → Onboarding)
- ✅ Leave management with balance tracking
- ✅ Partner ecosystem (Associates, Vendors, Franchises)
- ✅ Compliance & Risk management
- ✅ Multi-company support with role-based access
- ✅ Audit trails for all operations

---

## 🏢 MULTI-COMPANY ARCHITECTURE

### Company Hierarchy
```
COMPANY (Parent)
├── DEPARTMENT (Reports to Company)
│   ├── EMPLOYEES
│   ├── JOBS
│   └── TEAMS
├── USERS (Can belong to multiple companies)
├── ROLES (Company-specific with role definitions)
└── SETTINGS (Company configurations)
```

### Data Isolation & Access
```
User Login (with Company Selection)
        ↓
Load Company ID from Session
        ↓
Filter all queries by Company ID
        ↓
Department Manager sees only their department
Department Head sees all departments in their company
Owner/Director sees all companies
```

### Example Multi-Company API Queries
```javascript
// Filter by company
const employees = await Employee.find({ company: session.user.company });

// Department managers see only their department
const filter = session.user.role === "Department Manager" 
  ? { department: session.user.department } 
  : { company: session.user.company };
const leaves = await Leave.find(filter);

// HR sees all leaves in their company
const leaves = await Leave.find({ company: session.user.company });
```

---

## 👥 USER ROLES & PERMISSIONS

### Role Hierarchy (15 Roles)

| Role | Level | Company Access | Department Access | Permissions |
|------|-------|----------------|--------------------|---|
| **Owner** | 5 | ALL | ALL | Full system access, company settings |
| **Director** | 4.5 | Multiple | All in company | Strategic decisions, budget approval |
| **HR Head** | 4 | 1 | All | Recruitment, compliance, payroll approval |
| **HR Executive** | 3.5 | 1 | All | Recruitment, leave approval |
| **Department Manager** | 3 | 1 | Own only | Team management, attendance, leave approval |
| **DSM** | 2.5 | 1 | Own only | Field operations, associate management |
| **Trainer** | 2.5 | 1 | All | Training, onboarding coordination |
| **Accounts** | 2.5 | 1 | All | Payroll processing, expense approval |
| **Risk Officer** | 2.5 | 1 | All | Risk assessment, compliance |
| **IT Admin** | 2.5 | 1 | All | System administration |
| **Employee** | 1 | Own | Own | View personal data, apply leave, submit expenses |
| **Associate** | 1 | - | - | Limited access, field operations |
| **Vendor** | 1 | - | - | Service/product delivery tracking |
| **Franchisee** | 1 | - | - | Branch operations tracking |

### Permission Matrix
```
RECRUITMENT
├── Owner/Director/HR Head: Full access
├── HR Executive: View + Approve from HR Sourcing
├── Department Manager: Create + View own requisitions
└── Employee: View open jobs

ATTENDANCE
├── Department Manager: Mark for team, view team data
├── Employee: View own attendance
└── HR: View all, corrections

LEAVES
├── Employee: Apply, view own history
├── Manager: Approve for team
├── HR: Approve from manager level
└── Owner: Final approval for disputes

PAYROLL
├── Accounts: Generate payslips
├── Owner: Approve
├── Employee: View own payslip
└── HR: View all (anonymized if needed)

EXPENSES
├── Employee: Submit, view own
├── Manager: Approve for team
├── Accounts: Final approval
```

---

## 📊 DATABASE MODELS

### Core HR Models

#### 1. **User** (Authentication & Identity)
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  mobile: String,
  companies: [ObjectId] // N:N relationship - user can belong to multiple companies
  role: String,
  department: ObjectId,
  profilePhoto: String,
  lastLogin: Date,
  loginHistory: [{ip, timestamp, device}],
  status: "Active" | "Inactive" | "Suspended"
}
```

#### 2. **Company** (Organization Unit)
```javascript
{
  name: String (unique),
  registrationNumber: String,
  industry: String,
  headOffice: {street, city, state, zip, country},
  contactEmail: String,
  phone: String,
  website: String,
  employees: [ObjectId],
  departments: [ObjectId],
  roles: [ObjectId],
  logo: String,
  totalEmployees: Number,
  status: "Active" | "Inactive"
}
```

#### 3. **Department** (Organizational Unit)
```javascript
{
  name: String,
  company: ObjectId (FK),
  head: ObjectId (User), // Department Head
  employees: [ObjectId],
  reportingTo: ObjectId, // Parent department
  budget: Number,
  costCenter: String,
  status: "Active" | "Inactive"
}
```

#### 4. **EmployeeProfile** (Detailed Employee Information)
```javascript
{
  user: ObjectId (FK),
  company: ObjectId (FK),
  department: ObjectId (FK),
  designation: String,
  reportingManager: ObjectId,
  dateOfJoining: Date,
  dateOfBirth: Date,
  gender: String,
  bloodGroup: String,
  aadhar: String,
  pan: String,
  bankAccount: String,
  ifscCode: String,
  emergencyContact: {name, relation, phone},
  address: {present, permanent},
  leaveBalances: {
    casualLeave: Number,
    sickLeave: Number,
    earnedLeave: Number,
    unpaidLeave: Number,
    floatingHoliday: Number
  },
  performance: [{year, month, rating, comments}],
  certifications: [{name, issuer, issueDate, expiryDate}],
  skills: [String],
  status: "Active" | "OnLeave" | "OnProbation" | "OnNotice" | "Separated"
}
```

#### 5. **Attendance**
```javascript
{
  employee: ObjectId (FK),
  company: ObjectId (FK),
  date: Date,
  status: "Present" | "Absent" | "LeaveApproved" | "HolidayApproved" | "WFH" | "Medical",
  checkIn: Date,
  checkOut: Date,
  duration: Number, // in hours
  remarks: String,
  markedBy: ObjectId, // Manager who marked
  geoLocation: {latitude, longitude}
}
```

#### 6. **Leave**
```javascript
{
  employee: ObjectId (FK),
  type: "Casual Leave" | "Sick Leave" | "Earned Leave" | "Unpaid Leave" | "Floating Holiday",
  startDate: Date,
  endDate: Date,
  days: Number,
  reason: String,
  status: "Pending" | "Approved" | "Rejected" | "Cancelled",
  approvalChain: [
    {role: "DepartmentManager", approvedBy, approvalDate, comments},
    {role: "HR", approvedBy, approvalDate, comments},
    {role: "Owner", approvedBy, approvalDate, comments}
  ],
  createdAt: Date,
  updatedAt: Date
}
```

#### 7. **Payroll**
```javascript
{
  employee: ObjectId (FK),
  month: Number,
  year: Number,
  basicPay: Number,
  hra: Number,
  conveyance: Number,
  specialAllowance: Number,
  totalEarnings: Number,
  pfDeduction: Number,
  esiDeduction: Number,
  ptDeduction: Number,
  tdsDeduction: Number,
  totalDeductions: Number,
  netPay: Number,
  status: "Draft" | "Processed" | "Approved" | "Paid",
  approvedBy: ObjectId,
  paidOn: Date
}
```

### Recruitment Models

#### 8. **Job**
```javascript
{
  title: String,
  company: ObjectId (FK),
  department: ObjectId (FK),
  description: String,
  responsibilities: [String],
  requiredSkills: [String],
  experience: {min: Number, max: Number},
  salary: {min: Number, max: Number, currency: "INR"},
  location: String,
  employmentType: "Full-time" | "Contract" | "Internship",
  status: "Draft" | "Published" | "OnHold" | "Closed",
  postedBy: ObjectId,
  postedDate: Date,
  closingDate: Date,
  noOfPositions: Number,
  candidates: [ObjectId], // Candidate IDs
  approvalStatus: "Pending" | "Approved" | "Rejected"
}
```

#### 9. **Candidate**
```javascript
{
  name: String,
  email: String,
  mobile: String,
  job: ObjectId (FK), // Applied for which job
  company: ObjectId (FK),
  resume: String, // Document URL
  appliedDate: Date,
  currentCompany: String,
  currentDesignation: String,
  experience: Number,
  salaryExpected: Number,
  noticePeriod: Number,
  availability: Date,
  source: "LinkedIn" | "Indeed" | "Internal" | "Reference" | "Other",
  status: "Applied" | "Screening" | "Interview" | "Offered" | "Rejected" | "Hired",
  interviews: [ObjectId], // Interview IDs
  verifications: [ObjectId], // Verification records
  screeningRemarks: String,
  screenedBy: ObjectId,
  screenedDate: Date,
  rating: Number // 1-5
}
```

#### 10. **Interview**
```javascript
{
  candidate: ObjectId (FK),
  job: ObjectId (FK),
  type: "Round-1-HR" | "Round-2-Technical" | "Round-3-Manager" | "Final",
  scheduledDate: Date,
  interviewer: ObjectId,
  feedbackRating: Number, // 1-5
  feedbackComments: String,
  result: "Pass" | "Fail" | "Pending" | "Hold",
  nextRound: ObjectId, // Next interview ID if any
  meetingLink: String
}
```

#### 11. **HiringRequisition**
```javascript
{
  company: ObjectId (FK),
  department: ObjectId (FK),
  role: String,
  category: String,
  qty: Number,
  experience: {min: Number, max: Number},
  skills: [String],
  budget: {min: Number, max: Number},
  jd: String, // Job Description
  kra: String, // Key Result Areas
  kpi: String, // Key Performance Indicators
  sop: String, // Standard Operating Procedure
  reportingManager: ObjectId,
  status: "Pending HR Sourcing Review" → "Pending Accounts Review" → "Pending Owner Approval" → "Approved",
  approvalChain: [
    {stage: "HR Sourcing", approvedBy, remarks, status},
    {stage: "Accounts", approvedBy, remarks, status},
    {stage: "Owner", approvedBy, remarks, status}
  ],
  createdBy: String,
  dateOfRequirement: Date
}
```

### Partner Models

#### 12. **Associate**
```javascript
{
  name: String,
  email: String,
  phone: String,
  company: ObjectId (FK),
  territory: ObjectId,
  designation: String,
  manager: ObjectId (DSM),
  status: "Active" | "Inactive",
  performance: [{month, calls, meetings, fieldVisits, target, achievement}],
  riskLevel: "Low" | "Medium" | "High",
  monthlyTarget: Number,
  monthlyAchievement: Number
}
```

#### 13. **Vendor**
```javascript
{
  name: String,
  companyName: String,
  email: String,
  phone: String,
  company: ObjectId (FK),
  category: "Services" | "Products" | "Both",
  status: "Active" | "Inactive" | "Suspended",
  riskScore: Number, // 0-100
  complianceStatus: "Compliant" | "Non-Compliant" | "Pending",
  lastAudit: Date,
  bankDetails: {accountNumber, ifsc, name},
  documents: [ObjectId]
}
```

#### 14. **Franchise**
```javascript
{
  name: String,
  ownerName: String,
  location: {city, state, address},
  registrationNumber: String,
  parentCompany: ObjectId (FK),
  status: "Active" | "Inactive",
  performanceMetrics: {
    revenue: Number,
    customers: Number,
    nps: Number
  },
  manager: ObjectId
}
```

### Compliance Models

#### 15. **AuditLog**
```javascript
{
  action: String, // "CREATE" | "UPDATE" | "DELETE" | "VIEW"
  entity: String, // Model name
  entityId: ObjectId,
  userId: ObjectId,
  changes: {before: Object, after: Object},
  timestamp: Date,
  ipAddress: String,
  userAgent: String,
  company: ObjectId,
  status: "Success" | "Failed"
}
```

#### 16. **RiskAlert**
```javascript
{
  company: ObjectId (FK),
  title: String,
  description: String,
  severity: "Low" | "Medium" | "High" | "Critical",
  category: "Compliance" | "Performance" | "Financial" | "Security",
  status: "Open" | "In-Progress" | "Resolved",
  createdBy: ObjectId,
  assignedTo: ObjectId,
  dueDate: Date,
  resolvedDate: Date,
  resolution: String
}
```

#### 17. **SodReport** (Start of Day)
```javascript
{
  employee: ObjectId (FK),
  date: Date,
  plan: String,
  callsPlanned: Number,
  meetings: Number,
  fieldVisits: Number,
  submittedAt: Date,
  status: "Submitted" | "Acknowledged"
}
```

#### 18. **EodReport** (End of Day)
```javascript
{
  employee: ObjectId (FK),
  date: Date,
  completedWork: String,
  tasksCompleted: Number,
  achievementPercent: Number,
  issuesFaced: String,
  escalationRequired: Boolean,
  submittedAt: Date,
  status: "Submitted" | "Acknowledged"
}
```

---

## 🔌 API DOCUMENTATION

### Base URL
```
http://localhost:3000/api
```

### Authentication
All protected endpoints require:
```javascript
Headers: {
  "Authorization": "Bearer JWT_TOKEN"
}
```

### Employee APIs

#### 1. **Leave Management**

**GET /api/leaves** - Fetch leave history
```javascript
Response: {
  success: true,
  data: [
    {
      _id, employee, type, startDate, endDate, days, 
      status, reason, approvalChain, createdAt
    }
  ]
}
```

**POST /api/leaves** - Apply for leave
```javascript
Body: {
  type: "Casual Leave",
  startDate: "2026-06-05",
  endDate: "2026-06-06",
  days: 2,
  reason: "Personal work"
}

Response: {
  success: true,
  data: {_id, employee, status: "Pending", ...}
}
```

**PUT /api/leaves** - Update leave status (Manager/HR/Owner)
```javascript
Body: {
  id: "leave_id",
  status: "Approved",
  remarks: "Approved by manager"
}
```

#### 2. **Attendance**

**GET /api/attendance** - Get attendance records
```javascript
Query: ?month=6&year=2026&employee=emp_id
Response: {
  success: true,
  data: [{date, status, checkIn, checkOut, ...}]
}
```

**POST /api/attendance** - Mark attendance
```javascript
Body: {
  employee: "emp_id",
  date: "2026-06-01",
  status: "Present",
  checkIn: "2026-06-01T09:00:00Z",
  checkOut: "2026-06-01T17:00:00Z"
}
```

#### 3. **Payroll**

**GET /api/payroll** - Fetch payslips
```javascript
Query: ?month=6&year=2026
Response: {
  success: true,
  data: [{month, year, basicPay, hra, totalEarnings, netPay, ...}]
}
```

**POST /api/payroll** - Generate payslip (Accounts role)
```javascript
Body: {
  employeeId: "emp_id",
  month: 6,
  year: 2026,
  basicPay: 50000,
  hra: 10000,
  pfDeduction: 1800,
  tdsDeduction: 0
}
```

#### 4. **Expenses**

**GET /api/expenses** - Fetch expense claims
```javascript
Response: {
  success: true,
  data: [{amount, category, dateIncurred, description, status, ...}]
}
```

**POST /api/expenses** - Submit expense claim
```javascript
Body: {
  amount: 5000,
  category: "Travel",
  dateIncurred: "2026-05-30",
  description: "Client meeting travel",
  receiptUrl: "url_to_receipt"
}
```

### Recruitment APIs

#### 5. **Jobs**

**GET /api/jobs** - List all open jobs
```javascript
Query: ?company=comp_id&department=dept_id&status=Published
Response: {
  success: true,
  data: [{title, description, salary, location, candidates, ...}]
}
```

**POST /api/jobs** - Create job posting (HR/Manager)
```javascript
Body: {
  title: "Senior Developer",
  department: "dept_id",
  description: "...",
  experience: {min: 3, max: 5},
  salary: {min: 600000, max: 1000000},
  noOfPositions: 2
}
```

#### 6. **Candidates**

**GET /api/candidates** - Fetch candidates
```javascript
Query: ?job=job_id&status=Interview
Response: {
  success: true,
  data: [{name, email, resume, status, rating, ...}]
}
```

**POST /api/candidates** - Register candidate (Job applicant or manual entry)
```javascript
Body: {
  name: "John Doe",
  email: "john@example.com",
  job: "job_id",
  resume: "document_url",
  currentDesignation: "Developer",
  experience: 3
}
```

**PUT /api/candidates/[id]** - Update candidate status
```javascript
Body: {
  status: "Interview",
  rating: 4,
  screeningRemarks: "Good profile"
}
```

#### 7. **Interviews**

**POST /api/interviews** - Schedule interview
```javascript
Body: {
  candidate: "candidate_id",
  type: "Round-1-HR",
  scheduledDate: "2026-06-10T10:00:00Z",
  interviewer: "user_id",
  meetingLink: "zoom_link"
}
```

**PUT /api/interviews/[id]** - Submit interview feedback
```javascript
Body: {
  feedbackRating: 4,
  feedbackComments: "Good communication",
  result: "Pass"
}
```

#### 8. **Hiring Requisitions**

**POST /api/hiring** - Create hiring requisition (Department Manager)
```javascript
Body: {
  role: "Senior Developer",
  category: "Technology",
  qty: 2,
  experience: {min: 3, max: 5},
  budget: {min: 600000, max: 1000000},
  jd: "...",
  kra: "...",
  kpi: "...",
  reportingManager: "manager_id"
}
// Status: "Pending HR Sourcing Review"
```

**PUT /api/hiring** - Update requisition status
```javascript
Body: {
  id: "requisition_id",
  status: "Pending Accounts Review",
  remarks: "Forwarded for budget verification"
}
// Only HR can move to Accounts, Accounts to Owner
```

### HR Management APIs

#### 9. **Onboarding**

**POST /api/onboarding** - Create onboarding checklist
```javascript
Body: {
  candidate: "candidate_id",
  offerletter: "document_url",
  joiningDate: "2026-07-01",
  items: [
    "ID Card Issuance",
    "System Setup",
    "Training Schedule",
    "Policy Acknowledgment"
  ]
}
```

**PUT /api/onboarding** - Update checklist item status
```javascript
Body: {
  id: "onboarding_id",
  itemIndex: 0,
  completed: true
}
```

#### 10. **Training**

**POST /api/trainings** - Create training program
```javascript
Body: {
  title: "Advanced JavaScript",
  description: "...",
  trainer: "trainer_id",
  startDate: "2026-06-15",
  endDate: "2026-06-20",
  participants: ["emp_id1", "emp_id2"],
  duration: 5,
  category: "Technical"
}
```

### Partner Management APIs

#### 11. **Associates**

**GET /api/associates** - List associates
```javascript
Query: ?territory=territory_id&status=Active
```

**PUT /api/associates/[id]** - Update associate performance/status
```javascript
Body: {
  monthlyTarget: 100000,
  monthlyAchievement: 85000,
  riskLevel: "Low"
}
```

#### 12. **Vendors**

**POST /api/vendors** - Register vendor
```javascript
Body: {
  name: "ABC Services",
  category: "Services",
  email: "vendor@abc.com",
  bankDetails: {...}
}
```

### Dashboard APIs

#### 13. **Dashboard Stats**

**GET /api/dashboard/stats** - Get dashboard metrics
```javascript
Response: {
  success: true,
  data: {
    totalEmployees: 150,
    activeJobs: 5,
    pendingLeaves: 12,
    pendingApprovals: 8,
    openGrievances: 3,
    riskAlerts: 2
  }
}
```

### System APIs

#### 14. **Companies**

**GET /api/companies** - List companies (Owner/Admin)
```javascript
Response: {
  success: true,
  data: [
    {name, registrationNumber, headOffice, totalEmployees, status, ...}
  ]
}
```

#### 15. **Departments**

**GET /api/departments** - List departments
```javascript
Query: ?company=comp_id
```

#### 16. **Audit Logs**

**GET /api/audit-logs** - View system audit trail
```javascript
Query: ?company=comp_id&entity=User&startDate=date&endDate=date
Response: {
  success: true,
  data: [
    {action, entity, userId, changes, timestamp, ipAddress, ...}
  ]
}
```

---

## ⚙️ SETUP & CONFIGURATION

### Prerequisites
```bash
Node.js 18+
MongoDB 5.0+
npm or yarn
```

### Installation

1. **Clone and Install**
```bash
cd /home/himanshu/Desktop/HR\ Management
npm install
```

2. **Environment Setup**
Create `.env` file:
```env
# Database
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/database

# Authentication
NEXTAUTH_SECRET=your-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# External APIs
GEMINI_API_KEY=your-gemini-api-key
RS9_API_KEY=your-rs9-sync-key

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

3. **Database Initialization**
```bash
npm run seed
# This creates:
# - Roles (Owner, HR Head, etc.)
# - Test companies
# - Sample departments
# - Test users for each role
```

4. **Start Development Server**
```bash
npm run dev
# Server runs at http://localhost:3000
```

5. **Build for Production**
```bash
npm run build
npm start
```

### Default Test Users
```javascript
Owner:
- Email: owner@acolyte.com
- Password: Owner@123

HR Head:
- Email: hr@acolyte.com
- Password: HR@123

Department Manager:
- Email: manager@acolyte.com
- Password: Manager@123

Employee:
- Email: emp@acolyte.com
- Password: Emp@123
```

---

## 📊 WORKFLOWS

### 1. **Employee Onboarding Workflow**
```
Candidate Applied → Interview Process → Offer Letter → 
Onboarding Checklist → Training → Employee Created → 
EOL (End of Letter) → Active Employee
```

### 2. **Leave Approval Workflow**
```
Employee applies → Department Manager reviews → 
HR reviews → Owner/Director final approval → 
Auto-update attendance & leave balance
```

### 3. **Hiring Requisition Workflow**
```
Department Manager creates → 
HR Sourcing reviews (Stage 1) → 
Accounts reviews budget (Stage 2) → 
Owner/Director approves (Stage 3) → 
Job posting created
```

### 4. **Payroll Processing**
```
Mark attendance for month → 
Generate payslips (Accounts) → 
Owner approves → 
Mark as paid → 
Employee can download
```

### 5. **Grievance Handling**
```
Employee files grievance → 
Manager notified → 
HR escalates if needed → 
Owner reviews → 
Resolution & tracking
```

### 6. **Exit Management**
```
Resignation received → 
Notice period tracking → 
Full & Final settlement → 
Document collection → 
Exit clearance → 
Employee status: Separated
```

---

## 🔐 SECURITY

### Authentication
- ✅ JWT tokens (24-hour expiry)
- ✅ Bcrypt password hashing
- ✅ Session management
- ✅ IP-based access tracking
- ✅ Login history

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Company-level data isolation
- ✅ Department-level access control
- ✅ Route protection middleware

### Audit & Compliance
- ✅ Comprehensive audit trail
- ✅ All changes tracked (user, timestamp, IP, changes)
- ✅ Government compliance forms
- ✅ Risk scoring system
- ✅ SOD/EOD reporting for field teams

### Data Protection
- ✅ Sensitive data hashing (passwords, bank details)
- ✅ API validation
- ✅ Rate limiting on authentication
- ✅ CORS enabled for authorized domains

---

## 📱 Dashboard User Interfaces

### Owner Dashboard
- Company overview
- Multi-company statistics
- Approval queue
- Risk alerts
- Financial summary

### HR Dashboard
- Recruitment pipeline
- Leave approvals
- Compliance tracking
- Onboarding status
- Performance analytics

### Employee Dashboard
- Personal profile
- Leave balance
- Attendance history
- Payslips
- Task assignments

### Manager Dashboard
- Team overview
- Attendance management
- Leave approvals
- Team performance
- Task tracking

---

## 🚀 Next Steps

1. **Setup Development Environment**
   - Configure `.env` with your database credentials
   - Run `npm install` and `npm run seed`
   - Start with `npm run dev`

2. **Test All Workflows**
   - Login as different roles
   - Test leave application & approval
   - Create hiring requisitions
   - Generate payslips

3. **Configure Multi-Company**
   - Create multiple companies in settings
   - Assign users to companies
   - Test data isolation

4. **Deploy**
   - Set production environment variables
   - Run `npm run build`
   - Deploy to your hosting platform (Vercel, AWS, etc.)

---

## 📞 Support & Troubleshooting

### Common Issues

**1. MongoDB Connection Error**
```
Error: connect ECONNREFUSED
Solution: Verify MONGODB_URI in .env, ensure MongoDB is running
```

**2. NextAuth Secret Missing**
```
Error: NEXTAUTH_SECRET is missing
Solution: Add NEXTAUTH_SECRET to .env (min 32 characters)
```

**3. Build Failures**
```
Run: npm run build
Check: All environment variables are set
Clear: node_modules and .next folder, then reinstall
```

**4. Leave Balance Not Updating**
```
Check: EmployeeProfile model has leaveBalances field
Verify: Leave creation updates balances correctly
```

---

**System Version**: v1.0  
**Last Updated**: June 2026  
**Maintained By**: Acolyte Systems  
**License**: Proprietary
