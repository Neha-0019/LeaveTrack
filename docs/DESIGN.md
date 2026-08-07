# LeaveTrack Design Document

## Data Model

### Employee
- `id` (INTEGER, Primary Key)
- `name` (TEXT)
- `role` (TEXT: 'employee', 'manager')
- `leave_balance` (REAL, default 20.0)
- `token` (TEXT) - Cryptographically generated 16-byte hex API token for authentication.

### LeaveRequest
- `id` (INTEGER, Primary Key)
- `employee_id` (INTEGER, Foreign Key -> Employee.id)
- `start_date` (TEXT, YYYY-MM-DD)
- `end_date` (TEXT, YYYY-MM-DD)
- `reason` (TEXT)
- `status` (TEXT: 'PENDING', 'APPROVED', 'REJECTED')
- `half_day_start` (BOOLEAN, default 0)
- `half_day_end` (BOOLEAN, default 0)

## Business Rules & Key Flows
1. **Initial Balance:** An employee starts with a balance of 20.0 days.
2. **Required Fields:** Requests must include `employee_id`, `start_date`, `end_date`, and `reason`.
3. **Chronology:** `end_date` cannot be before `start_date`.
4. **No Past Dates:** A leave cannot be requested for a date range ending entirely in the past.
5. **Balance Ceiling:** An employee cannot request more working days than their remaining balance.
6. **No Overlaps:** Employees cannot have overlapping `PENDING` or `APPROVED` requests. Half-day requests on the exact same date for opposite halves are isolated and do not count as an overlap.
7. **Workflow State:** Requests default to `PENDING`.
8. **Deduction Timing:** Balances are deducted only upon `APPROVAL`, never upon request creation.
9. **State Lock:** Processed requests (`APPROVED` or `REJECTED`) are final and cannot be modified.
10. **Authorization Enforcement:** Only users with the `'manager'` role can approve or reject requests. They must provide a valid `Authorization` header matching their stored token.
11. **Self-Approval Block:** A manager cannot approve or reject their own leave requests.
12. **Half-Day Logic:** A leave can be modified by `half_day_start` and `half_day_end`. Single-day leaves cannot have both flags set to True simultaneously.
13. **Weekend Holiday Exclusion:** Saturdays and Sundays are excluded from duration math (e.g. Friday to Monday counts as 2 working days).

## API Specification
- `POST /employees`: 
  - Payload: `{"name": "...", "role": "..."}`
  - Responses: `201 Created` (returns generated token), `400 Bad Request` (invalid types/missing data).
- `GET /employees/<id>`:
  - Responses: `200 OK`, `404 Not Found`.
- `POST /leaves`:
  - Payload: `{"employee_id": int, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "reason": "str", "half_day_start": bool, "half_day_end": bool}`
  - Responses: `201 Created`, `400 Bad Request` (overlaps, invalid dates, insufficient balance), `404 Not Found`.
- `POST /leaves/<id>/approve`:
  - Headers: `Manager-Id: int`, `Authorization: str`
  - Responses: `200 OK`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `400 Bad Request`.
- `POST /leaves/<id>/reject`:
  - Headers: `Manager-Id: int`, `Authorization: str`
  - Responses: Same as approve.
- `GET /leaves`:
  - Responses: `200 OK` (list of all requests).

## Error Handling
- Invalid Input: Returns HTTP `400 Bad Request` with an explicit JSON `error` message detailing the specific validation that failed.
- Unauthorized/Forbidden Access: Returns HTTP `401 Unauthorized` for missing headers/invalid tokens, or `403 Forbidden` for role/self-approval violations.
- Double-Processing: Attempting to approve/reject an already processed request yields a `400 Bad Request` state lock error.
