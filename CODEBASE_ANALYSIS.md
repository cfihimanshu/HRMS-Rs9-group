# HR Management Next.js Codebase Analysis

## System Overview
A comprehensive Next.js-based HR Management System with MongoDB backend, supporting multi-company operations with 15+ user roles, recruitment pipeline, employee management, and risk assessment capabilities.

**Tech Stack:**
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Node.js with Next.js API routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js (JWT-based)
- **File Storage**: Cloudinary
- **Charts**: Recharts

---

## 1. DATABASE MODELS (34 Total Models)

### Core System Models
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **User** | `name`, `email`, `password`, `role`, `companies[]`, `status`, `loginHistory[]` | Central user entity supporting 15 roles with multi-company support |
| **Company** | `name`, `code`, `address`, `status` | Multi-company structure supporting organizational isolation |
| **Department** | `name`, `company`, `status` | Department hierarchy linked to companies |
| **Territory** | `name`, `assignedTo`, `status` | Geographic territory management |
| **Role** | `name`, `permissions[]`, `status` | Role-based access control |

### HR & Employee Models
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **EmployeeProfile** | `user`, `employeeId`, `designation`, `department`, `dateOfJoining`, `salaryStructure`, `leaveBalances` | Detailed employee information with compensation |
| **Attendance** | `employee`, `date`, `status`, `checkIn`, `checkOut` | Daily attendance tracking with clock-in/out |
| **Leave** | `employee`, `type`, `startDate`, `endDate`, `days`, `status`, `approvedBy` | Leave request management with 4 types |
| **Payroll** | `employee`, `month`, `year`, `earnings`, `deductions`, `netPay`, `status` | Monthly payroll processing |
| **Expense** | `employee`, `amount`, `category`, `dateIncurred`, `status`, `approvedBy` | Expense reimbursement tracking |
| **Training** | `candidate`, `trainer`, `status`, `assessments[]` | Onboarding training with daily assessments |
| **Probation** | `employee`, `startDate`, `endDate`, `kpis[]`, `status` | Probation period tracking |
| **ExitRecord** | `employee`, `exitReason`, `assetsReturned`, `accessRevoked`, `finalSettlementStatus` | Employee exit management |

### Recruitment Models
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Job** | `title`, `company`, `department`, `location`, `category`, `salaryRange`, `status` | Job vacancy posting |
| **Candidate** | `job`, `name`, `email`, `qualification`, `experience`, `riskAnswers`, `uploads`, `screeningResult`, `status` | Applicant tracking |
| **Interview** | `candidate`, `round`, `scheduleTime`, `interviewer`, `scores[]`, `status` | Multi-round interview management |
| **Verification** | `candidate`, `aadhaarStatus`, `panStatus`, `addressStatus`, `cibilStatus`, etc. | Background verification tracking |
| **Onboarding** | `candidate`, `category`, `generatedDocs[]`, `signedDocs[]`, `status` | Document generation and signing |
| **HiringRequisition** | `companyName`, `department`, `role`, `category`, `qty`, `jd`, `kra`, `kpi`, `riskLevel`, `status` | Multi-stage hiring approvals |

### Associate & Partner Models
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **Associate** | `user`, `territory`, `leadsGenerated`, `conversionRate`, `riskScore`, `exitRisk`, `flags[]` | Business associate tracking with risk flagging |
| **AssociatePerformance** | `evaluator`, `associateName`, `leads`, `conversion`, `complaint`, `riskFlag` | Performance evaluation logging |
| **Vendor** | `user`, `category`, `agreementUrl`, `paymentTerms`, `riskCategory`, `performanceScore` | Vendor management (12 categories) |
| **VendorRegistration** | `registeredBy`, `vendorName`, `category`, `panGst`, `agreementUrl` | New vendor registration workflow |
| **Franchise** | `user`, `territory`, `revenueSharing`, `leadsGenerated`, `territoryRisk`, `status` | Franchise partner management |
| **FranchiseRegistration** | `registeredBy`, `partnerName`, `territory`, `agreementUrl`, `status` | New franchise registration |

### Reporting & Compliance Models
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **SodReport** | `employee`, `date`, `taskSummary`, `callsPlanned`, `fieldVisits`, `target`, `location` | Start-of-Day reporting |
| **EodReport** | `employee`, `date`, `completedWork`, `pendingWork`, `issues`, `tomorrowPlan`, `location` | End-of-Day reporting with geolocation |
| **TaskLog** | `employee`, `date`, `taskTitle`, `taskType`, `status` | Daily task tracking |
| **Grievance** | `raisedBy`, `category`, `priority`, `anonymous`, `assignedTo`, `status` | Employee grievance management |
| **ExitForm** | `submittedBy`, `name`, `category`, `exitReason`, `assetReturn`, `postExitRisk` | Exit form submission |

### Risk & Compliance Models
| Model | Key Fields | Purpose |
|-------|-----------|---------|
| **RiskAlert** | `source`, `level`, `description`, `triggeredBy`, `status` | System-wide risk alerting |
| **AuditLog** | `user`, `action`, `entity`, `entityId`, `details`, `ipAddress`, `timestamp` | Comprehensive audit trail |
| **Notification** | `recipient`, `title`, `message`, `read` | User notifications |

---

## 2. USER ROLES & AUTHENTICATION (15 Roles)

### Role Hierarchy
```
1. Owner              - Full system access
2. Director          - Business unit oversight
3. HR Head           - HR department head
4. HR Executive      - HR operations
5. Department Manager - Department oversight
6. DSM               - District Sales Manager
7. Trainer           - Training delivery
8. Accounts          - Finance/Payroll
9. IT Admin          - System administration
10. Employee         - Staff member
11. Business Associate - Sales/field associate
12. Vendor           - Third-party service provider
13. Franchisee       - Franchise partner
14. Territory Partner - Regional partner
15. RIBP / Risk Officer - Risk management
```

### Authentication Flow
**Method**: Credentials Provider (NextAuth.js)
- **Login Types**: 
  - Password-based (email + password)
  - OTP-based (mobile + OTP)
- **Session Strategy**: JWT with 24-hour max age
- **Password Hashing**: bcryptjs
- **Login Tracking**: IP address and user-agent logging
- **Audit Logging**: All logins recorded in AuditLog

**Authentication Configuration** (`/lib/auth.ts`):
- Supports both password and OTP login
- Session callback enriches JWT with user role
- Login history persisted to User model
- Redirects unauthorized users to `/login`

---

## 3. API ENDPOINTS (37 Routes)

### Authentication
| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/api/auth/[...nextauth]` | POST | NextAuth.js provider |

### Employee Management
| Endpoint | Methods | Purpose | Auth Level |
|----------|---------|---------|------------|
| `/api/employees` | GET, POST | List/create employees | HR roles |
| `/api/attendance` | GET, POST | Track daily attendance & clock in/out | Employee |
| `/api/leaves` | POST, GET | Apply for/manage leaves | Employee |
| `/api/payroll` | GET, POST | Process & retrieve payroll | Accounts/HR |
| `/api/expenses` | GET, POST | File/approve expenses | Employee/Manager |
| `/api/tasks` | GET, POST | Log daily tasks | Employee |
| `/api/grievances` | GET, POST | File & manage grievances | Employee/HR |

### Recruitment Pipeline
| Endpoint | Methods | Purpose | Auth Level |
|----------|---------|---------|------------|
| `/api/jobs` | GET, POST, PUT, DELETE | Job postings | Public (GET), HR (POST+) |
| `/api/candidates` | POST, GET | Candidate applications | Public (POST), HR (GET) |
| `/api/candidates/[id]` | PUT | Update candidate status | HR roles |
| `/api/candidates/screen` | POST | AI-powered candidate screening | HR |
| `/api/interviews` | GET, POST, PUT | Interview management | HR/Interviewers |
| `/api/verifications` | GET, POST | Background verification tracking | HR/Compliance |
| `/api/onboarding` | GET, POST | Document management | HR |
| `/api/trainings` | GET, POST, PUT | Training delivery | Trainer/HR |
| `/api/probation` | GET, POST, PUT | Probation management | HR |

### Partner Management
| Endpoint | Methods | Purpose | Auth Level |
|----------|---------|---------|------------|
| `/api/associates` | GET, POST | Associate management | DSM/HR |
| `/api/vendors` | GET, POST | Vendor management | HR |
| `/api/franchises` | GET, POST | Franchise management | HR |

### Reporting & Compliance
| Endpoint | Methods | Purpose | Auth Level |
|----------|---------|---------|------------|
| `/api/reports/sod` | GET, POST | Start-of-Day reports | Employee |
| `/api/reports/eod` | GET, POST | End-of-Day reports | Employee |
| `/api/reports/form9` | GET, POST | Form 9 (Deduction Details) | HR/Compliance |
| `/api/reports/form10` | GET, POST | Form 10 (Contractor Info) | HR/Compliance |
| `/api/reports/form11` | GET, POST | Form 11 (PF Declaration) | HR/Compliance |
| `/api/reports/form13` | GET, POST | Form 13 (PF Settlement) | HR/Compliance |

### System Management
| Endpoint | Methods | Purpose | Auth Level |
|----------|---------|---------|------------|
| `/api/companies` | GET | List active companies | Public |
| `/api/departments` | GET | List departments | Public |
| `/api/hiring` | GET, POST | Hiring requisitions | HR |
| `/api/hiring/generate-jd` | POST | AI-generated job descriptions | HR |
| `/api/alerts` | GET, POST | Risk alerts | HR/Risk Officer |
| `/api/dashboard/stats` | GET | Dashboard statistics | Authenticated |
| `/api/documents/upload` | POST | File uploads (Cloudinary) | Authenticated |
| `/api/documents/download` | GET | File downloads | Authenticated |
| `/api/rs9-sync` | POST | RS9 government sync | Admin |
| `/api/seed` | POST | Database seeding | Dev/Admin |

---

## 4. MULTI-COMPANY SUPPORT IMPLEMENTATION

### Multi-Company Architecture
1. **User-Company Relationship**:
   - Users store `companies: ObjectId[]` array
   - Single user can belong to multiple companies
   - Enables cross-company access for Directors/Owners

2. **Company-Scoped Resources**:
   - Department linked to specific company
   - Job postings associated with company
   - Payroll processed per company
   - Compliance reports organized by company

3. **Data Isolation**:
   - Most queries filter by company context
   - Department cascade: User → Company → Department
   - Candidates linked to Jobs → linked to Company

4. **Multi-Tenant Considerations**:
   - No hard enforcement of company isolation (shared collections)
   - Role-based access provides logical separation
   - HR Head can see own company employees
   - Owner/Director can see all companies

---

## 5. COMPONENT STRUCTURE

### Dashboard Components
Located in `/components/dashboard/`:

| Component | Purpose | Audience |
|-----------|---------|----------|
| **Sidebar.tsx** | Navigation with role-based menu | All roles |
| **Topbar.tsx** | Header with user profile & notifications | All roles |
| **StatCard.tsx** | KPI/metric display cards | Dashboards |
| **ActivityFeed.tsx** | Recent activities log | All dashboards |
| **OverviewPanels.tsx** | Company-wide metrics & overview | Owner/Director |
| **EmployeePanels.tsx** | Employee-related statistics | HR roles |
| **HRPanels.tsx** | HR operations dashboard | HR roles |
| **RecruitmentPanels.tsx** | Hiring pipeline metrics | HR/Recruiters |
| **OnboardingPanels.tsx** | Onboarding progress tracking | HR |
| **ESSPanels.tsx** | Employee self-service info | Employees |
| **OpsPanels.tsx** | Operations metrics | Operations roles |
| **PartnersPanels.tsx** | Associate/Vendor/Franchise stats | Management |
| **CompliancePanels.tsx** | Compliance tracking | Compliance roles |
| **PerformanceChart.tsx** | Performance visualizations | All roles |
| **AttendanceChart.tsx** | Attendance trends | HR/Managers |
| **KanbanBoard.tsx** | Hiring pipeline kanban | HR |
| **HiringRequisitionModal.tsx** | Hiring request form | HR |

### UI Components
Located in `/components/ui/`:
- `button.tsx`, `card.tsx`, `field.tsx`, `input.tsx`, `label.tsx`
- `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `skeleton.tsx`
- `textarea.tsx`, `tooltip.tsx`

---

## 6. DASHBOARD ROUTES

### Page Structure
```
/app/(auth)/
  ├── login/page.tsx              - Login page
  └── unauthorized/page.tsx       - Unauthorized access page

/app/(dashboard)/
  ├── dashboard/page.tsx          - Owner Dashboard
  ├── hr/page.tsx                 - HR Dashboard
  ├── owner/page.tsx              - Owner specific views
  │   └── dashboard/              - Owner analytics
  └── dashboard/page.tsx          - Shared dashboard

/app/(public)/
  └── apply/page.tsx              - Public job application form

/app/jobs/
  └── apply/                       - Job application flow
```

---

## 7. KEY FEATURES & WORKFLOWS

### Recruitment Pipeline
1. **Job Creation** → Hiring Requisition Approval → Job Posted
2. **Candidate Application** → AI Screening → Verification
3. **Interviews** → Multi-round assessment (3 rounds)
4. **Onboarding** → Document generation & signing
5. **Training** → 3-day assessment → Activation

### Employee Lifecycle
1. **Onboarding** → Employee Profile creation
2. **Attendance Tracking** → Daily check-in/out
3. **Leave Management** → Balance validation & approval
4. **Performance Tracking** → KPI-based assessment
5. **Probation** → 3-month confirmation period
6. **Exit Management** → Exit form & settlement

### Risk Management
- **Risk Scoring**: Associates/Franchises/Vendors assessed
- **Automated Alerts**: Risk flags trigger notifications
- **Compliance Tracking**: Form 9/10/11/13 for statutory requirements
- **Audit Trail**: All actions logged with user, IP, timestamp

### Reporting System
- **SOD Reports**: Morning task planning & commitments
- **EOD Reports**: Evening summary of completed/pending work
- **Geolocation**: Field visit tracking with coordinates
- **Government Forms**: Form 9/10/11/13 for regulatory compliance

---

## 8. SECURITY & PERMISSIONS

### Permission Levels by Role
- **Owner**: Full system access
- **Director**: Multi-company oversight, approval authority
- **HR Head**: Complete HR operations
- **HR Executive**: HR operations execution
- **Department Manager**: Departmental oversight
- **Accounts**: Payroll & expense processing
- **Employee**: ESS (Leave, Payslips, Expenses)
- **DSM/Franchisee/Vendor**: Partner portal access
- **Risk Officer**: Risk alert management

### Security Features
- JWT-based session management (24-hour expiry)
- Bcrypt password hashing
- IP logging for login attempts
- Comprehensive audit trail
- Role-based route protection
- Optional OTP login for additional security

---

## 9. DATA RELATIONSHIPS

### Primary Entity Links
```
User
├── EmployeeProfile (1:1)
├── Company (N:N)
├── Leave (1:N)
├── Attendance (1:N)
├── Payroll (1:N)
├── Expense (1:N)
├── Associates (1:1)
├── Vendors (1:1)
├── Franchise (1:1)
└── AuditLog (1:N)

Candidate
├── Job (N:1)
├── Interview (1:N)
├── Verification (1:1)
├── Training (1:1)
├── Onboarding (1:1)
└── Leave (N:1)

Company
├── Department (1:N)
├── Job (1:N)
├── Territory (1:N)
└── User (N:N)
```

---

## 10. TECHNOLOGY & ARCHITECTURE NOTES

### Backend Architecture
- **Framework**: Next.js API routes
- **Database**: MongoDB with Mongoose schema validation
- **File Storage**: Cloudinary integration for document uploads
- **Async Processing**: Webhook callbacks for long-running operations

### Frontend Architecture
- **State Management**: React hooks + session context
- **Styling**: Tailwind CSS with custom components
- **Charts**: Recharts for data visualization
- **Forms**: HTML5 + custom validation
- **UI Library**: Shadcn components + Lucide icons

### Scalability Considerations
- Multi-company support allows multi-tenant deployment
- Indexed queries on frequently filtered fields (date, employee, status)
- Pagination recommended for large datasets
- Audit logging may need archival strategy

---

## 11. INTEGRATION POINTS

- **NextAuth.js**: Authentication & session management
- **Cloudinary**: Document & image storage
- **MongoDB**: Data persistence
- **Recharts**: Analytics & reporting
- **Bcryptjs**: Password security
- **Lucide-react**: Icon library

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Database Models** | 34 |
| **User Roles** | 15 |
| **API Endpoints** | 37 |
| **Dashboard Components** | 16 |
| **UI Components** | 11 |
| **Pages/Routes** | 12+ |

This is an enterprise-grade HR platform capable of managing employees, recruitment, compliance, and partner relationships across multiple companies with comprehensive risk assessment and audit capabilities.
