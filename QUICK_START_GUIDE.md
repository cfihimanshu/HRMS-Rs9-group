# QUICK START REFERENCE GUIDE

## ⚡ 5-Minute Setup

### Step 1: Install & Configure
```bash
cd '/home/himanshu/Desktop/HR Management'
npm install
```

Create `.env` file with your credentials:
```env
MONGODB_URI=your_database_url
NEXTAUTH_SECRET=your_secret_key_min_32_chars
NEXTAUTH_URL=http://localhost:3000
```

### Step 2: Seed Database
```bash
npm run seed
```

This creates:
- ✅ All user roles
- ✅ Test companies  
- ✅ Test departments
- ✅ Default test users

### Step 3: Start Development
```bash
npm run dev
# Open http://localhost:3000
```

### Step 4: Login with Test Users
```
Owner: owner@acolyte.com / Owner@123
HR: hr@acolyte.com / HR@123
Manager: manager@acolyte.com / Manager@123
Employee: emp@acolyte.com / Emp@123
```

---

## 🎯 Common Tasks

### Task 1: Employee Apply for Leave
```
1. Login as Employee
2. Go to Dashboard → Leave Management
3. Click "Apply New Leave"
4. Select Leave Type: Casual Leave / Sick Leave / Earned Leave / Unpaid Leave
5. Choose Start & End Date
6. Enter Reason
7. Click "Apply"
```

**Status Flow:**
```
Applied (Pending) → Manager Approves → HR Approves → Owner Final Approval → Approved
```

### Task 2: Create Job Opening
```
1. Login as HR Head
2. Go to Recruitment Panel
3. Click "Post New Job"
4. Fill Job Details
   - Title: "Senior Developer"
   - Description & Responsibilities
   - Required Skills
   - Experience (Min/Max)
   - Salary Range
   - Location
   - Positions to Open: 2
5. Set Closing Date
6. Click "Post Job"
```

**Status:** Published → Candidates can apply

### Task 3: Hire a Candidate
```
1. As HR: View candidates for job
2. Click candidate → View Profile
3. Schedule Interview
4. After interview: Mark as "Interview Pass"
5. Create Offer Letter
6. Candidate accepts offer
7. Create Onboarding Checklist
8. Complete all checklist items
9. Employee activated in system
```

### Task 4: Process Payroll
```
1. Login as Accounts
2. Go to Payroll Panel
3. Select Month & Year
4. For each employee:
   - Set Basic Pay, HRA, Allowances
   - Deductions: PF, TDS, PT
   - System calculates Net Pay
5. Submit for Approval
6. Owner approves
7. Payslips visible to employees
```

### Task 5: Mark Attendance
```
As Department Manager:
1. Go to Attendance Panel
2. Select Date
3. For each team member:
   - Mark: Present / Absent / Leave / WFH / Medical
   - If present: Check In/Out time
4. Add remarks if needed
5. Submit attendance
```

### Task 6: Multi-Company Setup
```
1. Create Company 1 via Database
   - Name, Registration Number, Address, Contact
2. Create Departments for Company 1
3. Create Company 2
4. Create Departments for Company 2
5. Create Users and assign to companies
6. User can switch between companies in dashboard
7. All data automatically filtered by company
```

### Task 7: Create Hiring Requisition
```
As Department Manager:
1. Go to Recruitment → Hiring Requisitions
2. Click "Create Requisition"
3. Fill Details:
   - Role: "Senior Developer"
   - Category: "Technology"
   - Quantity: 2
   - Budget Range
   - Skills Required
   - JD, KRA, KPI, SOP
   - Reporting Manager
4. Submit
```

**Approval Flow:**
```
Stage 1: HR Sourcing (HR verifies requirements)
  ↓
Stage 2: Accounts (Verifies budget)
  ↓
Stage 3: Owner/Director (Final approval)
  ↓
Status: Approved → Can post jobs
```

---

## 📊 Role Permissions Quick View

| Action | Owner | HR Head | Manager | Employee |
|--------|-------|---------|---------|----------|
| Apply Leave | ✅ | ✅ | ✅ | ✅ |
| Approve Leave | ✅ | ✅ | ✅* | ✗ |
| Post Job | ✅ | ✅ | ✗ | ✗ |
| Interview Candidate | ✅ | ✅ | ✅* | ✗ |
| Generate Payslip | ✅ | ✗ | ✗ | ✗ |
| View Payslip | ✅ | ✅* | ✅* | ✅** |
| Mark Attendance | ✅ | ✅ | ✅* | ✗ |
| Approve Expense | ✅ | ✅ | ✗ | ✗ |
| View All Employees | ✅ | ✅ | ✅* | ✗ |
| Create Requisition | ✅ | ✅ | ✅ | ✗ |
| Approve Requisition | ✅ | ✅** | ✗ | ✗ |

**Legend:**
- ✅ = Full access
- ✅* = Limited (own department/team)
- ✅** = View only
- ✗ = No access

---

## 🔍 Database Models at a Glance

### Core Employee Data
```
User → EmployeeProfile → Department → Company
User → Attendance
User → Leave
User → Payroll
```

### Recruitment
```
Job ← Candidate ← Interview ← Onboarding ← Training
       ↓
    Verification
```

### Partners
```
Associate (Field Team)
Vendor (Service Provider)
Franchise (Branch Operations)
```

### Compliance
```
AuditLog (All actions tracked)
RiskAlert (Issues flagged)
SodReport (Field team morning plan)
EodReport (Field team end-of-day summary)
```

---

## 🚀 API Endpoints Cheat Sheet

### Core Endpoints
```
POST   /api/auth/callback/credentials      → Login
GET    /api/dashboard/stats                → Dashboard metrics
GET    /api/employees                      → List employees
GET    /api/departments                    → List departments
GET    /api/companies                      → List companies (Owner only)
```

### Employee Self-Service
```
POST   /api/leaves                         → Apply leave
GET    /api/leaves                         → View leave history
POST   /api/expenses                       → Submit expense
GET    /api/payroll                        → View payslips
GET    /api/attendance                     → View attendance
```

### HR Operations
```
POST   /api/jobs                           → Create job
GET    /api/jobs                           → View open jobs
POST   /api/candidates                     → Register candidate
PUT    /api/candidates/[id]                → Update candidate status
POST   /api/interviews                     → Schedule interview
PUT    /api/interviews/[id]                → Submit feedback
POST   /api/onboarding                     → Create checklist
PUT    /api/onboarding/[id]                → Update checklist
```

### Recruitment & Hiring
```
POST   /api/hiring                         → Create requisition
GET    /api/hiring                         → View requisitions
PUT    /api/hiring                         → Approve/forward requisition
```

### Financial
```
GET    /api/payroll                        → View payslips
POST   /api/payroll                        → Generate payslip (Accounts)
GET    /api/expenses                       → View expenses
```

### Reporting
```
GET    /api/reports/sod                    → SOD reports
GET    /api/reports/eod                    → EOD reports
GET    /api/audit-logs                     → Audit trail
GET    /api/alerts                         → Risk alerts
```

---

## 📱 Dashboard Views by Role

### Owner Dashboard Shows:
- All companies overview
- Total employees, jobs, leaves, grievances
- Revenue & payroll expense
- Open risk alerts
- Approval queue
- Consolidated reports

### HR Dashboard Shows:
- Recruitment pipeline (status of all requisitions)
- Hiring status (interviews, offers)
- Leave approvals queue
- Compliance status
- Onboarding checklist
- Training programs

### Department Manager Shows:
- Team overview
- Attendance status (today)
- Leave requests from team
- Team performance
- Pending tasks

### Employee Shows:
- Personal profile
- Leave balance
- Attendance record
- Payslips
- Task assignments
- Grievances status

---

## 🔐 Authentication & Roles

### Login Types
```
Credentials: Email + Password (Most common)
OTP: Mobile + OTP (Alternative)
```

### Session Management
```
JWT Token Valid: 24 hours
Session Expiry: Automatic logout after 24h
Login History: All logins tracked with IP address
```

### Default Credentials
```
Owner:         owner@acolyte.com / Owner@123
HR Head:       hr@acolyte.com / HR@123
Manager:       manager@acolyte.com / Manager@123
Employee:      emp@acolyte.com / Emp@123
Accounts:      accounts@acolyte.com / Accounts@123
Risk Officer:  risk@acolyte.com / Risk@123
```

---

## 📝 Common API Response Formats

### Success Response
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe",
    ...
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Unauthorized access"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 10
}
```

---

## 🐛 Troubleshooting Quick Tips

| Problem | Solution |
|---------|----------|
| 404 on API endpoint | Check URL spelling & parameters |
| 401 Unauthorized | Login again, get fresh token |
| 403 Forbidden | Wrong role, use correct user |
| 500 Server Error | Check MongoDB connection, .env variables |
| Build fails | `npm install` then `npm run build` |
| Port 3000 in use | Kill process: `lsof -ti:3000 \| xargs kill -9` |
| Seed fails | Check MongoDB URI in .env |
| No test data | Run `npm run seed` again |

---

## 📂 Project File Structure

```
HR Management/
├── app/
│   ├── api/              # API Routes (endpoints)
│   │   ├── leaves/
│   │   ├── employees/
│   │   ├── payroll/
│   │   ├── hiring/
│   │   ├── jobs/
│   │   ├── candidates/
│   │   └── ... (37 routes)
│   ├── (dashboard)/      # Dashboard pages
│   ├── (auth)/           # Login page
│   ├── (public)/         # Public pages
│   └── layout.tsx        # Root layout
│
├── components/
│   ├── dashboard/        # Dashboard panels (16 components)
│   └── ui/               # Reusable UI components
│
├── lib/
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # MongoDB connection
│   └── utils.ts          # Helper functions
│
├── models/               # Database schemas (34 models)
│   ├── User.ts
│   ├── Employee.ts
│   ├── Leave.ts
│   ├── Job.ts
│   └── ... (30+ more)
│
├── public/               # Static files
├── package.json
├── .env                  # Environment variables
└── HRMS_COMPLETE_GUIDE.md
```

---

## 🎓 Learning Path

**Day 1: Setup & Authentication**
- [ ] Install dependencies
- [ ] Configure .env
- [ ] Run `npm run seed`
- [ ] Start server
- [ ] Login with test users

**Day 2: Core Features**
- [ ] Test leave application
- [ ] Test attendance marking
- [ ] View payslips
- [ ] Submit expense

**Day 3: Recruitment**
- [ ] Post a job
- [ ] Apply as candidate
- [ ] Schedule interview
- [ ] Mark result

**Day 4: Advanced**
- [ ] Create hiring requisition
- [ ] Follow approval workflow
- [ ] Setup onboarding checklist
- [ ] Test multi-company features

**Day 5: Admin & Deployment**
- [ ] View audit logs
- [ ] Test risk alerts
- [ ] Configure multi-company
- [ ] Prepare for production

---

## 🌐 Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Authentication (required!)
NEXTAUTH_SECRET=min-32-character-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# External Services
GEMINI_API_KEY=your-gemini-api-key-for-ai-features
RS9_API_KEY=your-rs9-sync-key

# File Storage (Cloudinary)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Production (when deploying)
# NEXTAUTH_URL=https://yourdomain.com
```

---

## 📊 Data Volume Guidelines

For optimal performance:

| Entity | Recommended Limit | Notes |
|--------|-------------------|-------|
| Users | 10,000+ | Depends on server capacity |
| Employees | 5,000+ | Per company |
| Jobs | 500+ | Per company |
| Candidates | 100,000+ | MongoDB can handle |
| Audit Logs | 1,000,000+ | Archive old logs quarterly |
| Leave Records | 50,000+ | Per company per year |

---

**Ready to go! Start with Step 1 above and refer back as needed.** ✅
