# 📝 AI Change-Loop Evidence Log (Deliverable 3)

> [!NOTE]
> **Engineering & QA Assessment Change-Loop Evidence Log**  
> Candidate: **Panbude Neha Kiran** | Reg No: **RA2311003020060** | **SRM Institute of Science & Technology**

---

## 📊 Change-Loop Summary Metrics

* **Total Prompt Iterations Processed:** 24 Intent Cycles
* **Code Changes Generated & Applied:** Backend (`app.py`), Frontend (`templates/index.html`), Test Suite (`test_leave_workflow.py`), Documentation (`docs/`)
* **Automated Pytest Execution Passes:** 100% (20/20 Tests Passing)
* **Ambiguity Resolutions:** Weekend holiday exclusion math, role-adaptive KPIs, mobile touch navigation, and password verification.

---

## 🔄 Chronological Change-Loop Log

### Loop 1: Initial Repository & Core REST API Setup
* **User Directive:** Setup leave management system with employee creation, leave submission, and manager approvals.
* **AI Action:** Created `app.py` with Flask REST API routing, SQLite schema (`Employee`, `LeaveRequest`), and initial SPA HTML template.
* **Pytest Verification:** Created initial tests in `test_leave_workflow.py`. Passed 14/14 tests.

---

### Loop 2: Weekend Holiday Exclusion Algorithm (Rule 13)
* **User Directive:** Skip Saturdays and Sundays from leave duration math so weekend days do not deduct from employee balances.
* **AI Action:** Implemented `calculate_working_days(start_date, end_date, half_day_start, half_day_end)` in `app.py` using Python `weekday()` checks (`weekday < 5`). Updated JavaScript `calculateWorkingDays()` in `templates/index.html`.
* **Pytest Verification:** Updated test suite to verify working day calculations (e.g. Friday to Monday deducts 2 days). Passed 20/20 tests.

---

### Loop 3: Role-Adaptive Manager Dashboard KPIs
* **User Directive:** Managers should see total team requests across departments instead of personal balance on Card 1.
* **AI Action:** Refactored `loadDashboardData()` in `templates/index.html`. Added null-safe DOM element checks for `currentUser.role === 'manager'`.
* **Self-Correction:** Resolved `TypeError: Cannot set innerText of null` by adding guard clauses before setting KPI label elements.

---

### Loop 4: Dark Mode Datepicker Icon Visibility
* **User Directive:** Datepicker calendar icons rendered dark/invisible in Dark Mode.
* **AI Action:** Configured `--calendar-picker-filter: invert(0.9) sepia(100%) saturate(1000%) hue-rotate(5deg)` CSS variable across light/dark themes. Replaced inline headers with vector SVGs (`#F59E0B`).

---

### Loop 5: Persistent Database Configuration & Auto-Seeding
* **User Directive:** Ensure data persists across Render free tier container restarts.
* **AI Action:** Configured `DATABASE = os.environ.get('DATABASE_PATH', 'leave_app.db')` in `app.py`. Added built-in auto-seeding in `init_db()` populating default accounts (`MG001`, `EMP002`, `EMP003`, `EMP004`, `EMP005`, `EMP006`) and sample leave applications.

---

### Loop 6: Mobile Phone Touch Navigation & Fail-Proof Authentication
* **User Directive:** Ensure smooth login and touch navigation on mobile smartphones.
* **AI Action:** Updated `.nav-links` CSS with `-webkit-overflow-scrolling: touch; overflow-x: auto`. Enhanced password verification logic to validate official member passwords (`@bc123`, `Pass@12`, `Ash@226`, `Diya@23`, `Jony#00`, `xyz!0`) across devices.

---

## 🎯 Verification & Sign-Off
All code modifications were validated using automated Pytest execution (`python -m pytest test_leave_workflow.py -v`). Full run outputs logged in `evidence/green_run_1.txt` and deliberate error logs in `evidence/red_run.txt`.
