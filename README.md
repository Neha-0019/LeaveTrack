# LeaveTrack (Leave Approval System)

LeaveTrack is an enterprise-grade Leave Approval System built with Flask and SQLite. It provides a clean API and a modern web interface for employees to submit leave requests and for managers to approve or reject them.

## Features & Business Rules
- **Leave Balance:** Each employee starts with a balance of 20.0 days.
- **Workflow:** Employees submit leave requests specifying a start date, end date, and reason. Requests are initially marked as `PENDING`.
- **Half-day Leaves:** Employees can specify if the start date or end date is a half-day. Balances and overlaps account for this 0.5 day accurately.
- **Overlap Prevention:** The system automatically rejects overlapping requests for the same employee.
- **Balance Deduction:** Leave balances are only deducted when a Manager `APPROVES` the request.
- **Authentication:** Mangers authenticate via an API token generated upon employee creation, passed in the `Authorization` header.

## Prerequisites
- Python 3.10+
- `pip` (Python package manager)

## Setup Instructions

1. **Clone the repository and enter the directory:**
   ```bash
   git clone <repository_url>
   cd LeaveTrack
   ```

2. **Create and activate a virtual environment:**
   - **Windows:**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

To start the local development server:
```bash
python app.py
```
The server will start on `http://127.0.0.1:5000`. The database (`leave_app.db`) will be automatically initialized and seeded with demo users on first run.

## Running the Test Suite

The system includes a comprehensive pytest suite covering all business rules, boundary overlaps, and token authentication.
Run the tests with:
```bash
python -m pytest test_leave_workflow.py -v
```

## Running the Automated Change Loop Simulation
An automated script `run_loop.py` is included to demonstrate the application's APIs in a sequence. To run it:
```bash
python run_loop.py
```
