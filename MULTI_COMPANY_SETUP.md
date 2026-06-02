# MULTI-COMPANY SETUP & CONFIGURATION GUIDE

## Quick Setup for Multiple Companies

### 1. Initial Database Structure
```javascript
// Your companies will have this structure:
Company 1: "Acolyte Technologies"
├─ Department 1: "Engineering"
│  ├─ Employees: 50
│  └─ Jobs: 5 open positions
├─ Department 2: "Sales"
│  ├─ Employees: 30
│  └─ Jobs: 3 open positions
└─ Department 3: "HR"
   ├─ Employees: 5
   └─ Jobs: 1 open position

Company 2: "Acolyte Services"
├─ Department 1: "Operations"
│  ├─ Employees: 25
│  └─ Jobs: 2 open positions
└─ Department 2: "Support"
   ├─ Employees: 15
   └─ Jobs: 0 open positions
```

### 2. Creating Multiple Companies (Admin Setup)

**Step 1: Create Companies in Database**
```javascript
// Go to MongoDB Compass or your MongoDB management tool
// Insert into 'companies' collection:

{
  "name": "Acolyte Technologies",
  "registrationNumber": "AAL-TECH-001",
  "industry": "IT Services",
  "headOffice": {
    "street": "123 Tech Park",
    "city": "Bangalore",
    "state": "Karnataka",
    "zip": "560001",
    "country": "India"
  },
  "contactEmail": "info@acolyte-tech.com",
  "phone": "+91-80-XXXX-XXXX",
  "website": "www.acolyte-tech.com",
  "logo": "https://cdn.example.com/logo.png",
  "totalEmployees": 0,
  "status": "Active",
  "createdAt": new Date(),
  "updatedAt": new Date()
}

{
  "name": "Acolyte Services",
  "registrationNumber": "AAL-SRV-001",
  "industry": "Business Services",
  "headOffice": {
    "street": "456 Business Plaza",
    "city": "Delhi",
    "state": "Delhi",
    "zip": "110001",
    "country": "India"
  },
  "contactEmail": "info@acolyte-services.com",
  "phone": "+91-11-XXXX-XXXX",
  "website": "www.acolyte-services.com",
  "logo": "https://cdn.example.com/logo2.png",
  "totalEmployees": 0,
  "status": "Active",
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

**Step 2: Create Departments for Each Company**
```javascript
// Engineering Department (Acolyte Technologies)
{
  "name": "Engineering",
  "company": ObjectId("company1_id"),
  "head": ObjectId("tech_head_user_id"),
  "budget": 500000,
  "costCenter": "ENG-001",
  "status": "Active"
}

// Operations Department (Acolyte Services)
{
  "name": "Operations",
  "company": ObjectId("company2_id"),
  "head": ObjectId("ops_head_user_id"),
  "budget": 300000,
  "costCenter": "OPS-001",
  "status": "Active"
}
```

**Step 3: Assign Users to Companies**
```javascript
// Update user document - User can belong to multiple companies
{
  "name": "Rajesh Kumar",
  "email": "rajesh@acolyte-tech.com",
  "companies": [
    ObjectId("company1_id"),  // Acolyte Technologies
    ObjectId("company2_id")   // Acolyte Services
  ],
  "role": "Owner",
  "department": ObjectId("dept1_id"),
  "status": "Active"
}

// A Department Manager only for one company:
{
  "name": "Priya Singh",
  "email": "priya@acolyte-tech.com",
  "companies": [
    ObjectId("company1_id")  // Only Acolyte Technologies
  ],
  "role": "Department Manager",
  "department": ObjectId("engineering_dept_id"),
  "status": "Active"
}
```

### 3. User Login & Company Selection Flow

**User sees this after login:**
```
Welcome, Rajesh Kumar

Select your company:
┌─────────────────────────────────────┐
│ ☑ Acolyte Technologies (Current)    │
│ ○ Acolyte Services                  │
│                                     │
│ [Switch Company] [Continue]         │
└─────────────────────────────────────┘
```

**Session now contains:**
```javascript
session = {
  user: {
    id: "user_id",
    name: "Rajesh Kumar",
    email: "rajesh@acolyte-tech.com",
    role: "Owner",
    company: "company1_id",           // Current active company
    companies: ["company1_id", "company2_id"], // All accessible companies
    department: "dept_id"
  },
  expires: "2026-06-02T10:00:00Z"
}
```

### 4. API Filtering by Company

**Example 1: Get all employees for current company**
```javascript
// app/api/employees/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Automatically filter by user's current company
  const filter = { company: session.user.company };
  
  const employees = await EmployeeProfile.find(filter)
    .populate("user", "name email")
    .populate("department");
    
  return NextResponse.json({ success: true, data: employees });
}
```

**Example 2: Get leaves for current company**
```javascript
// app/api/leaves/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Department Manager sees only their department
  // HR/Owner sees all company leaves
  const filter = session.user.role === "Department Manager"
    ? { 
        department: session.user.department,
        company: session.user.company 
      }
    : { 
        company: session.user.company 
      };
  
  const leaves = await Leave.find(filter);
  return NextResponse.json({ success: true, data: leaves });
}
```

**Example 3: Create hiring requisition**
```javascript
// app/api/hiring/route.ts
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  const body = await req.json();
  
  const requisition = new HiringRequisition({
    ...body,
    company: session.user.company,        // Auto-assign current company
    department: body.department,
    createdBy: session.user.name,
    status: "Pending HR Sourcing Review"
  });
  
  await requisition.save();
  return NextResponse.json({ success: true, data: requisition });
}
```

### 5. Dashboard Showing Multiple Companies

**Component: CompanySelector**
```typescript
// components/CompanySelector.tsx
import { useSession } from "next-auth/react";
import { useState } from "react";

export default function CompanySelector() {
  const { data: session } = useSession();
  const [selectedCompany, setSelectedCompany] = useState(session?.user?.company);

  const switchCompany = async (companyId: string) => {
    // Call API to switch company
    const res = await fetch("/api/auth/switch-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId })
    });
    
    if (res.ok) {
      window.location.reload(); // Reload to refresh all data
    }
  };

  return (
    <div className="company-selector">
      <select value={selectedCompany} onChange={(e) => switchCompany(e.target.value)}>
        {session?.user?.companies?.map((company) => (
          <option key={company._id} value={company._id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 6. Dashboard Metrics by Company

**Owner seeing all companies:**
```javascript
Owner Dashboard:

Companies Overview
┌─────────────────────────────────────────────┐
│ Total Companies: 2                          │
│                                             │
│ Acolyte Technologies                        │
│ ├─ Employees: 85                            │
│ ├─ Active Jobs: 5                           │
│ ├─ Pending Leaves: 8                        │
│ └─ Open Grievances: 1                       │
│                                             │
│ Acolyte Services                            │
│ ├─ Employees: 40                            │
│ ├─ Active Jobs: 2                           │
│ ├─ Pending Leaves: 3                        │
│ └─ Open Grievances: 0                       │
└─────────────────────────────────────────────┘

Group Analytics
├─ Total Revenue: ₹2.5 Cr
├─ Total Employees: 125
├─ Payroll Expense: ₹42 L
└─ Risk Alerts: 2
```

**Department Manager seeing only their company:**
```javascript
Department Manager Dashboard:

Company: Acolyte Technologies
Department: Engineering

Team Overview
├─ Team Size: 50
├─ Present Today: 48
├─ On Leave: 1
├─ Pending Approvals: 5
└─ Grievances: 0

Leave Requests (This Month)
├─ Pending: 3
├─ Approved: 5
└─ Rejected: 1
```

### 7. API Endpoints with Company Filtering

**All endpoints automatically handle company filtering:**

```javascript
// 1. Get employees
GET /api/employees
Query: ?company=comp_id (optional, uses session company if not provided)
Response: Employees from selected company only

// 2. Get leaves
GET /api/leaves
Response: Leaves from selected company only

// 3. Get jobs
GET /api/jobs
Response: Jobs from selected company only

// 4. Get payroll
GET /api/payroll
Response: Payslips from selected company only

// 5. Get departments
GET /api/departments
Response: Departments of selected company only

// 6. Create hiring requisition
POST /api/hiring
Body: { role, category, qty, ... }
Auto-added: company: session.user.company

// 7. View audit logs by company
GET /api/audit-logs
Query: ?company=comp_id
Response: Audit trail for selected company only
```

### 8. Data Isolation Verification

**Before Deploying, Verify:**

```javascript
// ✅ Test 1: Department Manager can't see other company
const emp1Company = await EmployeeProfile.find({ 
  department: deptManagerDept 
});
// Should only show employees from their assigned company

// ✅ Test 2: HR from Company A can't see Company B employees
const comp1Employees = await EmployeeProfile.find({ 
  company: company1Id 
});
// Should not include any company2 employees

// ✅ Test 3: Owner can see all companies
const allEmployees = await EmployeeProfile.find({});
// Should show employees from all companies when not filtered

// ✅ Test 4: Session company filtering works
// Login as user, verify session.user.company is set correctly
// Check that all API calls filter by this company
```

### 9. Audit Trail by Company

```javascript
// View who did what in each company
GET /api/audit-logs?company=comp1_id&startDate=2026-06-01&endDate=2026-06-30

Response: [
  {
    action: "CREATE",
    entity: "Leave",
    entityId: "leave_id",
    userId: "emp_id",
    user: "Rahul Kumar",
    changes: { before: {}, after: {type: "Casual Leave", days: 2} },
    timestamp: "2026-06-01T10:30:00Z",
    ipAddress: "192.168.1.100",
    company: "comp1_id"
  },
  // More records...
]
```

### 10. Reports by Company

**Owner can view consolidated reports:**

```javascript
Reports Menu:
├─ Payroll Report (All Companies)
│  ├─ Total Payroll: ₹42,50,000
│  ├─ By Company
│  │  ├─ Acolyte Technologies: ₹28,50,000
│  │  └─ Acolyte Services: ₹14,00,000
│  └─ Export: PDF, Excel
│
├─ Recruitment Report
│  ├─ Total Positions Open: 7
│  ├─ Total Applications: 156
│  └─ Hiring Status
│     ├─ Acolyte Technologies: 5 open, 98 applications
│     └─ Acolyte Services: 2 open, 58 applications
│
└─ Compliance Report
   ├─ Risk Alerts: 2
   ├─ By Company
   │  ├─ Acolyte Technologies: 1 alert
   │  └─ Acolyte Services: 1 alert
   └─ Audit Trail: 2,450 entries
```

---

## Testing Multi-Company Setup

### Test Case 1: Create Employee in Company 1
```bash
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Amit Patel",
    "email": "amit@acolyte-tech.com",
    "department": "dept_id_1",
    "designation": "Senior Developer"
  }'

# Response should include:
# company: "company1_id"
```

### Test Case 2: Department Manager Can't See Other Company
```bash
# Login as Department Manager (Company 1)
# Check GET /api/employees
# Should only return employees from Company 1

# If Manager tries to access Company 2 data:
# Expected: 403 Forbidden or empty result
```

### Test Case 3: Owner Can See All Companies
```bash
# Login as Owner
# Access dashboard
# Should show:
# - All companies
# - All employees
# - All jobs
# - Consolidated metrics
```

### Test Case 4: Switch Company
```bash
# Login as user with access to multiple companies
# Call POST /api/auth/switch-company
# Verify session.user.company is updated
# All subsequent API calls use new company
```

---

## Environment Setup Checklist

- [ ] Create all companies in MongoDB
- [ ] Create departments for each company
- [ ] Create test users with company assignments
- [ ] Assign users to correct roles
- [ ] Test login with different users
- [ ] Verify company filtering in all APIs
- [ ] Test data isolation
- [ ] Setup company logos/branding
- [ ] Configure company-specific settings
- [ ] Test multi-company reports

---

**Ready to deploy with multi-company support!**
