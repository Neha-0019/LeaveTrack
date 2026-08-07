# 🏛️ LeaveTrack — Technical System Architecture

> [!NOTE]
> Official System Architecture & Engineering Specifications for **LeaveTrack (Tactive Workplace Management)**.  
> Candidate: **Panbude Neha Kiran** | Reg No: **RA2311003020060** | **SRM Institute of Science & Technology**

---

## 🌟 Executive Summary
**LeaveTrack** is an enterprise-grade workplace leave management system built with Python Flask RESTful API, SQLite 3 persistent storage, and a modern Single-Page Application (SPA) frontend. It enforces role-based access control (RBAC), automated weekend holiday exclusions, half-day duration calculations, and official printable HR leave slips.

---

## ⚡ High-Level System Architecture

```
                                  ┌─────────────────────────────────────────┐
                                  │      Client Browser (Desktop/Mobile)    │
                                  │   Vanilla JS SPA / Glassmorphism UI     │
                                  └────────────────────┬────────────────────┘
                                                       │
                                            HTTP / JSON REST API
                                                       │
                                                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │       Flask Application Server          │
                                  │  • Authorization & Token Verification   │
                                  │  • Weekend Exclusion Algorithm          │
                                  │  • Role-Adaptive KPI Calculations       │
                                  └────────────────────┬────────────────────┘
                                                       │
                                                SQLite3 Engine
                                                       │
                                                       ▼
                                  ┌─────────────────────────────────────────┐
                                  │      Persistent SQLite Database         │
                                  │    • Employee Profiles & Balances       │
                                  │    • Leave Applications & Audit Logs    │
                                  └─────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack & Engineering Rationale

| Component | Technology | Selection Rationale |
|-----------|------------|---------------------|
| **Backend API** | Python 3.11 / Flask 3.0 | Lightweight, high-throughput RESTful routing with zero unnecessary abstraction overhead. |
| **Database** | SQLite 3 | Embedded zero-configuration ACID database with environment-based `DATABASE_PATH` for persistent disk storage on Render. |
| **Frontend** | Vanilla HTML5 / CSS3 / ES6 JS | Zero external framework dependencies; maximum runtime performance, fast load times, and custom CSS design system. |
| **Testing** | Pytest 7.4 | Automated suite executing 20 integration test cases in ~1 second. |
| **Production Server** | Gunicorn WSGI | Enterprise production process manager powering live cloud deployment. |

---

## 🔒 Security Architecture

1. **Role-Based Access Control (RBAC)**:
   * `employee`: Allowed to submit requests, view personal balance (`20.0 days`), track timeline audits, and print HR slips.
   * `manager`: Allowed to view department-wide team requests, approve/reject applications, and monitor team KPIs.
2. **Token Authentication**:
   * API endpoints require `Authorization` header token checks (`16-byte hex tokens`).
3. **Password Security**:
   * Regular expression validation requiring minimum 5-6 characters with letters, numbers, and special characters.

---

## 🌐 Cloud Deployment Architecture
* **Hosted URL**: [https://leavetrack-10ut.onrender.com](https://leavetrack-10ut.onrender.com)
* **GitHub Repository**: [https://github.com/Neha-0019/LeaveTrack](https://github.com/Neha-0019/LeaveTrack)
* **Disk Persistence**: Environment variable `DATABASE_PATH=/var/data/leave_app.db` mounts a persistent cloud disk.
