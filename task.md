# Execution Checklist - Visual Work Reports Dashboard

- [x] Add state declarations (`callsHistory`, `paymentsHistory`, `candidatesList`, `selectedDetailUser`, `selectedDetailBranch`, `loadingExtra`)
- [x] Fetch calls, payments, and candidates data in `fetchReports`
- [x] Compute employee-wise and branch-wise metrics dynamically
- [x] Render tab selectors and default tab redirection
- [x] Render high-level statistics cards
- [x] Render employee leaderboard cards with click events
- [x] Render branch recovery stats list with click events
- [x] Render detail popup modal for employees
- [x] Render detail popup modal for branches
- [x] Run TypeScript compilation checks and verify UI

## Today's Accomplished Tasks (16 July, 2026)

### Visual Dashboard & Work Reports
- [x] Remove Action Column & display data via tab-wise dropdown (SOD/EOD, Tasks, Calls, Payments)
- [x] Fix Employee column profile image display in the summary table
- [x] Fix the auto-reload loop on page load
- [x] Exclude Owner profile row from the Employee Work Summary table
- [x] Fix visual dashboard filters (Department/Employee name mapping via `/api/attendance/calendar-data`)
- [x] Make "All Employees" dropdown filter dynamic (only showing employees with data)
- [x] Merge assigned tasks into the assignee's daily logs and show "Assigned By" details
- [x] Fix date-filtering issues in Owner's assigned tasks timeline view (avoiding July 14 logs showing in July 13 filter)
- [x] Add search query input filtering to the Employee Work Summary table
- [x] Refactor search match algorithm to use word-boundary matching (prevents false matches like "rajasthan" matching "astha")

### Sidebar Profile Photo
- [x] Fetch `profilePhoto` from `EmployeeProfile` in `lib/auth.ts` and store it in JWT/Session
- [x] Update Sidebar bottom profile section avatar to render the user's profile photo (with initials fallback)

### Legal Recovery Integration
- [x] Display logged payments directly under the "Calls Made Report" in the employee's work report dropdown (without creating task cards)

### Excel Export Features
- [x] Implement "Export Summary" option to download Employee Work Summary table to Excel
- [x] Style the exported Excel document with elegant light pastel corporate colors (instead of saturated/bright backgrounds)

