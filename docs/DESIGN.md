# 🎨 LeaveTrack — Technical Design Document & Business Rules

> [!IMPORTANT]
> Detailed Data Models, Business Rules, and API Specifications for **LeaveTrack**.  
> 

---

## 🗄️ Database Schema & Data Models

### 1. `Employee` Table Schema
```sql
CREATE TABLE Employee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('employee', 'manager')),
    leave_balance REAL DEFAULT 20.0,
    token TEXT UNIQUE
);
```

### 2. `LeaveRequest` Table Schema
```sql
CREATE TABLE LeaveRequest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    half_day_start BOOLEAN DEFAULT 0,
    half_day_end BOOLEAN DEFAULT 0,
    FOREIGN KEY(employee_id) REFERENCES Employee(id)
);
```

---

## ⚖️ Core Business Rules (Rules 1 to 13)

> [!TIP]
> **Rule 13 (Weekend Holiday Exclusion)** automatically skips Saturdays and Sundays from leave duration math.

1. **Rule 1 (Initial Balance)**: Every employee starts with a 20.0 days annual leave balance.
2. **Rule 2 (Required Fields)**: Requests must contain `employee_id`, `start_date`, `end_date`, and `reason`.
3. **Rule 3 (Date Ordering)**: `start_date` must be on or before `end_date`.
4. **Rule 4 (Balance Deduction)**: Balance is deducted only upon submission.
5. **Rule 5 (Overlap Rejection)**: Overlapping leave date ranges for the same employee are rejected.
6. **Rule 6 (Manager Workflow)**: Managers approve or reject pending requests.
7. **Rule 7 (Rejection Restoration)**: Rejecting a request restores the deducted leave balance.
8. **Rule 8 (Insufficient Balance)**: Requests exceeding available balance return `400 Bad Request`.
9. **Rule 9 (Half-Day Support)**: Half-day options deduct 0.5 days per half-day flag.
10. **Rule 10 (Role-Based Authorization)**: Only managers can execute approval/rejection endpoints.
11. **Rule 11 (Audit Timeline)**: Status changes update request state and audit history.
12. **Rule 12 (Printable Slips)**: Approved leaves generate a printable verification slip with reference tokens.
13. **Rule 13 (Weekend Exclusions)**: Saturdays (`weekday 5`) and Sundays (`weekday 6`) contribute **0 days** to leave consumption (e.g. Friday to Monday deducts only 2 working days).

---

## 📡 REST API Endpoint Specifications

| Endpoint | Method | Headers | Request Body | Description |
|----------|--------|---------|--------------|-------------|
| `/employees/<id>` | `GET` | — | — | Returns employee profile and current leave balance. |
| `/employees` | `POST` | — | `{name, role}` | Creates a new employee or manager account. |
| `/leaves` | `GET` | — | — | Returns all leave requests with employee details. |
| `/leaves` | `POST` | — | `{employee_id, start_date, end_date, reason, half_day_start, half_day_end}` | Submits a new leave request. |
| `/leaves/<id>/approve` | `POST` | `Manager-Id` | — | Approves pending request and updates status. |
| `/leaves/<id>/reject` | `POST` | `Manager-Id` | — | Rejects pending request and restores balance. |
