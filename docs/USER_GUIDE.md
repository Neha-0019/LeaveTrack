# User Guide

Welcome to the LeaveTrack! This modern SaaS dashboard helps you seamlessly manage and track your time off with enterprise-grade reliability.

## For Employees: How to Request Leave
1. **Open the Application:** Open the user interface in your web browser.
2. **Submit a Request:** Locate the "Submit Leave Request" form on the main dashboard.
3. **Fill out the details:**
   - **Employee ID:** Enter your unique numeric Employee ID.
   - **Dates:** Select the Start Date and End Date for your planned time off.
   - **Reason:** Provide a brief Reason (e.g., "Family vacation", "Doctor appointment").
4. **Half Days:** The system fully supports half-day deductions (e.g. morning only or afternoon only). To use this, you can specify `half_day_start` or `half_day_end` in your API requests.
5. **Submit:** Click the primary action button to submit. If everything is correct (no overlapping requests, enough leave balance, valid dates), you will see a success notification. Your request is now `PENDING`.

## For Managers: Reviewing Leaves
1. **View Pending Requests:** Locate the "Leave Requests" data table below the dashboard. 
2. **Identify Yourself (Auth):** Enter your Manager ID into the top-right toolbar or the settings modal to authenticate. You must also supply your API token for security validation (managed securely in the backend for automated API testing).
3. **Approve or Reject:** Next to any `PENDING` request in the table, you will see action buttons.
   - **Approve:** Authorizes the time off and automatically deducts the exact amount of days (including half-days) from the employee's balance.
   - **Reject:** Denies the request, retaining the employee's balance untouched.
4. **Self-Approval Blocked:** Note that you cannot approve or reject your own time off! Another manager must approve it for you.

## Understanding Your Leave Balance
- **Starting Balance:** Every employee starts the year with 20.0 days.
- **When it Updates:** Your balance **does not** decrease when you submit a request. It only decreases *after* a manager clicks "Approve". 
- **Tracking:** You can view your current remaining balance on the top KPI cards on your dashboard.
