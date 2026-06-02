# API TESTING GUIDE - POSTMAN/CURL COMMANDS

## Setup: Get Your Bearer Token

### 1. Login to Get Token
```bash
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@acolyte.com",
    "password": "Owner@123"
  }'

# Response:
# {
#   "success": true,
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }
```

Save the token for all subsequent requests:
```bash
TOKEN="your_token_here"
```

---

## 🧪 TEST SCENARIOS

### SCENARIO 1: Employee Leave Management

#### 1.1 Apply for Leave
```bash
curl -X POST http://localhost:3000/api/leaves \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Casual Leave",
    "startDate": "2026-06-10",
    "endDate": "2026-06-11",
    "days": 2,
    "reason": "Personal work"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "leave_id_123",
#     "employee": "emp_id",
#     "type": "Casual Leave",
#     "status": "Pending",
#     "days": 2
#   }
# }
```

#### 1.2 Get Leave History
```bash
curl -X GET http://localhost:3000/api/leaves \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": [
#     {
#       "_id": "leave_id",
#       "employee": "emp_id",
#       "type": "Casual Leave",
#       "startDate": "2026-06-10",
#       "endDate": "2026-06-11",
#       "status": "Pending",
#       "reason": "Personal work"
#     }
#   ]
# }
```

#### 1.3 Manager Approves Leave (As Department Manager)
```bash
curl -X PUT http://localhost:3000/api/leaves \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "leave_id_123",
    "status": "Approved",
    "remarks": "Approved by manager"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "status": "Pending HR Review",
#     "approvalChain": [
#       {
#         "role": "DepartmentManager",
#         "approvedBy": "manager_name",
#         "status": "Approved"
#       }
#     ]
#   }
# }
```

---

### SCENARIO 2: Recruitment Pipeline

#### 2.1 Create Hiring Requisition (Department Manager)
```bash
curl -X POST http://localhost:3000/api/hiring \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Senior Developer",
    "category": "Technology",
    "qty": 2,
    "experience": {
      "min": 3,
      "max": 5
    },
    "skills": ["JavaScript", "React", "Node.js"],
    "budget": {
      "min": 600000,
      "max": 1000000
    },
    "jd": "Responsible for developing web applications...",
    "kra": "Deliver high-quality code, meet deadlines",
    "kpi": "Code review score > 80%, 0 critical bugs",
    "reportingManager": "manager_id"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "requisition_id",
#     "role": "Senior Developer",
#     "status": "Pending HR Sourcing Review",
#     "qty": 2
#   }
# }
```

#### 2.2 HR Reviews and Forwards to Accounts
```bash
curl -X PUT http://localhost:3000/api/hiring \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "requisition_id",
    "status": "Pending Accounts Review",
    "remarks": "Approved. High priority. Budget allocated: ₹20,00,000"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "status": "Pending Accounts Review",
#     "approvalChain": [
#       {
#         "stage": "HR Sourcing",
#         "status": "Approved",
#         "remarks": "Approved. High priority..."
#       }
#     ]
#   }
# }
```

#### 2.3 Accounts Reviews and Forwards to Owner
```bash
curl -X PUT http://localhost:3000/api/hiring \
  -H "Authorization: Bearer $ACCOUNTS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "requisition_id",
    "status": "Pending Owner Approval",
    "remarks": "Budget approved. Ready for hiring."
  }'
```

#### 2.4 Owner Approves and Job Posted
```bash
curl -X PUT http://localhost:3000/api/hiring \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "requisition_id",
    "status": "Approved",
    "remarks": "Final approval granted"
  }'

# After this, job should be automatically posted
```

#### 2.5 Post a Job
```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Developer",
    "description": "We are looking for...",
    "responsibilities": [
      "Develop web applications",
      "Review code of team members",
      "Participate in architecture discussions"
    ],
    "requiredSkills": ["JavaScript", "React", "Node.js", "MongoDB"],
    "experience": {
      "min": 3,
      "max": 5
    },
    "salary": {
      "min": 600000,
      "max": 1000000,
      "currency": "INR"
    },
    "location": "Bangalore",
    "employmentType": "Full-time",
    "noOfPositions": 2,
    "closingDate": "2026-07-01"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "job_id",
#     "title": "Senior Developer",
#     "status": "Published"
#   }
# }
```

#### 2.6 Get All Open Jobs
```bash
curl -X GET http://localhost:3000/api/jobs \
  -H "Authorization: Bearer $TOKEN"

# Query Parameters:
# ?status=Published
# ?company=comp_id
# ?department=dept_id

# Expected Response:
# {
#   "success": true,
#   "data": [
#     {
#       "_id": "job_id",
#       "title": "Senior Developer",
#       "status": "Published",
#       "candidates": 0,
#       "location": "Bangalore"
#     }
#   ]
# }
```

#### 2.7 Candidate Applies for Job
```bash
curl -X POST http://localhost:3000/api/candidates \
  -H "Authorization: Bearer $CANDIDATE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rahul Sharma",
    "email": "rahul.sharma@gmail.com",
    "mobile": "9876543210",
    "job": "job_id",
    "resume": "https://cdn.example.com/resume.pdf",
    "currentCompany": "Tech Corp",
    "currentDesignation": "Developer",
    "experience": 4,
    "salaryExpected": 750000,
    "noticePeriod": 30,
    "source": "LinkedIn"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "candidate_id",
#     "name": "Rahul Sharma",
#     "job": "job_id",
#     "status": "Applied"
#   }
# }
```

#### 2.8 HR Screens Candidate
```bash
curl -X PUT http://localhost:3000/api/candidates/candidate_id \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Screening",
    "rating": 4,
    "screeningRemarks": "Good profile, strong technical skills"
  }'
```

#### 2.9 Schedule Interview
```bash
curl -X POST http://localhost:3000/api/interviews \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate": "candidate_id",
    "job": "job_id",
    "type": "Round-1-HR",
    "scheduledDate": "2026-06-15T10:00:00Z",
    "interviewer": "hr_user_id",
    "meetingLink": "https://zoom.us/j/meeting123"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "interview_id",
#     "candidate": "candidate_id",
#     "type": "Round-1-HR",
#     "scheduledDate": "2026-06-15T10:00:00Z"
#   }
# }
```

#### 2.10 Submit Interview Feedback
```bash
curl -X PUT http://localhost:3000/api/interviews/interview_id \
  -H "Authorization: Bearer $INTERVIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackRating": 4,
    "feedbackComments": "Good communication, solid technical knowledge",
    "result": "Pass"
  }'
```

---

### SCENARIO 3: Payroll Management

#### 3.1 Get Payslips (Employee View)
```bash
curl -X GET "http://localhost:3000/api/payroll?month=6&year=2026" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": [
#     {
#       "_id": "payslip_id",
#       "month": 6,
#       "year": 2026,
#       "basicPay": 50000,
#       "hra": 10000,
#       "conveyance": 1000,
#       "totalEarnings": 61000,
#       "pfDeduction": 1800,
#       "ptDeduction": 0,
#       "tdsDeduction": 0,
#       "totalDeductions": 1800,
#       "netPay": 59200,
#       "status": "Processed"
#     }
#   ]
# }
```

#### 3.2 Generate Payslip (Accounts Role)
```bash
curl -X POST http://localhost:3000/api/payroll \
  -H "Authorization: Bearer $ACCOUNTS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp_id",
    "month": 6,
    "year": 2026,
    "basicPay": 50000,
    "hra": 10000,
    "conveyance": 1000,
    "specialAllowance": 0,
    "pfDeduction": 1800,
    "ptDeduction": 0,
    "tdsDeduction": 0
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "payslip_id",
#     "month": 6,
#     "year": 2026,
#     "netPay": 59200,
#     "status": "Processed"
#   }
# }
```

---

### SCENARIO 4: Attendance & EOD/SOD Reports

#### 4.1 Mark Attendance
```bash
curl -X POST http://localhost:3000/api/attendance \
  -H "Authorization: Bearer $MANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee": "emp_id",
    "date": "2026-06-01",
    "status": "Present",
    "checkIn": "2026-06-01T09:00:00Z",
    "checkOut": "2026-06-01T17:30:00Z",
    "geoLocation": {
      "latitude": 12.9716,
      "longitude": 77.5946
    }
  }'
```

#### 4.2 Submit SOD Report (Start of Day)
```bash
curl -X POST http://localhost:3000/api/reports/sod \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "Meet 5 clients, attend team meeting",
    "callsPlanned": 8,
    "meetings": 2,
    "fieldVisits": 3
  }'
```

#### 4.3 Submit EOD Report (End of Day)
```bash
curl -X POST http://localhost:3000/api/reports/eod \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "completedWork": "Met 4 clients, pending one reschedule",
    "tasksCompleted": 5,
    "achievementPercent": 85,
    "issuesFaced": "Traffic delayed field visit",
    "escalationRequired": false
  }'
```

---

### SCENARIO 5: Expenses

#### 5.1 Submit Expense Claim
```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "category": "Travel",
    "dateIncurred": "2026-05-30",
    "description": "Cab fare for client meeting in Whitefield",
    "receiptUrl": "https://cdn.example.com/receipt.pdf"
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "expense_id",
#     "amount": 5000,
#     "status": "Pending"
#   }
# }
```

#### 5.2 Get All Expenses (As Manager)
```bash
curl -X GET http://localhost:3000/api/expenses \
  -H "Authorization: Bearer $MANAGER_TOKEN"

# Manager sees: Own expenses + Team member expenses
```

#### 5.3 Approve Expense (As Accounts)
```bash
curl -X PUT http://localhost:3000/api/expenses/expense_id \
  -H "Authorization: Bearer $ACCOUNTS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Approved"
  }'
```

---

### SCENARIO 6: Onboarding

#### 6.1 Create Onboarding Checklist
```bash
curl -X POST http://localhost:3000/api/onboarding \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "candidate": "candidate_id",
    "offerletter": "https://cdn.example.com/offer_letter.pdf",
    "joiningDate": "2026-07-01",
    "items": [
      "Issue Employee ID",
      "System Setup (Laptop, Email, VPN)",
      "Office Access Card",
      "Insurance Enrollment",
      "Policy Acknowledgment",
      "Training Schedule"
    ]
  }'

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "_id": "onboarding_id",
#     "items": [
#       {
#         "name": "Issue Employee ID",
#         "completed": false
#       },
#       ...
#     ]
#   }
# }
```

#### 6.2 Mark Onboarding Item Complete
```bash
curl -X PUT http://localhost:3000/api/onboarding/onboarding_id \
  -H "Authorization: Bearer $HR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "itemIndex": 0,
    "completed": true
  }'
```

---

### SCENARIO 7: Dashboard Analytics

#### 7.1 Get Dashboard Stats
```bash
curl -X GET http://localhost:3000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": {
#     "totalEmployees": 150,
#     "activeJobs": 5,
#     "pendingLeaves": 12,
#     "pendingApprovals": 8,
#     "openGrievances": 3,
#     "riskAlerts": 2,
#     "payrollPending": 1,
#     "onboardingInProgress": 3
#   }
# }
```

#### 7.2 Get Audit Logs
```bash
curl -X GET "http://localhost:3000/api/audit-logs?startDate=2026-06-01&endDate=2026-06-30" \
  -H "Authorization: Bearer $OWNER_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "data": [
#     {
#       "action": "CREATE",
#       "entity": "Leave",
#       "entityId": "leave_id",
#       "userId": "emp_id",
#       "changes": {
#         "before": {},
#         "after": {"type": "Casual Leave", "days": 2}
#       },
#       "timestamp": "2026-06-01T10:30:00Z",
#       "ipAddress": "192.168.1.100"
#     }
#   ]
# }
```

---

## 🔧 Troubleshooting API Calls

### Common Errors & Solutions

**Error: 401 Unauthorized**
```bash
# Problem: Invalid or expired token
# Solution: Login again and get a fresh token
curl -X POST http://localhost:3000/api/auth/callback/credentials \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@acolyte.com", "password": "Owner@123"}'
```

**Error: 403 Forbidden**
```bash
# Problem: User doesn't have permission for this action
# Solution: Use correct role/user
# - Only HR can approve from HR Sourcing stage
# - Only Accounts can approve to Owner
# - Only Department Manager can mark attendance for their team
```

**Error: 404 Not Found**
```bash
# Problem: Resource doesn't exist
# Solution: Check the ID is correct
curl -X GET "http://localhost:3000/api/leaves/invalid_id" \
  -H "Authorization: Bearer $TOKEN"
# Returns 404 if leave_id doesn't exist
```

**Error: Validation Failed**
```bash
# Problem: Missing required fields
# Solution: Check API documentation and include all required fields
# Response:
# {
#   "success": false,
#   "error": "Missing required fields: days"
# }
```

---

## 📊 Sample Postman Collection

Import this into Postman:

```json
{
  "info": {
    "name": "ACOLYTE HRMS",
    "version": "1.0"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/auth/callback/credentials",
            "body": {
              "mode": "raw",
              "raw": "{\"email\": \"owner@acolyte.com\", \"password\": \"Owner@123\"}"
            }
          }
        }
      ]
    },
    {
      "name": "Leaves",
      "item": [
        {
          "name": "Apply Leave",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/leaves",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{token}}"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

**All functionality is now documented and ready for testing!**
