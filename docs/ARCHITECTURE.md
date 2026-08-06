# Architecture Document

## System Components
The application is built as a monolithic web service with three primary components:
1. **Frontend (HTML/JS/CSS):** A minimalistic, vanilla HTML and JavaScript interface styled like a modern B2B SaaS dashboard. It handles user inputs (leave requests, approvals) and communicates with the backend via asynchronous `fetch` API calls.
2. **Backend (Flask/Python):** A lightweight Python API handling HTTP requests, input validation, business logic enforcement (e.g., date overlaps, balance calculations, role authorization), and data routing.
3. **Storage (SQLite):** An embedded relational database storing `Employee` and `LeaveRequest` records securely on disk.

## Data Flow
The full lifecycle of a leave request follows this path:
1. **Submit:** An employee fills out the form in the UI. The frontend sends a `POST /leaves` request with JSON data.
2. **Validate:** The Flask API catches the request. It validates the payload types, checks that dates are logically sound (not in the past, end is after start), and performs SQL queries to ensure no overlapping leaves exist and that the employee has sufficient balance.
3. **Store:** If valid, the backend writes a new `LeaveRequest` record to SQLite with the `PENDING` status.
4. **Approve/Reject:** A manager interacts with the UI, sending a `POST /leaves/<id>/approve` request with their `Manager-Id` header and `Authorization` token header.
5. **Balance Update:** The backend verifies the manager's identity, role, token, and ensures they aren't approving their own request. Upon approval, it calculates the exact duration (including 0.5-day units), deducts it from the `Employee` table, and updates the `LeaveRequest` status to `APPROVED`.

## Technology Choices & Rationale
- **Flask (Python):** Chosen for its extreme simplicity, speed of setup, and transparency. It allows us to build a fully testable API in a single file without the boilerplate of larger frameworks like Django.
- **SQLite:** Chosen for zero-configuration persistence. Given the timeline of this assessment, it prioritizes immediate testability and local development over distributed scale.
- **Vanilla JS & HTML:** Eliminates build steps, Webpack configurations, or Node.js dependencies, ensuring anyone can run the app directly from the README.
- **Token-based API Auth:** A secure 16-byte hex token is generated per user. This prevents unauthorized approval actions without requiring full session management (JWT/cookies) which would overcomplicate the scope.

## Continuous Integration (CI)
The project is structured to run via standard CI pipelines. A robust `pytest` suite in `test_leave_workflow.py` guarantees business rules (like boundary overlaps and token security) do not regress.
