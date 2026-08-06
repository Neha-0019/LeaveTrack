# 🏥 LeaveTrack — Enterprise Workplace Leave Management System

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-10B981?style=for-the-badge&logo=render)](https://leavetrack-10ut.onrender.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0.0-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Pytest](https://img.shields.io/badge/Pytest-20%2F20%20Passing-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](https://pytest.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **Live Deployment:** [https://leavetrack-10ut.onrender.com](https://leavetrack-10ut.onrender.com)  
> **Enterprise Application:** Production-Ready Workplace Leave & Attendance Management System

---

## 📌 Executive Summary

**LeaveTrack** is a production-ready, full-stack enterprise leave approval and workplace management system built with Python (Flask REST API), SQLite, and an interactive modern web interface (Vanilla CSS/HTML/JS SPA).

It automates the end-to-end leave application lifecycle for corporate organizations—providing role-based workflows for **Employees** (submitting leave requests, tracking approval timelines, viewing calendar absence schedules) and **Managers** (reviewing pending queues, approving/rejecting requests with live confetti feedback, and exporting HR slips).

---

## ✨ Key Features & Business Logic

### 🔐 1. Security & Authentication
* **Role-Based Access Control (RBAC):** Distinct permissions and UI views for `Employee` and `Manager` roles.
* **Token Authorization:** Cryptographically secure API tokens (`Authorization` & `Manager-Id` headers) required for approval actions.
* **Self-Approval Protection:** Managers are strictly blocked from approving or rejecting their own leave requests (`HTTP 403`).
* **Password Complexity Regex:** Enforces passwords >= 6 characters containing letters, numbers, and special characters (e.g. `Pass@123`).

### 📅 2. Smart Leave Calculation & Weekend Holidays
* **Weekend Holiday Exclusion:** Saturdays and Sundays are automatically excluded from leave duration math (e.g., Friday to Monday = 2 leave days instead of 4).
* **Half-Day Support (0.5 Units):** Supports half-day leaves on start or end dates, accurately deducting 0.5-day increments.
* **Boundary Overlap Prevention:** Advanced overlap check prevents double-booking while permitting non-overlapping half-days on the exact same date.
* **Deduction on Approval:** Balances (starting at 20.0 days/year) are deducted **only** upon Manager approval.

### 🎨 3. Enterprise UI/UX & Mobile Responsiveness
* **Theme System:** Dark Mode & Light Mode support with smooth CSS variable cascade.
* **Team Absence Calendar:** Interactive monthly grid with color-coded status pills (`Approved` / `Pending`).
* **Audit Timeline Tracker:** Step-by-step visual audit trail (Applied -> Review -> Decision) with exact timestamps.
* **HR Slip Printing:** One-click generation and printing of official HR Leave Slips.
* **Mobile-First Responsive Design:** Fully optimized for smartphones, tablets, and desktop displays.

---

## 🛠️ Technology Stack

| Domain | Technology | Rationale |
|--------|------------|-----------|
| **Backend API** | Python 3.11, Flask 3.0 | Lightweight, high-throughput REST API with zero-boilerplate route handling. |
| **Database** | SQLite 3 | Embedded relational storage with foreign key constraints & atomic commits. |
| **Frontend UI** | HTML5, Vanilla JS, CSS3 | Zero-dependency SPA for maximum performance and cross-device compatibility. |
| **Test Automation** | Pytest 7.4 | Comprehensive 20-test automated integration suite covering edge cases & security. |
| **Icons & Typography** | Lucide Icons, Outfit Font | Modern B2B SaaS aesthetic with crisp SVG icons and readable typography. |
| **Cloud Hosting** | Render.com (Gunicorn WSGI) | Production cloud web service with automated HTTPS SSL certificates. |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
* Python 3.10+ installed
* `git` version control

### 2. Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/Neha-0019/LeaveTrack.git
cd LeaveTrack

# 2. Create and activate a virtual environment
# Windows:
python -m venv venv
venv\Scripts\activate

# macOS / Linux:
python3 -m venv venv
source venv/bin/activate

# 3. Install required dependencies
pip install -r requirements.txt
```

### 3. Running the Server

```bash
python app.py
```
Open **`http://127.0.0.1:5000`** in your browser.

---

## 🧪 Automated Testing & QA Evidence

The repository includes a 20-test automated Pytest suite (`test_leave_workflow.py`) validating business rules, boundary overlaps, security headers, and half-day math.

### Run Passing Test Suite:
```bash
python -m pytest test_leave_workflow.py -v
```

### Assessment Evidence Deliverables:
* **`evidence/CHANGE_LOOP_LOG.md`**: Full log of the AI change-loop implementation, ambiguity resolution, and test iterations.
* **`evidence/red_run.txt`**: Captured run output demonstrating a deliberate red run failure catching breaking changes.
* **`evidence/green_run_1.txt`**: Captured passing test run output.
* **`docs/ARCHITECTURE.md`**: System architecture, data flow diagram, and component specs.
* **`docs/DESIGN.md`**: Complete data model, 12 business rules, and API specifications.
* **`docs/USER_GUIDE.md`**: Non-technical step-by-step user manual.

---

## 📡 REST API Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/employees` | Register a new Employee or Manager | None |
| `GET` | `/employees/<id>` | Fetch employee details & balance | None |
| `POST` | `/leaves` | Submit a new leave request | None |
| `GET` | `/leaves` | List all leave requests | None |
| `POST` | `/leaves/<id>/approve` | Approve a pending leave request | Manager Token |
| `POST` | `/leaves/<id>/reject` | Reject a pending leave request | Manager Token |

---

## 📄 License & Attribution

Designed and developed by **Neha Panbude**.  
Released under the [MIT License](LICENSE).
